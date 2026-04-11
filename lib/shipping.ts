
import type { Product } from "@/lib/types";

export const shippingZones: Record<string, number> = {
  FR: 1000,
  BE: 1800,
  LU: 1800,
  DE: 1900,
  CA: 3500,
  US: 3900,
  CI: 2500,
  BJ: 2500,
  TG: 2500,
  OTHER: 4500
};

export function needsShipping(products: Product[]) {
  return products.some((item) => item.requiresShipping && item.isPhysical);
}

export function quoteShipping(country: string, totalPhysicalQuantity: number) {
  const base = shippingZones[country] ?? shippingZones.OTHER;
  const extra = Math.max(0, totalPhysicalQuantity - 1) * 400;
  return base + extra;
}
