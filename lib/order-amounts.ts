import type { OrderItem } from "@/lib/types";

export function orderItemTotal(item: Pick<OrderItem, "lineTotal" | "unitAmount" | "quantity">) {
  return item.lineTotal ?? item.unitAmount * item.quantity;
}

/** Charge a group as one shipment so indivisible cents never change its total. */
export function stripeOrderLine(item: OrderItem, currency: string, reference: string) {
  const total = orderItemTotal(item);
  const grouped = (item.shippingSavingsAmount ?? 0) > 0 || total !== item.unitAmount * item.quantity;
  return {
    quantity: grouped ? 1 : item.quantity,
    price_data: {
      currency,
      unit_amount: grouped ? total : item.unitAmount,
      product_data: {
        name: grouped ? `Traitement et expédition groupée — ${item.quantity} exemplaires` : item.productTitle,
        description: `${item.productTitle} — référence ${reference}`,
      },
    },
  };
}
