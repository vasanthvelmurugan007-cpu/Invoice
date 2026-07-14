import DashboardLayout from "../../../../(dashboard)/DashboardLayout";
import PrepareFilingClient from "./PrepareFilingClient";
import { db } from "../../../../../db";
import { tenants } from "../../../../../db/schema";
import { eq } from "drizzle-orm";

export default async function PrepareFilingPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1).execute();

  return (
    <DashboardLayout>
      <PrepareFilingClient
        tenantId={tenantId}
        tenantName={tenant?.businessName || "Client"}
      />
    </DashboardLayout>
  );
}
