-- CreateTable
CREATE TABLE "UrlQueue" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UrlQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaResult" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "jsonData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaResult_pkey" PRIMARY KEY ("id")
);
