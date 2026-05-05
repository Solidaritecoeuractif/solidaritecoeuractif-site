import TicketingDraftClient from "@/components/TicketingDraftClient";

export default function Page() {
  return (
    <main className="panel">
      <div
        style={{
          display: "grid",
          gap: "18px",
          maxWidth: "1180px",
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

          <p style={{ color: "#64748b", maxWidth: "760px" }}>
            Première maquette locale de configuration d’une billetterie. Cette
            étape prépare l’interface sans encore enregistrer les données en base
            et sans toucher aux commandes existantes.
          </p>
        </div>

        <TicketingDraftClient />
      </div>
    </main>
  );
}