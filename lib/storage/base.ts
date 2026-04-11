
import type { Order, Product } from "@/lib/types";

export type StoreData = {
  products: Product[];
  orders: Order[];
};

export interface StorageAdapter {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  saveProduct(product: Product): Promise<Product>;
  updateProduct(id: string, product: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  getOrders(): Promise<Order[]>;
  getOrderByReference(reference: string): Promise<Order | undefined>;
  saveOrder(order: Order): Promise<Order>;
  updateOrder(reference: string, order: Order): Promise<Order>;
  markOrdersExported(references: string[], exportedAt: string): Promise<void>;
  seedIfNeeded(): Promise<void>;
}
