import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

class MigrationConfigurationError extends Error {}

async function migrateProduction() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("Skipping production migrations outside a Vercel production build.");
    return;
  }
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new MigrationConfigurationError(
      "Set DATABASE_URL_UNPOOLED in Vercel Production before deploying.",
    );
  }
  const connection = new URL(connectionString);
  if (connection.hostname.includes("-pooler.")) {
    throw new MigrationConfigurationError(
      "Production migrations require a direct, unpooled connection.",
    );
  }
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query("SET statement_timeout = '120s'");
    // Session lock and migrations must share this one direct connection. Closing
    // it releases the lock even if a migration fails or the build is terminated.
    await client.query("SELECT pg_advisory_lock(184731029)");
    await migrate(drizzle(client), {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });
    console.log("Production schema is up to date.");
  } finally {
    await client.end();
  }
}

migrateProduction().catch((error) => {
  // Driver errors can contain connection details; do not print credentials to
  // public build logs. Configuration errors above contain only our own text.
  const message =
    error instanceof MigrationConfigurationError ? error.message : "Database migration failed.";
  console.error(message);
  process.exitCode = 1;
});
