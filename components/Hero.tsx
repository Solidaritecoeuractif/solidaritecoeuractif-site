export function Hero() {
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
          <h3>Cette plateforme permet notamment</h3>
          <ul>
            <li>De présenter les actions et initiatives de l’association</li>
            <li>D’accueillir des participations libres ou définies</li>
            <li>De soutenir des collectes solidaires</li>
            <li>De gérer des contributions sécurisées</li>
            <li>De suivre les demandes et les participations</li>
            <li>D’organiser les envois liés aux supports proposés</li>
          </ul>
        </div>
      </div>
    </section>
  );
}