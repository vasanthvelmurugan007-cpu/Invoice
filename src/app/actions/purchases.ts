"use server";

import { db } from "../../db";
import { purchases, tenants } from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser, getTenantForUser } from "../../lib/auth-utils";
import { revalidatePath } from "next/cache";
import { logAction } from "../../lib/audit";

export async function getPurchases(filters?: { vendorSearch?: string; itcOnly?: boolean }) {
  try {
    const user = await getCurrentUser();
    const tenant = await getTenantForUser(user.id);

    let query = db.select().from(purchases).where(eq(purchases.tenantId, tenant.id));

    const list = await query.execute();

    let filtered = list;
    if (filters?.vendorSearch) {
      const search = filters.vendorSearch.toLowerCase();
      filtered = filtered.filter((p) => p.vendorName.toLowerCase().includes(search));
    }
    if (filters?.itcOnly) {
      filtered = filtered.filter((p) => p.itcEligible);
    }

    return { success: true, purchases: filtered, businessGstin: tenant.gstin };
  } catch (error: any) {
    console.error("getPurchases error:", error);
    return { success: false, error: error.message || "Failed to load purchases" };
  }
}

export async function savePurchase(data: {
  id?: string;
  vendorName: string;
  vendorGstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  category: "goods" | "services";
  hsnCode: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  itcEligible: boolean;
}) {
  try {
    const user = await getCurrentUser();
    const tenant = await getTenantForUser(user.id);

    const values = {
      tenantId: tenant.id,
      vendorName: data.vendorName,
      vendorGstin: data.vendorGstin,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      category: data.category,
      hsnCode: data.hsnCode,
      taxableAmount: data.taxableAmount.toString(),
      cgst: data.cgst.toString(),
      sgst: data.sgst.toString(),
      igst: data.igst.toString(),
      totalAmount: data.totalAmount.toString(),
      itcEligible: data.itcEligible,
    };

    if (data.id) {
      await db.update(purchases).set(values).where(eq(purchases.id, data.id));
      await logAction({
        tenantId: tenant.id,
        actorId: user.id,
        actorRole: "owner",
        action: "updated_purchase",
        metadata: { invoiceNumber: data.invoiceNumber, vendorName: data.vendorName },
      });
    } else {
      await db.insert(purchases).values(values);
      await logAction({
        tenantId: tenant.id,
        actorId: user.id,
        actorRole: "owner",
        action: "created_purchase",
        metadata: { invoiceNumber: data.invoiceNumber, vendorName: data.vendorName },
      });
    }

    revalidatePath("/purchases");
    return { success: true };
  } catch (error: any) {
    console.error("savePurchase error:", error);
    return { success: false, error: error.message || "Failed to save purchase" };
  }
}

export async function deletePurchase(id: string) {
  try {
    const user = await getCurrentUser();
    const tenant = await getTenantForUser(user.id);

    const [existing] = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);

    if (!existing) return { success: false, error: "Purchase entry not found" };

    await db.delete(purchases).where(eq(purchases.id, id));

    await logAction({
      tenantId: tenant.id,
      actorId: user.id,
      actorRole: "owner",
      action: "deleted_purchase",
      metadata: { invoiceNumber: existing.invoiceNumber, vendorName: existing.vendorName },
    });

    revalidatePath("/purchases");
    return { success: true };
  } catch (error: any) {
    console.error("deletePurchase error:", error);
    return { success: false, error: error.message || "Failed to delete purchase" };
  }
}
