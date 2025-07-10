import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

async function showJobStatus() {
  try {
    logger.info("📊 Status atual dos jobs:");

    const statusCounts = await prisma.urlQueue.groupBy({
      by: ["status"],
      _count: true,
    });

    statusCounts.forEach(({ status, _count }) => {
      logger.info(`- ${status}: ${_count}`);
    });

    // Jobs em processamento
    const inProgress = await prisma.urlQueue.count({
      where: {
        processingStartedAt: { not: null },
        processingEndedAt: null,
      },
    });

    logger.info(`- Em processamento: ${inProgress}`);
  } catch (error) {
    logger.error("❌ Erro ao buscar status dos jobs:", error);
    throw error;
  }
}

async function reprocessBlockedJobs() {
  try {
    logger.info("🔄 Iniciando reprocessamento de jobs BLOCKED...");

    const blockedCount = await prisma.urlQueue.count({
      where: { status: "BLOCKED" },
    });

    if (blockedCount === 0) {
      logger.info("✅ Nenhum job BLOCKED encontrado para reprocessamento");
      return;
    }

    logger.info(`📊 Encontrados ${blockedCount} jobs BLOCKED`);

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

    // Mostra estatísticas atualizadas
    await showJobStatus();
  } catch (error) {
    logger.error("❌ Erro ao reprocessar jobs BLOCKED:", error);
    throw error;
  }
}

async function analyzeInvalidJobs() {
  try {
    logger.info("🔍 Analisando jobs INVALID...");

    const invalidJobs = await prisma.urlQueue.findMany({
      where: { status: "INVALID" },
      select: {
        id: true,
        url: true,
        createdAt: true,
        lastErrorMessage: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10, // Mostra apenas os 10 mais recentes
    });

    if (invalidJobs.length === 0) {
      logger.info("✅ Nenhum job INVALID encontrado");
      return;
    }

    logger.info(
      `📊 Encontrados ${invalidJobs.length} jobs INVALID (mostrando os 10 mais recentes):`,
    );

    invalidJobs.forEach((job) => {
      const daysAgo = Math.floor(
        (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      logger.info(`- ${job.id}: ${job.url}`);
      logger.info(`  Criado há ${daysAgo} dias`);
      if (job.lastErrorMessage) {
        logger.info(`  Erro: ${job.lastErrorMessage.substring(0, 100)}...`);
      }
      logger.info("");
    });
  } catch (error) {
    logger.error("❌ Erro ao analisar jobs INVALID:", error);
    throw error;
  }
}

async function cleanOldInvalidJobs(
  daysOld: number = 30,
  force: boolean = false,
) {
  try {
    logger.info(`🧹 Limpando jobs INVALID com mais de ${daysOld} dias...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldInvalidJobs = await prisma.urlQueue.findMany({
      where: {
        status: "INVALID",
        createdAt: { lt: cutoffDate },
      },
      select: {
        id: true,
        url: true,
        createdAt: true,
        lastErrorMessage: true,
      },
    });

    logger.info(`📊 Encontrados ${oldInvalidJobs.length} jobs INVALID antigos`);

    if (oldInvalidJobs.length === 0) {
      logger.info("✅ Nenhum job INVALID antigo encontrado para limpeza");
      return;
    }

    if (!force) {
      logger.warn(
        `⚠️ ATENÇÃO: Esta operação irá deletar ${oldInvalidJobs.length} jobs INVALID`,
      );
      logger.warn(
        "Para executar a limpeza, use: npm run manage-jobs clean-invalid --force",
      );
      logger.info("📋 Jobs que seriam deletados:");
      oldInvalidJobs.slice(0, 5).forEach((job) => {
        const daysAgo = Math.floor(
          (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        logger.info(`- ${job.id}: ${job.url} (${daysAgo} dias atrás)`);
      });
      if (oldInvalidJobs.length > 5) {
        logger.info(`... e mais ${oldInvalidJobs.length - 5} jobs`);
      }
      return;
    }

    // Executa a limpeza
    const deleteResult = await prisma.urlQueue.deleteMany({
      where: {
        status: "INVALID",
        createdAt: { lt: cutoffDate },
      },
    });

    logger.info(`✅ ${deleteResult.count} jobs INVALID antigos deletados`);
  } catch (error) {
    logger.error("❌ Erro ao limpar jobs INVALID:", error);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case "status":
        await showJobStatus();
        break;

      case "reprocess-blocked":
        await reprocessBlockedJobs();
        break;

      case "analyze-invalid":
        await analyzeInvalidJobs();
        break;

      case "clean-invalid":
        const daysOld = parseInt(process.argv[3]) || 30;
        const force = process.argv.includes("--force");
        await cleanOldInvalidJobs(daysOld, force);
        break;

      case "help":
      default:
        logger.info("📋 Comandos disponíveis:");
        logger.info(
          "  npm run manage-jobs status              - Mostra status atual dos jobs",
        );
        logger.info(
          "  npm run manage-jobs reprocess-blocked   - Reprocessa jobs BLOCKED",
        );
        logger.info(
          "  npm run manage-jobs analyze-invalid     - Analisa jobs INVALID",
        );
        logger.info(
          "  npm run manage-jobs clean-invalid [30]  - Limpa jobs INVALID antigos (30 dias por padrão)",
        );
        logger.info(
          "  npm run manage-jobs clean-invalid 30 --force  - Força a limpeza",
        );
        break;
    }
  } catch (error) {
    logger.error("❌ Erro no comando:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa o script se chamado diretamente
if (require.main === module) {
  main()
    .then(() => {
      logger.info("✅ Comando executado com sucesso");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Erro:", error);
      process.exit(1);
    });
}

export {
  showJobStatus,
  reprocessBlockedJobs,
  analyzeInvalidJobs,
  cleanOldInvalidJobs,
};
