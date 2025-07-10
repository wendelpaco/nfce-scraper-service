-- AlterTable
ALTER TABLE "UrlQueue" ADD COLUMN     "processingEndedAt" TIMESTAMP(3),
ADD COLUMN     "processingStartedAt" TIMESTAMP(3);
