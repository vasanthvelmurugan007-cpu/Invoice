"use server";

import { db } from "../../db";
import { auditorClients, tenants } from "../../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../../lib/auth-utils";
import { logAction } from "../../lib/audit";

export async function sendCaInvite(email: string, permissionLevel: string, tenantId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      return { success: false, error: "Unauthorized" };
    }

    // Get tenant business name
    const tenantList = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (tenantList.length === 0) {
      return { success: false, error: "Tenant not found" };
    }
    const tenant = tenantList[0];

    const inviteToken = crypto.randomUUID();

    // Insert into auditor_clients
    await db.insert(auditorClients).values({
      auditorId: "00000000-0000-0000-0000-000000000000", // Will be updated on accept
      tenantId,
      permissionLevel,
      status: "pending",
      inviteToken,
      inviteEmail: email,
    });

    // Log the audit trail action
    await logAction({
      tenantId,
      actorId: user.id,
      actorRole: "owner",
      action: "invited_auditor",
      metadata: { inviteEmail: email, permissionLevel },
    });

    const acceptLink = `/auditor/accept?token=${inviteToken}`;

    const { sendEmail } = await import("../../lib/notifications");
    await sendEmail({
      to: email,
      subject: `[${tenant.businessName}] has invited you to view their books on InvoiceHub`,
      body: `You have been invited by ${tenant.businessName} to access their books as an Auditor on InvoiceHub.\n\nPlease accept the invitation by clicking this link: ${acceptLink}`,
    });

    revalidatePath("/settings/ca-access");
    return { success: true, acceptLink };
  } catch (error: any) {
    console.error("sendCaInvite error:", error);
    return { success: false, error: error.message || "Failed to send invitation" };
  }
}

export async function revokeCaAccess(auditorClientId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      return { success: false, error: "Unauthorized" };
    }

    const [client] = await db
      .select()
      .from(auditorClients)
      .where(eq(auditorClients.id, auditorClientId))
      .limit(1);

    if (!client) {
      return { success: false, error: "Invitation not found" };
    }

    await db
      .update(auditorClients)
      .set({ status: "revoked" })
      .where(eq(auditorClients.id, auditorClientId));

    if (client.tenantId) {
      await logAction({
        tenantId: client.tenantId,
        actorId: user.id,
        actorRole: "owner",
        action: "revoked_auditor",
        metadata: { inviteEmail: client.inviteEmail },
      });
    }

    revalidatePath("/settings/ca-access");
    return { success: true };
  } catch (error: any) {
    console.error("revokeCaAccess error:", error);
    return { success: false, error: error.message || "Failed to revoke access" };
  }
}

export async function updateCaPermission(auditorClientId: string, newPermission: string) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "owner" && user.role !== "admin")) {
      return { success: false, error: "Unauthorized" };
    }

    const [client] = await db
      .select()
      .from(auditorClients)
      .where(eq(auditorClients.id, auditorClientId))
      .limit(1);

    if (!client) {
      return { success: false, error: "Invitation not found" };
    }

    await db
      .update(auditorClients)
      .set({ permissionLevel: newPermission })
      .where(eq(auditorClients.id, auditorClientId));

    if (client.tenantId) {
      await logAction({
        tenantId: client.tenantId,
        actorId: user.id,
        actorRole: "owner",
        action: "updated_auditor_permission",
        metadata: { inviteEmail: client.inviteEmail, newPermission },
      });
    }

    revalidatePath("/settings/ca-access");
    return { success: true };
  } catch (error: any) {
    console.error("updateCaPermission error:", error);
    return { success: false, error: error.message || "Failed to update permission" };
  }
}

export async function acceptCaInvite(token: string) {
  try {
    const [client] = await db
      .select()
      .from(auditorClients)
      .where(eq(auditorClients.inviteToken, token))
      .limit(1);

    if (!client) {
      return { success: false, error: "Invalid or expired invitation token" };
    }

    if (client.status !== "pending") {
      return { success: false, error: "Invitation is no longer pending" };
    }

    // Set role to auditor in cookies
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("user_role", "auditor", { path: "/" });

    const auditorId = "22222222-2222-2222-2222-222222222222"; // Mock CA user ID

    // Update auditor_clients row
    await db
      .update(auditorClients)
      .set({
        status: "active",
        acceptedAt: new Date(),
        auditorId,
        inviteToken: null, // Clear token
      })
      .where(eq(auditorClients.id, client.id));

    // Log the audit trail action
    if (client.tenantId) {
      await logAction({
        tenantId: client.tenantId,
        actorId: auditorId,
        actorRole: "auditor",
        action: "accepted_invite",
        metadata: { inviteEmail: client.inviteEmail },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("acceptCaInvite error:", error);
    return { success: false, error: error.message || "Failed to accept invitation" };
  }
}

