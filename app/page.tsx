
import { Hero } from "@/components/Hero";
import { ProductCard } from "@/components/ProductCard";
import { storage } from "@/lib/storage";

export default async function HomePage() {
  await storage().seedIfNeeded();
  const products = (await storage().getProducts()).filter((product) => product.isActive);
  const stats = {
    totalActiveProducts: products.length,
    totalPhysicalProducts: products.filter((item) => item.isPhysical).length,
    totalFlexibleOffers: products.filter((item) => item.pricingMode === "flexible").length
  };

  return (
    <main>
      <Hero />
      <section className="stats-grid">
        <article className="stat-card"><span>Offres actives</span><strong>{stats.totalActiveProducts}</strong></article>
        <article className="stat-card"><span>Produits physiques</span><strong>{stats.totalPhysicalProducts}</strong></article>
        <article className="stat-card"><span>Offres flexibles</span><strong>{stats.totalFlexibleOffers}</strong></article>
      </section>
      <section className="catalog-section" id="catalogue">
        <div className="container">
          <div className="section-heading">
            <div>
              <h2>Catalogue</h2>
              <p>Produits, dons, collectes et participations libres réunis dans une plateforme unique.</p>
            </div>
          </div>
          <div className="product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
