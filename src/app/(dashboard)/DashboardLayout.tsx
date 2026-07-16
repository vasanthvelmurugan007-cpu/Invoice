import React from "react";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth-utils";
import RoleSwitcher from "./RoleSwitcher";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const isOwner = user.role === "owner" || user.role === "admin";

  const ownerLinks = [
    { label: "Dashboard", href: "/", icon: "ti-dashboard" },
    { label: "Purchases", href: "/purchases", icon: "ti-receipt" },
    { label: "CA Access", href: "/settings/ca-access", icon: "ti-users" },
    { label: "Audit Log", href: "/settings/audit-log", icon: "ti-file-text" },
  ];

  const auditorLinks = [
    { label: "My Clients", href: "/auditor/dashboard", icon: "ti-users" },
    { label: "Activity Log", href: "/settings/audit-log", icon: "ti-file-text" },
  ];

  const links = isOwner ? ownerLinks : auditorLinks;

  return (
    <div className="flex h-screen min-h-[600px] font-sans bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/60 backdrop-blur-md border-r border-slate-800 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 min-h-[52px]">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <img src="/invoicehub-logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-sm text-white tracking-wide truncate">InvoiceHub</span>
          {user.role === "admin" ? (
            <span className="text-[10px] bg-gradient-to-r from-amber-500 to-yellow-600 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
              PRO
            </span>
          ) : (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-semibold">
              {user.role}
            </span>
          )}
        </div>
        <div className="flex-1 p-2 overflow-y-auto space-y-1">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors text-sm"
            >
              <i className={`ti ${link.icon} text-lg`} aria-hidden="true"></i>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div>Logged in as:</div>
          <div className="text-white truncate font-medium">{user.email}</div>
        </div>
        <form
          action={async () => {
            "use server";
            const { logoutUser } = await import("../actions/auth");
            await logoutUser();
            const { redirect } = await import("next/navigation");
            redirect("/login");
          }}
          className="p-2 border-t border-slate-800"
        >
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-sm"
          >
            <i className="ti ti-logout text-lg" aria-hidden="true"></i>
            <span>Logout</span>
          </button>
        </form>
      </div>

      {/* Main Section */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Top Header */}
        <div className="bg-slate-900/40 backdrop-blur-md border-b border-slate-800 px-6 h-[52px] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-200">InvoiceHub Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <RoleSwitcher currentRole={user.role === "admin" ? "owner" : user.role} />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-grow p-6 bg-gradient-to-b from-slate-950 to-slate-900 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
