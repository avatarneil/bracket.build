import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDatabase() {
  if (database) return database;
  if (!process.env.DATABASE_URL) throw new Error("Account storage is not configured.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
  attachDatabasePool(pool);
  database = drizzle(pool, { schema });
  return database;
}
