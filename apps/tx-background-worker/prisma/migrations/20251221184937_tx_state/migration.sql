/*
  Warnings:

  - The values [PROCCESSING] on the enum `TxStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TxStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "public"."transactions" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "transactions" ALTER COLUMN "state" TYPE "TxStatus_new" USING ("state"::text::"TxStatus_new");
ALTER TYPE "TxStatus" RENAME TO "TxStatus_old";
ALTER TYPE "TxStatus_new" RENAME TO "TxStatus";
DROP TYPE "public"."TxStatus_old";
ALTER TABLE "transactions" ALTER COLUMN "state" SET DEFAULT 'PENDING';
COMMIT;
