-- CreateTable
CREATE TABLE "wallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sol_adress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "signature" TEXT NOT NULL,
    "slot" BIGINT NOT NULL,
    "block_time" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_sol_adress_key" ON "wallet"("sol_adress");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_signature_key" ON "signatures"("signature");

-- CreateIndex
CREATE INDEX "signatures_signature_idx" ON "signatures"("signature");

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
