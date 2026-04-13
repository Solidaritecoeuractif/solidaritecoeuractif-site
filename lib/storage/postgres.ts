import { Pool } from "pg";
import type { StorageAdapter } from "./base";
import type { Order, Product } from "@/lib/types";

function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL manquant pour le driver postgres.");
  }
  return new Pool({ connectionString: url });
}

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    shortDescription: row.short_description,
    longDescription: row.long_description,
    image: row.image ?? "",
    offerType: row.offer_type,
    pricingMode: row.pricing_mode,
    fixedPrice: row.fixed_price ?? undefined,
    minimumAmount: row.minimum_amount ?? undefined,
    suggestedAmount: row.suggested_amount ?? undefined,
    isActive: row.is_active,
    isPhysical: row.is_physical,
    requiresShipping: row.requires_shipping,
    shippingFeeAmount: row.shipping_fee_amount ?? undefined,
    isFeatured: row.is_featured ?? false,
    maxQuantity: row.max_quantity ?? undefined,
    stock: row.stock ?? undefined,
    sku: row.sku ?? "",
    weightGrams: row.weight_grams ?? undefined,
    category: row.category ?? "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function rowToOrder(row: any, items: any[]): Order {
  return {
    id: row.id,
    reference: row.reference,
    customer: {
      firstName: row.customer_first_name,
      lastName: row.customer_last_name,
      email: row.customer_email,
      phone: row.customer_phone
    },
    shippingAddress: row.shipping_country
      ? {
          country: row.shipping_country,
          address1: row.shipping_address1,
          address2: row.shipping_address2 ?? "",
          postalCode: row.shipping_postal_code,
          city: row.shipping_city,
          notes: row.shipping_notes ?? ""
        }
      : undefined,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id ?? undefined,
      productTitle: item.product_title,
      offerType: item.offer_type,
      pricingMode: item.pricing_mode,
      unitAmount: item.unit_amount,
      quantity: item.quantity,
      customAmount: item.custom_amount ?? undefined
    })),
    subtotalAmount: row.subtotal_amount,
    shippingAmount: row.shipping_amount,
    totalAmount: row.total_amount,
    paymentStatus: row.payment_status,
    logisticsStatus: row.logistics_status,
    stripeSessionId: row.stripe_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    currency: row.currency,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    exportedAt: row.exported_at ? row.exported_at.toISOString() : undefined
  };
}

export class PostgresStorageAdapter implements StorageAdapter {
  async seedIfNeeded() {
    return;
  }

  async getProducts() {
    const client = await pool().connect();
    try {
      const result = await client.query("select * from products order by created_at desc");
      return result.rows.map(rowToProduct);
    } finally {
      client.release();
    }
  }

  async getProductById(id: string) {
    const client = await pool().connect();
    try {
      const result = await client.query("select * from products where id = $1 limit 1", [id]);
      return result.rows[0] ? rowToProduct(result.rows[0]) : undefined;
    } finally {
      client.release();
    }
  }

  async getProductBySlug(slug: string) {
    const client = await pool().connect();
    try {
      const result = await client.query("select * from products where slug = $1 limit 1", [slug]);
      return result.rows[0] ? rowToProduct(result.rows[0]) : undefined;
    } finally {
      client.release();
    }
  }

  async saveProduct(product: Product) {
    const client = await pool().connect();
    try {
      await client.query(
        `insert into products (
          id, slug, title, subtitle, short_description, long_description, image, offer_type, pricing_mode,
          fixed_price, minimum_amount, suggested_amount, is_active, is_physical, requires_shipping,
          shipping_fee_amount, is_featured, max_quantity, stock, sku, weight_grams, category, created_at, updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        )`,
        [
          product.id,
          product.slug,
          product.title,
          product.subtitle || null,
          product.shortDescription,
          product.longDescription,
          product.image || null,
          product.offerType,
          product.pricingMode,
          product.fixedPrice ?? null,
          product.minimumAmount ?? null,
          product.suggestedAmount ?? null,
          product.isActive,
          product.isPhysical,
          product.requiresShipping,
          product.shippingFeeAmount ?? null,
          product.isFeatured ?? false,
          product.maxQuantity ?? null,
          product.stock ?? null,
          product.sku || null,
          product.weightGrams ?? null,
          product.category || null,
          product.createdAt,
          product.updatedAt
        ]
      );
      return product;
    } finally {
      client.release();
    }
  }

