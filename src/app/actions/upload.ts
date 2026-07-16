"use server";

import { assertTenantAccess, getCurrentUser } from "../../lib/auth-utils";
import { supabase } from "../../lib/supabase";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Simple magic bytes checker for JPEG and PNG
function isValidMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.length > 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
  }
  return false;
}

export async function uploadLogoOrSignature(tenantId: string, formData: FormData) {
  const user = await getCurrentUser();
  await assertTenantAccess(user.id, tenantId, "owner");

  const file = formData.get("file") as File;
  const type = formData.get("type") as string; // 'logo' or 'signature'

  if (!file) {
    return { success: false, error: "No file provided" };
  }
  if (type !== "logo" && type !== "signature") {
    return { success: false, error: "Invalid upload type" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "File exceeds 2MB limit" };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: "Invalid file type. Only JPEG and PNG are allowed." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!isValidMagicBytes(buffer, file.type)) {
    return { success: false, error: "File content does not match MIME type (Magic bytes validation failed)." };
  }

  // Derive path securely server-side using tenantId to prevent path traversal
  const extension = file.type === "image/png" ? "png" : "jpg";
  const safeFilename = `${type}-${Date.now()}.${extension}`;
  const filePath = `${tenantId}/${safeFilename}`;

  const { data, error } = await supabase.storage.from("tenant-assets").upload(filePath, buffer, {
    contentType: file.type,
    upsert: true
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, path: data.path };
}
