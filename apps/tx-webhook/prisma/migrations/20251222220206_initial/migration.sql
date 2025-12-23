-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('MONITORING', 'CONFIRMED', 'FAILED', 'WEBHOOK_FAILED');

-- CreateTable
CREATE TABLE "SingatureMonitoring" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "webhook_url" TEXT NOT NULL,
    "webhook_sent_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SingatureMonitoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SingatureMonitoring_address_key" ON "SingatureMonitoring"("address");

-- CreateIndex
CREATE UNIQUE INDEX "SingatureMonitoring_signature_key" ON "SingatureMonitoring"("signature");
