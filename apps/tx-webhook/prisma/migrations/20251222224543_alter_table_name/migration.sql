/*
  Warnings:

  - You are about to drop the `SingatureMonitoring` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SingatureMonitoring";

-- CreateTable
CREATE TABLE "signature_monitoring" (
    "id" SERIAL NOT NULL,
    "signature" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "webhook_url" TEXT NOT NULL,
    "webhook_sent_at" TIMESTAMP(3),
    "status" "TxStatus" NOT NULL DEFAULT 'MONITORING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signature_monitoring_signature_key" ON "signature_monitoring"("signature");
