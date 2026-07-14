import DashboardLayout from "../../(dashboard)/DashboardLayout";
import { getCurrentUser } from "../../../lib/auth-utils";
import { getAuditorClients } from "./actions";
import Link from "next/link";

export default async function AuditorDashboard() {
  const user = await getCurrentUser();
  const res = await getAuditorClients(user.id);
  const clients = res.clients || [];

  // Aggregated Stats
  const totalClients = clients.length;
  const clientsFiled = clients.filter((c) => c.periodStatus === "filed").length;
  const clientsLocked = clients.filter((c) => c.periodStatus === "locked").length;
  const clientsPending = totalClients - clientsFiled;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "filed":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "locked":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "open":
      default:
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Auditor Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Manage multiple client businesses, review invoice/purchase data, and prepare monthly GST filings.
          </p>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Total Clients</span>
            <span className="text-2xl font-bold text-white mt-1 block">{totalClients}</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Data Ready (Locked)</span>
            <span className="text-2xl font-bold text-amber-400 mt-1 block">{clientsLocked}</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Pending Filing</span>
            <span className="text-2xl font-bold text-rose-400 mt-1 block">{clientsPending}</span>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Filed This Month</span>
            <span className="text-2xl font-bold text-purple-400 mt-1 block">{clientsFiled}</span>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your Clients</h2>

          {clients.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-10 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-gray-500">
                <i className="ti ti-users text-xl"></i>
              </div>
              <p className="text-gray-400 text-sm">No clients linked to your auditor account yet.</p>
              <p className="text-xs text-slate-500">Clients can invite you by entering your email in Settings &gt; CA Access.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <div
                  key={client.clientId}
                  className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white truncate max-w-[150px]">{client.businessName}</h3>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          GSTIN: {client.gstin || "N/A"}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getStatusBadge(
                          client.periodStatus
                        )}`}
                      >
                        {client.periodStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div>
                        <span className="text-slate-500 block">Sales Invoices</span>
                        <span className="font-semibold text-slate-200 mt-0.5 block">
                          {client.invoiceCount} invoices
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Revenue</span>
                        <span className="font-semibold text-slate-200 mt-0.5 block">
                          ₹{client.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-5 pt-3 border-t border-slate-800/60">
                    <Link
                      href={`/auditor/client/${client.tenantId}`}
                      className="flex-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg py-2 text-xs font-semibold transition-colors"
                    >
                      View Data
                    </Link>
                    <Link
                      href={`/auditor/client/${client.tenantId}/prepare-filing`}
                      className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-semibold transition-colors"
                    >
                      Prepare Filing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
