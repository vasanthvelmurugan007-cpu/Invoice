"use server";

import { db } from "../../db";
import { auditLogs, tenants } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser, getTenantForUser } from "../../lib/auth-utils";

export async function getAuditLogs() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    let logs = [];

    if (user.role === "owner") {
      const tenant = await getTenantForUser(user.id);
      logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenant.id))
        .orderBy(desc(auditLogs.createdAt))
        .execute();
    } else {
      logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.actorId, user.id))
        .orderBy(desc(auditLogs.createdAt))
        .execute();
    }

    return { success: true, logs };
  } catch (error: any) {
    console.error("getAuditLogs error:", error);
    return { success: false, error: error.message || "Failed to load audit logs" };
  }
}
