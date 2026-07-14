export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // Real Resend API call if key is present
      console.log(`[Notification] Attempting to send email via Resend to ${params.to}`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "InvoiceHub <noreply@invoicehub.com>",
          to: [params.to],
          subject: params.subject,
          html: params.body.replace(/\n/g, "<br/>"),
        }),
      });

      if (res.ok) {
        console.log(`[Notification] Resend email sent successfully to ${params.to}`);
        return { success: true };
      } else {
        const errorData = await res.json();
        console.error("[Notification] Resend API error details:", errorData);
        return { success: false, error: errorData.message || "Failed to send email via Resend" };
      }
    } else {
      // Mock / fallback logging
      console.log(`
=========================================
[MOCK EMAIL NOTIFICATION SENT]
To: ${params.to}
Subject: ${params.subject}
Body:
${params.body}
=========================================
      `);
      return { success: true };
    }
  } catch (error: any) {
    console.error("[Notification] sendEmail exception:", error);
    return { success: false, error: error.message || "Exception occurred sending email" };
  }
}
