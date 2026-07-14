"use client";

import { useTransition } from "react";
import { switchRole } from "../actions/role";

export default function RoleSwitcher({ currentRole }: { currentRole: "owner" | "auditor" }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (role: "owner" | "auditor") => {
    startTransition(async () => {
      await switchRole(role);
      window.location.reload();
    });
  };

  return (
    <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
      <button
        onClick={() => handleToggle("owner")}
        disabled={isPending}
        className={`px-3 py-1 rounded-md font-medium transition-colors ${
          currentRole === "owner"
            ? "bg-indigo-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Business Owner
      </button>
      <button
        onClick={() => handleToggle("auditor")}
        disabled={isPending}
        className={`px-3 py-1 rounded-md font-medium transition-colors ${
          currentRole === "auditor"
            ? "bg-indigo-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        CA Auditor
      </button>
    </div>
  );
}
