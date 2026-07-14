"use client";

import { useState } from "react";
import { savePurchase, deletePurchase } from "../../actions/purchases";
import { validateGstin, getStateCode, isSameState } from "../../../lib/gstin-utils";

interface Purchase {
  id: string;
  vendorName: string;
  vendorGstin: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  category: string | null;
  hsnCode: string | null;
  taxableAmount: string;
  cgst: string | null;
  sgst: string | null;
  igst: string | null;
  totalAmount: string;
  itcEligible: boolean | null;
}

export default function PurchasesClient({
  initialPurchases,
  businessGstin,
}: {
  initialPurchases: Purchase[];
  businessGstin: string | null;
}) {
  const [purchasesList, setPurchasesList] = useState<Purchase[]>(initialPurchases);
  const [vendorSearch, setVendorSearch] = useState("");
  const [itcFilter, setItcFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [vendorName, setVendorName] = useState("");
  const [vendorGstinField, setVendorGstinField] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [category, setCategory] = useState<"goods" | "services">("goods");
  const [hsnCode, setHsnCode] = useState("");
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [gstRate, setGstRate] = useState(18); // default 18%
  const [itcEligible, setItcEligible] = useState(true);

  // Computed tax values
  const isSameStateCode =
    businessGstin && vendorGstinField && vendorGstinField.length >= 2
      ? isSameState(businessGstin, vendorGstinField)
      : true;

  const totalTax = (taxableAmount * gstRate) / 100;
  const cgst = isSameStateCode ? totalTax / 2 : 0;
  const sgst = isSameStateCode ? totalTax / 2 : 0;
  const igst = !isSameStateCode ? totalTax : 0;
  const totalAmount = taxableAmount + totalTax;

  const openAddModal = () => {
    setEditItem(null);
    setVendorName("");
    setVendorGstinField("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setCategory("goods");
    setHsnCode("");
    setTaxableAmount(0);
    setGstRate(18);
    setItcEligible(true);
    setShowModal(true);
  };

  const openEditModal = (p: Purchase) => {
    setEditItem(p);
    setVendorName(p.vendorName);
    setVendorGstinField(p.vendorGstin || "");
    setInvoiceNumber(p.invoiceNumber);
    setInvoiceDate(p.invoiceDate);
    setCategory((p.category as any) || "goods");
    setHsnCode(p.hsnCode || "");
    setTaxableAmount(parseFloat(p.taxableAmount));
    // Determine gstRate based on total tax vs taxable
    const totalTaxVal = parseFloat(p.totalAmount) - parseFloat(p.taxableAmount);
    const calculatedRate = Math.round((totalTaxVal / parseFloat(p.taxableAmount)) * 100) || 18;
    setGstRate([0, 5, 12, 18, 28].includes(calculatedRate) ? calculatedRate : 18);
    setItcEligible(!!p.itcEligible);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !invoiceNumber) {
      alert("Please fill in all required fields.");
      return;
    }

    if (vendorGstinField && !validateGstin(vendorGstinField)) {
      alert("Invalid GSTIN format. Must be a 15-char alphanumeric string.");
      return;
    }

    setLoading(true);
    const res = await savePurchase({
      id: editItem?.id,
      vendorName,
      vendorGstin: vendorGstinField.toUpperCase().trim(),
      invoiceNumber,
      invoiceDate,
      category,
      hsnCode,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
      itcEligible,
    });
    setLoading(false);

    if (res.success) {
      setShowModal(false);
      window.location.reload();
    } else {
      alert(res.error || "Failed to save purchase.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase entry?")) return;
    setLoading(true);
    const res = await deletePurchase(id);
    setLoading(false);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete purchase.");
    }
  };

  const filteredPurchases = purchasesList.filter((p) => {
    const matchesSearch = p.vendorName.toLowerCase().includes(vendorSearch.toLowerCase());
    const matchesItc = !itcFilter || p.itcEligible;
    return matchesSearch && matchesItc;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Purchase Register</h1>
          <p className="text-slate-400 text-sm">Log and track your inward supplies and Input Tax Credit (ITC).</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 font-medium transition-colors text-sm flex items-center gap-2"
        >
          <i className="ti ti-plus"></i> Add Purchase
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search vendor name..."
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="itcFilter"
            checked={itcFilter}
            onChange={(e) => setItcFilter(e.target.checked)}
            className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="itcFilter" className="text-sm text-slate-300 cursor-pointer">
            Show ITC Eligible Only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-5">
        {filteredPurchases.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 text-gray-500">
              <i className="ti ti-receipt text-xl"></i>
            </div>
            <p className="text-gray-400 text-sm">No purchases recorded yet. Add your first vendor bill.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead>
                <tr className="border-b border-slate-800 text-gray-400 text-xs">
                  <th className="pb-3 font-medium">Vendor</th>
                  <th className="pb-3 font-medium">GSTIN</th>
                  <th className="pb-3 font-medium">Invoice No.</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Taxable</th>
                  <th className="pb-3 font-medium text-right">GST</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-center">ITC</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredPurchases.map((p) => {
                  const gst = parseFloat(p.cgst || "0") + parseFloat(p.sgst || "0") + parseFloat(p.igst || "0");
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/10">
                      <td className="py-3 text-white font-medium">{p.vendorName}</td>
                      <td className="py-3 font-mono text-xs text-slate-400">{p.vendorGstin || "N/A"}</td>
                      <td className="py-3">{p.invoiceNumber}</td>
                      <td className="py-3 text-xs text-slate-500">{p.invoiceDate}</td>
                      <td className="py-3 text-right">₹{parseFloat(p.taxableAmount).toFixed(2)}</td>
                      <td className="py-3 text-right">₹{gst.toFixed(2)}</td>
                      <td className="py-3 text-right text-white font-medium">₹{parseFloat(p.totalAmount).toFixed(2)}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            p.itcEligible
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-500/20 text-slate-400"
                          }`}
                        >
                          {p.itcEligible ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {editItem ? "Edit Purchase Entry" : "Add Purchase Entry"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Vendor GSTIN</label>
                  <input
                    type="text"
                    value={vendorGstinField}
                    onChange={(e) => setVendorGstinField(e.target.value)}
                    placeholder="e.g. 27AAACR5678Q1Z2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="goods">Goods</option>
                    <option value="services">Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Taxable Amount *</label>
                  <input
                    type="number"
                    required
                    value={taxableAmount}
                    onChange={(e) => setTaxableAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">GST Rate *</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              {/* Tax Breakdowns Info */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Computed Tax Breakdown:</span>
                  <span className="font-semibold text-slate-300">
                    {isSameStateCode ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"}
                  </span>
                </div>
                {isSameStateCode ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST ({gstRate / 2}%):</span>
                      <span className="text-white">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({gstRate / 2}%):</span>
                      <span className="text-white">₹{sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST ({gstRate}%):</span>
                    <span className="text-white">₹{igst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-semibold">
                  <span className="text-slate-300">Total Auto-Computed:</span>
                  <span className="text-indigo-400">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="itcEligible"
                  checked={itcEligible}
                  onChange={(e) => setItcEligible(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="itcEligible" className="text-xs text-slate-300 cursor-pointer">
                  Eligible for Input Tax Credit (ITC)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  {loading ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
