import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { storage } from "@/lib/storage";
import { productFormSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

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

function fromForm(data: FormData, fallbackImage: string) {
  return {
    title: String(data.get("title") || ""),
    subtitle: String(data.get("subtitle") || ""),
    shortDescription: String(data.get("shortDescription") || ""),
    longDescription: String(data.get("longDescription") || ""),
    image: fallbackImage,
    offerType: String(data.get("offerType") || "product"),
    pricingMode: String(data.get("pricingMode") || "fixed"),
    fixedPrice: Number(data.get("fixedPrice") || 0),
    minimumAmount: Number(data.get("minimumAmount") || 0),
    suggestedAmount: Number(data.get("suggestedAmount") || 0),
    isActive: data.get("isActive") === "on",
    isPhysical: data.get("isPhysical") === "on",
    requiresShipping: data.get("requiresShipping") === "on",
    shippingFeeAmount: Number(data.get("shippingFeeAmount") || 0) || undefined,
    isFeatured: data.get("isFeatured") === "on",
    maxQuantity: Number(data.get("maxQuantity") || 0) || undefined,
    stock: Number(data.get("stock") || 0) || undefined,
    sku: String(data.get("sku") || ""),
    weightGrams: parseWeightGrams(data),
    category: String(data.get("category") || ""),
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const method =
      String(formData.get("_method") || "").toLowerCase() ||
      new URL(request.url).searchParams.get("_method")?.toLowerCase() ||
      "post";

    if (method === "delete") {
      await storage().deleteProduct(id);
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/admin/products");
      return NextResponse.redirect(new URL("/admin/products", request.url), 303);
    }

    const current = await storage().getProductById(id);

    if (!current) {
      return NextResponse.redirect(new URL("/admin/products", request.url), 303);
    }

    const imageFile = formData.get("imageFile");
    const uploadedImage =
      imageFile instanceof File ? await fileToDataUrl(imageFile) : "";
    const finalImage = uploadedImage || current.image || "";

    const parsed = productFormSchema.safeParse(fromForm(formData, finalImage));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.isFeatured) {
      const products = await storage().getProducts();

      for (const product of products) {
        if (product.id !== id && product.isFeatured) {
          await storage().updateProduct(product.id, {
            ...product,
            isFeatured: false,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    const updated = {
      ...current,
      ...parsed.data,
      slug: slugify(parsed.data.title),
      updatedAt: new Date().toISOString(),
    };

    await storage().updateProduct(id, updated);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath(`/produit/${current.slug}`);
    revalidatePath(`/produit/${updated.slug}`);

    return NextResponse.redirect(new URL("/admin/products", request.url), 303);
  } catch (error) {
    console.error("Erreur update produit:", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le produit." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await storage().deleteProduct(id);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur suppression produit:", error);
    return NextResponse.json(
      { error: "Impossible de supprimer le produit." },
      { status: 500 }
    );
  }
}