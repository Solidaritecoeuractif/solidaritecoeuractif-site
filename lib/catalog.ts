
import type { Product } from "@/lib/types";
import { uniqueId } from "@/lib/utils";

const now = new Date().toISOString();

export const seedProducts: Product[] = [
  {
    id: uniqueId("prod"),
    slug: "365-jours-avec-le-seigneur-jesus-christ",
    title: "365 jours avec le Seigneur Jésus-Christ",
    subtitle: "Livre imprimé – envoi avec participation aux frais de livraison",
    shortDescription: "Le livre imprimé phare de la mission, en commande simple ou multiple.",
    longDescription:
      "Ce livre imprimé accompagne la prière quotidienne. Il peut être commandé en plusieurs exemplaires, avec gestion d'adresse et de livraison.",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
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
    category: "Livres",
    createdAt: now,
    updatedAt: now
  },
  {
    id: uniqueId("prod"),
    slug: "soutien-impression-livre",
    title: "Soutenir l’impression du livre",
    subtitle: "Participation libre avec minimum",
    shortDescription: "Contribution libre pour soutenir l'impression de nouveaux exemplaires.",
    longDescription:
      "Cette offre permet de soutenir le projet au montant de votre choix, avec un minimum défini, dans l'esprit d'une participation libre.",
    image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
    offerType: "participation",
    pricingMode: "flexible",
    minimumAmount: 500,
    suggestedAmount: 1500,
    isActive: true,
    isPhysical: false,
    requiresShipping: false,
    maxQuantity: 1,
    sku: "SUPPORT-PRINT",
    category: "Soutien",
    createdAt: now,
    updatedAt: now
  },
  {
    id: uniqueId("prod"),
    slug: "don-libre-solidarite-coeur-actif",
    title: "Don libre Solidarité Cœur Actif",
    subtitle: "Soutien général à l’œuvre",
    shortDescription: "Don libre pour soutenir la mission et les actions caritatives.",
    longDescription:
      "Le don libre sert à soutenir l'ensemble des projets portés par Solidarité Cœur Actif, sans nécessité de livraison.",
    image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
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
    updatedAt: now
  },
  {
    id: uniqueId("prod"),
    slug: "campagne-bibliotheque-solidaire",
    title: "Campagne Bibliothèque solidaire",
    subtitle: "Collecte caritative dédiée",
    shortDescription: "Campagne spéciale pour financer une diffusion élargie des ouvrages.",
    longDescription:
      "Collecte dédiée permettant d'alimenter une campagne caritative spécifique et visible comme telle dans le catalogue.",
    image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80",
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
    updatedAt: now
  }
];
