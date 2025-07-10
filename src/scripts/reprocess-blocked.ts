import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

async function reprocessBlockedJobs() {
  try {
    logger.info("🔄 Iniciando reprocessamento de jobs BLOCKED...");

    // Busca jobs com status BLOCKED
    const blockedJobs = await prisma.urlQueue.findMany({
      where: {
        status: "BLOCKED",
      },
      select: {
        id: true,
        url: true,
        createdAt: true,
        processingStartedAt: true,
        processingEndedAt: true,
        lastErrorMessage: true,
      },
    });

    logger.info(`📊 Encontrados ${blockedJobs.length} jobs com status BLOCKED`);

    if (blockedJobs.length === 0) {
      logger.info("✅ Nenhum job BLOCKED encontrado para reprocessamento");
      return;
    }

    // Move jobs BLOCKED para PENDING para reprocessamento
    const updateResult = await prisma.urlQueue.updateMany({
      where: {
        status: "BLOCKED",
      },
      data: {
        status: "PENDING",
        processingStartedAt: null,
        processingEndedAt: null,
        lastErrorMessage: null,
      },
    });

    logger.info(
      `✅ ${updateResult.count} jobs movidos de BLOCKED para PENDING`,
    );

    // Log detalhado dos jobs reprocessados
    logger.info("📋 Jobs reprocessados:");
    blockedJobs.forEach((job) => {
      const duration =
        job.processingStartedAt && job.processingEndedAt
          ? job.processingEndedAt.getTime() - job.processingStartedAt.getTime()
          : null;

      logger.info(`- Job ${job.id}:`);
      logger.info(`  URL: ${job.url}`);
      logger.info(`  Criado em: ${job.createdAt.toISOString()}`);
      if (duration) {
        logger.info(`  Duração anterior: ${(duration / 1000).toFixed(2)}s`);
      }
      if (job.lastErrorMessage) {
        logger.info(`  Erro anterior: ${job.lastErrorMessage}`);
      }
    });

    // Estatísticas finais
    const remainingBlocked = await prisma.urlQueue.count({
      where: { status: "BLOCKED" },
    });

    const pendingJobs = await prisma.urlQueue.count({
      where: { status: "PENDING" },
    });

    logger.info("📊 Estatísticas finais:");
    logger.info(`- Jobs BLOCKED restantes: ${remainingBlocked}`);
    logger.info(`- Jobs PENDING totais: ${pendingJobs}`);
  } catch (error) {
    logger.error("❌ Erro ao reprocessar jobs BLOCKED:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executa o script se chamado diretamente
if (require.main === module) {
  reprocessBlockedJobs()
    .then(() => {
      logger.info("✅ Script de reprocessamento concluído com sucesso");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Erro no script de reprocessamento:", error);
      process.exit(1);
    });
}

export { reprocessBlockedJobs };
