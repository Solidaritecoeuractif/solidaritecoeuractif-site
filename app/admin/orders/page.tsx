import { storage } from "@/lib/storage";
import OrdersTableClient from "@/components/OrdersTableClient";

export default async function OrdersPage() {
  const orders = await storage().getOrders();
  return <OrdersTableClient orders={orders} />;
}