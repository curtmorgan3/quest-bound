/*
  Warnings:

  - A unique constraint covering the columns `[streamTabId]` on the table `Character` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Character_streamTabId_key" ON "Character"("streamTabId");
