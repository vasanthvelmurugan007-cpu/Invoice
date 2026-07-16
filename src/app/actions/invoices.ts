"use server";

import { db } from "../../db";
import { invoices, tenants, monthlyPeriods } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser, getTenantForUser, assertTenantAccess } from "../../lib/auth-utils";
import { logAction } from "../../lib/audit";

export async function getInvoices() {
  try {
    const user = await getCurrentUser();
    const tenant = await getTenantForUser(user.id);
    
    // Will throw if no access
    await assertTenantAccess(user.id, tenant.id, "view"); 

    const list = await db.select().from(invoices).where(eq(invoices.tenantId, tenant.id)).execute();
    return { success: true, invoices: list };
  } catch (error: any) {
    console.error("getInvoices error:", error);
    return { success: false, error: error.message || "Failed to load invoices" };
  }
}

export async function saveInvoice(data: any) {
  try {
    const user = await getCurrentUser();
    const tenant = await getTenantForUser(user.id);

    // Section 1: Server Action Authorization Audit
    await assertTenantAccess(user.id, tenant.id, "owner");

    // Section 2: Period Locking Enforcement (Application Layer)
    const invDate = new Date(data.invoiceDate || data.date);
    if (!isNaN(invDate.getTime())) {
      const month = invDate.getMonth() + 1;
      const year = invDate.getFullYear();
      const [period] = await db
        .select()
        .from(monthlyPeriods)
        .where(
          and(
            eq(monthlyPeriods.tenantId, tenant.id),
            eq(monthlyPeriods.periodMonth, month),
            eq(monthlyPeriods.periodYear, year)
          )
        )
        .limit(1)
        .execute();

      if (period && (period.status === "locked" || period.status === "filed")) {
        return { success: false, error: `Period ${month}/${year} is locked or filed. Cannot save invoice.` };
      }
    }

    const values = {
      tenantId: tenant.id,
      invoiceNumber: data.id, 
      invoiceDate: data.date,
      dueDate: data.dueDate || null,
      customerName: data.customer,
      type: data.type || "Invoice",
      hidePriceForDc: data.hidePriceForDc || false,
      dcNumber: data.dcNumber || null,
      dcDate: data.dcDate || null,
      vehicleNumber: data.vehicleNumber || null,
      items: data.items || [],
      deliveryCharge: data.deliveryCharge ? data.deliveryCharge.toString() : "0",
      packagingCharge: data.packagingCharge ? data.packagingCharge.toString() : "0",
      totalAmount: data.total ? data.total.toString() : "0",
      status: data.status || "Unpaid",
    };

    // Check if exists
    const [existing] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenant.id), eq(invoices.invoiceNumber, data.id)))
      .limit(1)
      .execute();

    if (existing) {
      await db.update(invoices).set(values).where(eq(invoices.id, existing.id));
      await logAction({
        tenantId: tenant.id,
        actorId: user.id,
        actorRole: user.role,
        action: "updated_invoice",
        metadata: { invoiceNumber: data.id },
      });
    } else {
      await db.insert(invoices).values(values);
      await logAction({
        tenantId: tenant.id,
        actorId: user.id,
        actorRole: user.role,
        action: "created_invoice",
        metadata: { invoiceNumber: data.id },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("saveInvoice error:", error);
    return { success: false, error: error.message || "Failed to save invoice" };
  }
}
