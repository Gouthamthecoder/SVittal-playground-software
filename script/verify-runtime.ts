import "../load-env";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;

function requireRuntimeConfig() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required for the deployed application");
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  if (process.env.SEED_DEFAULT_DATA === "true" && !process.env.DEFAULT_ADMIN_PASSWORD) {
    throw new Error("DEFAULT_ADMIN_PASSWORD is required when SEED_DEFAULT_DATA=true");
  }
}

async function verifyRuntime() {
  requireRuntimeConfig();
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query("select 1");
    console.log("[runtime] Application database connection verified");
  } catch (error: any) {
    const code = error?.code ? ` (${error.code})` : "";
    throw new Error(`Application database connection failed${code}: ${error?.message ?? "Unknown database error"}`);
  } finally {
    await pool.end();
  }
}

verifyRuntime().catch((error) => {
  console.error(`[runtime] ${error.message}`);
  process.exit(1);
});
