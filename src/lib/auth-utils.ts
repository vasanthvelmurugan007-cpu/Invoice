import { cookies } from "next/headers";
import { db } from "../db";
import { tenants, auditorClients, auditLogs } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface UserSession {
  id: string;
  email: string;
  role: "owner" | "auditor" | "admin";
}

export const MOCK_OWNER_ID = "11111111-1111-1111-1111-111111111111";
export const MOCK_AUDITOR_ID = "22222222-2222-2222-2222-222222222222";

import { jwtVerify } from "jose";

export async function getCurrentUser(): Promise<UserSession> {
  if ((global as any).MOCK_USER) return (global as any).MOCK_USER;
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get("user_session")?.value;

  if (sessionVal) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-for-dev");
      const { payload } = await jwtVerify(sessionVal, secret);
      return {
        id: payload.id as string,
        email: payload.email as string,
        role: payload.role as "owner" | "auditor" | "admin",
      };
    } catch (e) {
      console.error("JWT Verify Error:", e);
    }
  }

  // Fallback mock (for tests/development if session is missing)
  const role = cookieStore.get("user_role")?.value || "owner";

  if (role === "auditor") {
    return {
      id: MOCK_AUDITOR_ID,
      email: "ca.sharma@auditfirm.com",
      role: "auditor",
    };
  }

  return {
    id: MOCK_OWNER_ID,
    email: "owner@invoicehub.com",
    role: "owner",
  };
}

export async function getTenantForUser(userId: string) {
  try {
    const isRahul = userId === "44444444-4444-4444-4444-444444444444";
    const businessName = isRahul ? "Rahul's Enterprise" : "Acme Enterprises Ltd";
    const gstin = isRahul ? "27RAHUL2727R1ZX" : "27ABCCT2727Q1ZX";

    const existing = await db.select().from(tenants).where(eq(tenants.ownerId, userId)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    // Auto-create a default tenant for testing
    const [newTenant] = await db.insert(tenants).values({
      businessName,
      gstin,
      ownerId: userId,
    }).returning();

    return newTenant;
  } catch (error) {
    console.warn("Database connection failed, falling back to mock tenant data:", error);
    const isRahul = userId === "44444444-4444-4444-4444-444444444444";
    return {
      id: isRahul ? "88888888-8888-8888-8888-888888888888" : "99999999-9999-9999-9999-999999999999",
      businessName: isRahul ? "Rahul's Enterprise (Mock)" : "Acme Enterprises Ltd (Mock)",
      gstin: isRahul ? "27RAHUL2727R1ZX" : "27ABCCT2727Q1ZX",
      ownerId: userId,
      createdAt: new Date(),
    };
  }
}

export async function setUserRole(role: "owner" | "auditor") {
  const cookieStore = await cookies();
  cookieStore.set("user_role", role, { path: "/" });
}

export async function assertTenantAccess(userId: string, tenantId: string, requiredRole: "owner" | "auditor" | "view" = "view") {
  try {
    const user = await getCurrentUser();
    
    // Check if owner
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    if (tenant.ownerId === userId) {
      if (requiredRole === "auditor") {
        throw new Error("Auditor role required");
      }
      return true;
    }
    
    // Check if auditor
    if (requiredRole === "owner") {
      throw new Error("Owner role required");
    }
    
    const [auditorClient] = await db
      .select()
      .from(auditorClients)
      .where(and(
        eq(auditorClients.tenantId, tenantId),
        eq(auditorClients.auditorId, userId),
        eq(auditorClients.status, "active")
      ))
      .limit(1);
      
    if (!auditorClient) {
      throw new Error("No active auditor access");
    }
    
    return true;
  } catch (error: any) {
    // Log failed auth to audit logs
    try {
      await db.insert(auditLogs).values({
        tenantId: tenantId,
        actorId: userId,
        actorRole: "unknown",
        action: "failed_auth",
        metadata: { reason: error.message },
      });
    } catch (e) {
      console.error("Failed to write audit log for failed auth", e);
    }
    throw new Error("Unauthorized access to tenant: " + error.message);
  }
}
