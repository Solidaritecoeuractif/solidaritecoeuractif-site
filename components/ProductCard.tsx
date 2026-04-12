import Link from "next/link";
import type { Product } from "@/lib/types";
import { euros } from "@/lib/utils";

function amountText(product: Product) {
  if (product.pricingMode === "fixed") {
    return euros(product.fixedPrice || 0);
  }
  return `Participation à partir de ${euros(product.minimumAmount || 0)}`;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      {product.image ? (
        <img
          src={product.image}
          alt={product.title}
          className="product-image"
        />
      ) : null}

      <div className="product-body">
        <span className="product-type">{label(product.offerType)}</span>
        <h3>{product.title}</h3>
        <p>{product.shortDescription}</p>

        <div className="product-footer">
          <strong>{amountText(product)}</strong>
          <Link
            href={`/produit/${product.slug}`}
            className="button secondary small"
          >
            Découvrir
          </Link>
        </div>
      </div>
    </article>
  );
}

function label(type: Product["offerType"]) {
  switch (type) {
    case "product":
      return "Support solidaire";
    case "donation":
      return "Soutien libre";
    case "campaign":
      return "Collecte";
    case "participation":
      return "Participation";
  }
}