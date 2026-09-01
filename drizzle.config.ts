import "./load-env";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DRIZZLE_MIGRATE === "true"
  ? process.env.MIGRATION_DATABASE_URL
  : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    process.env.DRIZZLE_MIGRATE === "true"
      ? "MIGRATION_DATABASE_URL is required to run database migrations"
      : "DATABASE_URL is required to manage the database schema",
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
