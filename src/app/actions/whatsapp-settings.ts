"use server";

import { db } from "../../db";
import { tenantWhatsappNumbers } from "../../db/schema";
import { assertTenantAccess } from "../../lib/auth-utils";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function requestWhatsAppLink(userId: string, tenantId: string, phoneNumber: string) {
  await assertTenantAccess(userId, tenantId, "owner");

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Check if phone number is already verified by another tenant
  const existingVerified = await db.select().from(tenantWhatsappNumbers).where(
    and(
      eq(tenantWhatsappNumbers.phoneNumber, phoneNumber),
      eq(tenantWhatsappNumbers.verified, true)
    )
  ).limit(1);

  if (existingVerified.length > 0 && existingVerified[0].tenantId !== tenantId) {
    return { success: false, error: "Phone number is already verified by another business." };
  }

  // Insert or Update the record for this tenant
  const existingRecord = await db.select().from(tenantWhatsappNumbers).where(
    and(
      eq(tenantWhatsappNumbers.tenantId, tenantId),
      eq(tenantWhatsappNumbers.phoneNumber, phoneNumber)
    )
  ).limit(1);

  if (existingRecord.length > 0) {
    await db.update(tenantWhatsappNumbers).set({
      verificationCode: code,
      codeExpiresAt: expiresAt,
      verificationAttempts: 0,
      verified: false
    }).where(eq(tenantWhatsappNumbers.id, existingRecord[0].id));
  } else {
    await db.insert(tenantWhatsappNumbers).values({
      tenantId,
      phoneNumber,
      verificationCode: code,
      codeExpiresAt: expiresAt,
      verificationAttempts: 0,
      verified: false
    });
  }

  // Send WhatsApp message
  try {
    await sendWhatsAppMessage(phoneNumber, `Your InvoiceHub verification code is: ${code}. It expires in 10 minutes.`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Failed to send WhatsApp message. Please check the phone number." };
  }
}

export async function verifyWhatsAppLink(userId: string, tenantId: string, phoneNumber: string, code: string) {
  await assertTenantAccess(userId, tenantId, "owner");

  const [record] = await db.select().from(tenantWhatsappNumbers).where(
    and(
      eq(tenantWhatsappNumbers.tenantId, tenantId),
      eq(tenantWhatsappNumbers.phoneNumber, phoneNumber)
    )
  ).limit(1);

  if (!record) {
    return { success: false, error: "No verification request found for this number." };
  }

  if (record.verified) {
    return { success: true }; // Already verified
  }

  // Check lockout
  if (record.verificationAttempts >= 5) {
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  // Check expiry
  if (!record.codeExpiresAt || new Date() > record.codeExpiresAt) {
    return { success: false, error: "Code expired. Please request a new one." };
  }

  // Check code correctness
  if (record.verificationCode !== code) {
    await db.update(tenantWhatsappNumbers).set({
      verificationAttempts: record.verificationAttempts + 1
    }).where(eq(tenantWhatsappNumbers.id, record.id));
    
    return { success: false, error: "Invalid code." };
  }

  // Success
  await db.update(tenantWhatsappNumbers).set({
    verified: true,
    verifiedAt: new Date(),
    verificationCode: null,
    codeExpiresAt: null,
    verificationAttempts: 0
  }).where(eq(tenantWhatsappNumbers.id, record.id));

  return { success: true };
}
