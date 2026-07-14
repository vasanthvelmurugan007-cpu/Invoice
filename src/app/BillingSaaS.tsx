"use client";
import { useState, useRef, useEffect } from "react";
import { HsnAutocomplete } from "../components/hsn-autocomplete";


const MODULES = ["Dashboard", "Invoices", "Delivery Challan", "Customers", "Products", "GSTR Export", "Settings"];

const initialSettings = {
  companyName: "Your Company Name",
  gstin: "27ABCCT2727Q1ZX",
  address: "64, Whitefield Main Rd, Palm Meadows",
  city: "Bengaluru",
  state: "KARNATAKA",
  pincode: "560066",
  mobile: "+91 9999999999",
  bankName: "YES BANK",
  accountNo: "66789999222445",
  ifsc: "YESBBIN4567",
  branch: "Koramangala",
  upiId: "yourcompany@yesbank",
  invoiceTemplate: "classic",
};

const initialCustomers = [
  { id: 1, name: "Kishore Biyani", gstin: "29AABCK1234P1Z5", phone: "9999999999", address: "64, Whitefield Main Rd", city: "Bengaluru", state: "KARNATAKA", pincode: "560066" },
  { id: 2, name: "Rajan Mehta Traders", gstin: "27AAACR5678Q1Z2", phone: "9888888888", address: "12, MG Road", city: "Mumbai", state: "MAHARASHTRA", pincode: "400001" },
];

const initialProducts = [
  { id: 1, name: "Haldirams Samosa 200g", hsn: "392310", unit: "NOS", rate: 61.90, taxRate: 5 },
  { id: 2, name: "Britannia Whole Wheat Bread", hsn: "392310", unit: "NOS", rate: 42.86, taxRate: 5 },
  { id: 3, name: "Surf Excel Easy Wash 1kg", hsn: "392310", unit: "KGS", rate: 122.03, taxRate: 5 },
  { id: 4, name: "Sanitizer", hsn: "392310", unit: "NOS", rate: 127.12, taxRate: 5 },
  { id: 5, name: "Utensils Set", hsn: "76151030", unit: "NOS", rate: 1784.82, taxRate: 12 },
  { id: 6, name: "Kitchen Towel Set", hsn: "392310", unit: "NOS", rate: 94.29, taxRate: 5 },
  { id: 7, name: "Green Cotton Bedsheet", hsn: "392310", unit: "NOS", rate: 339.29, taxRate: 5 },
  { id: 8, name: "Premium Medjool Dates", hsn: "392310", unit: "KGS", rate: 1875.00, taxRate: 5 },
  { id: 9, name: "Fortune Sunflower Oil", hsn: "392310", unit: "LTR", rate: 200.00, taxRate: 5 },
  { id: 10, name: "Haldiram's Bhujia Sev", hsn: "8708", unit: "NOS", rate: 190.48, taxRate: 5 },
];

const demoInvoices = [
  { id: "INV-3", date: "12 Apr 2025", customer: "Kishore Biyani", total: 9678, status: "Paid", type: "Invoice" },
  { id: "INV-2", date: "05 Apr 2025", customer: "Rajan Mehta Traders", total: 14250, status: "Unpaid", type: "Invoice" },
  { id: "DC-1", date: "02 Apr 2025", customer: "Kishore Biyani", total: 3200, status: "Delivered", type: "DC" },
];

function getNumberWords(num) {
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const n = Math.round(num);
  if (n === 0) return "Zero";
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? " " + a[n%10] : "");
    if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + inWords(n%100) : "");
    if (n < 100000) return inWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + inWords(n%1000) : "");
    if (n < 10000000) return inWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + inWords(n%100000) : "");
    return inWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + inWords(n%10000000) : "");
  };
  return inWords(n);
}
function numberToWords(num) {
  return "INR " + getNumberWords(num) + " Rupees Only. E & O.E";
}

