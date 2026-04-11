import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const seed = {
  products: [],
  orders: []
};

await mkdir(join(process.cwd(), "data"), { recursive: true });
await writeFile(join(process.cwd(), "data", "store.json"), JSON.stringify(seed, null, 2), "utf8");
console.log("Fichier data/store.json initialisé.");
