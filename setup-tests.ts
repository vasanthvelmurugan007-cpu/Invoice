import { db } from "./src/db";
import fs from "fs";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

async function setupAndRun() {
  console.log("Pushing schema with drizzle-kit...");
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5433/postgres";
  execSync("npx.cmd drizzle-kit push", { stdio: "inherit", env: process.env });

  console.log("Applying RLS policies and backfills...");
  const rlsSql = fs.readFileSync("./src/db/rls_policies.sql", "utf-8");
  
  // Backfill purchases status
  await db.execute(sql.raw(`UPDATE purchases SET status = 'confirmed' WHERE status IS NULL;`));

  // Mock Supabase auth schema and auth.uid() function
  await db.execute(sql.raw(`
    DO $$ BEGIN
      CREATE ROLE authenticated;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
      BEGIN
        RETURN '00000000-0000-0000-0000-000000000000'::uuid;
      END;
    $$ LANGUAGE plpgsql;
  `));

  try {
    await db.execute(sql.raw(rlsSql));
    console.log("RLS policies applied.");
  } catch (e: any) {
    console.log("RLS policies already applied or failed:", e.message);
  }

  console.log("Running security tests...");
  execSync("npx.cmd tsx src/tests/security.test.ts", { stdio: "inherit", env: process.env });
}

setupAndRun().catch(e => {
  console.error(e);
  process.exit(1);
});
