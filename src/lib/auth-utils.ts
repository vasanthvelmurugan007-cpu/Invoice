import { cookies } from "next/headers";
import { db } from "../db";
import { tenants } from "../db/schema";
import { eq } from "drizzle-orm";

export interface UserSession {
  id: string;
  email: string;
  role: "owner" | "auditor" | "admin";
}

export const MOCK_OWNER_ID = "11111111-1111-1111-1111-111111111111";
export const MOCK_AUDITOR_ID = "22222222-2222-2222-2222-222222222222";

export async function getCurrentUser(): Promise<UserSession> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get("user_session")?.value;

  if (sessionVal) {
    try {
      const parsed = JSON.parse(sessionVal);
      return {
        id: parsed.id,
        email: parsed.email,
        role: parsed.role,
      };
    } catch (e) {}
  }

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
