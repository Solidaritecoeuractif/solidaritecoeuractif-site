export default function Page() {
  return (
    <main className="panel">
      <div
        style={{
          display: "grid",
          gap: "18px",
          maxWidth: "980px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 8px",
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Module séparé
          </p>

          <h1 style={{ margin: 0 }}>Billetteries</h1>
        </div>

        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "16px",
            padding: "18px",
            background: "#f8fafc",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Base préparatoire</h2>

          <p>
            Cette page prépare l’ajout futur d’un module de billetterie séparé
            du système actuel des offres, commandes, exports et paiements du
            livre.
          </p>

          <p>
            Pour l’instant, cette rubrique ne crée aucune billetterie, ne
            modifie aucune commande, ne touche pas au panier, ne modifie pas
            Stripe et n’écrit rien dans la base de données.
          </p>

          <p>
            La prochaine étape consistera à définir une structure dédiée aux
            billetteries, aux tarifs, aux participants et aux accès
            collaborateurs, sans impacter les fonctionnalités existantes.
          </p>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Objectifs du futur module</h2>

          <ul style={{ marginBottom: 0, paddingLeft: "20px", lineHeight: 1.7 }}>
            <li>Créer une ou plusieurs billetteries visibles ou masquées.</li>
            <li>Configurer les tarifs fixes, libres ou gratuits.</li>
            <li>Définir les dates, lieux, descriptions et limites de places.</li>
            <li>Recevoir les inscriptions et paiements liés aux billets.</li>
            <li>Envoyer des notifications email aux responsables autorisés.</li>
            <li>
              Donner un accès limité à un collègue sans accès à l’admin complet.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}