export default function Page() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com";
  return (
    <main className="legal-card">
      <h1>Contact</h1>
      <p>Pour toute question, utilisez l’adresse de support suivante : {email}.</p>
    </main>
  );
}
