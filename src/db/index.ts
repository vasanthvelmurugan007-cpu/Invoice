import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/invoicehub";

// Disable prefetch as it is not supported by Supabase connection pooling (if used)
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
