
import type { MetadataRoute } from "next";
import { storage } from "@/lib/storage";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const products = await storage().getProducts();
  return [
    "",
    "/panier",
    "/commande",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
    "/conditions",
    ...products.map((product) => `/produit/${product.slug}`)
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date()
  }));
}
