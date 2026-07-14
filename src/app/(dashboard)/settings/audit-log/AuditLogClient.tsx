"use client";

import { useState } from "react";
import { formatPeriod } from "../../../../lib/period-utils";

interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  periodMonth: number | null;
  periodYear: number | null;
  metadata: any;
  createdAt: string;
}

export default function AuditLogClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [actionFilter, setActionFilter] = useState("all");

  const translateAction = (act: string, month: number | null, year: number | null) => {
    const periodStr = month && year ? ` (${formatPeriod(month, year)})` : "";
    switch (act) {
      case "viewed_client_data":
        return `Viewed invoices${periodStr}`;
      case "downloaded_gstr1":
      case "generated_gstr-1":
        return `Generated GSTR-1${periodStr}`;
      case "generated_gstr-3b":
        return `Generated GSTR-3B${periodStr}`;
      case "generated_hsn":
        return `Generated HSN Summary${periodStr}`;
      case "locked_period":
        return `Locked period${periodStr}`;
      case "unlocked_period":
        return `Unlocked period${periodStr}`;
      case "filed":
        return `Marked period${periodStr} as filed`;
      case "invited_auditor":
        return "Invited CA";
      case "revoked_auditor":
        return "Revoked CA Access";
      case "updated_auditor_permission":
        return "Updated CA permission level";
      case "created_purchase":
        return "Recorded a purchase invoice";
      case "updated_purchase":
        return "Updated a purchase invoice";
      case "deleted_purchase":
        return "Deleted a purchase invoice";
      case "accepted_invite":
        return "CA accepted invitation";
      default:
        return act;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === "all") return true;
    return log.action === actionFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Audit Trail Log</h1>
        <p className="text-slate-400 text-sm">
          A security log showing actions taken by business owners and Chartered Accountants.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Filter by Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Actions</option>
            <option value="viewed_client_data">Viewed invoices</option>
            <option value="locked_period">Locked period</option>
            <option value="unlocked_period">Unlocked period</option>
            <option value="filed">Filed returns</option>
            <option value="invited_auditor">Invited CA</option>
            <option value="accepted_invite">Accepted invites</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-5">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No audit log entries matching selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-slate-800 text-gray-400 text-xs">
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Action Details</th>
                  <th className="pb-3">Additional Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/10">
                    <td className="py-3 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          log.actorRole === "owner"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        }`}
                      >
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 text-white font-medium">
                      {translateAction(log.action, log.periodMonth, log.periodYear)}
                    </td>
                    <td className="py-3 text-xs text-slate-500 max-w-[200px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
