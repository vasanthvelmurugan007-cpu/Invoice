"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { headers } from "next/headers";
import { loginRateLimiter } from "../../lib/rate-limit";
import { db } from "../../db";
import { auditLogs } from "../../db/schema";

export async function loginUser(email: string, password?: string) {
  const cookieStore = await cookies();
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for") || "unknown";
  
  const limitCheck = loginRateLimiter.check(`${email}-${ip}`);
  if (!limitCheck.success) {
    // Log rate limit violation
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000000", // system tenant
        actorId: "00000000-0000-0000-0000-000000000000",
        actorRole: "unknown",
        action: "failed_auth",
        metadata: { email, ip, reason: "rate_limited", remaining: limitCheck.remaining }
      });
    } catch(e) {}
    return { success: false, error: "Too many login attempts. Please try again later." };
  }

  let role: "owner" | "auditor" | "admin" = "owner";
  let userId = "11111111-1111-1111-1111-111111111111";

  const handleFailedAuth = async () => {
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000000",
        actorId: "00000000-0000-0000-0000-000000000000",
        actorRole: "unknown",
        action: "failed_auth",
        metadata: { email, ip, reason: "invalid_credentials", remaining: limitCheck.remaining }
      });
    } catch(e) {}
    return { success: false, error: "Invalid credentials" };
  };

  if (email === "rahul@invoicehub.in") {
    if (password !== "Iyal6183@") {
      return await handleFailedAuth();
    }
    role = "admin";
    userId = "44444444-4444-4444-4444-444444444444";
  } else if (email === "admin@invoicehub.com") {
    if (password && password !== "admin123") {
      return await handleFailedAuth();
    }
    role = "admin";
    userId = "33333333-3333-3333-3333-333333333333";
  } else if (email === "auditor@invoicehub.com") {
    if (password && password !== "password123") {
      return await handleFailedAuth();
    }
    role = "auditor";
    userId = "22222222-2222-2222-2222-222222222222";
  } else if (email === "owner@invoicehub.com") {
    if (password && password !== "password123") {
      return await handleFailedAuth();
    }
    role = "owner";
    userId = "11111111-1111-1111-1111-111111111111";
  } else {
    // Return false for any unrecognized email
    return await handleFailedAuth();
  }

  const session = {
    id: userId,
    email,
    role,
  };

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-for-dev");
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(secret);

  cookieStore.set("user_session", token, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 1 day
  });

  cookieStore.set("user_role", role === "admin" ? "owner" : role, {
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return { success: true, role };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("user_session");
  cookieStore.delete("user_role");
  return { success: true };
}
