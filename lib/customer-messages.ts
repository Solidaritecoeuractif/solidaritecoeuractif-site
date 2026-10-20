import { z } from "zod";

export const DEFAULT_DELIVERY_MESSAGE = "Le délai estimé de réception est de 3 à 15 jours à compter de la confirmation de votre paiement. Ce délai comprend le traitement de votre demande, l’expédition et l’acheminement de votre colis. Il peut varier selon la destination et le volume des demandes. Les informations de suivi vous seront communiquées dès leur disponibilité.";

export const customerMessagesSchema = z.object({
  deliveryMessage: z.string().trim().min(1, "Le message ne peut pas être vide.").max(2000, "Le message ne doit pas dépasser 2 000 caractères."),
});

export type CustomerMessages = z.infer<typeof customerMessagesSchema>;

export const DEFAULT_CUSTOMER_MESSAGES: CustomerMessages = {
  deliveryMessage: DEFAULT_DELIVERY_MESSAGE,
};
