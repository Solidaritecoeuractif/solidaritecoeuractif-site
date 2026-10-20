export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <main>
      <Hero featuredProduct={featuredProduct} />

      <div className="solidarity-ribbon"><div className="container"><span>Accueillir</span><span aria-hidden="true">✳</span><span>Partager</span><span aria-hidden="true">✳</span><span>Agir ensemble</span></div></div>

      <section className="catalog-section" id="catalogue">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Des gestes qui nous rapprochent</span>
              <h2>Une intention.<br /><em>Une action concrète.</em></h2>
              <p>
                Découvrez les initiatives de l’association et choisissez la
                manière dont vous souhaitez y prendre part.
              </p>
            </div>
          </div>

          <div className={`product-grid${products.length === 1 ? " product-grid-single" : ""}`}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
      <section className="solidarity-steps"><div className="container">
        <div className="section-heading"><div><span className="eyebrow">Simplement, à votre rythme</span><h2>Chaque geste a sa place.</h2></div></div>
        <ol>
          <li><span>01</span><h3>Découvrez</h3><p>Chaque initiative présente son intention, son contenu et ses conditions de participation.</p></li>
          <li><span>02</span><h3>Choisissez</h3><p>Consultez les détails de votre participation. Les frais de traitement et d’expédition applicables sont précisés dans le parcours.</p></li>
          <li><span>03</span><h3>Gardons le lien</h3><p>Une question sur un livre ou sur l’association ? Nous sommes là pour vous répondre.</p></li>
        </ol>
      </div></section>
      <section className="solidarity-contact"><div className="container"><div><span className="eyebrow">Le dialogue fait aussi partie du chemin</span><h2>Une question ?<br /><em>Parlons-en.</em></h2></div><Link className="button primary" href="/contact">Contacter l’association <span aria-hidden="true">↗</span></Link></div></section>
    </main>
  );
}
