import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/AddToCartForm";
import { storage } from "@/lib/storage";
import { euros } from "@/lib/utils";
import type { Product } from "@/lib/types";

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.solidaritecoeuractif.com";
const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Solidarité Cœur Actif";

function offerTypeLabel(type: Product["offerType"]) {
  switch (type) {
    case "product":
      return "Support solidaire";
    case "donation":
      return "Soutien libre";
    case "campaign":
      return "Collecte";
    case "participation":
      return "Participation";
    default:
      return "Offre";
  }
}

function absoluteImageUrl(image?: string | null) {
  if (!image) return undefined;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (image.startsWith("data:")) {
    return undefined;
  }
  return new URL(image, baseUrl).toString();
}

function productDescription(product: Product) {
  if (product.shortDescription?.trim()) {
    return product.shortDescription.trim();
  }

  return "Découvrez cette initiative solidaire proposée par Solidarité Cœur Actif.";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await storage().getProductBySlug(slug);

  if (!product || !product.isActive) {
    return {
      title: "Offre",
    };
  }

  const description = productDescription(product);
  const url = `${baseUrl}/produit/${product.slug}`;
  const imageUrl = absoluteImageUrl(product.image);

  return {
    title: product.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      siteName: brand,
      url,
      title: product.title,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: product.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: product.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await storage().getProductBySlug(slug);

  if (!product || !product.isActive) notFound();

  const amountText =
    product.pricingMode === "fixed"
      ? euros(product.fixedPrice || 0)
      : `À partir de ${euros(product.minimumAmount || 0)}`;

  return (
    <main className="product-page">
      <div className="container product-detail">
        <div className="panel product-media-panel">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="product-image product-detail-image"
            />
          ) : null}
        </div>

        <div className="panel product-content-panel">
          <span className="product-type">{offerTypeLabel(product.offerType)}</span>

          <h1>{product.title}</h1>

          {product.subtitle ? <p className="muted">{product.subtitle}</p> : null}

          <p className="product-detail-description">{product.longDescription}</p>

          <p className="product-price-highlight">
            <strong>{amountText}</strong>
          </p>

          <div className="product-detail-action">
            <AddToCartForm product={product} />
          </div>
        </div>
      </div>
    </main>
  );
}