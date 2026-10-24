-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "provider" VARCHAR(12) NOT NULL DEFAULT 'vapi';
-- AlterTable
ALTER TABLE "KnowledgeDocument" ADD COLUMN     "chars" INTEGER,
ADD COLUMN     "pages" INTEGER;
-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "dograhAgentUuid" VARCHAR(80),
ADD COLUMN     "dograhBaseUrl" VARCHAR(200) NOT NULL DEFAULT 'https://app.dograh.com',
ADD COLUMN     "dograhFromNumberId" INTEGER,
ADD COLUMN     "dograhInboundUrl" VARCHAR(300) NOT NULL DEFAULT 'https://api.dograh.com/api/v1/telephony/inbound/run',
ADD COLUMN     "dograhTelephonyConfigId" INTEGER,
ADD COLUMN     "inboundRouter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "providerOrder" VARCHAR(40) NOT NULL DEFAULT 'vapi,dograh',
ADD COLUMN     "vapiInboundUrl" VARCHAR(300);
-- CreateTable
CREATE TABLE "ProviderState" (
    "id" VARCHAR(12) NOT NULL,
    "cooldownUntil" TIMESTAMP(3),
    "lastError" VARCHAR(300),
    "lastErrorKind" VARCHAR(12),
    "lastErrorAt" TIMESTAMP(3),
    "lastOkAt" TIMESTAMP(3),
    "failures" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProviderState_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Call_endedAt_idx" ON "Call"("endedAt");
