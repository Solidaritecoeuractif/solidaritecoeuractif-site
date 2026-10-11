import { Pool } from "pg";

export type DigitalVisibility = { ready: boolean; enabled: boolean };
const KEY = "sevlogos_365_digital_discovery";
let sharedPool: Pool | null = null;

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Database is unavailable");
  if (!sharedPool) sharedPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 10000,
  });
  return sharedPool;
}

// If the table is missing, the database fails or the flag is not literally
// true, NO public page may render the digital promotion.
export async function readDigitalVisibility(): Promise<DigitalVisibility> {
  try {
    const { rows } = await database().query<{ enabled: boolean }>(
      "SELECT enabled FROM sca_publication_controls WHERE feature_key = $1",
      [KEY]
    );
    return { ready: true, enabled: rows[0]?.enabled === true };
  } catch {
    return { ready: false, enabled: false };
  }
}

export async function writeDigitalVisibility(next: boolean): Promise<void> {
  if (typeof next !== "boolean") throw new Error("Invalid flag");
  await database().query(
    "INSERT INTO sca_publication_controls (feature_key,enabled,updated_at) " +
    "VALUES ($1,$2,now()) ON CONFLICT (feature_key) " +
    "DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()",
    [KEY, next]
  );
}
