import { Prisma } from "@prisma/client";

type AuditClient = Prisma.TransactionClient;

type AuditEntryInput = {
  actorUserId: string | null;
  actorClerkUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
};

export async function recordAuditLog(tx: AuditClient, input: AuditEntryInput) {
  return tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorClerkUserId: input.actorClerkUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? Prisma.DbNull,
      after: input.after ?? Prisma.DbNull,
      metadata: input.metadata ?? Prisma.DbNull
    }
  });
}
