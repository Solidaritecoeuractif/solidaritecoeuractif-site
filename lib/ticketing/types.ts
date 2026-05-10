export type TicketingStatus = "draft" | "published" | "hidden" | "archived";

export type TicketingDurationType = "none" | "one_day" | "several_days";

export type TicketingRateType = "fixed" | "free_amount" | "free";

export type TicketingCustomFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "select"
  | "checkbox";

export type TicketingCustomFieldTarget = "payer" | "participant";

export type TicketingAccessStatus =
  | "pending_validation"
  | "active"
  | "blocked"
  | "deleted";

export type TicketingEvent = {
  id: string;
  slug: string;

  title: string;
  formTypeLabel?: string;

  status: TicketingStatus;
  isVisible: boolean;

  locationName?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  country?: string;

  durationType: TicketingDurationType;
  startsAt?: string;
  endsAt?: string;

  organizerEmail?: string;
  organizerPhone?: string;

  shortDescription?: string;
  longDescription?: string;

  primaryColor?: string;
  bannerImageUrl?: string;
  thumbnailImageUrl?: string;

  allowExtraDonation: boolean;
  suggestedDonationAmounts: number[];

  totalParticipantLimit?: number;
  salesOpenAt?: string;
  salesCloseAt?: string;

  confirmationEmailSubject?: string;
  confirmationEmailMessage?: string;
  confirmationEmailEnabled?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type TicketingRate = {
  id: string;
  eventId: string;

  name: string;
  description?: string;

  type: TicketingRateType;

  amount?: number;
  minimumAmount?: number;

  isActive: boolean;

  totalQuantityLimit?: number;
  quantityPerOrderLimit?: number;

  promoCodeEnabled?: boolean;
  promoCodePublic?: boolean;
  promoCode?: string;
  promoDiscountPercent?: number;

  createdAt: string;
  updatedAt: string;
};

export type TicketingCustomField = {
  id: string;
  eventId: string;

  label: string;
  fieldKey: string;

  type: TicketingCustomFieldType;
  target: TicketingCustomFieldTarget;

  isRequired: boolean;
  isActive: boolean;

  appliesToRateIds?: string[];
  options?: string[];

  position: number;

  createdAt: string;
  updatedAt: string;
};

export type TicketingParticipant = {
  id: string;
  eventId: string;
  rateId: string;

  firstName: string;
  lastName: string;

  answers: Record<string, string | boolean | number | null>;

  createdAt: string;
  updatedAt: string;
};

export type TicketingOrder = {
  id: string;
  eventId: string;
  reference: string;

  payerFirstName: string;
  payerLastName: string;
  payerEmail: string;
  payerPhone?: string;

  participants: TicketingParticipant[];

  subtotalAmount: number;
  extraDonationAmount: number;
  totalAmount: number;

  currency: string;

  paymentStatus: "pending" | "paid" | "cancelled";

  stripeSessionId?: string;
  stripePaymentIntentId?: string;

  confirmationEmailSentAt?: string;
  adminNotificationSentAt?: string;

  createdAt: string;
  updatedAt: string;
};

export type TicketingCollaboratorAccess = {
  id: string;
  eventId: string;

  email: string;
  displayName?: string;

  passwordHash?: string;

  status: TicketingAccessStatus;

  canEditEvent: boolean;
  canEditRates: boolean;
  canViewParticipants: boolean;
  canReceiveNotifications: boolean;

  validatedAt?: string;
  blockedAt?: string;
  deletedAt?: string;

  lastLoginAt?: string;

  createdAt: string;
  updatedAt: string;
};