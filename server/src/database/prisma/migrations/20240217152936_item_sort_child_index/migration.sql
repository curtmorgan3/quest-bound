/*
  Warnings:

  - You are about to drop the column `sortParentId` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "sortParentId",
ADD COLUMN     "sortChildId" TEXT;