export function generateInvoiceHtml(invoice, settings, customers, copyTitle) {
  const customer = customers.find(c => c.name === invoice.customer) || {};
  const items = invoice.items || [];
  const getItemDetailsStr = (item: any) => {
    const details = [];
    if (item.hsn) details.push(`HSN: ${item.hsn}`);
    if (item.materialCode) details.push(`Material Code: ${item.materialCode}`);
    if (item.dcNumber) details.push(`DC No: ${item.dcNumber}`);
    if (item.dcDate) details.push(`DC Date: ${item.dcDate}`);
    if (item.poNumber) details.push(`PO No: ${item.poNumber}`);
    if (item.poDate) details.push(`PO Date: ${item.poDate}`);
    return details.join(" | ");
  };

  const taxGroups = {};
  items.forEach(item => {
    const taxable = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    const key = item.hsn + "_" + item.taxRate;
    if (!taxGroups[key]) taxGroups[key] = { hsn: item.hsn, rate: Number(item.taxRate), taxable: 0 };
    taxGroups[key].taxable += taxable;
  });

  const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
  const deliveryCharge = Number(invoice.deliveryCharge) || 0;
  const packagingCharge = Number(invoice.packagingCharge) || 0;
  const taxableAmount = subtotal + deliveryCharge + packagingCharge;
  const totalTax = (Object.values(taxGroups) as any[]).reduce((s: number, g: any) => s + (g.taxable * g.rate / 100), 0);
  const grandTotal = Math.round(taxableAmount + totalTax);
  const totalQty = items.reduce((s: number, i: any) => s + (Number(i.qty) || 0), 0);

  const stateCode = settings.state === "KARNATAKA" ? "29" : settings.state === "MAHARASHTRA" ? "27" : "29";

  if (template === "retro") {
    return `
      <div style="max-width: 800px; margin: auto; padding: 25px; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 11px; background: #fff; line-height: 1.4; border: 4px solid #000;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 4px double #000; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="font-size: 26px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${settings.companyName}</h1>
          <div style="font-size: 11px; margin-top: 5px;">
            ${settings.address}, ${settings.city}, ${settings.state} - ${settings.pincode}<br>
            GSTIN: ${settings.gstin} | PHONE: ${settings.mobile}
          </div>
        </div>

        <!-- Meta info -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #000;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-bottom: 10px; border: none;">
              <div style="font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-bottom: 5px;">BILL TO:</div>
              <div style="font-weight: bold;">${invoice.customer}</div>
              <div>${customer.address || ""}</div>
              <div>${customer.city || ""}, ${customer.state || ""} ${customer.pincode || ""}</div>
              <div>GSTIN: ${customer.gstin || "N/A"}</div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-bottom: 10px; text-align: right; border: none;">
              <div style="display: inline-block; text-align: left;">
                <div><strong>DOC TYPE:</strong> ${invoice.type === "DC" ? "DELIVERY CHALLAN" : "TAX INVOICE"}</div>
                <div><strong>DOC NUMBER:</strong> ${invoice.id}</div>
                <div><strong>DATE:</strong> ${invoice.date}</div>
                <div><strong>COPY:</strong> ${copyTitle}</div>
                ${invoice.vehicleNumber ? `<div><strong>VEHICLE NO:</strong> ${invoice.vehicleNumber}</div>` : ""}
                ${invoice.poNumber ? `<div><strong>PO NO:</strong> ${invoice.poNumber}</div>` : ""}
                ${invoice.poDate ? `<div><strong>PO DATE:</strong> ${invoice.poDate}</div>` : ""}
                ${invoice.poItem ? `<div><strong>PO ITEM:</strong> ${invoice.poItem}</div>` : ""}
              </div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000;">
          <thead>
            <tr style="border-bottom: 2px solid #000; background: #e2e8f0;">
              <th style="padding: 6px; border: 1px solid #000; text-align: center; width: 6%;">SL</th>
              <th style="padding: 6px; border: 1px solid #000; text-align: left;">ITEM DESCRIPTION</th>
              <th style="padding: 6px; border: 1px solid #000; text-align: center; width: 12%;">QTY</th>
              ${invoice.hidePriceForDC ? '' : `
              <th style="padding: 6px; border: 1px solid #000; text-align: right; width: 14%;">RATE</th>
              <th style="padding: 6px; border: 1px solid #000; text-align: center; width: 10%;">GST</th>
              <th style="padding: 6px; border: 1px solid #000; text-align: right; width: 14%;">TOTAL</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
            <tr style="border-bottom: 1px solid #000;">
              <td style="padding: 6px; border: 1px solid #000; text-align: center;">${i+1}</td>
              <td style="padding: 6px; border: 1px solid #000;"><strong>${item.name.toUpperCase()}</strong>${getItemDetailsStr(item) ? `<br><span style="font-size: 9px;">${getItemDetailsStr(item)}</span>` : ""}</td>
              <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.qty} ${item.unit}</td>
              ${invoice.hidePriceForDC ? '' : `
              <td style="padding: 6px; border: 1px solid #000; text-align: right;">${(Number(item.rate) || 0).toFixed(2)}</td>
              <td style="padding: 6px; border: 1px solid #000; text-align: center;">${item.taxRate}%</td>
              <td style="padding: 6px; border: 1px solid #000; text-align: right; font-weight: bold;">${((Number(item.qty) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
              `}
            </tr>`).join("")}
          </tbody>
        </table>

        <!-- Summary Totals -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 55%; vertical-align: top; border: none; padding-right: 15px;">
              <div style="font-weight: bold; margin-bottom: 5px;">AMOUNT IN WORDS:</div>
              <div style="font-style: italic; border: 1px dashed #000; padding: 8px;">
                ${invoice.hidePriceForDC ? `TOTAL QUANTITY: ${getNumberWords(totalQty)} UNITS` : `${numberToWords(grandTotal).toUpperCase()}`}
              </div>
            </td>
            <td style="width: 45%; vertical-align: top; border: none;">
              ${invoice.hidePriceForDC ? '' : `
              <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px;">
                <tr>
                  <td style="padding: 5px; border: 1px solid #000; text-align: right;">SUBTOTAL</td>
                  <td style="padding: 5px; border: 1px solid #000; text-align: right; font-weight: bold;">${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px; border: 1px solid #000; text-align: right;">TAXABLE AMT</td>
                  <td style="padding: 5px; border: 1px solid #000; text-align: right;">${taxableAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px; border: 1px solid #000; text-align: right;">TOTAL TAX</td>
                  <td style="padding: 5px; border: 1px solid #000; text-align: right;">${totalTax.toFixed(2)}</td>
                </tr>
                <tr style="background: #e2e8f0; font-weight: bold;">
                  <td style="padding: 6px; border: 1px solid #000; text-align: right;">GRAND TOTAL</td>
                  <td style="padding: 6px; border: 1px solid #000; text-align: right; font-size: 12px;">₹${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
              `}
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
          <tr>
            <td style="border: none; vertical-align: bottom;">
              <span style="font-weight: bold; border: 2px solid #000; padding: 4px 8px;">ORIGINAL COPY</span>
            </td>
            <td style="border: none; text-align: right; width: 220px; vertical-align: bottom;">
              <div style="font-size: 9px; margin-bottom: 35px;">FOR <strong>${settings.companyName.toUpperCase()}</strong></div>
              <div style="border-top: 2px solid #000; padding-top: 4px; text-align: center; font-weight: bold;">AUTH SIGNATORY</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  if (template === "corporate") {
    return `
      <div style="max-width: 800px; margin: auto; padding: 35px; font-family: 'Segoe UI', Roboto, sans-serif; color: #334155; font-size: 11px; background: #fff; line-height: 1.5;">
        <!-- Banner Head -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border-bottom: 3px solid #0f172a; padding-bottom: 10px;">
          <tr>
            <td style="border: none; padding: 0; vertical-align: middle;">
              <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${settings.companyName}</h1>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">GSTIN: ${settings.gstin} | Mob: ${settings.mobile}</div>
            </td>
            <td style="border: none; padding: 0; vertical-align: middle; text-align: right;">
              <span style="background: #0f172a; color: #fff; font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                ${invoice.type === "DC" ? "DELIVERY CHALLAN" : "TAX INVOICE"}
              </span>
            </td>
          </tr>
        </table>

        <!-- Grid info -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <td style="width: 35%; vertical-align: top; border: none; padding: 0;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; min-height: 110px;">
                <div style="font-weight: bold; color: #0f172a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">FROM:</div>
                <div style="font-weight: bold; color: #1e293b;">${settings.companyName}</div>
                <div style="color: #64748b; font-size: 10px; margin-top: 2px;">
                  ${settings.address}<br>${settings.city}, ${settings.state} ${settings.pincode}
                </div>
              </div>
            </td>
            <td style="width: 35%; vertical-align: top; border: none; padding: 0 10px;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; min-height: 110px;">
                <div style="font-weight: bold; color: #0f172a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">BILL TO:</div>
                <div style="font-weight: bold; color: #1e293b;">${invoice.customer}</div>
                <div style="color: #64748b; font-size: 10px; margin-top: 2px;">
                  ${customer.address || ""}<br>${customer.city || ""}, ${customer.state || ""} ${customer.pincode || ""}<br>
                  GSTIN: ${customer.gstin || "N/A"}
                </div>
              </div>
            </td>
            <td style="width: 30%; vertical-align: top; border: none; padding: 0;">
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; min-height: 110px;">
                <div style="font-weight: bold; color: #0f172a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">SUMMARY:</div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 10px;">
                  <strong>Doc No:</strong> <span>${invoice.id}</span>
                  <strong>Date:</strong> <span>${invoice.date}</span>
                  <strong>Copy:</strong> <span>${copyTitle}</span>
                  ${invoice.vehicleNumber ? `<strong>Vehicle:</strong> <span>${invoice.vehicleNumber}</span>` : ""}
                  ${invoice.poNumber ? `<strong>PO No:</strong> <span>${invoice.poNumber}</span>` : ""}
                  ${invoice.poDate ? `<strong>PO Date:</strong> <span>${invoice.poDate}</span>` : ""}
                  ${invoice.poItem ? `<strong>PO Item:</strong> <span>${invoice.poItem}</span>` : ""}
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #334155; color: #fff;">
              <th style="padding: 8px 10px; text-align: center; width: 5%; font-weight: 600;">#</th>
              <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Description</th>
              <th style="padding: 8px 10px; text-align: center; width: 10%; font-weight: 600;">Qty</th>
              ${invoice.hidePriceForDC ? '' : `
              <th style="padding: 8px 10px; text-align: right; width: 15%; font-weight: 600;">Rate</th>
              <th style="padding: 8px 10px; text-align: center; width: 10%; font-weight: 600;">Tax</th>
              <th style="padding: 8px 10px; text-align: right; width: 15%; font-weight: 600;">Total</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 10px; text-align: center;">${i+1}</td>
              <td style="padding: 8px 10px;"><strong style="color: #1e293b;">${item.name}</strong>${getItemDetailsStr(item) ? `<br><span style="font-size: 9px; color:#64748b;">${getItemDetailsStr(item)}</span>` : ""}</td>
              <td style="padding: 8px 10px; text-align: center;">${item.qty} ${item.unit}</td>
              ${invoice.hidePriceForDC ? '' : `
              <td style="padding: 8px 10px; text-align: right;">${(Number(item.rate) || 0).toFixed(2)}</td>
              <td style="padding: 8px 10px; text-align: center; color: #64748b;">${item.taxRate}%</td>
              <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #1e293b;">${((Number(item.qty) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
              `}
            </tr>`).join("")}
          </tbody>
        </table>

        <!-- Totals & Summary -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr>
            <td style="width: 60%; vertical-align: top; border: none; padding-right: 20px;">
              <div style="font-size: 9px; color: #64748b; margin-bottom: 4px;">Remarks & Words:</div>
              <div style="font-style: italic; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
                ${invoice.hidePriceForDC ? `Total Quantity: ${getNumberWords(totalQty)} Units Only` : `${numberToWords(grandTotal)}`}
              </div>
            </td>
            <td style="width: 40%; vertical-align: top; border: none;">
              ${invoice.hidePriceForDC ? '' : `
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10px;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">Subtotal</td>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; width: 45%;">${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">Taxable Amount</td>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">${taxableAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">Tax Total</td>
                  <td style="padding: 5px 8px; border-bottom: 1px solid #cbd5e1; text-align: right;">${totalTax.toFixed(2)}</td>
                </tr>
                <tr style="background: #e2e8f0; font-weight: bold;">
                  <td style="padding: 6px 8px; text-align: right; font-size: 12px; color: #0f172a;">Grand Total</td>
                  <td style="padding: 6px 8px; text-align: right; font-size: 12px; color: #0f172a;">₹${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
              `}
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <tr>
            <td style="border: none; vertical-align: bottom;">
              <span style="font-weight: bold; color: #64748b;">THANK YOU FOR YOUR BUSINESS</span>
            </td>
            <td style="border: none; text-align: right; width: 220px; vertical-align: bottom;">
              <div style="font-size: 9px; margin-bottom: 35px;">For <strong>${settings.companyName}</strong></div>
              <div style="border-top: 1px solid #94a3b8; padding-top: 2px; text-align: center;">Authorized Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  if (template === "minimal") {
    return `
      <div style="max-width: 800px; margin: auto; padding: 40px; font-family: 'Inter', system-ui, sans-serif; color: #1e293b; font-size: 11px; background: #fff; line-height: 1.6;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <tr>
            <td style="border: none; padding: 0; vertical-align: top;">
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #6366f1; font-weight: bold;">${invoice.type === "DC" ? "DELIVERY CHALLAN" : "TAX INVOICE"}</span>
              <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 5px 0 0 0; text-transform: uppercase;">${settings.companyName}</h1>
            </td>
            <td style="border: none; padding: 0; vertical-align: top; text-align: right;">
              <div style="font-size: 11px; color: #64748b;">
                <div><strong>Invoice ID:</strong> ${invoice.id}</div>
                <div><strong>Date:</strong> ${invoice.date}</div>
                <div><strong>Copy:</strong> ${copyTitle}</div>
                ${invoice.vehicleNumber ? `<div><strong>Vehicle:</strong> ${invoice.vehicleNumber}</div>` : ""}
                ${invoice.poNumber ? `<div><strong>PO No:</strong> ${invoice.poNumber}</div>` : ""}
                ${invoice.poDate ? `<div><strong>PO Date:</strong> ${invoice.poDate}</div>` : ""}
                ${invoice.poItem ? `<div><strong>PO Item:</strong> ${invoice.poItem}</div>` : ""}
              </div>
            </td>
          </tr>
        </table>

        <!-- Details Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr>
            <td style="width: 50%; border: none; padding: 0; vertical-align: top;">
              <div style="border-left: 2px solid #6366f1; padding-left: 12px;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">Sender Details</div>
                <div style="font-weight: 600; color: #0f172a;">${settings.companyName}</div>
                <div>${settings.address}</div>
                <div>${settings.city}, ${settings.state} ${settings.pincode}</div>
                <div>Ph: ${settings.mobile}</div>
                <div>GSTIN: ${settings.gstin}</div>
              </div>
            </td>
            <td style="width: 50%; border: none; padding: 0; vertical-align: top;">
              <div style="border-left: 2px solid #e2e8f0; padding-left: 12px;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">Bill To</div>
                <div style="font-weight: 600; color: #0f172a;">${invoice.customer}</div>
                <div>${customer.address || ""}</div>
                <div>${customer.city || ""}, ${customer.state || ""} ${customer.pincode || ""}</div>
                <div>Ph: ${customer.phone || ""}</div>
                <div>GSTIN: ${customer.gstin || "N/A"}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #0f172a;">
              <th style="padding: 10px 0; text-align: left; font-weight: bold; color: #0f172a; width: 5%;">#</th>
              <th style="padding: 10px 0; text-align: left; font-weight: bold; color: #0f172a;">Item Description</th>
              <th style="padding: 10px 0; text-align: center; font-weight: bold; color: #0f172a; width: 10%;">Qty</th>
              ${invoice.hidePriceForDC ? '' : `
              <th style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a; width: 15%;">Rate</th>
              <th style="padding: 10px 0; text-align: center; font-weight: bold; color: #0f172a; width: 10%;">Tax</th>
              <th style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a; width: 15%;">Total</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0;">${i+1}</td>
              <td style="padding: 10px 0;"><strong style="color:#0f172a;">${item.name}</strong>${getItemDetailsStr(item) ? `<br><span style="font-size:9px; color:#64748b;">${getItemDetailsStr(item)}</span>` : ""}</td>
              <td style="padding: 10px 0; text-align: center;">${item.qty} ${item.unit}</td>
              ${invoice.hidePriceForDC ? '' : `
              <td style="padding: 10px 0; text-align: right;">${(Number(item.rate) || 0).toFixed(2)}</td>
              <td style="padding: 10px 0; text-align: center; color:#64748b;">${item.taxRate}%</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600; color:#0f172a;">${((Number(item.qty) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
              `}
            </tr>`).join("")}
          </tbody>
        </table>

        <!-- Summary -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <tr>
            <td style="width: 55%; border: none; padding: 0; vertical-align: top;">
              <div style="font-size: 10px; color:#64748b;">
                <strong>Amount in Words:</strong><br>
                ${invoice.hidePriceForDC ? `Total Quantity: ${getNumberWords(totalQty)} Units Only` : `${numberToWords(grandTotal)}`}
              </div>
            </td>
            <td style="width: 45%; border: none; padding: 0; vertical-align: top;">
              ${invoice.hidePriceForDC ? '' : `
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr>
                  <td style="padding: 4px 0; color:#64748b;">Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 500;">${subtotal.toFixed(2)}</td>
                </tr>
                ${deliveryCharge > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color:#64748b;">Shipping & Handling</td>
                  <td style="padding: 4px 0; text-align: right;">${deliveryCharge.toFixed(2)}</td>
                </tr>` : ""}
                ${packagingCharge > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color:#64748b;">Packaging</td>
                  <td style="padding: 4px 0; text-align: right;">${packagingCharge.toFixed(2)}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding: 4px 0; color:#64748b;">Taxable Amount</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 500;">${taxableAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#64748b;">Tax Total</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 500;">${totalTax.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #0f172a; font-size: 13px;">
                  <td style="padding: 8px 0; font-weight: 800; color:#0f172a;">Grand Total</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 800; color:#6366f1;">₹${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
              `}
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <tr>
            <td style="border: none; padding: 20px 0 0 0; vertical-align: top;">
              <div style="font-size: 14px; font-weight: 800; color:#6366f1;">THANK YOU</div>
            </td>
            <td style="border: none; padding: 20px 0 0 0; text-align: right; vertical-align: top; width: 220px;">
              <div style="font-size: 10px; color:#64748b; margin-bottom: 40px;">For <strong>${settings.companyName}</strong></div>
              <div style="border-top: 1px solid #cbd5e1; padding-top: 4px; text-align: center; font-size: 10px;">Authorized Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  if (template === "compact") {
    return `
      <div style="max-width: 800px; margin: auto; padding: 15px; font-family: Arial, sans-serif; color: #111; font-size: 10px; background: #fff; line-height: 1.4;">
        <!-- Header Banner -->
        <div style="background: #0f172a; padding: 12px; color: #fff; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div>
            <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${settings.companyName}</h1>
            <div style="font-size: 9px; opacity: 0.8; margin-top: 2px;">GSTIN: ${settings.gstin} | Mob: ${settings.mobile}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">${invoice.type === "DC" ? "DELIVERY CHALLAN" : "TAX INVOICE"}</div>
            <div style="font-size: 9px; opacity: 0.8;">No: ${invoice.id} | Date: ${invoice.date}</div>
          </div>
        </div>

        <!-- Grid info -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 0.5px solid #cbd5e1; border-radius: 4px;">
          <tr>
            <td style="width: 50%; padding: 6px; border-right: 0.5px solid #cbd5e1; vertical-align: top; background: #f8fafc;">
              <span style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Customer details</span>
              <div style="font-weight: bold; margin-top: 2px;">${invoice.customer}</div>
              <div>${customer.address || ""}</div>
              <div>GSTIN: ${customer.gstin || "N/A"}</div>
            </td>
            <td style="width: 50%; padding: 6px; vertical-align: top;">
              <span style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dispatch information</span>
              ${invoice.dcNumber ? `<div style="margin-top: 2px;"><strong>DC Number:</strong> ${invoice.dcNumber}</div>` : ""}
              ${invoice.vehicleNumber ? `<div><strong>Vehicle Number:</strong> ${invoice.vehicleNumber}</div>` : ""}
              ${invoice.poNumber ? `<div><strong>PO Number:</strong> ${invoice.poNumber}</div>` : ""}
              ${invoice.poDate ? `<div><strong>PO Date:</strong> ${invoice.poDate}</div>` : ""}
              ${invoice.poItem ? `<div><strong>PO Item:</strong> ${invoice.poItem}</div>` : ""}
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="background: #1e293b; color: #fff;">
              <th style="padding: 4px 6px; text-align: center; border: 0.5px solid #cbd5e1; width: 4%;">#</th>
              <th style="padding: 4px 6px; text-align: left; border: 0.5px solid #cbd5e1;">Description</th>
              <th style="padding: 4px 6px; text-align: center; border: 0.5px solid #cbd5e1; width: 8%;">Qty</th>
              ${invoice.hidePriceForDC ? '' : `
              <th style="padding: 4px 6px; text-align: right; border: 0.5px solid #cbd5e1; width: 12%;">Rate</th>
              <th style="padding: 4px 6px; text-align: center; border: 0.5px solid #cbd5e1; width: 8%;">GST</th>
              <th style="padding: 4px 6px; text-align: right; border: 0.5px solid #cbd5e1; width: 12%;">Total</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
            <tr>
              <td style="padding: 4px 6px; text-align: center; border: 0.5px solid #cbd5e1;">${i+1}</td>
              <td style="padding: 4px 6px; border: 0.5px solid #cbd5e1;"><strong>${item.name}</strong>${getItemDetailsStr(item) ? ` <span style="font-size: 8px; color: #475569;">(${getItemDetailsStr(item)})</span>` : ""}</td>
              <td style="padding: 4px 6px; text-align: center; border: 0.5px solid #cbd5e1;">${item.qty} ${item.unit}</td>
              ${invoice.hidePriceForDC ? '' : `
              <td style="padding: 4px 6px; text-align: right; border: 0.5px solid #cbd5e1;">${(Number(item.rate) || 0).toFixed(2)}</td>
              <td style="padding: 4px 6px; text-align: center; border: 0.5px solid #cbd5e1;">${item.taxRate}%</td>
              <td style="padding: 4px 6px; text-align: right; border: 0.5px solid #cbd5e1; font-weight: bold;">${((Number(item.qty) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
              `}
            </tr>`).join("")}
          </tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 60%; vertical-align: top; border: none; padding-right: 15px;">
              <div style="font-size: 8px; color: #64748b; margin-bottom: 4px;">Chargeable Amount (Words):</div>
              <div style="font-style: italic; font-weight: bold;">
                ${invoice.hidePriceForDC ? `Total Qty: ${getNumberWords(totalQty)} Units` : `${numberToWords(grandTotal)}`}
              </div>
            </td>
            <td style="width: 40%; vertical-align: top; border: none;">
              ${invoice.hidePriceForDC ? '' : `
              <table style="width: 100%; border-collapse: collapse; border: 0.5px solid #cbd5e1; font-size: 9px;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 3px 6px; border: 0.5px solid #cbd5e1; text-align: right; font-weight: bold;">Subtotal</td>
                  <td style="padding: 3px 6px; border: 0.5px solid #cbd5e1; text-align: right; width: 45%;">${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 6px; border: 0.5px solid #cbd5e1; text-align: right;">Taxable Amount</td>
                  <td style="padding: 3px 6px; border: 0.5px solid #cbd5e1; text-align: right;">${taxableAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 6px; border: 0.5px solid #cbd5e1; text-align: right;">Tax Total</td>
                  <td style="padding: 3px 6px; border: 0.5px solid #cbd5e1; text-align: right;">${totalTax.toFixed(2)}</td>
                </tr>
                <tr style="background: #f1f5f9; font-weight: bold;">
                  <td style="padding: 4px 6px; border: 0.5px solid #cbd5e1; text-align: right; font-size: 11px;">Grand Total</td>
                  <td style="padding: 4px 6px; border: 0.5px solid #cbd5e1; text-align: right; font-size: 11px; color: #020617;">₹${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
              `}
            </td>
          </tr>
        </table>

        <!-- Footer signatures -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="border: none; font-size: 10px; vertical-align: bottom;">
              <span style="font-weight: bold; color: #64748b;">THANK YOU</span>
            </td>
            <td style="border: none; text-align: right; width: 180px;">
              <div style="font-size: 8px; margin-bottom: 25px;">For <strong>${settings.companyName}</strong></div>
              <div style="border-top: 0.5px solid #000; padding-top: 2px; text-align: center; font-size: 8px;">Authorized Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  return `
    <div style="max-width: 800px; margin: auto; padding: 30px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; font-size: 11px; background: #fff;">
      <div style="text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; color: #333;">${invoice.type === "DC" ? "DELIVERY CHALLAN" : "INVOICE"}</div>
      <div style="font-size: 32px; font-weight: bold; color: #d0d0d0; letter-spacing: 2px; margin-bottom: 15px; text-transform: uppercase;">${settings.companyName}</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 60%; vertical-align: top; border: none; padding: 0;">
            <div style="line-height: 1.5; font-size: 11px;">
              <div style="font-weight: bold; font-size: 12px; color: #000;">${settings.companyName}</div>
              <div>${settings.address}</div>
              <div>${settings.city}, ${settings.state} ${settings.pincode}</div>
              <div><strong>Mobile:</strong> ${settings.mobile}</div>
              <div><strong>GSTIN:</strong> ${settings.gstin}</div>
            </div>
          </td>
          <td style="width: 40%; vertical-align: top; text-align: right; border: none; padding: 0;">
            <div style="display: inline-block; text-align: left; font-size: 11px; line-height: 1.5;">
              <div><strong>Date:</strong> ${invoice.date}</div>
              <div><strong>${invoice.type === "DC" ? "DC Num" : "Invoice Num"}:</strong> ${invoice.id}</div>
              <div><strong>Copy:</strong> ${copyTitle}</div>
            </div>
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
        <tr>
          <th style="font-size: 11px; text-align: left; border-bottom: 1px solid #000; padding-bottom: 5px; width: 50%;">BILL TO</th>
          <th style="font-size: 11px; text-align: right; border-bottom: 1px solid #000; padding-bottom: 5px; width: 50%;">DISPATCH DETAILS</th>
        </tr>
        <tr>
          <td style="vertical-align: top; padding-top: 10px; line-height: 1.5; border: none;">
            <div><strong>${invoice.customer}</strong></div>
            <div>${customer.address || ""}</div>
            <div>${customer.city || ""}, ${customer.state || ""} ${customer.pincode || ""}</div>
            <div>Ph: ${customer.phone || ""}</div>
            <div style="margin-top: 5px;"><strong>GSTIN:</strong> ${customer.gstin || "N/A"}</div>
          </td>
          <td style="vertical-align: top; padding-top: 10px; line-height: 1.5; border: none; text-align: right;">
            <div style="display: inline-block; text-align: left;">
              ${invoice.dcNumber ? `<div><strong>DC Number:</strong> ${invoice.dcNumber}</div>` : ""}
              ${invoice.dcDate ? `<div><strong>DC Issue Date:</strong> ${invoice.dcDate}</div>` : ""}
              ${invoice.vehicleNumber ? `<div><strong>Vehicle Number:</strong> ${invoice.vehicleNumber}</div>` : ""}
              ${invoice.poNumber ? `<div><strong>PO Number:</strong> ${invoice.poNumber}</div>` : ""}
              ${invoice.poDate ? `<div><strong>PO Date:</strong> ${invoice.poDate}</div>` : ""}
              ${invoice.poItem ? `<div><strong>PO Item:</strong> ${invoice.poItem}</div>` : ""}
            </div>
          </td>
        </tr>
      </table>


      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr>
            <th style="border: 1px solid #ccc; border-bottom: 2px solid #000; padding: 8px; text-align: center; width: 5%; background-color: #f9f9f9; font-weight: bold; color: #000;">S.No</th>
            <th style="border: 1px solid #ccc; border-bottom: 2px solid #000; padding: 8px; text-align: left; background-color: #f9f9f9; font-weight: bold; color: #000;">DESCRIPTION</th>
            <th style="border: 1px solid #ccc; border-bottom: 2px solid #000; padding: 8px; text-align: center; width: 10%; background-color: #f9f9f9; font-weight: bold; color: #000;">QTY</th>
            ${invoice.hidePriceForDC ? '' : `
            <th style="border: 1px solid #ccc; border-bottom: 2px solid #000; padding: 8px; text-align: right; width: 15%; background-color: #f9f9f9; font-weight: bold; color: #000;">RATE</th>
            <th style="border: 1px solid #ccc; border-bottom: 2px solid #000; padding: 8px; text-align: center; width: 10%; background-color: #f9f9f9; font-weight: bold; color: #000;">TAX</th>
            <th style="border: 1px solid #ccc; border-bottom: 2px solid #000; padding: 8px; text-align: right; width: 15%; background-color: #f9f9f9; font-weight: bold; color: #000;">TOTAL</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${i+1}</td>
            <td style="border: 1px solid #ccc; padding: 8px;"><strong>${item.name}</strong>${getItemDetailsStr(item) ? `<br><span style="font-size:9px; color:#666;">${getItemDetailsStr(item)}</span>` : ""}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${item.qty} ${item.unit}</td>
            ${invoice.hidePriceForDC ? '' : `
            <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${(Number(item.rate) || 0).toFixed(2)}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${item.taxRate}%</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${((Number(item.qty) || 0) * (Number(item.rate) || 0)).toFixed(2)}</td>
            `}
          </tr>`).join("")}
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="width: 60%; vertical-align: top; border: none; padding-right: 20px;">
            <div style="color: #666; margin-bottom: 10px;">Remarks / Instructions:</div>
            <div style="font-style: italic; margin-bottom: 15px;">
              ${invoice.hidePriceForDC ? `Total Quantity (in words):<br>${getNumberWords(totalQty)} Units Only` : `Amount Chargeable (in words):<br>${numberToWords(grandTotal)}`}
            </div>
          </td>
          <td style="width: 40%; vertical-align: top; border: none; padding: 0;">
            ${invoice.hidePriceForDC ? '' : `
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 8px; font-weight: bold; font-size: 10px; text-align: right; border-bottom: 1px solid #eee; width: 60%;">SUBTOTAL</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #ccc; border-bottom: 1px solid #eee; background: #f0f0f0;">${subtotal.toFixed(2)}</td>
              </tr>
              ${deliveryCharge > 0 ? `
              <tr>
                <td style="padding: 6px 8px; font-size: 10px; text-align: right; border-bottom: 1px solid #eee;">SHIPPING/HANDLING</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #ccc; border-bottom: 1px solid #eee;">${deliveryCharge.toFixed(2)}</td>
              </tr>` : ""}
              ${packagingCharge > 0 ? `
              <tr>
                <td style="padding: 6px 8px; font-size: 10px; text-align: right; border-bottom: 1px solid #eee;">PACKAGING</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #ccc; border-bottom: 1px solid #eee;">${packagingCharge.toFixed(2)}</td>
              </tr>` : ""}
              <tr>
                <td style="padding: 6px 8px; font-weight: bold; font-size: 10px; text-align: right; border-bottom: 1px solid #eee;">TAXABLE AMOUNT</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #ccc; border-bottom: 1px solid #eee; background: #f0f0f0;">${taxableAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-weight: bold; font-size: 10px; text-align: right; border-bottom: 1px solid #eee;">TOTAL TAX</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #ccc; border-bottom: 1px solid #eee; background: #f0f0f0;">${totalTax.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 8px; font-weight: bold; font-size: 12px; text-align: right; border-bottom: 1px solid #eee;">TOTAL</td>
                <td style="padding: 6px 8px; text-align: right; border: 1px solid #ccc; border-bottom: 1px solid #eee; background: #f0f0f0; font-weight: bold; font-size: 13px;">₹${grandTotal.toFixed(2)}</td>
              </tr>
            </table>
            `}
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <tr>
          <td style="border: none; vertical-align: bottom;">
            <div style="font-size: 24px; text-transform: uppercase; margin-bottom: 40px;">THANK YOU</div>
            <div style="border-top: 1px solid #000; padding-top: 5px; width: 180px; text-align: center;">Receiver's Signature</div>
          </td>
          <td style="border: none; text-align: right; vertical-align: bottom;">
            <div style="font-size: 11px; margin-bottom: 40px;">For <strong>${settings.companyName}</strong></div>
            <div style="border-top: 1px solid #000; padding-top: 5px; width: 180px; text-align: center; float: right;">Authorized Signatory</div>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 40px; font-size: 11px; line-height: 1.5; color: #555;">
        <div>For questions concerning this invoice, please contact ${settings.mobile}</div>
        <div>This is a digitally signed document.</div>
      </div>
    </div>
  `;
}

export function printInvoiceDocument(invoice, settings, customers) {
  const copies = ["ORIGINAL", "DUPLICATE", "TRIPLICATE"];

  const invoiceHtml = copies.map((copyTitle, index) => {
    let html = generateInvoiceHtml(invoice, settings, customers, copyTitle);
    return `<div style="${index < copies.length - 1 ? 'page-break-after: always;' : ''}">${html}</div>`;
  }).join("");

  const printWin = window.open("", "_blank");
  if (!printWin) return alert("Please allow popups to print.");
  printWin.document.write(`<html><head><title>${invoice.id}</title></head><body style="margin:0;">${invoiceHtml}</body></html>`);
  printWin.document.close();
  setTimeout(() => printWin.print(), 250);
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", width: "100%", maxWidth: 780, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{title}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)" }}>×</button>
        </div>
        <div style={{ padding: "1.25rem" }}>{children}</div>
      </div>
    </div>
  );
}

function InvoicePreview({ invoice, settings, customers, onClose }) {
  const printInvoice = () => {
    printInvoiceDocument(invoice, settings, customers);
  };

  const previewHtml = generateInvoiceHtml(invoice, settings, customers, "ORIGINAL");

  return (
    <Modal title={`Invoice Preview — ${invoice.id}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={printInvoice} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", cursor: "pointer", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "1px solid var(--color-border-info)" }}>
          <i className="ti ti-printer" aria-hidden="true"></i> Print / Download PDF
        </button>
        <button onClick={onClose} style={{ padding: "6px 14px", cursor: "pointer" }}>Close</button>
      </div>

      <div style={{ border: "1px solid #ccc", background: "#f9f9f9", maxHeight: "70vh", overflowY: "auto", display: "flex", justifyContent: "center", padding: "20px 0" }}>
        <div style={{ boxShadow: "0 0 10px rgba(0,0,0,0.1)" }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </div>
    </Modal>
  );
}

function CreateInvoiceModal({ onSave, onClose, customers, products, settings, editInvoice, invoices }) {
  const getNextId = (typeStr) => {
    const existing = invoices.filter(i => (typeStr === "DC" ? i.type === "DC" : i.type !== "DC")).map(i => {
      const parts = i.id.split("-");
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    const max = existing.length ? Math.max(...existing) : 0;
    return (typeStr === "DC" ? "DC-" : "INV-") + (max + 1);
  };

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(editInvoice?.customer || "");
  const [date, setDate] = useState(editInvoice?.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate || date);
  const [dcNumber, setDcNumber] = useState(editInvoice?.dcNumber || "");
  const [dcDate, setDcDate] = useState(editInvoice?.dcDate || "");
  const [poNumber, setPoNumber] = useState(editInvoice?.poNumber || "");
  const [poDate, setPoDate] = useState(editInvoice?.poDate || "");
  const [poItem, setPoItem] = useState(editInvoice?.poItem || "");
  const [vehicleNumber, setVehicleNumber] = useState(editInvoice?.vehicleNumber || "");
  const [type, setType] = useState(editInvoice?.type || "Invoice");
  const [hidePriceForDC, setHidePriceForDC] = useState(editInvoice?.hidePriceForDC || false);
  const [invoiceId, setInvoiceId] = useState(editInvoice?.id || getNextId(type));
  const [deliveryCharge, setDeliveryCharge] = useState(editInvoice?.deliveryCharge || 0);
  const [packagingCharge, setPackagingCharge] = useState(editInvoice?.packagingCharge || 0);
  const [items, setItems] = useState(editInvoice?.items || [{ name: "", hsn: "", materialCode: "", dcNumber: "", dcDate: "", poNumber: "", poDate: "", unit: "NOS", rate: 0, qty: 1, taxRate: 5 }]);
  const [searchProduct, setSearchProduct] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(null);
  
  const [lockedPeriods, setLockedPeriods] = useState<{ month: number; year: number }[]>([]);

  useEffect(() => {
    import("./actions/periods").then((mod) => {
      mod.getLockedPeriods().then((res) => {
        if (res.success && res.periods) {
          setLockedPeriods(res.periods);
        }
      });
    });
  }, []);

  const parsedDate = new Date(date);
  const isLocked = !isNaN(parsedDate.getTime()) && lockedPeriods.some(p => 
    p.month === (parsedDate.getMonth() + 1) && p.year === parsedDate.getFullYear()
  );

  const addItem = () => setItems([...items, { name: "", hsn: "", materialCode: "", dcNumber: "", dcDate: "", poNumber: "", poDate: "", unit: "NOS", rate: 0, qty: 1, taxRate: 5 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };
    setItems(updated);
  };
  const selectProduct = (i, product) => {
    updateItem(i, "name", product.name);
    updateItem(i, "hsn", product.hsn);
    updateItem(i, "unit", product.unit);
    updateItem(i, "rate", product.rate);
    updateItem(i, "taxRate", product.taxRate);
    setShowProductSearch(null);
    setSearchProduct("");
  };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
  const taxableAmount = subtotal + parseFloat(deliveryCharge || 0) + parseFloat(packagingCharge || 0);
  const totalTax = items.reduce((s, i) => {
    const taxable = (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0);
    return s + taxable * (parseFloat(i.taxRate) || 0) / 100;
  }, 0);
  const grandTotal = Math.round(taxableAmount + totalTax);

  const handleSave = () => {
    if (!customer) return alert("Please select a customer");
    if (items.every(i => !i.name)) return alert("Please add at least one item");
    onSave({
      id: invoiceId || "INV-1",
      date, dueDate, dcNumber, dcDate, vehicleNumber, customer, type, hidePriceForDC,
      poNumber, poDate, poItem,
      items: items.filter(i => i.name),
      deliveryCharge: parseFloat(deliveryCharge) || 0,
      packagingCharge: parseFloat(packagingCharge) || 0,
      total: grandTotal,
      status: type === "DC" ? "Delivered" : "Unpaid",
    });
    onClose();
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()));

  return (
    <Modal title={editInvoice ? `Edit ${editInvoice.id}` : "Create New Invoice / DC"} onClose={onClose}>
      {/* Warning banner if period is locked */}
      {isLocked && (
        <div style={{
          background: "rgba(220, 38, 38, 0.15)",
          color: "#f87171",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          padding: "10px 12px",
          borderRadius: "6px",
          marginBottom: "16px",
          fontSize: "12px",
          fontWeight: 500,
        }}>
          ⚠️ This period is locked by your CA. New invoices cannot be added. Contact your CA to unlock.
        </div>
      )}

      {/* Step tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {["Details", "Items", "Summary"].map((s, i) => (
          <button key={s} onClick={() => setStep(i+1)} style={{
            padding: "6px 16px", cursor: "pointer", borderRadius: "var(--border-radius-md)",
            background: step === i+1 ? "var(--color-background-info)" : "var(--color-background-secondary)",
            color: step === i+1 ? "var(--color-text-info)" : "var(--color-text-primary)",
            border: step === i+1 ? "1px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
            fontSize: 13, fontWeight: step === i+1 ? 500 : 400
          }}>{i+1}. {s}</button>
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Document Type</label>
            <select value={type} onChange={e => {
              const newType = e.target.value;
              setType(newType);
              if (!editInvoice) setInvoiceId(getNextId(newType));
            }} style={{ width: "100%" }}>
              <option value="Invoice">Tax Invoice</option>
              <option value="DC">Delivery Challan</option>
              <option value="Proforma">Proforma Invoice</option>
              <option value="CreditNote">Credit Note</option>
            </select>
          </div>
          {type === "DC" && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <input type="checkbox" checked={hidePriceForDC} onChange={e => setHidePriceForDC(e.target.checked)} id="hidePriceCb" />
              <label htmlFor="hidePriceCb" style={{ fontSize: 13, cursor: "pointer" }}>Hide Prices in Delivery Challan (Only show Quantity)</label>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Invoice / DC Number *</label>
            <input type="text" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Customer *</label>
            <select value={customer} onChange={e => setCustomer(e.target.value)} style={{ width: "100%" }}>
              <option value="">— Select Customer —</option>
              {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Invoice Date</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Due Date</label>
            <input type="text" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>DC Number</label>
            <input type="text" value={dcNumber} onChange={e => setDcNumber(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>DC Issue Date</label>
            <input type="text" value={dcDate} onChange={e => setDcDate(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>PO Number</label>
            <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>PO Date</label>
            <input type="text" value={poDate} onChange={e => setPoDate(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>PO Item</label>
            <input type="text" value={poItem} onChange={e => setPoItem(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Vehicle Number</label>
            <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Delivery Charges (₹)</label>
            <input type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Packaging Charges (₹)</label>
            <input type="number" value={packagingCharge} onChange={e => setPackagingCharge(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button onClick={() => setStep(2)} style={{ padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Next: Add Items →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["S.No", "Product", "Material Code", "HSN", "DC No", "DC Date", "PO No", "PO Date", "Unit", "Qty", "Rate (₹)", "Tax%", "Amount", ""].map(h => (
                    <th key={h} style={{ padding: "6px 8px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: "4px 8px", border: "0.5px solid var(--color-border-tertiary)", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 11 }}>{i+1}</td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", position: "relative", minWidth: 180 }}>
                      <input value={item.name} onChange={e => { updateItem(i, "name", e.target.value); setShowProductSearch(i); setSearchProduct(e.target.value); }}
                        placeholder="Type product name..." style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                      {showProductSearch === i && searchProduct && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", zIndex: 100, maxHeight: 150, overflowY: "auto" }}>
                          {filteredProducts.slice(0,6).map(p => (
                            <div key={p.id} onClick={() => selectProduct(i, p)} style={{ padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
                              onMouseEnter={e => (e.target as any).style.background = "var(--color-background-secondary)"}
                              onMouseLeave={e => (e.target as any).style.background = "transparent"}>
                              {p.name} — ₹{p.rate}
                            </div>
                          ))}
                          {filteredProducts.length === 0 && <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--color-text-secondary)" }}>No match — using custom entry</div>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", minWidth: 100 }}>
                      <input type="text" value={item.materialCode || ""} onChange={e => updateItem(i, "materialCode", e.target.value)} placeholder="MAT-001" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", minWidth: 100 }}>
                      <input type="text" value={item.hsn || ""} onChange={e => {
                        updateItem(i, "hsn", e.target.value);
                      }} placeholder="HSN Code" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", minWidth: 100 }}>
                      <input type="text" value={item.dcNumber || ""} onChange={e => updateItem(i, "dcNumber", e.target.value)} placeholder="DC No" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", minWidth: 100 }}>
                      <input type="text" value={item.dcDate || ""} onChange={e => updateItem(i, "dcDate", e.target.value)} placeholder="DC Date" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", minWidth: 100 }}>
                      <input type="text" value={item.poNumber || ""} onChange={e => updateItem(i, "poNumber", e.target.value)} placeholder="PO No" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)", minWidth: 100 }}>
                      <input type="text" value={item.poDate || ""} onChange={e => updateItem(i, "poDate", e.target.value)} placeholder="PO Date" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 12 }} />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <select value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} style={{ fontSize: 12, border: "none", background: "transparent" }}>
                        {["NOS","KGS","LTR","MTR","BOX","PKT","SET","PCS"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <input type="number" value={item.qty} onChange={e => updateItem(i, "qty", e.target.value)} style={{ width: 55, border: "none", outline: "none", background: "transparent", fontSize: 12 }} min="0.001" step="0.001" />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <input type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} style={{ width: 80, border: "none", outline: "none", background: "transparent", fontSize: 12 }} step="0.01" />
                    </td>
                    <td style={{ padding: "4px 4px", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <select value={item.taxRate} onChange={e => updateItem(i, "taxRate", e.target.value)} style={{ fontSize: 12, border: "none", background: "transparent" }}>
                        {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "4px 8px", border: "0.5px solid var(--color-border-tertiary)", textAlign: "right", fontSize: 12 }}>
                      ₹{((parseFloat(item.qty)||0) * (parseFloat(item.rate)||0)).toFixed(2)}
                    </td>
                    <td style={{ padding: "4px 8px", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <button onClick={() => removeItem(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-danger)", fontSize: 14 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={addItem} style={{ padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>
              <i className="ti ti-plus" aria-hidden="true"></i> Add Item
            </button>
            <div style={{ flex: 1 }}></div>
            <div style={{ textAlign: "right", fontSize: 13 }}>
              <div style={{ color: "var(--color-text-secondary)" }}>Taxable: ₹{taxableAmount.toFixed(2)} + Tax: ₹{totalTax.toFixed(2)}</div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>Total: ₹{grandTotal}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => setStep(1)} style={{ padding: "8px 20px", cursor: "pointer" }}>← Back</button>
            <button onClick={() => setStep(3)} style={{ padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Next: Summary →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem", marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Customer</span>
              <span style={{ fontWeight: 500 }}>{customer}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Type</span>
              <span>{type}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Items</span>
              <span>{items.filter(i => i.name).length} line items</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {parseFloat(deliveryCharge) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Delivery</span>
                <span>₹{deliveryCharge}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--color-text-secondary)" }}>GST</span>
              <span>₹{totalTax.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, fontSize: 15 }}>
              <span>Grand Total</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} style={{ padding: "8px 20px", cursor: "pointer" }}>← Back</button>
            <button
              onClick={handleSave}
              disabled={isLocked}
              style={{
                padding: "8px 24px",
                cursor: isLocked ? "not-allowed" : "pointer",
                fontWeight: 500,
                background: isLocked ? "var(--color-background-secondary)" : "var(--color-background-success)",
                color: isLocked ? "var(--color-text-secondary)" : "var(--color-text-success)",
                border: isLocked ? "1px solid var(--color-border-primary)" : "1px solid var(--color-border-success)",
                opacity: isLocked ? 0.6 : 1
              }}
            >
              <i className="ti ti-check" aria-hidden="true"></i> Save {type}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function GSTRExport({ invoices, onClose }) {
  const [period, setPeriod] = useState("Apr 2025");
  const [type, setType] = useState("GSTR-1");

  const rows = invoices.filter(inv => inv.type === "Invoice" && inv.items);

  const downloadCSV = () => {
    let csv = "";
    if (type === "GSTR-1") {
      csv = "Invoice No,Invoice Date,Customer Name,Customer GSTIN,Place of Supply,Invoice Value,Taxable Value,CGST,SGST,IGST,Total Tax\n";
      rows.forEach(inv => {
        const taxable = (inv.items || []).reduce((s, i) => s + i.qty * i.rate, 0);
        const tax = (inv.items || []).reduce((s, i) => s + i.qty * i.rate * i.taxRate / 100, 0);
        csv += `${inv.id},${inv.date},${inv.customer},,29-KARNATAKA,${inv.total},${taxable.toFixed(2)},${(tax/2).toFixed(2)},${(tax/2).toFixed(2)},0,${tax.toFixed(2)}\n`;
      });
    } else {
      csv = "Invoice No,Invoice Date,Customer Name,Taxable Value,CGST Rate,CGST Amount,SGST Rate,SGST Amount,Total Tax\n";
      rows.forEach(inv => {
        const taxable = (inv.items || []).reduce((s, i) => s + i.qty * i.rate, 0);
        const tax = (inv.items || []).reduce((s, i) => s + i.qty * i.rate * i.taxRate / 100, 0);
        csv += `${inv.id},${inv.date},${inv.customer},${taxable.toFixed(2)},2.5%,${(tax/2).toFixed(2)},2.5%,${(tax/2).toFixed(2)},${tax.toFixed(2)}\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${type}-${period.replace(" ","-")}.csv`; a.click();
  };

  return (
    <Modal title="GSTR Export" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Return Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%" }}>
            <option>GSTR-1</option>
            <option>GSTR-3B</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Period</label>
          <input value={period} onChange={e => setPeriod(e.target.value)} style={{ width: "100%" }} />
        </div>
      </div>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem", marginBottom: 16, fontSize: 13 }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Preview — {type} for {period}</div>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Invoice No", "Date", "Customer", "Taxable Amt", "GST", "Total"].map(h => (
                <th key={h} style={{ padding: "4px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(inv => {
              const taxable = (inv.items || []).reduce((s, i) => s + i.qty * i.rate, 0);
              const tax = (inv.items || []).reduce((s, i) => s + i.qty * i.rate * i.taxRate / 100, 0);
              return (
                <tr key={inv.id}>
                  <td style={{ padding: "4px 8px" }}>{inv.id}</td>
                  <td style={{ padding: "4px 8px" }}>{inv.date}</td>
                  <td style={{ padding: "4px 8px" }}>{inv.customer}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>₹{taxable.toFixed(2)}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>₹{tax.toFixed(2)}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>₹{inv.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={downloadCSV} style={{ padding: "8px 20px", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
        <i className="ti ti-download" aria-hidden="true"></i> Download {type} Excel / CSV
      </button>
    </Modal>
  );
}

export default function BillingSaaS({ user }: { user: any }) {
  const [module, setModule] = useState("Dashboard");
  const [settings, setSettings] = useState(initialSettings);
  const [customers, setCustomers] = useState(initialCustomers);
  const [products, setProducts] = useState(initialProducts);
  const [invoices, setInvoices] = useState(demoInvoices);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("billing_settings");
    if (s) {
      try { setSettings(JSON.parse(s)); } catch(e){}
    }
    const c = localStorage.getItem("billing_customers");
    if (c) {
      try { setCustomers(JSON.parse(c)); } catch(e){}
    }
    const p = localStorage.getItem("billing_products");
    if (p) {
      try { setProducts(JSON.parse(p)); } catch(e){}
    }
    const i = localStorage.getItem("billing_invoices");
    if (i) {
      try { setInvoices(JSON.parse(i)); } catch(e){}
    }
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem("billing_settings", JSON.stringify(settings)); }, [settings, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("billing_customers", JSON.stringify(customers)); }, [customers, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("billing_products", JSON.stringify(products)); }, [products, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("billing_invoices", JSON.stringify(invoices)); }, [invoices, loaded]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [showGSTR, setShowGSTR] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [newCustomer, setNewCustomer] = useState(false);
  const [newProduct, setNewProduct] = useState(false);
  const [settingsForm, setSettingsForm] = useState(settings);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const saveInvoice = (inv) => {
    setInvoices(prev => {
      const idx = prev.findIndex(i => i.id === inv.id);
      if (idx >= 0) { const a = [...prev]; a[idx] = inv; return a; }
      return [inv, ...prev];
    });
    setEditInvoice(null);
  };

  const deleteInvoice = (id) => {
    if (confirm(`Delete ${id}?`)) setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const markPaid = (id) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: "Paid" } : i));
  };

  const saveCustomer = (c) => {
    if (c.id) setCustomers(prev => prev.map(x => x.id === c.id ? c : x));
    else setCustomers(prev => [...prev, { ...c, id: Date.now() }]);
    setEditCustomer(null); setNewCustomer(false);
  };

  const saveProduct = (p) => {
    if (p.id) setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    else setProducts(prev => [...prev, { ...p, id: Date.now() }]);
    setEditProduct(null); setNewProduct(false);
  };

  const totalRevenue = invoices.filter(i => i.status === "Paid" && i.type === "Invoice").reduce((s, i) => s + i.total, 0);
  const totalUnpaid = invoices.filter(i => i.status === "Unpaid").reduce((s, i) => s + i.total, 0);
  const totalInvoices = invoices.filter(i => i.type === "Invoice").length;

  const statusColor = (s) => {
    if (s === "Paid" || s === "Delivered") return { bg: "var(--color-background-success)", color: "var(--color-text-success)" };
    if (s === "Unpaid") return { bg: "var(--color-background-warning)", color: "var(--color-text-warning)" };
    return { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" };
  };

  return (
    <div style={{ display: "flex", height: "100vh", minHeight: 600, fontFamily: "var(--font-sans)", background: "var(--color-background-tertiary)" }}>
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 200 : 52, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "14px 14px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 10, minHeight: 52 }}>
          <div style={{ width: 26, height: 26, borderRadius: "var(--border-radius-md)", background: "var(--color-background-info)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-receipt-2" style={{ fontSize: 14, color: "var(--color-text-info)" }} aria-hidden="true"></i>
          </div>
          {sidebarOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>InvoiceHub</span>
              {user?.role === "admin" && (
                <span style={{ fontSize: 9, fontWeight: 700, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", padding: "1px 4px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>PRO</span>
              )}
            </div>
          )}
          <div style={{ flex: 1 }}></div>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, flexShrink: 0 }}>
            <i className={`ti ti-${sidebarOpen ? "layout-sidebar-left-collapse" : "layout-sidebar-left-expand"}`} aria-hidden="true"></i>
          </button>
        </div>
        <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
          {[
            { name: "Dashboard", icon: "ti-dashboard" },
            { name: "Invoices", icon: "ti-file-invoice" },
            { name: "Delivery Challan", icon: "ti-truck" },
            { name: "Customers", icon: "ti-users" },
            { name: "Purchases", icon: "ti-receipt", href: "/purchases" },
            { name: "CA Access", icon: "ti-users", href: "/settings/ca-access" },
            { name: "Products", icon: "ti-package" },
            { name: "GSTR Export", icon: "ti-file-spreadsheet" },
            { name: "Settings", icon: "ti-settings" },
          ].map(({ name, icon, href }) => (
            <button key={name} onClick={() => href ? window.location.href = href : setModule(name)} title={name} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 8px",
              borderRadius: "var(--border-radius-md)", cursor: "pointer", border: "none", marginBottom: 2,
              background: module === name ? "var(--color-background-info)" : "transparent",
              color: module === name ? "var(--color-text-info)" : "var(--color-text-secondary)",
              textAlign: "left", transition: "background 0.15s",
            }}>
              <i className={`ti ${icon}`} style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true"></i>
              {sidebarOpen && <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{name}</span>}
            </button>
          ))}
        </div>
        {sidebarOpen && (
          <div style={{ padding: "10px 12px", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 11, color: "var(--color-text-secondary)" }}>
            <div style={{ fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{user?.email || "Guest"}</div>
            {settings.companyName}<br />{settings.gstin}
          </div>
        )}
        <button
          onClick={async () => {
            const { logoutUser } = await import("./actions/auth");
            await logoutUser();
            window.location.href = "/login";
          }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 16px)", margin: "4px 8px 8px", padding: "8px 8px",
            borderRadius: "var(--border-radius-md)", cursor: "pointer", border: "none",
            background: "rgba(239, 68, 68, 0.08)", color: "var(--color-text-danger)",
            textAlign: "left", transition: "background 0.15s",
          }}
        >
          <i className="ti ti-logout" style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true"></i>
          {sidebarOpen && <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Logout</span>}
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{module}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(module === "Invoices" || module === "Delivery Challan") && (
              <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", cursor: "pointer", background: "var(--color-background-info)", color: "var(--color-text-info)", border: "1px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500 }}>
                <i className="ti ti-plus" aria-hidden="true"></i> New {module === "Delivery Challan" ? "DC" : "Invoice"}
              </button>
            )}
            {module === "GSTR Export" && (
              <button onClick={() => setShowGSTR(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <i className="ti ti-file-spreadsheet" aria-hidden="true"></i> Export GSTR
              </button>
            )}
            {module === "Customers" && (
              <button onClick={() => setNewCustomer(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <i className="ti ti-plus" aria-hidden="true"></i> Add Customer
              </button>
            )}
            {module === "Products" && (
              <button onClick={() => setNewProduct(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <i className="ti ti-plus" aria-hidden="true"></i> Add Product
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: "20px" }}>

          {/* Dashboard */}
          {module === "Dashboard" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: "ti-currency-rupee", color: "var(--color-text-success)" },
                  { label: "Unpaid Amount", value: `₹${totalUnpaid.toLocaleString("en-IN")}`, icon: "ti-clock", color: "var(--color-text-warning)" },
                  { label: "Total Invoices", value: totalInvoices, icon: "ti-file-invoice", color: "var(--color-text-info)" },
                  { label: "Customers", value: customers.length, icon: "ti-users", color: "var(--color-text-primary)" },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 18, color }} aria-hidden="true"></i>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1rem 1.25rem" }}>
                <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 14 }}>Recent Invoices</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Invoice", "Date", "Customer", "Amount", "Status"].map(h => (
                        <th key={h} style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0,5).map(inv => (
                      <tr key={inv.id} style={{ cursor: "pointer" }} onClick={() => setShowPreview(inv)}>
                        <td style={{ padding: "8px 8px" }}>{inv.id}</td>
                        <td style={{ padding: "8px 8px", color: "var(--color-text-secondary)" }}>{inv.date}</td>
                        <td style={{ padding: "8px 8px" }}>{inv.customer}</td>
                        <td style={{ padding: "8px 8px", fontWeight: 500 }}>₹{inv.total.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "8px 8px" }}>
                          <span style={{ ...statusColor(inv.status), padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{inv.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices / DC */}
          {(module === "Invoices" || module === "Delivery Challan") && (
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["#", "Date", "Customer", "Amount", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textAlign: "left", background: "var(--color-background-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.filter(i => module === "Delivery Challan" ? i.type === "DC" : i.type !== "DC").map(inv => (
                    <tr key={inv.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{inv.id}</td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{inv.date}</td>
                      <td style={{ padding: "10px 12px" }}>{inv.customer}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>₹{inv.total.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ ...statusColor(inv.status), padding: "2px 10px", borderRadius: 20, fontSize: 11 }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setShowPreview(inv)} title="View" style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12 }}><i className="ti ti-eye" aria-hidden="true"></i></button>
                          <button onClick={() => printInvoiceDocument(inv, settings, customers)} title="Print" style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12 }}><i className="ti ti-printer" aria-hidden="true"></i></button>
                          <button onClick={() => { setEditInvoice(inv); setShowCreate(true); }} title="Edit" style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12 }}><i className="ti ti-edit" aria-hidden="true"></i></button>
                          {inv.status === "Unpaid" && <button onClick={() => markPaid(inv.id)} title="Mark Paid" style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "var(--color-text-success)" }}><i className="ti ti-check" aria-hidden="true"></i></button>}
                          <button onClick={() => deleteInvoice(inv.id)} title="Delete" style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "var(--color-text-danger)" }}><i className="ti ti-trash" aria-hidden="true"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Customers */}
          {module === "Customers" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {customers.map(c => (
                  <div key={c.id} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-background-info)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: "var(--color-text-info)", flexShrink: 0 }}>
                        {c.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>GSTIN: {c.gstin || "—"}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                      <div><i className="ti ti-phone" style={{ fontSize: 12, marginRight: 6 }} aria-hidden="true"></i>{c.phone}</div>
                      <div><i className="ti ti-map-pin" style={{ fontSize: 12, marginRight: 6 }} aria-hidden="true"></i>{c.address}, {c.city}, {c.state} - {c.pincode}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button onClick={() => setEditCustomer(c)} style={{ padding: "4px 10px", cursor: "pointer", fontSize: 12 }}><i className="ti ti-edit" aria-hidden="true"></i> Edit</button>
                      <button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} style={{ padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--color-text-danger)" }}><i className="ti ti-trash" aria-hidden="true"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {module === "Products" && (
            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Product Name", "HSN/SAC", "Unit", "Rate (₹)", "GST %", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textAlign: "left", background: "var(--color-background-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "9px 12px", fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{p.hsn}</td>
                      <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{p.unit}</td>
                      <td style={{ padding: "9px 12px" }}>₹{p.rate.toFixed(2)}</td>
                      <td style={{ padding: "9px 12px" }}>{p.taxRate}%</td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setEditProduct(p)} style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12 }}><i className="ti ti-edit" aria-hidden="true"></i></button>
                          <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))} style={{ padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "var(--color-text-danger)" }}><i className="ti ti-trash" aria-hidden="true"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GSTR Export */}
          {module === "GSTR Export" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { title: "GSTR-1", sub: "Outward Supplies", icon: "ti-file-invoice", desc: "Monthly / quarterly B2B & B2C sales return" },
                { title: "GSTR-3B", sub: "Summary Return", icon: "ti-file-spreadsheet", desc: "Monthly summary return with tax liability" },
                { title: "HSN Summary", sub: "HSN-wise detail", icon: "ti-list", desc: "Product-wise HSN tax summary for filing" },
              ].map(item => (
                <div key={item.title} onClick={() => setShowGSTR(true)} style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", cursor: "pointer" }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 28, color: "var(--color-text-info)", display: "block", marginBottom: 10 }} aria-hidden="true"></i>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>{item.sub}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
                  <div style={{ marginTop: 12, fontSize: 12, color: "var(--color-text-info)", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-download" style={{ fontSize: 14 }} aria-hidden="true"></i> Export CSV
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings */}
          {module === "Settings" && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 16, fontSize: 14 }}>Company Information</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    ["companyName", "Company Name", "text"],
                    ["gstin", "GSTIN", "text"],
                    ["address", "Address", "text"],
                    ["city", "City", "text"],
                    ["state", "State", "text"],
                    ["pincode", "Pincode", "text"],
                    ["mobile", "Mobile", "text"],
                  ].map(([field, label]) => (
                    <div key={field} style={field === "companyName" || field === "address" ? { gridColumn: "1 / -1" } : {}}>
                      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
                      <input value={settingsForm[field]} onChange={e => setSettingsForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%" }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 16, fontSize: 14 }}>Bank Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["bankName","Bank Name"],["accountNo","Account Number"],["ifsc","IFSC Code"],["branch","Branch"],["upiId","UPI ID"]].map(([field, label]) => (
                    <div key={field}>
                      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
                      <input value={settingsForm[field]} onChange={e => setSettingsForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%" }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 16, fontSize: 14 }}>Invoice Settings</div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Default Invoice Template</label>
                  <select
                    value={settingsForm.invoiceTemplate || "classic"}
                    onChange={e => setSettingsForm(f => ({ ...f, invoiceTemplate: e.target.value }))}
                    style={{ width: "100%" }}
                  >
                    <option value="classic">Classic Elegant (Default)</option>
                    <option value="minimal">Modern Minimalist</option>
                    <option value="compact">Pro Compact</option>
                    <option value="retro">Bold Retro (Courier Slab)</option>
                    <option value="corporate">Slate Corporate (Modern Professional)</option>
                  </select>
                </div>
              </div>
              {user?.role === "admin" && (
                <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "1.25rem", marginBottom: 16 }}>
                  <div style={{ fontWeight: 500, marginBottom: 16, fontSize: 14, color: "var(--color-text-info)", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-crown" aria-hidden="true"></i> PRO Features: Theme Customizer
                  </div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Premium Interface Colorway</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { name: "Indigo Slate", primary: "#818cf8", bg: "#0f172a", tertiary: "#030712", secondary: "#020617" },
                      { name: "Emerald Dark", primary: "#34d399", bg: "#062f22", tertiary: "#011c13", secondary: "#01120c" },
                      { name: "Amber Glow", primary: "#fbbf24", bg: "#2d1a01", tertiary: "#170c00", secondary: "#0d0600" },
                    ].map(t => (
                      <button
                        key={t.name}
                        onClick={() => {
                          document.documentElement.style.setProperty("--color-text-info", t.primary);
                          document.documentElement.style.setProperty("--color-background-primary", t.bg);
                          document.documentElement.style.setProperty("--color-background-tertiary", t.tertiary);
                          document.documentElement.style.setProperty("--color-background-secondary", t.secondary);
                          alert(`Premium theme "${t.name}" applied successfully!`);
                        }}
                        style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.primary }}></span>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => { setSettings(settingsForm); alert("Settings saved!"); }} style={{ padding: "8px 24px", cursor: "pointer", fontWeight: 500 }}>
                <i className="ti ti-check" aria-hidden="true"></i> Save Settings
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {(showCreate || editInvoice) && (
        <CreateInvoiceModal
          onSave={saveInvoice}
          onClose={() => { setShowCreate(false); setEditInvoice(null); }}
          customers={customers}
          products={products}
          settings={settings}
          editInvoice={editInvoice}
          invoices={invoices}
        />
      )}

      {showPreview && (
        <InvoicePreview
          invoice={showPreview}
          settings={settings}
          customers={customers}
          onClose={() => setShowPreview(null)}
        />
      )}

      {showGSTR && (
        <GSTRExport invoices={invoices} onClose={() => setShowGSTR(false)} />
      )}

      {/* Customer Edit Modal */}
      {(editCustomer || newCustomer) && (
        <CustomerForm
          customer={editCustomer || { name: "", gstin: "", phone: "", address: "", city: "", state: "", pincode: "" }}
          onSave={saveCustomer}
          onClose={() => { setEditCustomer(null); setNewCustomer(false); }}
        />
      )}

      {/* Product Edit Modal */}
      {(editProduct || newProduct) && (
        <ProductForm
          product={editProduct || { name: "", hsn: "", unit: "NOS", rate: 0, taxRate: 5 }}
          onSave={saveProduct}
          onClose={() => { setEditProduct(null); setNewProduct(false); }}
        />
      )}
    </div>
  );
}

function CustomerForm({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer);
  return (
    <Modal title={form.id ? "Edit Customer" : "Add Customer"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[["name","Customer Name"],["gstin","GSTIN"],["phone","Phone"],["address","Address"],["city","City"],["state","State"],["pincode","Pincode"]].map(([field, label]) => (
          <div key={field} style={field === "name" || field === "address" ? { gridColumn: "1 / -1" } : {}}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
            <input value={form[field] || ""} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => onSave(form)} style={{ padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Save Customer</button>
        <button onClick={onClose} style={{ padding: "8px 20px", cursor: "pointer" }}>Cancel</button>
      </div>
    </Modal>
  );
}

function ProductForm({ product, onSave, onClose }) {
  const [form, setForm] = useState(product);
  return (
    <Modal title={form.id ? "Edit Product" : "Add Product"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Product Name</label>
          <input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%" }} />
        </div>
        {[["hsn","HSN/SAC Code"],["unit","Unit"],["rate","Rate (₹)"],["taxRate","GST Rate (%)"]].map(([field, label]) => (
          <div key={field}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
            {field === "unit" ? (
              <select value={form[field] || "NOS"} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: "100%" }}>
                {["NOS","KGS","LTR","MTR","BOX","PKT","SET","PCS"].map(u => <option key={u}>{u}</option>)}
              </select>
            ) : field === "taxRate" ? (
              <select value={form[field] || 5} onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) }))} style={{ width: "100%" }}>
                {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            ) : (
              <input type={field === "rate" ? "number" : "text"} value={form[field] || ""} onChange={e => setForm(f => ({ ...f, [field]: field === "rate" ? parseFloat(e.target.value) : e.target.value }))} style={{ width: "100%" }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => onSave(form)} style={{ padding: "8px 20px", cursor: "pointer", fontWeight: 500 }}>Save Product</button>
        <button onClick={onClose} style={{ padding: "8px 20px", cursor: "pointer" }}>Cancel</button>
      </div>
    </Modal>
  );
}