  async updateProduct(id: string, product: Product) {
    const client = await pool().connect();
    try {
      await client.query(
        `update products
         set slug=$2,title=$3,subtitle=$4,short_description=$5,long_description=$6,image=$7,offer_type=$8,pricing_mode=$9,fixed_price=$10,minimum_amount=$11,suggested_amount=$12,is_active=$13,is_physical=$14,requires_shipping=$15,shipping_fee_amount=$16,is_featured=$17,max_quantity=$18,stock=$19,sku=$20,weight_grams=$21,category=$22,updated_at=$23
         where id=$1`,
        [
          id,
          product.slug,
          product.title,
          product.subtitle || null,
          product.shortDescription,
          product.longDescription,
          product.image || null,
          product.offerType,
          product.pricingMode,
          product.fixedPrice ?? null,
          product.minimumAmount ?? null,
          product.suggestedAmount ?? null,
          product.isActive,
          product.isPhysical,
          product.requiresShipping,
          product.shippingFeeAmount ?? null,
          product.isFeatured ?? false,
          product.maxQuantity ?? null,
          product.stock ?? null,
          product.sku || null,
          product.weightGrams ?? null,
          product.category || null,
          product.updatedAt
        ]
      );
      return product;
    } finally {
      client.release();
    }
  }

  async deleteProduct(id: string) {
    const client = await pool().connect();
    try {
      await client.query("delete from products where id = $1", [id]);
    } finally {
      client.release();
    }
  }

  async getOrders() {
    const client = await pool().connect();
    try {
      const ordersRes = await client.query("select * from orders order by created_at desc");
      const itemsRes = await client.query("select * from order_items order by created_at desc");
      return ordersRes.rows.map((row) =>
        rowToOrder(row, itemsRes.rows.filter((item) => item.order_id === row.id))
      );
    } finally {
      client.release();
    }
  }

  async getOrderByReference(reference: string) {
    const client = await pool().connect();
    try {
      const orderRes = await client.query("select * from orders where reference = $1 limit 1", [reference]);
      if (!orderRes.rows[0]) return undefined;
      const itemsRes = await client.query(
        "select * from order_items where order_id = $1 order by created_at asc",
        [orderRes.rows[0].id]
      );
      return rowToOrder(orderRes.rows[0], itemsRes.rows);
    } finally {
      client.release();
    }
  }

  async saveOrder(order: Order) {
    const client = await pool().connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into orders (id, reference, customer_first_name, customer_last_name, customer_email, customer_phone, shipping_country, shipping_address1, shipping_address2, shipping_postal_code, shipping_city, shipping_notes, subtotal_amount, shipping_amount, total_amount, payment_status, logistics_status, stripe_session_id, stripe_payment_intent_id, currency, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [
          order.id,
          order.reference,
          order.customer.firstName,
          order.customer.lastName,
          order.customer.email,
          order.customer.phone,
          order.shippingAddress?.country ?? null,
          order.shippingAddress?.address1 ?? null,
          order.shippingAddress?.address2 ?? null,
          order.shippingAddress?.postalCode ?? null,
          order.shippingAddress?.city ?? null,
          order.shippingAddress?.notes ?? null,
          order.subtotalAmount,
          order.shippingAmount,
          order.totalAmount,
          order.paymentStatus,
          order.logisticsStatus,
          order.stripeSessionId ?? null,
          order.stripePaymentIntentId ?? null,
          order.currency,
          order.createdAt,
          order.updatedAt
        ]
      );
      for (const item of order.items) {
        await client.query(
          `insert into order_items (id, order_id, product_id, product_title, offer_type, pricing_mode, unit_amount, quantity, custom_amount, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            item.id,
            order.id,
            item.productId ?? null,
            item.productTitle,
            item.offerType,
            item.pricingMode,
            item.unitAmount,
            item.quantity,
            item.customAmount ?? null,
            order.createdAt
          ]
        );
      }
      await client.query("commit");
      return order;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrder(reference: string, order: Order) {
    const client = await pool().connect();
    try {
      await client.query(
        `update orders set payment_status=$2, logistics_status=$3, stripe_session_id=$4, stripe_payment_intent_id=$5, updated_at=$6 where reference=$1`,
        [
          reference,
          order.paymentStatus,
          order