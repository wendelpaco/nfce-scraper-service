import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { scraperQueue } from "../jobs/queue";

const prisma = new PrismaClient();

async function cleanBullJobs() {
  try {
    logger.info("🧹 Iniciando limpeza de jobs BullMQ...");

    // Buscar jobs BullMQ
    const bullJobs = await scraperQueue.getJobs([
      "waiting",
      "active",
      "completed",
      "failed",
    ]);

    logger.info(`📊 Total de jobs BullMQ encontrados: ${bullJobs.length}`);

    let cleanedCount = 0;
    let orphanCount = 0;

    for (const job of bullJobs) {
      const jobData = job.data as any;
      const jobId = jobData?.jobId;

      if (!jobId) {
        logger.warn(`⚠️ Job BullMQ ${job.id} sem jobId - removendo...`);
        await job.remove();
        orphanCount++;
        continue;
      }

      // Verificar se o job existe no banco
      const dbJob = await prisma.urlQueue.findUnique({
        where: { id: jobId },
      });

      if (!dbJob) {
        logger.warn(
          `⚠️ Job BullMQ ${job.id} (jobId: ${jobId}) não encontrado no banco - removendo...`,
        );
        await job.remove();
        orphanCount++;
        continue;
      }

      // Verificar se o job já foi processado
      if (job.finishedOn || job.failedReason) {
        logger.info(`✅ Job BullMQ ${job.id} já foi processado - removendo...`);
        await job.remove();
        cleanedCount++;
        continue;
      }

      // Verificar se o job no banco tem status que não permite reprocessamento
      if (!["PENDING", "BLOCKED"].includes(dbJob.status)) {
        logger.warn(
          `⚠️ Job BullMQ ${job.id} (DB status: ${dbJob.status}) não pode ser reprocessado - removendo...`,
        );
        await job.remove();
        cleanedCount++;
        continue;
      }
    }

    logger.info(`📊 Limpeza concluída:`);
    logger.info(`- Jobs órfãos removidos: ${orphanCount}`);
    logger.info(`- Jobs já processados removidos: ${cleanedCount}`);
    logger.info(`- Total removido: ${orphanCount + cleanedCount}`);

    // Mostrar estatísticas finais
    const remainingJobs = await scraperQueue.getJobs(["waiting", "active"]);
    logger.info(`📊 Jobs restantes: ${remainingJobs.length}`);
  } catch (error) {
    logger.error("❌ Erro ao limpar jobs BullMQ:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const force = process.argv.includes("--force");

  if (!force) {
    logger.warn(
      "⚠️ ATENÇÃO: Esta operação irá remover jobs BullMQ órfãos e já processados",
    );
    logger.warn(
      "Para executar a limpeza, use: npm run clean-bull-jobs -- --force",
    );
    return;
  }

  await cleanBullJobs();
}

main().catch(console.error);
