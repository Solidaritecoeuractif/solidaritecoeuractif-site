export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { storage } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Solidarité Cœur Actif : actions de soutien, collectes solidaires et participation au service des personnes en situation de précarité.",
};

export default async function HomePage() {
  await storage().seedIfNeeded();
  const products = (await storage().getProducts()).filter(
    (product) => product.isActive
  );

  const featuredProduct =
    products.find((product) => product.isFeatured) || products[0];

  const stats = {
    totalActiveProducts: products.length,
    totalPhysicalProducts: products.filter((item) => item.isPhysical).length,
    totalFlexibleOffers: products.filter(
      (item) => item.pricingMode === "flexible"
    ).length,
  };

  return (
    <main>
      <Hero featuredProduct={featuredProduct} />

      <section className="stats-grid">
        <article className="stat-card">
          <span>Actions disponibles</span>
          <strong>{stats.totalActiveProducts}</strong>
        </article>

        <article className="stat-card">
          <span>Supports imprimés</span>
          <strong>{stats.totalPhysicalProducts}</strong>
        </article>

        <article className="stat-card">
          <span>Participations libres</span>
          <strong>{stats.totalFlexibleOffers}</strong>
        </article>
      </section>

      <section className="catalog-section" id="catalogue">
        <div className="container">
          <div className="section-heading">
            <div>
              <h2>Actions et soutiens</h2>
              <p>
                Retrouvez ici les initiatives de l’association, les soutiens
                solidaires, les collectes et les participations proposées pour
                accompagner nos actions auprès des personnes en situation de
                précarité et de vulnérabilité.
              </p>
            </div>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}