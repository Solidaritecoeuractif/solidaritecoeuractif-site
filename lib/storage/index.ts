import type { StorageAdapter } from "./base";

let adapter: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (adapter !== null) {
    return adapter;
  }

  const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase();

  if (driver === "postgres") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresStorageAdapter } = require("./postgres");
    adapter = new PostgresStorageAdapter() as StorageAdapter;
    return adapter;
  }

  const isProduction =
    process.env.NODE_ENV === "production" || !!process.env.VERCEL;

  if (isProduction) {
    throw new Error(
      `Invalid STORAGE_DRIVER in production: "${process.env.STORAGE_DRIVER ?? ""}". Expected "postgres".`
    );
  }

  // JSON autorisé seulement en local/dev
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JsonStorageAdapter } = require("./json");
  adapter = new JsonStorageAdapter() as StorageAdapter;
  return adapter;
}