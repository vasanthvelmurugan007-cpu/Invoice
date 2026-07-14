"use server";

import { db } from "../../db";
import { monthlyPeriods } from "../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logAction } from "../../lib/audit";
import { getCurrentUser, getTenantForUser } from "../../lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function lockPeriod(tenantId: string, month: number, year: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const actorRole = user.role;

    // Check if period already exists
    const [existing] = await db
      .select()
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.tenantId, tenantId),
          eq(monthlyPeriods.periodMonth, month),
          eq(monthlyPeriods.periodYear, year)
        )
      )
      .limit(1)
      .execute();

    if (existing) {
      await db
        .update(monthlyPeriods)
        .set({
          status: "locked",
          lockedAt: new Date(),
          lockedBy: user.id,
        })
        .where(eq(monthlyPeriods.id, existing.id));
    } else {
      await db.insert(monthlyPeriods).values({
        tenantId,
        periodMonth: month,
        periodYear: year,
        status: "locked",
        lockedAt: new Date(),
        lockedBy: user.id,
      });
    }

    await logAction({
      tenantId,
      actorId: user.id,
      actorRole,
      action: "locked_period",
      periodMonth: month,
      periodYear: year,
    });

    const { sendEmail } = await import("../../lib/notifications");
    await sendEmail({
      to: "owner@invoicehub.com",
      subject: `Filing Period Locked for ${month}/${year}`,
      body: `Your CA has locked the filing period for ${month}/${year}. You cannot edit or add invoices for this period.`,
    });

    revalidatePath(`/auditor/client/${tenantId}`);
    return { success: true };
  } catch (error: any) {
    console.error("lockPeriod error:", error);
    return { success: false, error: error.message || "Failed to lock period" };
  }
}

export async function unlockPeriod(tenantId: string, month: number, year: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const [existing] = await db
      .select()
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.tenantId, tenantId),
          eq(monthlyPeriods.periodMonth, month),
          eq(monthlyPeriods.periodYear, year)
        )
      )
      .limit(1)
      .execute();

    if (existing) {
      await db
        .update(monthlyPeriods)
        .set({
          status: "open",
          lockedAt: null,
          lockedBy: null,
        })
        .where(eq(monthlyPeriods.id, existing.id));

      await logAction({
        tenantId,
        actorId: user.id,
        actorRole: user.role,
        action: "unlocked_period",
        periodMonth: month,
        periodYear: year,
      });
    }

    const { sendEmail } = await import("../../lib/notifications");
    await sendEmail({
      to: "owner@invoicehub.com",
      subject: `Filing Period Unlocked for ${month}/${year}`,
      body: `Your CA has unlocked the filing period for ${month}/${year}. You can now add or edit invoices for this period.`,
    });

    revalidatePath(`/auditor/client/${tenantId}`);
    return { success: true };
  } catch (error: any) {
    console.error("unlockPeriod error:", error);
    return { success: false, error: error.message || "Failed to unlock period" };
  }
}

export async function getPeriodStatus(tenantId: string, month: number, year: number) {
  try {
    const [period] = await db
      .select()
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.tenantId, tenantId),
          eq(monthlyPeriods.periodMonth, month),
          eq(monthlyPeriods.periodYear, year)
        )
      )
      .limit(1)
      .execute();

    return { success: true, status: period?.status || "open" };
  } catch (error: any) {
    console.error("getPeriodStatus error:", error);
    return { success: false, error: error.message || "Failed to fetch period status" };
  }
}

export async function getLockedPeriods() {
  try {
    const user = await getCurrentUser();
    const tenant = await getTenantForUser(user.id);
    const locked = await db
      .select({
        month: monthlyPeriods.periodMonth,
        year: monthlyPeriods.periodYear,
        status: monthlyPeriods.status,
      })
      .from(monthlyPeriods)
      .where(
        and(
          eq(monthlyPeriods.tenantId, tenant.id),
          sql`${monthlyPeriods.status} IN ('locked', 'filed')`
        )
      )
      .execute();
    return { success: true, periods: locked };
  } catch (error) {
    console.error("getLockedPeriods error:", error);
    return { success: false, periods: [] };
  }
}

