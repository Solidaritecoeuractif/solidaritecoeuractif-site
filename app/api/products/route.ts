import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { storage } from "@/lib/storage";
import { productFormSchema } from "@/lib/validators";
import { slugify, uniqueId } from "@/lib/utils";

export async function GET() {
  const products = await storage().getProducts();
  return NextResponse.json(products);
}

function fromForm(data: FormData) {
  return {
    title: String(data.get("title") || ""),
    subtitle: String(data.get("subtitle") || ""),
    shortDescription: String(data.get("shortDescription") || ""),
    longDescription: String(data.get("longDescription") || ""),
    image: String(data.get("image") || ""),
    offerType: String(data.get("offerType") || "product"),
    pricingMode: String(data.get("pricingMode") || "fixed"),
    fixedPrice: Number(data.get("fixedPrice") || 0),
    minimumAmount: Number(data.get("minimumAmount") || 0),
    suggestedAmount: Number(data.get("suggestedAmount") || 0),
    isActive: data.get("isActive") === "on",
    isPhysical: data.get("isPhysical") === "on",
    requiresShipping: data.get("requiresShipping") === "on",
    maxQuantity: Number(data.get("maxQuantity") || 0) || undefined,
    stock: Number(data.get("stock") || 0) || undefined,
    sku: String(data.get("sku") || ""),
    weightGrams: Number(data.get("weightGrams") || 0) || undefined,
    category: String(data.get("category") || "")
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = productFormSchema.safeParse(fromForm(formData));

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const product = {
    id: uniqueId("prod"),
    slug: slugify(parsed.data.title),
    ...parsed.data,
    createdAt: now,
    updatedAt: now
  };

  await storage().saveProduct(product);
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath(`/produit/${product.slug}`);

  return NextResponse.redirect(new URL("/admin/products", request.url));
}