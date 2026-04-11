import { JsonStorageAdapter } from "./json";
import type { StorageAdapter } from "./base";

let adapter: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (adapter) return adapter;

  if (process.env.STORAGE_DRIVER === "postgres") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresStorageAdapter } = require("./postgres");
    const postgresAdapter: StorageAdapter = new PostgresStorageAdapter();
    adapter = postgresAdapter;
    return postgresAdapter;
  }

  const jsonAdapter: StorageAdapter = new JsonStorageAdapter();
  adapter = jsonAdapter;
  return jsonAdapter;
}