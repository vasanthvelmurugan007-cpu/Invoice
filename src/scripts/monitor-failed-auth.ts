import { db } from "../db";
import { auditLogs } from "../db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const THRESHOLD = 5;
const WINDOW_MINUTES = 15;

async function monitorFailedAuth() {
  console.log(`Starting failed_auth monitor. Checking for >${THRESHOLD} failures in the last ${WINDOW_MINUTES} minutes...`);

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  // Group by IP and User from metadata
  const ipField = sql<string>`${auditLogs.metadata}->>'ip'`;
  const userField = sql<string>`${auditLogs.metadata}->>'email'`;

  const results = await db
    .select({
      ip: ipField,
      user: userField,
      count: sql<number>`cast(count(${auditLogs.id}) as int)`
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "failed_auth"),
        gte(auditLogs.createdAt, windowStart)
      )
    )
    .groupBy(ipField, userField)
    .having(sql`count(${auditLogs.id}) > ${THRESHOLD}`);

  if (results.length > 0) {
    console.error("🚨 ALERT: Brute force or credential stuffing attack detected!");
    results.forEach(r => {
      console.error(`- IP: ${r.ip}, User: ${r.user} -> ${r.count} failed attempts in the last ${WINDOW_MINUTES}m`);
    });
    // In a real production setup, this would ping a Slack webhook or trigger PagerDuty.
    process.exit(1);
  } else {
    console.log("Monitor check passed. No excessive failed authentications detected.");
    process.exit(0);
  }
}

monitorFailedAuth().catch(e => {
  console.error("Monitor failed to run:", e);
  process.exit(1);
});
