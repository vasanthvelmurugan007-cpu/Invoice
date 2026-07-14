"use server";

import { db } from "../../../../db";
import { invoices, purchases, tenants, gstFilingPackages, monthlyPeriods } from "../../../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "../../../../lib/auth-utils";
import { logAction } from "../../../../lib/audit";

export async function getClientData(tenantId: string, month: number, year: number) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "auditor") {
      return { success: false, error: "Unauthorized" };
    }

    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`; // Approx filter

    // Log the page view action
    await logAction({
      tenantId,
      actorId: user.id,
      actorRole: "auditor",
      action: "viewed_client_data",
      periodMonth: month,
      periodYear: year,
    });

    // Fetch tenant details
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
      .execute();

    if (!tenant) {
      return { success: false, error: "Client tenant not found" };
    }

    // Fetch invoices
    const clientInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          sql`${invoices.invoiceDate} >= ${startDate}::date`,
          sql`${invoices.invoiceDate} <= ${endDate}::date`
        )
      )
      .execute();

    // Fetch purchases
    const clientPurchases = await db
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.tenantId, tenantId),
          sql`${purchases.invoiceDate} >= ${startDate}::date`,
          sql`${purchases.invoiceDate} <= ${endDate}::date`
        )
      )
      .execute();

    // Fetch filing packages
    const filingHistory = await db
      .select()
      .from(gstFilingPackages)
      .where(
        and(
          eq(gstFilingPackages.tenantId, tenantId),
          eq(gstFilingPackages.periodMonth, month),
          eq(gstFilingPackages.periodYear, year)
        )
      )
      .execute();

    // Fetch period status
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

    return {
      success: true,
      tenant,
      invoices: clientInvoices,
      purchases: clientPurchases,
      filingHistory,
      periodStatus: period?.status || "open",
    };
  } catch (error: any) {
    console.error("getClientData error:", error);
    return { success: false, error: error.message || "Failed to fetch client details" };
  }
}
