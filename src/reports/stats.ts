/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

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

  // --- ANÁLISE DE PERFORMANCE ---
  const performanceStats = await prisma.urlQueue.findMany({
    where: {
      processingStartedAt: { not: null },
      processingEndedAt: { not: null },
      status: "DONE",
    },
    select: {
      processingStartedAt: true,
      processingEndedAt: true,
      status: true,
    },
  });

  const processingTimes = performanceStats.map((stat) => {
    const start = stat.processingStartedAt!.getTime();
    const end = stat.processingEndedAt!.getTime();
    return end - start;
  });

  const avgProcessingTime =
    processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) /
        processingTimes.length
      : 0;

  const minProcessingTime =
    processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
  const maxProcessingTime =
    processingTimes.length > 0 ? Math.max(...processingTimes) : 0;

  // Jobs em processamento (não finalizados)
  const jobsInProgress = await prisma.urlQueue.count({
    where: {
      processingStartedAt: { not: null },
      processingEndedAt: null,
    },
  });

  // Jobs pendentes (não iniciados)
  const jobsPending = await prisma.urlQueue.count({
    where: {
      processingStartedAt: null,
      status: "PENDING",
    },
  });

  console.log("=== ANÁLISE DE STATUS DOS PROCESSAMENTOS ===\n");

  console.log("📊 Status das filas:");
  statusCounts.forEach(({ status, _count }) => {
    console.log(`- ${status}: ${_count}`);
  });

  console.log("\n⏱️ Métricas de Performance:");
  console.log(
    `- Tempo médio de processamento: ${(avgProcessingTime / 1000).toFixed(2)}s`,
  );
  console.log(`- Tempo mínimo: ${(minProcessingTime / 1000).toFixed(2)}s`);
  console.log(`- Tempo máximo: ${(maxProcessingTime / 1000).toFixed(2)}s`);
  console.log(
    `- Total de jobs processados com tempo: ${processingTimes.length}`,
  );
  console.log(`- Jobs em processamento: ${jobsInProgress}`);
  console.log(`- Jobs pendentes: ${jobsPending}`);

  console.log("\n🚨 Top 5 mensagens de erro mais comuns:");
  topErrors.forEach(({ lastErrorMessage, _count }) => {
    console.log(`- "${lastErrorMessage}": ${_count}`);
  });

  console.log("\n👤 Top 5 tokens com mais erros:");
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
  console.log("\n=== ESTATÍSTICAS ADICIONAIS ===");

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

  console.log(`✅ Total DONE: ${totalDone}`);
  console.log(`❌ Total com ERRO: ${totalError} (${percent(totalError)})`);
  console.log(`⏳ Total BLOCKED: ${totalBlocked} (${percent(totalBlocked)})`);
  console.log(`🚫 Total INVALID: ${totalInvalid} (${percent(totalInvalid)})`);

  const totalNotas = await prisma.notaResult.count();
  const avgNotasPorUrl =
    totalDone > 0 ? (totalNotas / totalDone).toFixed(2) : "0";
  console.log(`\n📄 Média de notas por URL (DONE): ${avgNotasPorUrl}`);

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

  console.log("\n🔗 Top 5 URLs mais processadas:");
  topUrls.forEach(({ url, _count }) => {
    console.log(`- ${url} (${_count.url} resultados)`);
  });

  // --- ANÁLISE DE TENDÊNCIAS ---
  console.log("\n=== ANÁLISE DE TENDÊNCIAS ===");

  const recentJobs = await prisma.urlQueue.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const recentStatusCounts = recentJobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log("📈 Jobs das últimas 24h:");
  Object.entries(recentStatusCounts).forEach(([status, count]) => {
    console.log(`- ${status}: ${count}`);
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
      lastErrorMessage: true,
      processingStartedAt: true,
      processingEndedAt: true,
    },
  });

  const csvHeader =
    "status,bullJobId,url,lastErrorMessage,processingStartedAt,processingEndedAt,durationMs\n";
  const csvRows = failedRecords.map((r) => {
    const durationMs =
      r.processingStartedAt && r.processingEndedAt
        ? r.processingEndedAt.getTime() - r.processingStartedAt.getTime()
        : "";

    return [
      r.status,
      r.bullJobId ?? "",
      r.url,
      (r.lastErrorMessage ?? "").replace(/\n/g, " "),
      r.processingStartedAt?.toISOString() ?? "",
      r.processingEndedAt?.toISOString() ?? "",
      durationMs,
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(",");
  });

  await fs.writeFile(path, csvHeader + csvRows.join("\n"));
  console.log(
    `\n📁 Arquivo "${path}" gerado com ${failedRecords.length} registros com erro ou inválidos.`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
