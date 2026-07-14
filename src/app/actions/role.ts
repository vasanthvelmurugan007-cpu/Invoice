"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function switchRole(role: "owner" | "auditor") {
  const cookieStore = await cookies();
  cookieStore.set("user_role", role, { path: "/" });
  revalidatePath("/");
  return { success: true };
}
