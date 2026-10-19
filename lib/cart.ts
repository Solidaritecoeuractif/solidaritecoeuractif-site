import type { CartItemInput, Product } from "@/lib/types";
import { calculateZoneAdjustedLineMinimum } from "@/lib/destinations";
import { groupedShippingSavings, hasAutomaticShipping } from "@/lib/grouped-shipping";

export type ResolvedCartItem = {
  product: Product;
  quantity: number;
  customAmount?: number;
  unitAmount: number;
  lineTotal: number;
  shippingSavingsAmount?: number;
};

export type ResolvedCart = {
  items: ResolvedCartItem[];
  subtotal: number;
  requiresShipping: boolean;
  errors: string[];
};

// One shipment per product: duplicate browser/API lines cannot repeat the saving.
export function normalizeCartItems(items: CartItemInput[], products: Product[]) {
  const result: CartItemInput[] = [];
  for (const item of items) {
    const product = products.find(entry => entry.id === item.productId);
    if (product && hasAutomaticShipping(product)) {
      const previous = result.find(entry => entry.productId === item.productId);
      if (previous) previous.quantity += item.quantity;
      else result.push({ productId: item.productId, quantity: item.quantity });
    } else result.push({ ...item });
  }
  return result;
}

export function resolveCart(
  items: CartItemInput[],
  products: Product[],
  destinationCode?: string
): ResolvedCart {
  const resolved: ResolvedCartItem[] = [];
  const errors: string[] = [];

  for (const item of normalizeCartItems(items, products)) {
    const product = products.find(
      (entry) => entry.id === item.productId && entry.isActive
    );

    if (!product) {
      errors.push(`Produit introuvable ou inactif : ${item.productId}`);
      continue;
    }

    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      errors.push(`Quantité invalide pour ${product.title}.`);
      continue;
    }
    const maxAllowed = Math.min(product.maxQuantity ?? 50, 50);
    if (item.quantity > maxAllowed) {
      errors.push(
        `Quantité trop élevée pour ${product.title}. Maximum autorisé : ${maxAllowed}.`
      );
      continue;
    }

    if (typeof product.stock === "number" && item.quantity > product.stock) {
      errors.push(
        `Stock insuffisant pour ${product.title}. Stock disponible : ${product.stock}.`
      );
      continue;
    }

    const automatic = hasAutomaticShipping(product);
    const minimum = calculateZoneAdjustedLineMinimum(product, item.quantity, destinationCode || "FR");
    const requested = item.customAmount === undefined ? minimum : item.customAmount * item.quantity;
    const lineTotal = product.pricingMode === "fixed"
      ? (product.fixedPrice ?? 0) * item.quantity
      : automatic ? minimum : requested;

    if (!Number.isSafeInteger(lineTotal) || lineTotal <= 0 ||
        (product.pricingMode === "flexible" && lineTotal < minimum)) {
      errors.push(`Le montant choisi pour ${product.title} est inférieur au minimum autorisé ou invalide.`);
      continue;
    }

    const unitAmount = Math.floor(lineTotal / item.quantity);
    resolved.push({
      product,
      quantity: item.quantity,
      customAmount: product.pricingMode === "flexible" && !automatic ? unitAmount : undefined,
      unitAmount,
      lineTotal,
      shippingSavingsAmount: groupedShippingSavings(product, item.quantity),
    });
  }

  const subtotal = resolved.reduce((sum, item) => sum + item.lineTotal, 0);
  const requiresShipping = resolved.some(
    (item) => item.product.isPhysical && item.product.requiresShipping
  );

  return { items: resolved, subtotal, requiresShipping, errors };
}

export function computeTotals(items: ResolvedCartItem[], _country?: string) {
  const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const shippingAmount = items.reduce((sum, item) => {
    if (!item.product.isPhysical || !item.product.requiresShipping) {
      return sum;
    }

    const shippingFeeAmount = item.product.shippingFeeAmount ?? 0;
    return sum + shippingFeeAmount * item.quantity;
  }, 0);

  const totalPhysicalQuantity = items
    .filter((item) => item.product.isPhysical && item.product.requiresShipping)
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotalAmount,
    shippingAmount,
    totalAmount: subtotalAmount + shippingAmount,
    totalPhysicalQuantity,
  };
}