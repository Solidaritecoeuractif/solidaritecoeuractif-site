export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="page-card">
      <h1>Commande confirmée</h1>
      <p>Merci. Le paiement a été reçu et votre commande a bien été enregistrée.</p>
      {params.reference ? (
        <p>
          <strong>Référence :</strong> {params.reference}
        </p>
      ) : null}
      <p>
        Un email de confirmation avec votre attestation de paiement vous sera
        envoyé. Pour les produits physiques, les informations de livraison vous
        seront communiquées par mail ou par SMS.
      </p>
      <p>Dieu vous bénisse.</p>
    </main>
  );
}