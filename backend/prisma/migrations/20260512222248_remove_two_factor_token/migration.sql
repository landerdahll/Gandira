/*
  Warnings:

  - You are about to drop the `TwoFactorToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TwoFactorToken" DROP CONSTRAINT "TwoFactorToken_userId_fkey";

-- DropTable
DROP TABLE "TwoFactorToken";
