
export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const params = await searchParams;
  return (
    <main className="page-card">
      <h1>Commande confirmée</h1>
      <p>Merci. Le paiement a été reçu. Votre commande a bien été enregistrée.</p>
      {params.reference ? <p><strong>Référence :</strong> {params.reference}</p> : null}
      <p>Vous pourrez désormais traiter cette commande depuis l’espace admin.</p>
    </main>
  );
}
