
import { JsonStorageAdapter } from "./json";
import { PostgresStorageAdapter } from "./postgres";
import type { StorageAdapter } from "./base";

let adapter: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (adapter) return adapter;
  adapter = process.env.STORAGE_DRIVER === "postgres" ? new PostgresStorageAdapter() : new JsonStorageAdapter();
  return adapter;
}
