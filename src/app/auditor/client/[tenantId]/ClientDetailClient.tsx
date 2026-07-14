"use client";

import { useState, useEffect } from "react";
import { lockPeriod, unlockPeriod } from "../../../actions/periods";
import Link from "next/link";
import { formatPeriod } from "../../../../lib/period-utils";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  totalAmount: string;
  deliveryCharge: string | null;
  packagingCharge: string | null;
  items: any;
  status: string;
  type: string;
}

interface Purchase {
  id: string;
  vendorName: string;
  vendorGstin: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  taxableAmount: string;
  cgst: string | null;
  sgst: string | null;
  igst: string | null;
  totalAmount: string;
  hsnCode: string | null;
  category: string | null;
  itcEligible: boolean | null;
}

interface FilingPackage {
  id: string;
  status: string;
  createdAt: string;
  gstr1Url: string | null;
  gstr3bUrl: string | null;
  hsnSummaryUrl: string | null;
}

export default function ClientDetailClient({
  tenantId,
  initialData,
}: {
  tenantId: string;
  initialData: {
    tenant: { businessName: string; gstin: string | null };
    invoices: Invoice[];
    purchases: Purchase[];
    filingHistory: FilingPackage[];
    periodStatus: string;
  };
}) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("invoices");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Month list helper
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

  const years = [2024, 2025, 2026];

  useEffect(() => {
    // For local experience, if selected period changes we trigger page reload with query params
    const params = new URLSearchParams(window.location.search);
    params.set("month", selectedMonth.toString());
    params.set("year", selectedYear.toString());
    window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    // Real App: fetch data for selected period
    const refreshData = async () => {
      setLoading(true);
      const { getClientData } = await import("./actions");
      const res = await getClientData(tenantId, selectedMonth, selectedYear);
      if (res.success && res.tenant) {
        setData({
          tenant: res.tenant,
          invoices: res.invoices as any,
          purchases: res.purchases as any,
          filingHistory: res.filingHistory as any,
          periodStatus: res.periodStatus,
        });
      }
      setLoading(false);
    };
    refreshData();
  }, [selectedMonth, selectedYear]);

  const handleLockToggle = async () => {
    setLoading(true);
    if (data.periodStatus === "open") {
      const res = await lockPeriod(tenantId, selectedMonth, selectedYear);
      if (res.success) {
        setData((prev) => ({ ...prev, periodStatus: "locked" }));
      }
    } else {
      const res = await unlockPeriod(tenantId, selectedMonth, selectedYear);
      if (res.success) {
        setData((prev) => ({ ...prev, periodStatus: "open" }));
      }
    }
    setLoading(false);
  };

  // Calculate GSTR summaries
  const invoicesCount = data.invoices.length;
  const totalSales = data.invoices.reduce((s, i) => s + parseFloat(i.totalAmount || "0"), 0);

  // Simple check: B2B sales have valid looking GSTINs, or let's assume if there are items and tax rate.
  // Wait, let's extract tax totals from items
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxableSales = 0;

  data.invoices.forEach((inv) => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    items.forEach((item: any) => {
      const rate = parseFloat(item.rate || "0");
      const qty = parseFloat(item.qty || "0");
      const taxRate = parseFloat(item.taxRate || "0");
      const taxable = rate * qty;
      taxableSales += taxable;

      // Mock state logic or split tax
      // Let's assume standard split: 50/50 CGST/SGST if no IGST
      const totalTax = (taxable * taxRate) / 100;
      cgstTotal += totalTax / 2;
      sgstTotal += totalTax / 2;
    });
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/auditor/dashboard" className="text-xs text-indigo-400 hover:underline">
              &larr; Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">{data.tenant.businessName}</h1>
          <p className="text-slate-400 text-sm">GSTIN: {data.tenant.gstin || "N/A"}</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-lg">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-slate-950 text-white border-none py-1 px-2 focus:ring-0"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-950 text-white border-none py-1 px-2 focus:ring-0"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800">
        {[
          { id: "invoices", label: "Invoices" },
          { id: "purchases", label: "Purchases" },
          { id: "gstr", label: "GSTR Summary" },
          { id: "history", label: "Filing History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading client data...</div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-6 min-h-[300px]">
          {activeTab === "invoices" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Invoices ({invoicesCount})</h3>
              {data.invoices.length === 0 ? (
                <p className="text-slate-400 text-sm">No sales invoices recorded for this period.</p>
              ) : (
                <table className="w-full text-left text-sm text-gray-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-gray-400 text-xs">
                      <th className="pb-3">Invoice No.</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-800/40 hover:bg-slate-800/10">
                        <td className="py-3 text-white font-medium">{inv.invoiceNumber}</td>
                        <td className="py-3">{inv.customerName}</td>
                        <td className="py-3 text-xs text-gray-400">{inv.invoiceDate}</td>
                        <td className="py-3 text-right font-medium">₹{parseFloat(inv.totalAmount).toFixed(2)}</td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              inv.status === "Paid"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "purchases" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Purchase Entries ({data.purchases.length})</h3>
              {data.purchases.length === 0 ? (
                <p className="text-slate-400 text-sm">No purchase entries recorded for this period.</p>
              ) : (
                <table className="w-full text-left text-sm text-gray-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-gray-400 text-xs">
                      <th className="pb-3">Vendor</th>
                      <th className="pb-3">GSTIN</th>
                      <th className="pb-3">Invoice No.</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-right">Taxable</th>
                      <th className="pb-3 text-right">CGST+SGST/IGST</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((pur) => (
                      <tr key={pur.id} className="border-b border-slate-800/40 hover:bg-slate-800/10">
                        <td className="py-3 text-white font-medium">{pur.vendorName}</td>
                        <td className="py-3 font-mono text-xs">{pur.vendorGstin || "N/A"}</td>
                        <td className="py-3">{pur.invoiceNumber}</td>
                        <td className="py-3 text-xs text-gray-400">{pur.invoiceDate}</td>
                        <td className="py-3 text-right">₹{parseFloat(pur.taxableAmount).toFixed(2)}</td>
                        <td className="py-3 text-right text-xs">
                          {parseFloat(pur.igst || "0") > 0 ? (
                            <span>IGST: ₹{parseFloat(pur.igst || "0").toFixed(2)}</span>
                          ) : (
                            <span>
                              CGST: ₹{parseFloat(pur.cgst || "0").toFixed(2)} <br />
                              SGST: ₹{parseFloat(pur.sgst || "0").toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-medium">₹{parseFloat(pur.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "gstr" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">GSTR Period Summary — {formatPeriod(selectedMonth, selectedYear)}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-slate-400">Outward Supplies (Sales)</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Outward Supplies:</span>
                    <span className="font-semibold text-white">₹{totalSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Taxable Value:</span>
                    <span className="font-semibold text-slate-200">₹{taxableSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">CGST Collected:</span>
                    <span className="font-semibold text-slate-200">₹{cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">SGST Collected:</span>
                    <span className="font-semibold text-slate-200">₹{sgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">IGST Collected:</span>
                    <span className="font-semibold text-slate-200">₹{igstTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-slate-400">Inward Supplies (ITC Claims)</h4>
                  {/* Aggregate purchases */}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Purchase Volume:</span>
                    <span className="font-semibold text-white">
                      ₹{data.purchases.reduce((s, p) => s + parseFloat(p.totalAmount || "0"), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Eligible ITC:</span>
                    <span className="font-semibold text-emerald-400">
                      ₹
                      {data.purchases
                        .filter((p) => p.itcEligible)
                        .reduce(
                          (s, p) =>
                            s +
                            parseFloat(p.cgst || "0") +
                            parseFloat(p.sgst || "0") +
                            parseFloat(p.igst || "0"),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">GST Filing Packages</h3>
              {data.filingHistory.length === 0 ? (
                <p className="text-slate-400 text-sm">No filing packages generated for this period.</p>
              ) : (
                <table className="w-full text-left text-sm text-gray-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-gray-400 text-xs">
                      <th className="pb-3">Date Prepared</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Downloads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.filingHistory.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-slate-800/40 hover:bg-slate-800/10">
                        <td className="py-3 text-slate-300">
                          {new Date(pkg.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-semibold uppercase">
                            {pkg.status}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-3 text-xs text-indigo-400">
                          {pkg.gstr1Url && <a href={pkg.gstr1Url} className="hover:underline">GSTR-1 CSV</a>}
                          {pkg.gstr3bUrl && <a href={pkg.gstr3bUrl} className="hover:underline">GSTR-3B CSV</a>}
                          {pkg.hsnSummaryUrl && <a href={pkg.hsnSummaryUrl} className="hover:underline">HSN CSV</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Filing Period Status:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
              data.periodStatus === "filed"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : data.periodStatus === "locked"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            }`}
          >
            {data.periodStatus}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleLockToggle}
            disabled={loading || data.periodStatus === "filed"}
            className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {data.periodStatus === "open" ? "Lock Period" : "Unlock Period"}
          </button>

          <Link
            href={`/auditor/client/${tenantId}/prepare-filing`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <i className="ti ti-file-export"></i>
            Prepare GST Package
          </Link>
        </div>
      </div>
    </div>
  );
}
