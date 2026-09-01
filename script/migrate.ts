import "../load-env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.MIGRATION_DATABASE_URL;

if (!connectionString) {
  throw new Error("MIGRATION_DATABASE_URL is required to run database migrations");
}

const pool = new Pool({ connectionString });

async function runMigrations() {
  try {
    await pool.query("select 1");
    console.log("[migrations] Database connection verified");

    await migrate(drizzle({ client: pool }), { migrationsFolder: "migrations" });
    console.log("[migrations] Database schema is up to date");
  } catch (error: any) {
    const code = error?.code ? ` (${error.code})` : "";
    console.error(`[migrations] Failed${code}: ${error?.message ?? "Unknown database error"}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void runMigrations();
