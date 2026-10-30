import { redirect } from "next/navigation";
import { storage } from "@/lib/storage";
import { legacyQualimReturnPath } from "@/lib/qualim-return";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const params = await searchParams;
  const reference = String(params.reference || "").trim();
  let returnPath: string | null = null;
  if (reference && reference.length <= 120) {
    try {
      const order = await storage().getOrderByReference(reference);
      returnPath = legacyQualimReturnPath(reference, order);
    } catch {
      // A lookup failure must not claim that an order has been paid.
    }
  }
  if (returnPath) redirect(returnPath);

  return (
    <main className="page-card">
      <h1>Vérification de votre commande</h1>
      <p>La confirmation de votre paiement n’est pas encore disponible. Ne recommencez pas le paiement ; vous pouvez vérifier de nouveau cette page.</p>
      {reference && reference.length <= 120 ? <a href={`/confirmation?reference=${encodeURIComponent(reference)}`}>Vérifier de nouveau</a> : <a href="/">Revenir à l’accueil</a>}
    </main>
  );
}
