"use server";

import { cookies } from "next/headers";

export async function loginUser(email: string, password?: string) {
  const cookieStore = await cookies();

  let role: "owner" | "auditor" | "admin" = "owner";
  let userId = "11111111-1111-1111-1111-111111111111";

  if (email === "rahul@invoicehub.in") {
    if (password !== "Iyal6183@") {
      return { success: false };
    }
    role = "admin";
    userId = "44444444-4444-4444-4444-444444444444";
  } else if (email === "admin@invoicehub.com") {
    if (password && password !== "admin123") {
      return { success: false };
    }
    role = "admin";
    userId = "33333333-3333-3333-3333-333333333333";
  } else if (email === "auditor@invoicehub.com") {
    if (password && password !== "password123") {
      return { success: false };
    }
    role = "auditor";
    userId = "22222222-2222-2222-2222-222222222222";
  } else if (email === "owner@invoicehub.com") {
    if (password && password !== "password123") {
      return { success: false };
    }
    role = "owner";
    userId = "11111111-1111-1111-1111-111111111111";
  } else {
    // Return false for any unrecognized email
    return { success: false };
  }

  const session = {
    id: userId,
    email,
    role,
  };

  cookieStore.set("user_session", JSON.stringify(session), {
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
