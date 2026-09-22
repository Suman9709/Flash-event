import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export async function checkDatabaseConnection(): Promise<string> {
  const result = await pool.query<{ database: string }>(
    "SELECT current_database() AS database",
  );

  const database = result.rows[0]?.database;

  if (!database) {
    throw new Error("Database health query returned no database name");
  }

  return database;
}

export function closePool(): Promise<void> {
  return pool.end();
}
