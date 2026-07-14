"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { acceptCaInvite } from "../../actions/ca-access";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const res = await acceptCaInvite(token);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/auditor/dashboard");
      }, 2000);
    } else {
      setError(res.error || "Failed to accept invitation");
    }
  };

  if (!token) {
    return (
      <div className="text-center p-6 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl space-y-4 max-w-md w-full">
        <h2 className="text-xl font-bold text-rose-400">Invalid Link</h2>
        <p className="text-slate-300 text-sm">
          The invitation link you followed is missing the required validation token. Please contact the business owner.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center p-8 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl space-y-6 max-w-md w-full">
      <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto text-2xl">
        <i className="ti ti-mail-opened"></i>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">CA Auditor Invitation</h2>
        <p className="text-slate-400 text-sm mt-1">
          You have been invited to manage a client's business accounts on InvoiceHub.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg">
          {error}
        </div>
      )}

      {success ? (
        <div className="p-4 text-sm bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg space-y-2">
          <p className="font-semibold">Invitation accepted successfully!</p>
          <p className="text-xs text-emerald-400">Redirecting to CA Dashboard...</p>
        </div>
      ) : (
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 font-semibold transition-colors text-sm disabled:opacity-50"
        >
          {loading ? "Accepting..." : "Accept & Join as Auditor"}
        </button>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400">Loading invitation details...</div>}>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
