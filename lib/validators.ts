import { z } from "zod";

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
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const productFormSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().optional().default(""),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(20),
  image: z.string().url().optional().or(z.literal("")),
  offerType: z.enum(["product", "donation", "campaign", "participation"]),
  pricingMode: z.enum(["fixed", "flexible"]),
  fixedPrice: z.number().int().nonnegative().optional(),
  minimumAmount: z.number().int().nonnegative().optional(),
  suggestedAmount: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
  isPhysical: z.boolean().default(false),
  requiresShipping: z.boolean().default(false),
  shippingFeeAmount: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().default(false),
  maxQuantity: z.number().int().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  sku: z.string().optional().default(""),
  weightGrams: z.number().int().nonnegative().optional(),
  category: z.string().optional().default("")
});