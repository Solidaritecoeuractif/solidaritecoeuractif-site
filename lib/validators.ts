import { z } from "zod";

export const groupedShippingSchema = z.object({
  enabled: z.boolean(),
  tiers: z.array(z.object({
    minQuantity: z.number().int().min(2).max(50),
    savingsAmount: z.number().int().positive().max(100000),
  })).min(1).max(8),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(600),
  footer: z.string().trim().max(600),
}).superRefine((config, ctx) => {
  config.tiers.forEach((tier, index) => {
    const previous = config.tiers[index - 1];
    if (previous && (tier.minQuantity <= previous.minQuantity || tier.savingsAmount < previous.savingsAmount)) {
      ctx.addIssue({ code: "custom", path: ["tiers", index], message: "Les seuils doivent augmenter et les économies ne doivent pas diminuer." });
    }
  });
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(50),
  customAmount: z.number().int().positive().optional()
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(3)
  }),
  shippingAddress: z
    .object({
      country: z.string().min(2),
      address1: z.string().min(1),
      address2: z.string().optional().default(""),
      postalCode: z.string().min(1),
      city: z.string().min(1),
      notes: z.string().optional().default("")
    })
    .optional(),
  supportEnabled: z.boolean().optional().default(true),
  supportAmount: z.number().int().nonnegative().optional().default(0),
  expectedTotalAmount: z.number().int().nonnegative().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const productFormSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().optional().default(""),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(20),
  image: z.string().optional().default(""),
  offerType: z.enum(["product", "donation", "campaign", "participation"]),
  pricingMode: z.enum(["fixed", "flexible"]),
  fixedPrice: z.number().int().nonnegative().optional(),
  minimumAmount: z.number().int().nonnegative().optional(),
  minimumAmountOutreMer: z.number().int().nonnegative().optional(),
  minimumAmountInternational: z.number().int().nonnegative().optional(),
  suggestedAmount: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
  isPhysical: z.boolean().default(false),
  requiresShipping: z.boolean().default(false),
  shippingFeeAmount: z.number().int().nonnegative().optional(),
  groupedShipping: groupedShippingSchema.optional(),
  isFeatured: z.boolean().default(false),
  maxQuantity: z.number().int().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().optional().default(""),
  weightGrams: z.number().int().nonnegative().optional(),
  category: z.string().optional().default("")
}).superRefine((product, ctx) => {
  const config = product.groupedShipping;
  if (!config?.enabled) return;
  if (!product.isPhysical || !product.requiresShipping || product.pricingMode !== "flexible") {
    ctx.addIssue({ code: "custom", path: ["groupedShipping"], message: "L’envoi groupé nécessite une offre physique à montant libre avec livraison." });
  }
  const base = Math.min(product.minimumAmount ?? 0, product.minimumAmountOutreMer ?? product.minimumAmount ?? 0, product.minimumAmountInternational ?? product.minimumAmount ?? 0);
  for (let index = 0; index < config.tiers.length; index++) {
    const tier = config.tiers[index];
    const previousSaving = config.tiers[index - 1]?.savingsAmount ?? 0;
    if (base <= 0 || tier.savingsAmount >= base * tier.minQuantity || tier.savingsAmount - previousSaving > base) {
      ctx.addIssue({ code: "custom", path: ["groupedShipping", "tiers", index], message: "L’économie doit conserver un montant d’envoi positif et un total croissant avec la quantité, dans chaque zone." });
    }
  }
});
