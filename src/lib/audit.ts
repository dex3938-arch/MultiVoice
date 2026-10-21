import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function audit(userId: number | null, action: string, entity?: string, entityId?: string | number, detail?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId: entityId === undefined ? undefined : String(entityId), detail } });
}
