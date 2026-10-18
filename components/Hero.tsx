import type { Product } from "@/lib/types";
import Link from "next/link";

export function Hero({ featuredProduct }: { featuredProduct?: Product }) {
  return (
    <section className="hero solidarity-hero">
      <div className="container hero-grid">
        <div className="solidarity-intro">
          <span className="eyebrow">Solidarité Cœur Actif · Association</span>
          <h1>
            La solidarité<br />prend vie<br /><em>avec vous.</em>
          </h1>
          <p>
            Un livre à partager, une attention à offrir, une initiative à soutenir.
            Ensemble, faisons une place à celles et ceux qui en ont besoin.
          </p>
          <div className="solidarity-actions">
            <a className="button primary" href="#catalogue">Découvrir nos initiatives <span aria-hidden="true">↗</span></a>
            <Link className="solidarity-text-link" href="/contact">Échangeons ensemble <span aria-hidden="true">→</span></Link>
          </div>
          <p className="solidarity-mission">Aux côtés des personnes en situation de précarité et de vulnérabilité.</p>
        </div>

        <div className="solidarity-feature">
          {featuredProduct ? (
            <>
              <span className="solidarity-feature-label">À découvrir en ce moment</span>
              <Link className="solidarity-book-stage" href={`/produit/${featuredProduct.slug}`} aria-label={`Découvrir ${featuredProduct.title}`}>
                {featuredProduct.image ? <img src={featuredProduct.image} alt={featuredProduct.title} width={280} height={380} fetchPriority="high" /> : <span className="solidarity-feature-placeholder">Un geste.<br />Du cœur.</span>}
              </Link>
              <div className="solidarity-feature-caption">
                <div><span>Notre initiative à la une</span><h2><Link href={`/produit/${featuredProduct.slug}`}>{featuredProduct.title}</Link></h2></div>
                <Link className="solidarity-round-link" href={`/produit/${featuredProduct.slug}`} aria-label={`Voir l’initiative : ${featuredProduct.title}`}>↗</Link>
              </div>
            </>
          ) : (
            <>
              <p className="solidarity-feature-placeholder">De l’attention.<br />Des liens.<br />De l’espoir.</p>
              <Link className="button secondary" href="/contact">Rencontrons-nous</Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
