import type { Product } from "@/lib/types";
import { uniqueId } from "@/lib/utils";

const now = new Date().toISOString();

export const seedProducts: Product[] = [
  {
    id: uniqueId("prod"),
    slug: "365-jours-avec-le-seigneur-jesus-christ",
    title: "365 jours avec le Seigneur Jésus-Christ",
    subtitle: "Livre imprimé – envoi avec participation aux frais de livraison",
    shortDescription:
      "Un support imprimé pour accompagner la prière quotidienne, disponible en demande simple ou multiple.",
    longDescription:
      "Ce livre imprimé accompagne la prière quotidienne. Il peut être demandé en un ou plusieurs exemplaires, avec prise en compte de l’adresse de réception et des frais liés à l’envoi.",
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
    offerType: "product",
    pricingMode: "fixed",
    fixedPrice: 1000,
    minimumAmount: 1000,
    suggestedAmount: 1000,
    isActive: true,
    isPhysical: true,
    requiresShipping: true,
    maxQuantity: 10,
    stock: 5000,
    sku: "BOOK-365",
    weightGrams: 600,
    category: "Supports imprimés",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uniqueId("prod"),
    slug: "soutien-impression-livre",
    title: "Soutenir l’impression du livre",
    subtitle: "Participation libre avec minimum",
    shortDescription:
      "Participation libre pour aider à l’impression de nouveaux exemplaires.",
    longDescription:
      "Cette proposition permet de soutenir l’impression du livre au montant de votre choix, avec un minimum défini, dans l’esprit d’une participation libre et solidaire.",
    image:
      "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
    offerType: "participation",
    pricingMode: "flexible",
    minimumAmount: 500,
    suggestedAmount: 1500,
    isActive: true,
    isPhysical: false,
    requiresShipping: false,
    maxQuantity: 1,
    sku: "SUPPORT-PRINT",
    category: "Soutiens",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uniqueId("prod"),
    slug: "don-libre-solidarite-coeur-actif",
    title: "Don libre Solidarité Cœur Actif",
    subtitle: "Soutien général à l’association",
    shortDescription:
      "Participation libre pour soutenir les actions solidaires de l’association.",
    longDescription:
      "Le don libre permet de soutenir l’ensemble des actions menées par Solidarité Cœur Actif auprès des personnes en situation de précarité et de vulnérabilité, sans nécessité d’envoi.",
    image:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
    offerType: "donation",
    pricingMode: "flexible",
    minimumAmount: 100,
    suggestedAmount: 2000,
    isActive: true,
    isPhysical: false,
    requiresShipping: false,
    maxQuantity: 1,
    sku: "DON-GENERAL",
    category: "Dons",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uniqueId("prod"),
    slug: "campagne-bibliotheque-solidaire",
    title: "Campagne Bibliothèque solidaire",
    subtitle: "Collecte dédiée",
    shortDescription:
      "Action de collecte destinée à soutenir une diffusion plus large des ouvrages.",
    longDescription:
      "Cette collecte dédiée aide à soutenir une action solidaire spécifique autour de la diffusion des ouvrages et de l’accompagnement des personnes qui en ont besoin.",
    image:
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80",
    offerType: "campaign",
    pricingMode: "flexible",
    minimumAmount: 500,
    suggestedAmount: 2500,
    isActive: true,
    isPhysical: false,
    requiresShipping: false,
    maxQuantity: 1,
    sku: "CAMPAIGN-LIB",
    category: "Collectes",
    createdAt: now,
    updatedAt: now,
  },
];