export const dynamic = "force-dynamic";

import { CheckoutClient } from "@/components/CheckoutClient";
import { storage } from "@/lib/storage";

export default async function CheckoutPage() {
  const products = await storage().getProducts();
  return <CheckoutClient products={products} />;
}