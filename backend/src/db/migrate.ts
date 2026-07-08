import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { pool } from "../db.js";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export async function runMigrations() {
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
    await pool.query(sql);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations()
    .then(() => {
      console.log("Migrations aplicadas.");
      return pool.end();
    })
    .catch((err) => {
      console.error("Falha ao aplicar migrations:", err);
      process.exit(1);
    });
}
