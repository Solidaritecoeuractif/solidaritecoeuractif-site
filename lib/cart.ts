import type { CartItemInput, Product } from "@/lib/types";
import { calculateZoneAdjustedLineMinimum } from "@/lib/destinations";

export type ResolvedCartItem = {
  product: Product;
  quantity: number;
  customAmount?: number;
  unitAmount: number;
  lineTotal: number;
};

export type ResolvedCart = {
  items: ResolvedCartItem[];
  subtotal: number;
  requiresShipping: boolean;
  errors: string[];
};

function resolveUnitAmount(
  product: Product,
  quantity: number,
  destinationCode?: string,
  customAmount?: number
) {
  if (product.pricingMode === "fixed") {
    return product.fixedPrice ?? 0;
  }

  const adjustedLineMinimum = calculateZoneAdjustedLineMinimum(
    product,
    quantity,
    destinationCode || "FR"
  );

  const adjustedUnitMinimum = Math.ceil(adjustedLineMinimum / quantity);
  const requested = customAmount ?? adjustedUnitMinimum;

  return Math.max(requested, adjustedUnitMinimum);
}

export function resolveCart(
  items: CartItemInput[],
  products: Product[],
  destinationCode?: string
): ResolvedCart {
  const resolved: ResolvedCartItem[] = [];
  const errors: string[] = [];

  for (const item of items) {
    const product = products.find(
      (entry) => entry.id === item.productId && entry.isActive
    );

    if (!product) {
      errors.push(`Produit introuvable ou inactif : ${item.productId}`);
      continue;
    }

    const maxAllowed = product.maxQuantity ?? 50;
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

    if (product.pricingMode === "flexible") {
      const adjustedLineMinimum = calculateZoneAdjustedLineMinimum(
        product,
        item.quantity,
        destinationCode || "FR"
      );

      const adjustedUnitMinimum = Math.ceil(
        adjustedLineMinimum / item.quantity
      );

      if (
        typeof item.customAmount === "number" &&
        item.customAmount < adjustedUnitMinimum
      ) {
        errors.push(
          `Le montant choisi pour ${product.title} est inférieur au minimum autorisé pour cette destination.`
        );
        continue;
      }
    }

    const unitAmount = resolveUnitAmount(
      product,
      item.quantity,
      destinationCode,
      item.customAmount
    );

    if (unitAmount <= 0) {
      errors.push(`Montant invalide pour ${product.title}.`);
      continue;
    }

    resolved.push({
      product,
      quantity: item.quantity,
      customAmount: product.pricingMode === "flexible" ? unitAmount : undefined,
      unitAmount,
      lineTotal: unitAmount * item.quantity,
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