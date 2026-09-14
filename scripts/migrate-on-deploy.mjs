import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

class MigrationConfigurationError extends Error {}

async function migrateDeployment() {
  const environment = process.env.VERCEL_ENV;
  if (!["production", "preview"].includes(environment)) {
    console.log("Skipping deployment migrations outside Vercel production and preview builds.");
    return;
  }
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString || !process.env.DATABASE_URL) {
    throw new MigrationConfigurationError(
      `Set DATABASE_URL and DATABASE_URL_UNPOOLED in Vercel ${environment} before deploying.`,
    );
  }
  const connection = new URL(connectionString);
  if (connection.hostname.includes("-pooler.")) {
    throw new MigrationConfigurationError(
      "Deployment migrations require a direct, unpooled connection.",
    );
  }
  const runtime = new URL(process.env.DATABASE_URL);
  const databaseTarget = (url) =>
    `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
  if (databaseTarget(connection) !== databaseTarget(runtime)) {
    throw new MigrationConfigurationError(
      "DATABASE_URL and DATABASE_URL_UNPOOLED must target the same database branch.",
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
    console.log(`${environment} schema is up to date.`);
  } finally {
    await client.end();
  }
}

migrateDeployment().catch((error) => {
  // Driver errors can contain connection details; do not print credentials to
  // public build logs. Configuration errors above contain only our own text.
  const message =
    error instanceof MigrationConfigurationError ? error.message : "Database migration failed.";
  console.error(message);
  process.exitCode = 1;
});
