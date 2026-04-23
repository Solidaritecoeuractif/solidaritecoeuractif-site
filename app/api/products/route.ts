import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { storage } from "@/lib/storage";
import { productFormSchema } from "@/lib/validators";
import { slugify, uniqueId } from "@/lib/utils";

async function fileToDataUrl(file: File | null) {
  if (!file || file.size === 0) return "";
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

function parseWeightGrams(data: FormData) {
  const raw = String(data.get("weightKg") || "").trim().replace(",", ".");
  if (!raw) return undefined;

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;

  return Math.round(numeric * 1000);
}

function parseOptionalAmount(data: FormData, field: string) {
  const raw = String(data.get(field) || "").trim();
  if (!raw) return undefined;

  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;

  return numeric;
}

function fromForm(data: FormData, uploadedImage: string) {
  return {
    title: String(data.get("title") || ""),
    subtitle: String(data.get("subtitle") || ""),
    shortDescription: String(data.get("shortDescription") || ""),
    longDescription: String(data.get("longDescription") || ""),
    image: uploadedImage,
    offerType: String(data.get("offerType") || "product"),
    pricingMode: String(data.get("pricingMode") || "fixed"),
    fixedPrice: parseOptionalAmount(data, "fixedPrice"),
    minimumAmount: parseOptionalAmount(data, "minimumAmount"),
    minimumAmountOutreMer: parseOptionalAmount(data, "minimumAmountOutreMer"),
    minimumAmountInternational: parseOptionalAmount(data, "minimumAmountInternational"),
    suggestedAmount: parseOptionalAmount(data, "suggestedAmount"),
    isActive: data.get("isActive") === "on",
    isPhysical: data.get("isPhysical") === "on",
    requiresShipping: data.get("requiresShipping") === "on",
    shippingFeeAmount: parseOptionalAmount(data, "shippingFeeAmount"),
    isFeatured: data.get("isFeatured") === "on",
    maxQuantity: Number(data.get("maxQuantity") || 0) || undefined,
    stock: Number(data.get("stock") || 0) || undefined,
    sku: String(data.get("sku") || ""),
    weightGrams: parseWeightGrams(data),
    category: String(data.get("category") || ""),
  };
}

export async function GET() {
  const products = await storage().getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const imageFile = formData.get("imageFile");
  const uploadedImage =
    imageFile instanceof File ? await fileToDataUrl(imageFile) : "";

  const parsed = productFormSchema.safeParse(fromForm(formData, uploadedImage));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.isFeatured) {
    const products = await storage().getProducts();
    for (const product of products) {
      if (product.isFeatured) {
        await storage().updateProduct(product.id, {
          ...product,
          isFeatured: false,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  const now = new Date().toISOString();
  const product = {
    id: uniqueId("prod"),
    slug: slugify(parsed.data.title),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  await storage().saveProduct(product);
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath(`/produit/${product.slug}`);

  return NextResponse.redirect(new URL("/admin/products", request.url));
}