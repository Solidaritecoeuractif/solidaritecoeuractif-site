import TicketingDraftClient from "@/components/TicketingDraftClient";
import { ticketingStorage } from "@/lib/ticketing";

export default async function Page() {
  const events = await ticketingStorage().getTicketingEvents();

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
            Configuration des billetteries du site. Ce module reste séparé des
            commandes, offres, exports et paiements existants du livre.
          </p>
        </div>

        <TicketingDraftClient initialEvents={events} />
      </div>
    </main>
  );
}