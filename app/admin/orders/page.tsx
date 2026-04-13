import { storage } from "@/lib/storage";
import OrdersTableClient from "@/components/OrdersTableClient";

export default async function OrdersPage() {
  const orders = (await storage().getOrders()).filter(
    (order) => order.paymentStatus === "paid"
  );

  return <OrdersTableClient orders={orders} />;
}