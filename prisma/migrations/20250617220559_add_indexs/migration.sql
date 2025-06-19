/*
  Warnings:

  - The primary key for the `NotaResult` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UrlQueue` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `urlQueueId` to the `NotaResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NotaResult" DROP CONSTRAINT "NotaResult_pkey",
ADD COLUMN     "urlQueueId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "NotaResult_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "NotaResult_id_seq";

-- AlterTable
ALTER TABLE "UrlQueue" DROP CONSTRAINT "UrlQueue_pkey",
ADD COLUMN     "bullJobId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "UrlQueue_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "UrlQueue_id_seq";

-- CreateIndex
CREATE INDEX "NotaResult_urlQueueId_idx" ON "NotaResult"("urlQueueId");

-- CreateIndex
CREATE INDEX "UrlQueue_status_idx" ON "UrlQueue"("status");

-- CreateIndex
CREATE INDEX "UrlQueue_createdAt_idx" ON "UrlQueue"("createdAt");

-- AddForeignKey
ALTER TABLE "NotaResult" ADD CONSTRAINT "NotaResult_urlQueueId_fkey" FOREIGN KEY ("urlQueueId") REFERENCES "UrlQueue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
