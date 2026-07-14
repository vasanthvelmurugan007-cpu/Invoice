import { getClientData } from "./actions";
import ClientDetailClient from "./ClientDetailClient";
import DashboardLayout from "../../../(dashboard)/DashboardLayout";
import { getCurrentPeriod } from "../../../../lib/period-utils";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { tenantId } = await params;
  const sParams = await searchParams;

  const current = getCurrentPeriod();
  const month = sParams.month ? parseInt(sParams.month) : current.month;
  const year = sParams.year ? parseInt(sParams.year) : current.year;

  const res = await getClientData(tenantId, month, year);

  if (!res.success || !res.tenant) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-slate-400 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl max-w-md mx-auto my-10">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Error Loading Client</h2>
          <p>{res.error || "Client details could not be retrieved."}</p>
        </div>
      </DashboardLayout>
    );
  }

  const initialData = {
    tenant: res.tenant,
    invoices: (res.invoices || []) as any,
    purchases: (res.purchases || []) as any,
    filingHistory: (res.filingHistory || []) as any,
    periodStatus: res.periodStatus || "open",
  };

  return (
    <DashboardLayout>
      <ClientDetailClient tenantId={tenantId} initialData={initialData} />
    </DashboardLayout>
  );
}
