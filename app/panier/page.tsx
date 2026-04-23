export const dynamic = "force-dynamic";

import { CartClient } from "@/components/CartClient";
import { storage } from "@/lib/storage";

export default async function CartPage() {
  const products = await storage().getProducts();
  return <CartClient products={products} />;
}