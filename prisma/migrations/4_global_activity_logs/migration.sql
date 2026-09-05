CREATE TABLE "ActivityLog" (
"id" TEXT NOT NULL,
"actorUserId" TEXT,
"actorUsername" TEXT NOT NULL,
"actorRole" TEXT NOT NULL,
"action" TEXT NOT NULL,
"module" TEXT NOT NULL,
"targetType" TEXT,
"targetId" TEXT,
"description" TEXT NOT NULL,
"metadata" TEXT,
"ipAddress" TEXT,
"userAgent" TEXT,
"rTUnitId" TEXT,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "ActivityLog_actorUserId_idx" ON "ActivityLog"("actorUserId");
CREATE INDEX "ActivityLog_rTUnitId_idx" ON "ActivityLog"("rTUnitId");
CREATE INDEX "ActivityLog_actorRole_idx" ON "ActivityLog"("actorRole");
CREATE INDEX "ActivityLog_module_idx" ON "ActivityLog"("module");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_rTUnitId_fkey" FOREIGN KEY ("rTUnitId") REFERENCES "RTUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
