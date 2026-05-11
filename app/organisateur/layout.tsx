import Link from "next/link";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ fontSize: "18px" }}>Espace organisateur</strong>
          <div style={{ color: "#64748b", fontSize: "14px", marginTop: "2px" }}>
            Gestion des billetteries
          </div>
        </div>

        <nav
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/organisateur/billetteries" className="button secondary">
            Mes billetteries
          </Link>

          <Link
            href="/organisateur/billetteries/nouvelle"
            className="button secondary"
          >
            Nouvelle billetterie
          </Link>

          <form action="/api/organisateur/deconnexion" method="post">
            <button type="submit" className="button secondary">
              Déconnexion
            </button>
          </form>
        </nav>
      </header>

      {children}
    </div>
  );
}