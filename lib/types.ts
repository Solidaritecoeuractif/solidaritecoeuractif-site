export type OfferType = "product" | "donation" | "campaign" | "participation";
export type PricingMode = "fixed" | "flexible";
export type PaymentStatus = "pending" | "paid" | "cancelled";
export type LogisticsStatus =
  | "to_process"
  | "prepared"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  shortDescription: string;
  longDescription: string;
  image?: string;
  offerType: OfferType;
  pricingMode: PricingMode;
  fixedPrice?: number;
  minimumAmount?: number;
  suggestedAmount?: number;
  isActive: boolean;
  isPhysical: boolean;
  requiresShipping: boolean;
  shippingFeeAmount?: number;
  maxQuantity?: number;
  stock?: number;
  sku?: string;
  weightGrams?: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

export type CartItemInput = {
  productId: string;
  quantity: number;
  customAmount?: number;
};

export type Customer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type Address = {
  country: string;
  address1: string;
  address2?: string;
  postalCode: string;
  city: string;
  notes?: string;
};

export type OrderItem = {
  id: string;
  productId?: string;
  productTitle: string;
  offerType: OfferType;
  pricingMode: PricingMode;
  unitAmount: number;
  quantity: number;
  customAmount?: number;
};

export type Order = {
  id: string;
  reference: string;
  customer: Customer;
  shippingAddress?: Address;
  items: OrderItem[];
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  logisticsStatus: LogisticsStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
  emailSentAt?: string;
  paymentReceiptSentAt?: string;
};

export type CatalogStats = {
  totalActiveProducts: number;
  totalPhysicalProducts: number;
  totalFlexibleOffers: number;
};