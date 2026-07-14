import { db } from "../db";
import { auditLogs } from "../db/schema";

export interface LogActionParams {
  tenantId: string;
  actorId: string;
  actorRole: "owner" | "auditor" | "admin";
  action: string;
  periodMonth?: number;
  periodYear?: number;
  metadata?: any;
}

export async function logAction(params: LogActionParams) {
  try {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      periodMonth: params.periodMonth,
      periodYear: params.periodYear,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("Failed to log audit trail action:", error);
  }
}
