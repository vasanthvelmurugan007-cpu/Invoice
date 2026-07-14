import RoleSwitcher from "../../(dashboard)/RoleSwitcher";
import { getCurrentUser } from "../../../lib/auth-utils";

export default async function NoAccessPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center p-8 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl space-y-4 max-w-md w-full">
        <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl">
          <i className="ti ti-alert-triangle"></i>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Access Restricted</h2>
        <p className="text-slate-300 text-sm">
          You don't have any active client connections. Ask your client to invite you via InvoiceHub.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-3">
        <span className="text-xs text-slate-400">Testing Tools: Switch back to Owner</span>
        <RoleSwitcher currentRole={user.role === "admin" ? "owner" : user.role} />
      </div>
    </div>
  );
}
