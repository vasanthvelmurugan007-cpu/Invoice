import { db } from "./index";
import { purchases, invoices, hsnMaster } from "./schema";
import { isNull, eq, and, sql } from "drizzle-orm";

export async function backfillHsnRates() {
  console.log("Starting backfill for purchases...");
  const missingPurchases = await db.select().from(purchases).where(isNull(purchases.hsnRate));
  let pCount = 0;
  for (const p of missingPurchases) {
    if (p.hsnCode) {
      const pDate = p.invoiceDate || new Date().toISOString().split("T")[0];
      const [hsn] = await db
        .select()
        .from(hsnMaster)
        .where(
          and(
            eq(hsnMaster.code, p.hsnCode),
            sql`${hsnMaster.effectiveFrom} <= ${pDate}::date`,
            sql`(${hsnMaster.effectiveTo} IS NULL OR ${hsnMaster.effectiveTo} >= ${pDate}::date)`
          )
        )
        .orderBy(sql`${hsnMaster.effectiveFrom} DESC`)
        .limit(1);
      
      if (hsn) {
        await db.update(purchases).set({ hsnRate: hsn.gstRate }).where(eq(purchases.id, p.id));
        pCount++;
      }
    }
  }
  console.log(`Backfilled ${pCount} purchases.`);

  console.log("Starting backfill for invoices...");
  const missingInvoices = await db.select().from(invoices).where(isNull(invoices.hsnRate));
  let iCount = 0;
  for (const inv of missingInvoices) {
    const items = Array.isArray(inv.items) ? inv.items : [];
    const firstItemWithHsn = items.find((i: any) => i.hsnCode);
    if (firstItemWithHsn) {
      const iDate = inv.invoiceDate || new Date().toISOString().split("T")[0];
      const [hsn] = await db
        .select()
        .from(hsnMaster)
        .where(
          and(
            eq(hsnMaster.code, firstItemWithHsn.hsnCode),
            sql`${hsnMaster.effectiveFrom} <= ${iDate}::date`,
            sql`(${hsnMaster.effectiveTo} IS NULL OR ${hsnMaster.effectiveTo} >= ${iDate}::date)`
          )
        )
        .orderBy(sql`${hsnMaster.effectiveFrom} DESC`)
        .limit(1);
        
      if (hsn) {
        await db.update(invoices).set({ hsnRate: hsn.gstRate }).where(eq(invoices.id, inv.id));
        iCount++;
      }
    }
  }
  console.log(`Backfilled ${iCount} invoices.`);
}

if (require.main === module) {
  backfillHsnRates().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
