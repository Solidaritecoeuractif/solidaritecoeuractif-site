
import { promises as fs } from "node:fs";
import path from "node:path";
import { seedProducts } from "@/lib/catalog";
import type { Order, Product } from "@/lib/types";
import type { StorageAdapter, StoreData } from "./base";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const payload: StoreData = { products: seedProducts, orders: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreData> {
  await ensureFile();
  const content = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(content) as StoreData;
}

async function writeStore(data: StoreData) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export class JsonStorageAdapter implements StorageAdapter {
  async seedIfNeeded() {
    await ensureFile();
  }

  async getProducts() {
    return (await readStore()).products;
  }

  async getProductById(id: string) {
    return (await readStore()).products.find((product) => product.id === id);
  }

  async getProductBySlug(slug: string) {
    return (await readStore()).products.find((product) => product.slug === slug);
  }

  async saveProduct(product: Product) {
    const store = await readStore();
    store.products.push(product);
    await writeStore(store);
    return product;
  }

  async updateProduct(id: string, product: Product) {
    const store = await readStore();
    store.products = store.products.map((entry) => (entry.id === id ? product : entry));
    await writeStore(store);
    return product;
  }

  async deleteProduct(id: string) {
    const store = await readStore();
    store.products = store.products.filter((product) => product.id !== id);
    await writeStore(store);
  }

  async getOrders() {
    return (await readStore()).orders;
  }

  async getOrderByReference(reference: string) {
    return (await readStore()).orders.find((order) => order.reference === reference);
  }

  async saveOrder(order: Order) {
    const store = await readStore();
    store.orders.push(order);
    await writeStore(store);
    return order;
  }

    async updateOrder(reference: string, order: Order) {
    const store = await readStore();
    store.orders = store.orders.map((entry) => (entry.reference === reference ? order : entry));
    await writeStore(store);
    return order;
  }

  async markOrdersExported(references: string[], exportedAt: string) {
    const store = await readStore();
    store.orders = store.orders.map((order) =>
      references.includes(order.reference)
        ? { ...order, exportedAt, updatedAt: new Date().toISOString() }
        : order
    );
    await writeStore(store);
  }
}
