import { askLLM } from "./llm-client";
import { db } from "../db";
import { hsnMaster, purchases } from "../db/schema";
import { eq, and, lte } from "drizzle-orm";
import crypto from "crypto";

export async function extractInvoiceData(imageBuffer: Buffer, mimeType: string, tenantId: string) {
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const prompt = `
You are an expert accountant extracting structured data from an invoice.
Extract the following fields and return ONLY a valid JSON object without markdown formatting:
{
  "vendorName": "Company Name",
  "vendorGstin": "15-character GSTIN or null",
  "invoiceNumber": "string",
  "invoiceDate": "YYYY-MM-DD",
  "taxableAmount": 0.00,
  "cgst": 0.00,
  "sgst": 0.00,
  "igst": 0.00,
  "totalAmount": 0.00,
  "hsnCode": "4 to 8 digit HSN/SAC code or null",
  "category": "goods" or "services"
}
`;

  let llmResponse = "";
  if (process.env.NODE_ENV === "test" || (global as any).MOCK_WHATSAPP) {
    if ((global as any).MOCK_LLM_RESPONSE) {
      llmResponse = (global as any).MOCK_LLM_RESPONSE;
    } else {
      llmResponse = JSON.stringify({
        vendorName: "ABC Traders",
        vendorGstin: "27ABCDE1234F1Z5",
        invoiceNumber: "INV-123",
        invoiceDate: "2024-05-15",
        taxableAmount: 1000,
        cgst: 90,
        sgst: 90,
        igst: 0,
        totalAmount: 1180,
        hsnCode: "6109",
        category: "goods"
      });
    }
  } else {
    llmResponse = await askLLM({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    });
  }

  return processExtractedInvoiceText(llmResponse, tenantId);
}

export async function processExtractedInvoiceText(llmResponse: string, tenantId: string) {
  let parsed: any;
  try {
    const cleanJson = llmResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleanJson);
  } catch (e) {
    return { success: false, error: "Failed to parse LLM response into JSON" };
  }

  // Validate GSTIN roughly
  const gstinValid = !parsed.vendorGstin || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(parsed.vendorGstin);
  
  // Reconcile totals
  const calculatedTotal = Number(parsed.taxableAmount) + Number(parsed.cgst) + Number(parsed.sgst) + Number(parsed.igst);
  const totalMatches = Math.abs(calculatedTotal - Number(parsed.totalAmount)) < 1.0; // allow small rounding diffs

  // Match HSN rate
  let hsnRate = null;
  let hsnMatched = false;
  if (parsed.hsnCode) {
    const invoiceDate = parsed.invoiceDate ? new Date(parsed.invoiceDate) : new Date();
    const hsnRows = await db.select().from(hsnMaster)
      .where(
        and(
          eq(hsnMaster.code, parsed.hsnCode),
          lte(hsnMaster.effectiveFrom, invoiceDate.toISOString().split("T")[0])
        )
      )
      .orderBy(hsnMaster.effectiveFrom) // descending could be better but sticking to simple first for now
      .limit(1);
    
    if (hsnRows.length > 0) {
      hsnRate = hsnRows[hsnRows.length - 1].gstRate;
      hsnMatched = true;
    }
  }

  const confidence = (gstinValid && totalMatches && (!parsed.hsnCode || hsnMatched)) ? "high" : "needs_review";

  const purchaseId = crypto.randomUUID();
  await db.insert(purchases).values({
    id: purchaseId,
    tenantId: tenantId,
    vendorName: parsed.vendorName || "Unknown Vendor",
    vendorGstin: parsed.vendorGstin,
    invoiceNumber: parsed.invoiceNumber || "UNKNOWN",
    invoiceDate: parsed.invoiceDate ? new Date(parsed.invoiceDate).toISOString() : new Date().toISOString(),
    taxableAmount: parsed.taxableAmount || 0,
    cgst: parsed.cgst || 0,
    sgst: parsed.sgst || 0,
    igst: parsed.igst || 0,
    totalAmount: parsed.totalAmount || 0,
    hsnCode: parsed.hsnCode,
    hsnRate: hsnRate,
    category: parsed.category || "goods",
    status: "pending_review",
    itcEligible: true,
  });

  return { 
    success: true, 
    purchaseId, 
    parsed, 
    confidence 
  };
}
