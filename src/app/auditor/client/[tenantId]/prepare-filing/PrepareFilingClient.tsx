"use client";

import { useState, useEffect } from "react";
import { validateFilingData, generateFilingPackageFile, markPeriodAsFiled } from "./actions";
import Link from "next/link";

export default function PrepareFilingClient({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const [step, setStep] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Step 1 states
  const [summary, setSummary] = useState<{ invoiceCount: number } | null>(null);

  // Step 2 states
  const [validationResults, setValidationResults] = useState<any>(null);
  const [hasFailedCritical, setHasFailedCritical] = useState(false);

  // Step 3 states
  const [gstr1Generated, setGstr1Generated] = useState(false);
  const [gstr3bGenerated, setGstr3bGenerated] = useState(false);
  const [hsnGenerated, setHsnGenerated] = useState(false);
  const [packageId, setPackageId] = useState<string | null>(null);

  // Step 4 states
  const [confirmGstr1, setConfirmGstr1] = useState(false);
  const [confirmGstr3b, setConfirmGstr3b] = useState(false);
  const [confirmPortal, setConfirmPortal] = useState(false);
  const [confirmClient, setConfirmClient] = useState(false);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleNextStep1 = async () => {
    setLoading(true);
    const res = await validateFilingData(tenantId, selectedMonth, selectedYear);
    setLoading(false);

    if (res.success) {
      setSummary({ invoiceCount: res.invoiceCount ?? 0 });
      setValidationResults(res.checks);
      setHasFailedCritical(!!res.hasFailedCritical);
      setStep(2);
    } else {
      alert(res.error || "Failed to load validation data.");
    }
  };

  const handleGenerate = async (type: "gstr-1" | "gstr-3b" | "hsn") => {
    setLoading(true);
    const res = await generateFilingPackageFile(tenantId, selectedMonth, selectedYear, type);
    setLoading(false);

    if (res.success) {
      if (type === "gstr-1") setGstr1Generated(true);
      if (type === "gstr-3b") setGstr3bGenerated(true);
      if (type === "hsn") setHsnGenerated(true);
      if (res.packageId) setPackageId(res.packageId);
    } else {
      alert(res.error || "Generation failed.");
    }
  };

  const handleFilePeriod = async () => {
    if (!packageId) return;
    setLoading(true);
    const res = await markPeriodAsFiled(tenantId, selectedMonth, selectedYear, packageId);
    setLoading(false);

    if (res.success) {
      alert("Filing process completed successfully!");
      window.location.href = `/auditor/client/${tenantId}`;
    } else {
      alert(res.error || "Failed to mark as filed.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href={`/auditor/client/${tenantId}`} className="text-xs text-indigo-400 hover:underline">
          &larr; Back to Client
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">GST Filing Preparer</h1>
        <p className="text-slate-400 text-sm">Client: {tenantName}</p>
      </div>

      {/* Step Progress Bar */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-4">
        {[
          { num: 1, label: "Select Period" },
          { num: 2, label: "Validate Data" },
          { num: 3, label: "Generate Files" },
          { num: 4, label: "Confirm Upload" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {s.num}
            </span>
            <span className={`text-xs ${step >= s.num ? "text-slate-100" : "text-slate-500"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-6 min-h-[300px]">
        {step === 1 && (
          <div className="space-y-6 max-w-md">
            <div>
              <h2 className="text-lg font-semibold text-white">Select Return Filing Period</h2>
              <p className="text-xs text-slate-400">Select the month and year of sales record to file.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleNextStep1}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg py-2 px-6 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze Period Data &rarr;"}
            </button>
          </div>
        )}

        {step === 2 && validationResults && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Data Validation Checklist</h2>
              <p className="text-xs text-slate-400">Review system audit check before file generation.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  key: "noDuplicateInvoices",
                  label: "No Duplicate Invoice Numbers",
                  desc: "Ensures every invoice has a unique identifier.",
                },
                {
                  key: "hsnFormat",
                  label: "Valid HSN/SAC Codes",
                  desc: "HSN codes must be exactly 4 or 8 digits.",
                },
                {
                  key: "noZeroTax",
                  label: "No Zero Tax on Taxable Goods",
                  desc: "Checks that goods have non-zero tax rates where expected.",
                },
                {
                  key: "dateInPeriod",
                  label: "Dates Match Selection Period",
                  desc: "All invoices must fall inside the selected month.",
                },
              ].map((check) => {
                const result = validationResults[check.key];
                return (
                  <div key={check.key} className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{check.label}</h4>
                        <p className="text-xs text-slate-500">{check.desc}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          result.pass ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {result.pass ? "✓ PASS" : "✗ FAIL"}
                      </span>
                    </div>
                    {!result.pass && result.errors.length > 0 && (
                      <div className="mt-2 text-xs text-rose-300 font-mono space-y-0.5 bg-rose-950/20 p-2 rounded border border-rose-950/30">
                        {result.errors.map((e: string, i: number) => (
                          <div key={i}>{e}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
              >
                &larr; Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={hasFailedCritical}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Proceed to Generation &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Returns Package</h2>
              <p className="text-xs text-slate-400">Generate monthly tables required for Government portal filing.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl flex flex-col justify-between items-center text-center space-y-4">
                <div>
                  <h4 className="font-semibold text-white">GSTR-1 Outward Supplies</h4>
                  <p className="text-xs text-slate-500 mt-1">Contains all B2B sales invoices and credit notes.</p>
                </div>
                {gstr1Generated ? (
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded">Generated</span>
                ) : (
                  <button
                    onClick={() => handleGenerate("gstr-1")}
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded text-xs font-medium"
                  >
                    {loading ? "Generating..." : "Generate CSV"}
                  </button>
                )}
              </div>

              <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl flex flex-col justify-between items-center text-center space-y-4">
                <div>
                  <h4 className="font-semibold text-white">GSTR-3B Monthly Return</h4>
                  <p className="text-xs text-slate-500 mt-1">Aggregated sales and Input Tax Credit summary.</p>
                </div>
                {gstr3bGenerated ? (
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded">Generated</span>
                ) : (
                  <button
                    onClick={() => handleGenerate("gstr-3b")}
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded text-xs font-medium"
                  >
                    {loading ? "Generating..." : "Generate CSV"}
                  </button>
                )}
              </div>

              <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl flex flex-col justify-between items-center text-center space-y-4">
                <div>
                  <h4 className="font-semibold text-white">HSN Wise Summary</h4>
                  <p className="text-xs text-slate-500 mt-1">HSN aggregations as required by GSTR-1 Table 12.</p>
                </div>
                {hsnGenerated ? (
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded">Generated</span>
                ) : (
                  <button
                    onClick={() => handleGenerate("hsn")}
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded text-xs font-medium"
                  >
                    {loading ? "Generating..." : "Generate CSV"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
              >
                &larr; Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!gstr1Generated || !gstr3bGenerated || !hsnGenerated}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Go to Upload Confirmation &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Filing Upload Confirmation</h2>
              <p className="text-xs text-slate-400">Acknowledge filing on GST Portal before marking as complete.</p>
            </div>

            <div className="space-y-3 bg-slate-950 p-5 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confG1"
                  checked={confirmGstr1}
                  onChange={(e) => setConfirmGstr1(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600"
                />
                <label htmlFor="confG1" className="text-sm text-slate-300 cursor-pointer">
                  I have reviewed GSTR-1 data tables.
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confG3"
                  checked={confirmGstr3b}
                  onChange={(e) => setConfirmGstr3b(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600"
                />
                <label htmlFor="confG3" className="text-sm text-slate-300 cursor-pointer">
                  I have reviewed GSTR-3B summary values.
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confPortal"
                  checked={confirmPortal}
                  onChange={(e) => setConfirmPortal(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600"
                />
                <label htmlFor="confPortal" className="text-sm text-slate-300 cursor-pointer">
                  I have uploaded generated CSV packages to the GST Common Portal.
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confClient"
                  checked={confirmClient}
                  onChange={(e) => setConfirmClient(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600"
                />
                <label htmlFor="confClient" className="text-sm text-slate-300 cursor-pointer">
                  Client has been informed of filing draft.
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
              >
                &larr; Back
              </button>
              <button
                onClick={handleFilePeriod}
                disabled={!confirmGstr1 || !confirmGstr3b || !confirmPortal || !confirmClient}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Mark Return as Filed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
