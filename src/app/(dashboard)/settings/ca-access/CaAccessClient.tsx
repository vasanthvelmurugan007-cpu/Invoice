"use client";

import { useState } from "react";
import { sendCaInvite, revokeCaAccess, updateCaPermission } from "../../../actions/ca-access";

interface ClientData {
  id: string;
  inviteEmail: string;
  permissionLevel: string;
  status: string;
  invitedAt: string;
  inviteToken: string | null;
}

export default function CaAccessClient({
  tenantId,
  initialClients,
}: {
  tenantId: string;
  initialClients: ClientData[];
}) {
  const [clients, setClients] = useState<ClientData[]>(initialClients);
  const [email, setEmail] = useState("");
  const [permissionLevel, setPermissionLevel] = useState("view");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);
    setGeneratedLink(null);

    const res = await sendCaInvite(email, permissionLevel, tenantId);
    setLoading(false);

    if (res.success) {
      setMessage({ text: `Invitation sent to ${email} successfully!`, type: "success" });
      setEmail("");
      if (res.acceptLink) {
        setGeneratedLink(res.acceptLink);
      }
      // Reload list
      window.location.reload();
    } else {
      setMessage({ text: res.error || "Failed to send invitation.", type: "error" });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this CA's access?")) return;

    setLoading(true);
    const res = await revokeCaAccess(id);
    setLoading(false);

    if (res.success) {
      setMessage({ text: "Access revoked successfully.", type: "success" });
      window.location.reload();
    } else {
      setMessage({ text: res.error || "Failed to revoke access.", type: "error" });
    }
  };

  const handlePermissionChange = async (id: string, current: string) => {
    const nextPerm = current === "view" ? "download" : current === "download" ? "comment" : "view";
    setLoading(true);
    const res = await updateCaPermission(id, nextPerm);
    setLoading(false);

    if (res.success) {
      setMessage({ text: `Permission updated to ${nextPerm} successfully.`, type: "success" });
      window.location.reload();
    } else {
      setMessage({ text: res.error || "Failed to update permission.", type: "error" });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "revoked":
      default:
        return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">CA Access Management</h1>
        <p className="text-gray-400 text-sm">
          Invite your Chartered Accountant to view your books, export GST reports, and lock filing periods.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {generatedLink && (
        <div className="p-4 rounded-lg border bg-indigo-950/40 border-indigo-500/30 text-indigo-300 space-y-2">
          <p className="font-semibold text-sm">Testing Helper (Invite Magic Link):</p>
          <p className="text-xs break-all bg-black/30 p-2 rounded border border-indigo-500/20 font-mono">
            {window.location.origin}{generatedLink}
          </p>
          <a
            href={generatedLink}
            className="inline-block text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-3 rounded transition-colors"
          >
            Open Invite Link
          </a>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Section 1: Invite Form */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Invite Chartered Accountant</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">CA's Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ca@firm.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Permission Level</label>
              <select
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="view">View Only</option>
                <option value="download">View + Download</option>
                <option value="comment">View + Download + Comment</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 font-medium transition-colors text-sm disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>

        {/* Section 2: CAs Table */}
        <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Authorized Accountants</h2>

          {clients.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-gray-500">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  ></path>
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No Chartered Accountants invited yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-slate-800 text-gray-400 text-xs">
                    <th className="pb-3 font-medium">CA Email</th>
                    <th className="pb-3 font-medium">Permission</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Invited On</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-800/10">
                      <td className="py-3 text-white font-medium">{client.inviteEmail}</td>
                      <td className="py-3 capitalize text-xs">
                        {client.permissionLevel === "view"
                          ? "View Only"
                          : client.permissionLevel === "download"
                          ? "View + Download"
                          : "View + Download + Comment"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${getStatusBadgeClass(
                            client.status
                          )}`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {new Date(client.invitedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        {client.status !== "revoked" && (
                          <>
                            <button
                              onClick={() => handlePermissionChange(client.id, client.permissionLevel)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                              disabled={loading}
                            >
                              Toggle Perm
                            </button>
                            <button
                              onClick={() => handleRevoke(client.id)}
                              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                              disabled={loading}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
