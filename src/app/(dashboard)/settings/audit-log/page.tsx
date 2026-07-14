import { getAuditLogs } from "../../../actions/audit";
import AuditLogClient from "./AuditLogClient";
import DashboardLayout from "../../DashboardLayout";

export default async function AuditLogPage() {
  const res = await getAuditLogs();
  const logs = (res.logs || []) as any;

  return (
    <DashboardLayout>
      <AuditLogClient initialLogs={logs} />
    </DashboardLayout>
  );
}
