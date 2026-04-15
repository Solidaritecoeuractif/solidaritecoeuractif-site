import type { MetadataRoute } from "next";
import { storage } from "@/lib/storage";

function normalizeBaseUrl(url?: string) {
  const fallback = "https://www.solidaritecoeuractif.com";
  const raw = (url || fallback).trim();

  try {
    const parsed = new URL(raw);
    parsed.protocol = "https:";
    parsed.host = "www.solidaritecoeuractif.com";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
  const products = await storage().getProducts();

  return [
    "",
    "/panier",
    "/commande",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
    "/conditions",
    ...products.map((product) => `/produit/${product.slug}`),
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}