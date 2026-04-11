import type { CartItemInput, Product } from "@/lib/types";
import { quoteShipping } from "@/lib/shipping";

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

function resolveUnitAmount(product: Product, customAmount?: number) {
  if (product.pricingMode === "fixed") {
    return product.fixedPrice ?? 0;
  }

  const floor = product.minimumAmount ?? 0;
  const requested = customAmount ?? product.suggestedAmount ?? floor;
  return Math.max(requested, floor);
}

export function resolveCart(items: CartItemInput[], products: Product[]): ResolvedCart {
  const resolved: ResolvedCartItem[] = [];
  const errors: string[] = [];

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId && entry.isActive);
    if (!product) {
      errors.push(`Produit introuvable ou inactif : ${item.productId}`);
      continue;
    }

    const maxAllowed = product.maxQuantity ?? 50;
    if (item.quantity > maxAllowed) {
      errors.push(`Quantité trop élevée pour ${product.title}. Maximum autorisé : ${maxAllowed}.`);
      continue;
    }

    if (typeof product.stock === "number" && item.quantity > product.stock) {
      errors.push(`Stock insuffisant pour ${product.title}. Stock disponible : ${product.stock}.`);
      continue;
    }

    if (product.pricingMode === "flexible") {
      const minimum = product.minimumAmount ?? 0;
      if (typeof item.customAmount === "number" && item.customAmount < minimum) {
        errors.push(`Le montant choisi pour ${product.title} est inférieur au minimum autorisé.`);
        continue;
      }
    }

    const unitAmount = resolveUnitAmount(product, item.customAmount);
    if (unitAmount <= 0) {
      errors.push(`Montant invalide pour ${product.title}.`);
      continue;
    }

    resolved.push({
      product,
      quantity: item.quantity,
      customAmount: product.pricingMode === "flexible" ? unitAmount : undefined,
      unitAmount,
      lineTotal: unitAmount * item.quantity
    });
  }

  const subtotal = resolved.reduce((sum, item) => sum + item.lineTotal, 0);
  const requiresShipping = resolved.some((item) => item.product.isPhysical && item.product.requiresShipping);

  return { items: resolved, subtotal, requiresShipping, errors };
}

export function computeTotals(items: ResolvedCartItem[], country?: string) {
  const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const physicalQty = items
    .filter((item) => item.product.isPhysical && item.product.requiresShipping)
    .reduce((sum, item) => sum + item.quantity, 0);
  const shippingAmount = physicalQty > 0 ? quoteShipping(country || "OTHER", physicalQty) : 0;
  return {
    subtotalAmount,
    shippingAmount,
    totalAmount: subtotalAmount + shippingAmount,
    totalPhysicalQuantity: physicalQty
  };
}
