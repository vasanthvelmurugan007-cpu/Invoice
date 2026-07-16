<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Operational Cron Jobs
The application includes a failed-auth monitoring script designed to catch credential stuffing or brute force attempts in near real-time.
- **Script**: `src/scripts/monitor-failed-auth.ts`
- **Schedule**: Run this every 15 minutes via cron.
- **Cron Entry Example**: `*/15 * * * * npx tsx /path/to/project/src/scripts/monitor-failed-auth.ts >> /var/log/invoicehub/monitor.log 2>&1`
- **Alerting**: The script exits with status 1 if it detects more than 5 failed logins for a single IP/user within the time window. Monitor the log output or wrap the cron entry to trigger a Slack webhook on non-zero exits.
