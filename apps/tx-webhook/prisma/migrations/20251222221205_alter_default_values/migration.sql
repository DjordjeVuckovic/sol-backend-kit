/*
  Warnings:

  - You are about to drop the column `address` on the `SingatureMonitoring` table. All the data in the column will be lost.
  - The `status` column on the `SingatureMonitoring` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "SingatureMonitoring_address_key";

-- AlterTable
ALTER TABLE "SingatureMonitoring" DROP COLUMN "address",
DROP COLUMN "status",
ADD COLUMN     "status" "TxStatus" NOT NULL DEFAULT 'MONITORING';
