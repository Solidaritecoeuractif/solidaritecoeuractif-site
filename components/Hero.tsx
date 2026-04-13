import Link from "next/link";
import type { Product } from "@/lib/types";

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
          <div className="hero-actions">
            <a href="#catalogue" className="button primary">
              Découvrir les actions
            </a>
            <a href="/panier" className="button secondary">
              Voir le panier
            </a>
          </div>
        </div>

        <div className="hero-card">
          {featuredProduct ? (
            <>
              <h3>Offre mise en avant</h3>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>
                {featuredProduct.title}
              </p>
              {featuredProduct.subtitle ? (
                <p style={{ marginBottom: 8 }}>{featuredProduct.subtitle}</p>
              ) : null}
              <p style={{ marginBottom: 12 }}>
                {featuredProduct.shortDescription}
              </p>
              <Link
                href={`/produit/${featuredProduct.slug}`}
                className="button primary"
              >
                Voir cette offre
              </Link>
            </>
          ) : (
            <>
              <h3>Aucune offre mise en avant</h3>
              <p>
                Sélectionne une offre depuis l’administration pour l’afficher ici.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}