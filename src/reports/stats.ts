/* eslint-disable no-console */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Agrupa por status e conta quantos há de cada um
  const statusCounts = await prisma.urlQueue.groupBy({
    by: ["status"],
    _count: true,
  });

  // Top 5 mensagens de erro mais frequentes
  const topErrors = await prisma.urlQueue.groupBy({
    by: ["lastErrorMessage"],
    where: {
      status: "ERROR",
      lastErrorMessage: {
        not: null,
      },
    },
    _count: {
      lastErrorMessage: true,
    },
    orderBy: {
      _count: {
        lastErrorMessage: "desc",
      },
    },
    take: 5,
  });

  // Filas com mais erros (top 5 tokens)
  const topFailingTokens = await prisma.urlQueue.groupBy({
    by: ["apiTokenId"],
    where: {
      status: "ERROR",
      apiTokenId: {
        not: null,
      },
    },
    _count: {
      apiTokenId: true,
    },
    orderBy: {
      _count: {
        apiTokenId: "desc",
      },
    },
    take: 5,
  });

  console.log("--- Estatísticas Gerais ---\n");

  console.log("Status das filas:");
  statusCounts.forEach(({ status, _count }) => {
    console.log(`- ${status}: ${_count}`);
  });

  console.log("\nTop 5 mensagens de erro mais comuns:");
  topErrors.forEach(({ lastErrorMessage, _count }) => {
    console.log(`- "${lastErrorMessage}": ${_count}`);
  });

  console.log("\nTop 5 tokens com mais erros:");
  for (const { apiTokenId, _count } of topFailingTokens) {
    const token = await prisma.apiToken.findUnique({
      where: { id: apiTokenId! },
      select: {
        name: true,
        token: true,
        apiUser: {
          select: { name: true, email: true },
        },
      },
    });
    console.log(
      `- ${token?.name} (${token?.apiUser.name} / ${token?.apiUser.email}): ${_count?.apiTokenId ?? 0}`,
    );
  }

  // --- Estatísticas Adicionais ---
  console.log("\n--- Estatísticas Adicionais ---");

  const totalDone = await prisma.urlQueue.count({
    where: { status: "DONE" },
  });

  const totalError = await prisma.urlQueue.count({
    where: { status: "ERROR" },
  });

  const totalBlocked = await prisma.urlQueue.count({
    where: { status: "BLOCKED" },
  });

  const totalInvalid = await prisma.urlQueue.count({
    where: { status: "INVALID" },
  });

  const totalAll = await prisma.urlQueue.count();

  const percent = (count: number) =>
    ((count / totalAll) * 100).toFixed(1) + "%";

  console.log(`Total DONE: ${totalDone}`);
  console.log(`Total com ERRO: ${totalError} (${percent(totalError)})`);
  console.log(`Total BLOCKED: ${totalBlocked} (${percent(totalBlocked)})`);
  console.log(`Total INVALID: ${totalInvalid} (${percent(totalInvalid)})`);

  const totalNotas = await prisma.notaResult.count();
  const avgNotasPorUrl =
    totalDone > 0 ? (totalNotas / totalDone).toFixed(2) : "0";
  console.log(`\nMédia de notas por URL (DONE): ${avgNotasPorUrl}`);

  const topUrls = await prisma.notaResult.groupBy({
    by: ["url"],
    _count: {
      url: true,
    },
    orderBy: {
      _count: {
        url: "desc",
      },
    },
    take: 5,
  });

  console.log("\nTop 5 URLs mais processadas:");
  topUrls.forEach(({ url, _count }) => {
    console.log(`- ${url} (${_count.url} resultados)`);
  });

  // Gera arquivo CSV com registros com status "ERROR" ou "INVALID"
  const fs = await import("fs/promises");
  const path = "urlQueue-errors.csv";

  const failedRecords = await prisma.urlQueue.findMany({
    where: {
      status: {
        in: ["ERROR", "INVALID"],
      },
    },
    select: {
      status: true,
      bullJobId: true,
      url: true,
      // urlFinal: true,
      lastErrorMessage: true,
    },
  });

  const csvHeader = "status,bullJobId,url,lastErrorMessage\n";
  const csvRows = failedRecords.map((r) =>
    [
      r.status,
      r.bullJobId ?? "",
      r.url,
      // r.urlFinal ?? "",
      (r.lastErrorMessage ?? "").replace(/\n/g, " "),
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(","),
  );

  await fs.writeFile(path, csvHeader + csvRows.join("\n"));
  console.log(
    `\nArquivo "${path}" gerado com ${failedRecords.length} registros com erro ou inválidos.`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
