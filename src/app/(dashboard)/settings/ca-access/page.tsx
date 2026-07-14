import { getCurrentUser, getTenantForUser } from "../../../../lib/auth-utils";
import { db } from "../../../../db";
import { auditorClients } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import CaAccessClient from "./CaAccessClient";
import DashboardLayout from "../../DashboardLayout";

export default async function CaAccessPage() {
  const user = await getCurrentUser();
  const tenant = await getTenantForUser(user.id);

  // Fetch CA clients associated with this tenant
  let clientsList = [];
  try {
    clientsList = await db
      .select()
      .from(auditorClients)
      .where(eq(auditorClients.tenantId, tenant.id))
      .execute();
  } catch (error) {
    console.warn("Database failed to fetch auditor clients, using empty list:", error);
  }

  return (
    <DashboardLayout>
      <CaAccessClient
        tenantId={tenant.id}
        initialClients={JSON.parse(JSON.stringify(clientsList))}
      />
    </DashboardLayout>
  );
}
