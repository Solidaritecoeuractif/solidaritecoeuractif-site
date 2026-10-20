import CustomerMessagesForm from "@/components/CustomerMessagesForm";
import { customerMessagesSchema, DEFAULT_CUSTOMER_MESSAGES } from "@/lib/customer-messages";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const saved = customerMessagesSchema.safeParse(await storage().getCustomerMessages());
  return (
    <section className="panel">
      <h1>Messages clients</h1>
      <p>Personnalisez les informations de livraison du courriel de confirmation de paiement envoyé par Solidarité Cœur Actif.</p>
      <CustomerMessagesForm initialValue={saved.success ? saved.data : DEFAULT_CUSTOMER_MESSAGES} />
    </section>
  );
}
