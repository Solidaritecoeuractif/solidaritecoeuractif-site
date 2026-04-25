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

  const staticPaths = [
    "",
    "/panier",
    "/commande",
    "/contact",
    "/mentions-legales",
    "/politique-confidentialite",
    "/conditions",
  ];

  let productPaths: string[] = [];

  try {
    const products = await storage().getProducts();
    productPaths = products
      .filter((product) => product.isActive)
      .map((product) => `/produit/${product.slug}`);
  } catch (error) {
    console.error("Sitemap fallback: impossible de charger les produits.", error);
  }

  return [...staticPaths, ...productPaths].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}