import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/AddToCartForm";
import { storage } from "@/lib/storage";
import { euros } from "@/lib/utils";
import type { Product } from "@/lib/types";

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

  return {
    title: product.title,
    description:
      "Recevez le livre 365 jours avec le Seigneur Jésus-Christ et soutenez une initiative solidaire pour accompagner la prière au quotidien.",
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