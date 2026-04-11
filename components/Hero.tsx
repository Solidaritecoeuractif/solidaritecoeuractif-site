
export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">Plateforme premium</span>
          <h1>Produits, dons, collectes et commandes avec paiement sécurisé</h1>
          <p>
            Une base professionnelle pour vendre, recevoir des participations libres,
            soutenir une œuvre et traiter les commandes avec une logique claire de livraison.
          </p>
          <div className="hero-actions">
            <a href="#catalogue" className="button primary">Voir le catalogue</a>
            <a href="/panier" className="button secondary">Ouvrir le panier</a>
          </div>
        </div>
        <div className="hero-card">
          <h3>Ce site gère déjà</h3>
          <ul>
            <li>Panier multi-produits et multi-quantités</li>
            <li>Prix fixe et montant libre minimum</li>
            <li>Dons et collectes caritatives</li>
            <li>Stripe Checkout et webhook</li>
            <li>Exports CSV et Excel</li>
            <li>Base prête pour Chronopost</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
