import crypto from "crypto";

export async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  // For automated testing and local dev where live credentials aren't set, we mock the success.
  if (!token || !phoneId || process.env.NODE_ENV === "test" || (global as any).MOCK_WHATSAPP) {
    console.log(`[MOCK WhatsApp] Sent to ${to}: ${text}`);
    return { success: true, messageId: `mock-msg-${Date.now()}` };
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`WhatsApp API Error: ${errorText}`);
    throw new Error(`WhatsApp API Error: ${errorText}`);
  }

  return await response.json();
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer> {
  const token = process.env.WHATSAPP_TOKEN;
  
  if (!token || process.env.NODE_ENV === "test" || (global as any).MOCK_WHATSAPP) {
    console.log(`[MOCK WhatsApp] Downloading media ${mediaId}`);
    return Buffer.from("mock-image-data");
  }

  // 1. Get media URL
  const urlResponse = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!urlResponse.ok) {
    throw new Error("Failed to get media URL");
  }
  const urlData = await urlResponse.json();

  // 2. Download binary data
  const mediaResponse = await fetch(urlData.url, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!mediaResponse.ok) {
    throw new Error("Failed to download media bytes");
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature) return false;
  
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    if (process.env.NODE_ENV === "test") return true;
    console.error("WHATSAPP_APP_SECRET is missing");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(payload, "utf8")
    .digest("hex");

  const expectedStr = `sha256=${expectedSignature}`;
  
  if (signature.length !== expectedStr.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedStr));
}

