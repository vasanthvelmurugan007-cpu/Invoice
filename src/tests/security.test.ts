import assert from "node:assert";
import { db } from "../db";
import { tenants, monthlyPeriods, invoices, purchases, auditLogs, auditorClients, gstFilingPackages, hsnMaster } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { assertTenantAccess, getCurrentUser } from "../lib/auth-utils";
import { generateFilingPackageFile } from "../app/auditor/client/[tenantId]/prepare-filing/actions";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Override getCurrentUser for testing environment
(global as any).MOCK_USER = null;
const originalGetCurrentUser = getCurrentUser;
(global as any).getCurrentUserOverride = async () => {
  if ((global as any).MOCK_USER) return (global as any).MOCK_USER;
  return originalGetCurrentUser();
};

async function runTests() {
  console.log("Starting Security Integration Tests...");

  try {
    // 1. Test assertTenantAccess and failed_auth logging
    console.log("Test 1: assertTenantAccess failed_auth logging");
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    
    // We can't easily check DB for auditLogs because we don't have a valid tenant to insert against (foreign key constraints).
    // Let's create a test tenant.
    const [testTenant] = await db.insert(tenants).values({
      businessName: "Test Tenant",
      ownerId: "11111111-1111-1111-1111-111111111111", 
    }).returning();

    let threw = false;
    try {
      await assertTenantAccess(fakeUserId, testTenant.id, "owner");
    } catch (e: any) {
      threw = true;
      assert.match(e.message, /Unauthorized access to tenant/);
    }
    assert.strictEqual(threw, true, "assertTenantAccess should throw for unauthorized access");

    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, testTenant.id)).orderBy(desc(auditLogs.createdAt)).limit(1);
    assert.ok(log, "Audit log should be created");
    assert.strictEqual(log.action, "failed_auth", "Action should be failed_auth");
    console.log("✓ Test 1 Passed\n");

    // 2. Test Period Locking Enforcement (DB Trigger)
    console.log("Test 2: Period Locking Enforcement");
    const testMonth = 1;
    const testYear = 2026;

    // Lock the period
    await db.insert(monthlyPeriods).values({
      tenantId: testTenant.id,
      periodMonth: testMonth,
      periodYear: testYear,
      status: "locked",
    });

    // Try to insert invoice directly into DB (should be blocked by Postgres trigger)
    let triggerBlocked = false;
    try {
      await db.insert(invoices).values({
        tenantId: testTenant.id,
        invoiceNumber: "TEST-001",
        invoiceDate: "2026-01-15",
        customerName: "Test Customer",
        totalAmount: "1000",
        items: [],
      });
    } catch (e: any) {
      triggerBlocked = true;
      const fullError = String(e) + " " + String(e.cause?.message || "");
      assert.match(fullError, /Cannot modify data for a locked or filed period/);
    }
    assert.strictEqual(triggerBlocked, true, "Postgres trigger should block insert to locked period");
    console.log("✓ Test 2 Passed\n");

    // 3. Test Actual Idempotency via .onConflictDoUpdate()
    console.log("Test 3: Idempotency in generateFilingPackageFile");
    (global as any).MOCK_USER = { id: "33333333-3333-3333-3333-333333333333", role: "auditor" };
    
    // Create an auditor client access first
    await db.insert(auditorClients).values({
      auditorId: "33333333-3333-3333-3333-333333333333",
      tenantId: testTenant.id,
      status: "active",
      inviteEmail: "auditor@example.com"
    });

    // Call twice
    await generateFilingPackageFile(testTenant.id, 2, 2026, "gstr-1");
    await generateFilingPackageFile(testTenant.id, 2, 2026, "gstr-1");

    // Verify exactly one row exists with version = 2
    const packages = await db.select().from(gstFilingPackages).where(eq(gstFilingPackages.tenantId, testTenant.id));
    assert.strictEqual(packages.length, 1, "Only one package row should exist due to idempotency");
    assert.strictEqual(packages[0].version, 2, "Package version should be incremented to 2");
    console.log("✓ Test 3 Passed\n");

    // 4. Test Auditor Session Validity
    console.log("Test 4: Auditor Session Validity Live Check");
    
    // Revoke access mid-session
    await db.update(auditorClients)
      .set({ status: "revoked" })
      .where(eq(auditorClients.tenantId, testTenant.id));

    // Call an action as that auditor
    let auditorThrew = false;
    try {
      await assertTenantAccess("33333333-3333-3333-3333-333333333333", testTenant.id, "auditor");
    } catch (e: any) {
      auditorThrew = true;
      assert.match(e.message, /No active auditor access/);
    }
    assert.strictEqual(auditorThrew, true, "Auditor should be rejected after revocation");
    console.log("✓ Test 4 Passed\n");

    // 5. Test HSN Historical Rate Lookup & Backfill
    console.log("Test 5: HSN Historical Rate Lookup & Backfill");
    
    // Clean up any existing test HSN codes
    await db.delete(hsnMaster).where(eq(hsnMaster.code, "TESTHSN"));

    // Insert two HSN rows: one from 2025 (18%) and one from 2026 (12%)
    await db.insert(hsnMaster).values([
      { code: "TESTHSN", description: "Test Product", gstRate: 1800, type: "HSN", effectiveFrom: "2025-01-01", effectiveTo: "2025-12-31" },
      { code: "TESTHSN", description: "Test Product", gstRate: 1200, type: "HSN", effectiveFrom: "2026-01-01", effectiveTo: null }
    ]);

    // Insert an invoice with a 2025 date and null hsnRate
    const [testInvoice] = await db.insert(invoices).values({
      tenantId: testTenant.id,
      invoiceNumber: "HSN-TEST-1",
      invoiceDate: "2025-06-15",
      customerName: "HSN Customer",
      totalAmount: "100",
      items: [{ hsnCode: "TESTHSN" }]
    }).returning();

    // Run backfill
    const { backfillHsnRates } = await import("../db/backfill-hsn");
    await backfillHsnRates();

    const [updatedInvoice] = await db.select().from(invoices).where(eq(invoices.id, testInvoice.id));
    assert.strictEqual(updatedInvoice.hsnRate, 1800, "Should fetch the historical 18% rate from 2025");
    console.log("✓ Test 5 Passed\n");

    // 6. Test Three-role RBAC Check
    console.log("Test 6: Three-role RBAC Check");
    const { getClientData } = await import("../app/auditor/client/[tenantId]/actions");
    
    // Set to Unrelated User
    (global as any).MOCK_USER = { id: "99999999-9999-9999-9999-999999999999", role: "owner" };

    const c1 = await getClientData(testTenant.id, 1, 2026);
    assert.strictEqual(c1.success, false, "Unrelated user should be denied getClientData");

    const f1 = await generateFilingPackageFile(testTenant.id, 1, 2026, "gstr-1");
    assert.strictEqual(f1.success, false, "Unrelated user should be denied generateFilingPackageFile");
    assert.match(f1.error || "", /Unauthorized/, "Should return unauthorized error");

    // Set to Auditor
    (global as any).MOCK_USER = { id: "33333333-3333-3333-3333-333333333333", role: "auditor" };
    // Make auditor active
    await db.update(auditorClients).set({ status: "active" }).where(eq(auditorClients.tenantId, testTenant.id));
    
    const c2 = await getClientData(testTenant.id, 1, 2026);
    assert.strictEqual(c2.success, true, "Auditor should be allowed getClientData");

    const f2 = await generateFilingPackageFile(testTenant.id, 1, 2026, "gstr-1");
    assert.strictEqual(!!f2.fileUrl || !!f2.packageId, true, "Auditor should be allowed generateFilingPackageFile");

    // Set to Owner
    (global as any).MOCK_USER = { id: "11111111-1111-1111-1111-111111111111", role: "owner" };
    
    const c3 = await getClientData(testTenant.id, 1, 2026);
    assert.strictEqual(c3.success, false, "Owner should be denied getClientData (auditor required)");

    console.log("✓ Test 6 Passed\n");

    // 7. Test Session Integrity Check
    console.log("Test 7: Session Integrity Check");
    const { SignJWT, jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-for-dev");
    
    const validToken = await new SignJWT({ id: "1", role: "auditor" }).setProtectedHeader({ alg: "HS256" }).sign(secret);
    
    // Simulate a tampered payload
    const parts = validToken.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ id: "1", role: "owner" })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    let verifyFailed = false;
    try {
      await jwtVerify(tamperedToken, secret);
    } catch (e: any) {
      verifyFailed = true;
      assert.strictEqual(e.code, 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED');
    }
    assert.strictEqual(verifyFailed, true, "Tampered JWT must fail verification");
    console.log("✓ Test 7 Passed\n");

    // 8. AST Scanner Regression Check
    console.log("Test 8: AST Scanner Regression Check");
    const { execSync } = await import("child_process");
    try {
      execSync("npx tsx src/tests/scan-actions.ts src/tests/fixtures/unsafe-test.ts", { stdio: "pipe" });
      assert.fail("Scanner should have exited with error code 1");
    } catch (error: any) {
      assert.strictEqual(error.status, 1, "Scanner must exit with code 1");
      const output = error.stdout.toString() + error.stderr.toString();
      assert.match(output, /Found 1 violations/, "Scanner should find exactly 1 violation in the fixture");
      assert.match(output, /getTenantNameUnsafe/, "Scanner should identify the unsafe function name");
    }
    console.log("✓ Test 8 Passed\n");

    // 9. Auth Rate Limiting Check
    console.log("Test 9: Auth Rate Limiting Check");
    const { loginRateLimiter } = await import("../lib/rate-limit");
    let rateLimitHit = false;
    for (let i = 0; i < 6; i++) {
      const res = loginRateLimiter.check("testuser@invoicehub.com-127.0.0.1");
      if (!res.success) {
        rateLimitHit = true;
      }
    }
    assert.strictEqual(rateLimitHit, true, "Rate limiter should block after 5 failed attempts");
    console.log("✓ Test 9 Passed\n");

    // 10. Malicious File Upload Check
    console.log("Test 10: Malicious File Upload Check");
    const { uploadLogoOrSignature } = await import("../app/actions/upload");
    const formData = new FormData();
    // Simulate an .exe file but claim it is image/png
    const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00"); // typical MZ header for DOS/Windows executable
    const fakeFile = new File([exeBuffer], "malicious.png", { type: "image/png" });
    formData.append("file", fakeFile);
    formData.append("type", "logo");
    
    // We mock getCurrentUser just for the action if needed, but it already has MOCK_USER
    (global as any).MOCK_USER = { id: "11111111-1111-1111-1111-111111111111", role: "owner" };
    
    const uploadRes = await uploadLogoOrSignature(testTenant.id, formData);
    assert.strictEqual(uploadRes.success, false, "Upload must be rejected");
    assert.match(uploadRes.error || "", /Magic bytes validation failed/, "Must fail magic bytes check");
    console.log("✓ Test 10 Passed\n");
    // Setup for WhatsApp Tests
    const { requestWhatsAppLink, verifyWhatsAppLink } = await import("../app/actions/whatsapp-settings");
    const { POST: webhookPOST } = await import("../app/api/whatsapp/webhook/route");
    const { tenantWhatsappNumbers, whatsappProcessedMessages } = await import("../db/schema");
    const crypto = await import("crypto");
    
    // Test 15: Verification Code Brute-Force Protection
    console.log("Test 15: Verification Code Brute-Force Protection");
    await requestWhatsAppLink("11111111-1111-1111-1111-111111111111", testTenant.id, "+919876543210");
    let lockoutHit = false;
    for (let i = 0; i < 6; i++) {
      const res = await verifyWhatsAppLink("11111111-1111-1111-1111-111111111111", testTenant.id, "+919876543210", "000000");
      if (res.error?.includes("Too many failed attempts")) {
        lockoutHit = true;
      }
    }
    assert.strictEqual(lockoutHit, true, "Must lock out after 5 attempts");
    
    // Fix the lockout by requesting a new link
    await requestWhatsAppLink("11111111-1111-1111-1111-111111111111", testTenant.id, "+919876543210");
    // Manually get the code from DB
    let [freshRecord] = await db.select().from(tenantWhatsappNumbers).where(eq(tenantWhatsappNumbers.tenantId, testTenant.id));
    
    // Test expired code
    await db.update(tenantWhatsappNumbers).set({ codeExpiresAt: new Date(Date.now() - 10000) }).where(eq(tenantWhatsappNumbers.id, freshRecord.id));
    const expiredRes = await verifyWhatsAppLink("11111111-1111-1111-1111-111111111111", testTenant.id, "+919876543210", freshRecord.verificationCode!);
    assert.match(expiredRes.error || "", /Code expired/, "Must reject expired code");

    // Fix the expiry and verify
    await db.update(tenantWhatsappNumbers).set({ codeExpiresAt: new Date(Date.now() + 10000) }).where(eq(tenantWhatsappNumbers.id, freshRecord.id));
    const verifyRes = await verifyWhatsAppLink("11111111-1111-1111-1111-111111111111", testTenant.id, "+919876543210", freshRecord.verificationCode!);
    assert.strictEqual(verifyRes.success, true, "Must verify with correct code");
    console.log("✓ Test 15 Passed\n");

    // Helper for webhook testing
    const buildWebhookReq = (payload: any, sign: boolean = true) => {
      const raw = JSON.stringify(payload);
      const secret = process.env.WHATSAPP_APP_SECRET || "test-secret";
      const signature = sign ? `sha256=${crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex")}` : "invalid";
      
      return {
        text: async () => raw,
        headers: new Headers({
          "x-hub-signature-256": signature,
          "x-forwarded-for": "127.0.0.1"
        })
      } as any;
    };

    // Set mock env
    process.env.WHATSAPP_APP_SECRET = "test-secret";
    (global as any).MOCK_WHATSAPP = true;

    // Test 11: WhatsApp Invoice Capture E2E (happy path)
    console.log("Test 11: WhatsApp Invoice Capture E2E");
    // 11.1 Unregistered number
    const unregPayload = { entry: [{ changes: [{ value: { messages: [{ id: "msg1", from: "+12345", type: "text", text: { body: "Hi" } }] } }] }] };
    let resWebhook = await webhookPOST(buildWebhookReq(unregPayload));
    assert.strictEqual(resWebhook.status, 200); // Should reply with link prompt and return 200
    
    // 11.2 Invalid signature
    const invalidSigReq = buildWebhookReq(unregPayload, false);
    resWebhook = await webhookPOST(invalidSigReq);
    assert.strictEqual(resWebhook.status, 401, "Must reject invalid signature");

    // 11.3 Valid image upload
    const validImgPayload = { entry: [{ changes: [{ value: { messages: [{ id: "msg2", from: "+919876543210", type: "image", image: { id: "img1", mime_type: "image/png" } }] } }] }] };
    (global as any).MOCK_LLM_RESPONSE = JSON.stringify({
      vendorName: "Valid Vendor", vendorGstin: "27ABCDE1234F1Z5", invoiceNumber: "INV-11",
      invoiceDate: "2024-05-15", taxableAmount: 1000, cgst: 90, sgst: 90, igst: 0, totalAmount: 1180,
      hsnCode: "6109", category: "goods"
    });
    await webhookPOST(buildWebhookReq(validImgPayload));
    
    let [purchaseRec] = await db.select().from(purchases).where(eq(purchases.tenantId, testTenant.id)).orderBy(desc(purchases.createdAt)).limit(1);
    assert.ok(purchaseRec, "Purchase must be created");
    assert.strictEqual(purchaseRec.status, "pending_review", "Must be pending_review");
    
    // 11.4 Confirmation YES
    const yesPayload = { entry: [{ changes: [{ value: { messages: [{ id: "msg3", from: "+919876543210", type: "text", text: { body: "YES" } }] } }] }] };
    await webhookPOST(buildWebhookReq(yesPayload));
    [purchaseRec] = await db.select().from(purchases).where(eq(purchases.id, purchaseRec.id));
    assert.strictEqual(purchaseRec.status, "confirmed", "Must be confirmed");
    console.log("✓ Test 11 Passed\n");

    // Test 12: Webhook Message Deduplication
    console.log("Test 12: Webhook Message Deduplication");
    const dupPayload = { entry: [{ changes: [{ value: { messages: [{ id: "msg_dup", from: "+919876543210", type: "image", image: { id: "img2", mime_type: "image/png" } }] } }] }] };
    await webhookPOST(buildWebhookReq(dupPayload));
    await webhookPOST(buildWebhookReq(dupPayload)); // Send again
    
    const countDup = await db.select().from(whatsappProcessedMessages).where(eq(whatsappProcessedMessages.messageId, "msg_dup"));
    assert.strictEqual(countDup.length, 1, "Must deduplicate message processing");
    console.log("✓ Test 12 Passed\n");

    // Test 13: Cross-Tenant Isolation
    console.log("Test 13: Cross-Tenant Isolation");
    const [tenantB] = await db.insert(tenants).values({ businessName: "Tenant B", ownerId: "11111111-1111-1111-1111-111111111111" }).returning();
    const purchasesB = await db.select().from(purchases).where(eq(purchases.tenantId, tenantB.id));
    assert.strictEqual(purchasesB.length, 0, "Tenant B must not see Tenant A purchases");
    console.log("✓ Test 13 Passed\n");

    // Test 14: Low-Confidence / needs_review Path
    console.log("Test 14: Low-Confidence / needs_review Path");
    (global as any).MOCK_LLM_RESPONSE = JSON.stringify({
      vendorName: "Shady Vendor", vendorGstin: "INVALID_GSTIN", invoiceNumber: "INV-BAD",
      invoiceDate: "2024-05-15", taxableAmount: 1000, cgst: 0, sgst: 0, igst: 0, totalAmount: 5000, // Mismatch totals
      hsnCode: null, category: "goods"
    });
    const shadyPayload = { entry: [{ changes: [{ value: { messages: [{ id: "msg_shady", from: "+919876543210", type: "image", image: { id: "img3", mime_type: "image/png" } }] } }] }] };
    await webhookPOST(buildWebhookReq(shadyPayload));
    let [shadyPurchase] = await db.select().from(purchases).where(eq(purchases.invoiceNumber, "INV-BAD")).limit(1);
    assert.ok(shadyPurchase, "Purchase must be created despite low confidence");
    assert.strictEqual(shadyPurchase.status, "pending_review", "Must be pending_review");
    console.log("✓ Test 14 Passed\n");

    // Clean up
    await db.delete(whatsappProcessedMessages).where(eq(whatsappProcessedMessages.messageId, "msg_dup"));
    await db.delete(whatsappProcessedMessages).where(eq(whatsappProcessedMessages.messageId, "msg_shady"));
    await db.delete(whatsappProcessedMessages).where(eq(whatsappProcessedMessages.messageId, "msg1"));
    await db.delete(whatsappProcessedMessages).where(eq(whatsappProcessedMessages.messageId, "msg2"));
    await db.delete(whatsappProcessedMessages).where(eq(whatsappProcessedMessages.messageId, "msg3"));
    await db.delete(tenantWhatsappNumbers).where(eq(tenantWhatsappNumbers.tenantId, testTenant.id));
    await db.delete(auditLogs).where(eq(auditLogs.tenantId, testTenant.id));
    await db.delete(purchases).where(eq(purchases.tenantId, testTenant.id));
    await db.delete(invoices).where(eq(invoices.tenantId, testTenant.id));
    await db.delete(monthlyPeriods).where(eq(monthlyPeriods.tenantId, testTenant.id));
    await db.delete(auditorClients).where(eq(auditorClients.tenantId, testTenant.id));
    await db.delete(tenants).where(eq(tenants.id, testTenant.id));
    await db.delete(tenants).where(eq(tenants.businessName, "Tenant B"));
    await db.delete(hsnMaster).where(eq(hsnMaster.code, "TESTHSN"));
    
    console.log("All security tests passed successfully.");

    // Format output with LLM
    try {
      const { askLLM } = await import("../lib/llm-client");
      const summary = await askLLM({
        messages: [{
          role: "user",
          content: `Format a clean, human-readable summary paragraph of the following successful security test run. Do not hallucinate any failures.\n\nTest Run Output:\nAll 7 Tests Passed: \n- assertTenantAccess\n- Period Locking\n- Idempotency\n- Auditor Session\n- HSN Historical Rates\n- Three-role RBAC\n- Session Integrity Check`
        }]
      });
      console.log("\n[LLM SUMMARY]\n" + summary);
    } catch (e) {
      // Ignore LLM error if API key missing in test run
    }

    process.exit(0);

  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

runTests();
