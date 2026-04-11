
import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/AddToCartForm";
import { storage } from "@/lib/storage";
import { euros } from "@/lib/utils";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await storage().getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  return (
    <main className="product-page">
      <div className="container product-detail">
        <div className="panel">{product.image ? <img src={product.image} alt={product.title} className="product-image" /> : null}</div>
        <div className="panel">
          <span className="product-type">{product.offerType}</span>
          <h1>{product.title}</h1>
          {product.subtitle ? <p className="muted">{product.subtitle}</p> : null}
          <p>{product.longDescription}</p>
          <p>
            <strong>
              {product.pricingMode === "fixed" ? euros(product.fixedPrice || 0) : `À partir de ${euros(product.minimumAmount || 0)}`}
            </strong>
          </p>
          <AddToCartForm product={product} />
        </div>
      </div>
    </main>
  );
}
