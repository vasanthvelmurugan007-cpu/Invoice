"use server";

import { db } from "../../../db";
import { auditorClients, tenants, invoices, monthlyPeriods } from "../../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentPeriod } from "../../../lib/period-utils";
import { getCurrentUser } from "../../../lib/auth-utils";

export async function getAuditorClients(auditorId: string) {
  // @skip-tenant-check - Authorization handled via getCurrentUser().id matching the auditor
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "auditor") {
      return { success: false, error: "Unauthorized" };
    }
    const safeAuditorId = user.id;

    const { month, year } = getCurrentPeriod();
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`; // Approx or use correct end of month

    // Fetch auditor clients
    const clients = await db
      .select({
        clientId: auditorClients.id,
        permissionLevel: auditorClients.permissionLevel,
        status: auditorClients.status,
        tenantId: tenants.id,
        businessName: tenants.businessName,
        gstin: tenants.gstin,
      })
      .from(auditorClients)
      .innerJoin(tenants, eq(auditorClients.tenantId, tenants.id))
      .where(and(eq(auditorClients.auditorId, safeAuditorId), eq(auditorClients.status, "active")))
      .execute();

    const clientSummaries = [];

    for (const client of clients) {
      // Get invoices for current month
      const clientInvoices = await db
        .select({
          total: invoices.totalAmount,
          type: invoices.type,
          status: invoices.status,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, client.tenantId),
            sql`${invoices.invoiceDate} >= ${startDate}::date`,
            sql`${invoices.invoiceDate} <= ${endDate}::date`
          )
        )
        .execute();

      const salesInvoices = clientInvoices.filter(
        (i) => i.type === "Invoice" || i.type === "Proforma"
      );
      const revenue = salesInvoices.reduce((s, i) => s + parseFloat(i.total || "0"), 0);

      // Get period status
      const [period] = await db
        .select()
        .from(monthlyPeriods)
        .where(
          and(
            eq(monthlyPeriods.tenantId, client.tenantId),
            eq(monthlyPeriods.periodMonth, month),
            eq(monthlyPeriods.periodYear, year)
          )
        )
        .limit(1)
        .execute();

      clientSummaries.push({
        ...client,
        invoiceCount: salesInvoices.length,
        revenue,
        periodStatus: period?.status || "open",
      });
    }

    return { success: true, clients: clientSummaries };
  } catch (error: any) {
    console.error("getAuditorClients error:", error);
    return { success: false, error: error.message || "Failed to fetch clients" };
  }
}
