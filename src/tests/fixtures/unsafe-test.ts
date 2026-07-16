"use server";

import { db } from "../../db";
import { tenants } from "../../db/schema";
import { eq } from "drizzle-orm";

// INTENTIONAL VULNERABILITY FOR REGRESSION TESTING: 
// This function touches a tenant table without calling assertTenantAccess.
// The scan-actions.ts tool should catch this and exit with 1.
export async function getTenantNameUnsafe(tenantId: string) {
  const result = await db.select().from(tenants).where(eq(tenants.id, tenantId)).execute();
  return result[0]?.businessName;
}
