import type { GroupedShipping, Product } from "@/lib/types";

export const DEFAULT_GROUPED_SHIPPING: GroupedShipping = {
  enabled: true,
  tiers: [
    { minQuantity: 2, savingsAmount: 400 },
    { minQuantity: 3, savingsAmount: 600 },
  ],
  title: "Faites-en profiter vos proches 💛",
  description: "Regroupez vos exemplaires à la même adresse et économisez sur les frais de traitement et d’expédition :",
  footer: "Pour vous, votre famille, vos amis ou votre communauté… les livres sont offerts, seuls les frais de traitement et d’expédition restent à votre charge.",
};

type ShippingProduct = Partial<Pick<Product, "isPhysical" | "requiresShipping" | "pricingMode" | "groupedShipping">>;

export function hasAutomaticShipping(product: ShippingProduct) {
  return Boolean(product.isPhysical && product.requiresShipping && product.pricingMode === "flexible" && product.groupedShipping);
}

export function activeGroupedShipping(product: ShippingProduct) {
  return hasAutomaticShipping(product) && product.groupedShipping?.enabled
    ? product.groupedShipping
    : undefined;
}

export function groupedShippingSavings(product: ShippingProduct, quantity: number) {
  const config = activeGroupedShipping(product);
  if (!config) return 0;
  const tier = [...config.tiers].sort((a, b) => b.minQuantity - a.minQuantity)
    .find(entry => quantity >= entry.minQuantity);
  return tier?.savingsAmount ?? 0;
}

export function groupedTierLabel(tiers: GroupedShipping["tiers"], index: number) {
  const current = tiers[index].minQuantity;
  const next = tiers[index + 1]?.minQuantity;
  if (!next) return `${current} exemplaires ou plus`;
  if (next === current + 1) return `${current} exemplaires`;
  return `${current} à ${next - 1} exemplaires`;
}
