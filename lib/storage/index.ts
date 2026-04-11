import { JsonStorageAdapter } from "./json";
import type { StorageAdapter } from "./base";

let adapter: StorageAdapter | null = null;

export function storage(): StorageAdapter {
  if (adapter) return adapter;

  if (process.env.STORAGE_DRIVER === "postgres") {
    // Chargement dynamique pour éviter que Vercel tente de builder Postgres
    // quand on utilise simplement STORAGE_DRIVER=json
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PostgresStorageAdapter } = require("./postgres");
    adapter = new PostgresStorageAdapter();
    return adapter;
  }

  adapter = new JsonStorageAdapter();
  return adapter;
}