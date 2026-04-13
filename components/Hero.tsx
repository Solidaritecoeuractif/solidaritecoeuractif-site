import type { Product } from "@/lib/types";
import { AddToCartForm } from "@/components/AddToCartForm";

export function Hero({ featuredProduct }: { featuredProduct?: Product }) {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">Association solidaire</span>
          <h1>
            Actions de solidarité, soutiens, collectes et participations au service
            des personnes en situation de précarité et de vulnérabilité
          </h1>
          <p>
            Cette plateforme permet de présenter les actions de l’association,
            d’accueillir des soutiens, d’organiser des collectes et de proposer des
            participations, notamment pour les frais de livraison et certaines
            initiatives solidaires, dans un cadre clair et sécurisé.
          </p>
        </div>

        <div className="hero-card">
          {featuredProduct ? (
            <>
              {featuredProduct.image ? (
                <img
                  src={featuredProduct.image}
                  alt={featuredProduct.title}
                  className="product-image"
                  style={{ marginBottom: 16 }}
                />
              ) : null}

              <h3>{featuredProduct.title}</h3>

              {featuredProduct.subtitle ? (
                <p className="muted" style={{ marginBottom: 8 }}>
                  {featuredProduct.subtitle}
                </p>
              ) : null}

              <p style={{ marginBottom: 16 }}>{featuredProduct.longDescription}</p>

              <AddToCartForm product={featuredProduct} />
            </>
          ) : (
            <>
              <h3>Aucune offre mise en avant</h3>
              <p>Sélectionne une offre depuis l’administration pour l’afficher ici.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}