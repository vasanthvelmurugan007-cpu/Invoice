import puppeteer from 'puppeteer';
import { askLLM } from '../lib/llm-client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

async function runUiSanityCheck() {
  console.log("Starting UI Sanity Check with Puppeteer...");
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Log in as Owner
  console.log("Logging in as Owner...");
  await page.goto('http://localhost:3000/login');
  await page.waitForSelector('input[type="email"]');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const ownerBtn = buttons.find(b => b.textContent?.includes('Business Owner'));
    if (ownerBtn) ownerBtn.click();
  });
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  
  const ownerScreenshot = await page.screenshot({ encoding: 'base64' });
  fs.writeFileSync('owner_dash.png', Buffer.from(ownerScreenshot, 'base64'));
  console.log("Owner dashboard screenshot captured.");
  await page.close();

  // 2. Log in as Auditor (Fresh context)
  console.log("Logging in as Auditor...");
  const auditorContext = await browser.createBrowserContext();
  const auditorPage = await auditorContext.newPage();
  await auditorPage.setViewport({ width: 1280, height: 800 });
  await auditorPage.goto('http://localhost:3000/login');
  await auditorPage.waitForSelector('input[type="email"]');
  await auditorPage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const auditorBtn = buttons.find(b => b.textContent?.includes('CA Auditor'));
    if (auditorBtn) auditorBtn.click();
  });
  await auditorPage.click('button[type="submit"]');
  await auditorPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  
  const auditorScreenshot = await auditorPage.screenshot({ encoding: 'base64' });
  fs.writeFileSync('auditor_dash.png', Buffer.from(auditorScreenshot, 'base64'));
  console.log("Auditor dashboard screenshot captured.");
  await auditorPage.close();

  await browser.close();

  // 3. Ask LLM to verify
  console.log("Asking LLM to verify UI separation...");
  const prompt = `You are shown two dashboard screenshots: one for a business Owner, one for an Auditor. Describe 2-3 concrete UI elements visible in each that differ (e.g., navigation items, page titles, available actions). Then state PASS if they are meaningfully distinct interfaces, or FAIL if they look substantially the same (e.g., same layout with only a label changed).`;

  try {
    const result = await askLLM({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/png;base64,${ownerScreenshot}` } },
            { type: "image_url", image_url: { url: `data:image/png;base64,${auditorScreenshot}` } }
          ]
        }
      ]
    });
    console.log("\n[LLM VERDICT]\n" + result);
  } catch (error) {
    console.error("LLM verification failed:", error);
  }
}

runUiSanityCheck().catch(console.error);
