import { prisma } from "@/app/lib/prisma";

export async function logActivity(input: {
  actorUserId?: string | null;
  actorUsername?: string | null;
  actorRole?: string | null;
  action: string;
  module: string;
  targetType?: string | null;
  targetId?: string | null;
  description: string;
  metadata?: unknown;
  rTUnitId?: string | null;
  request?: Request;
}) {
  try {
    const forwarded = input.request?.headers.get("x-forwarded-for");

    const ipAddress =
      forwarded?.split(",")[0]?.trim() ||
      input.request?.headers.get("x-real-ip") ||
      null;

    await prisma.activityLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorUsername: input.actorUsername || "system",
        actorRole: (input.actorRole || "SYSTEM").toUpperCase(),
        action: input.action,
        module: input.module,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        description: input.description,
        metadata:
          input.metadata === undefined
            ? null
            : JSON.stringify(input.metadata),
        rTUnitId: input.rTUnitId ?? null,
        ipAddress,
        userAgent:
          input.request?.headers.get("user-agent") || null,
      },
    });
  } catch (error) {
    console.error("ACTIVITY_LOG_ERROR", error);
  }
}
