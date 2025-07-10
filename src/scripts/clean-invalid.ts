import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

async function analyzeInvalidJobs() {
  try {
    logger.info("🔍 Analisando jobs com status INVALID...");

    // Busca jobs com status INVALID
    const invalidJobs = await prisma.urlQueue.findMany({
      where: {
        status: "INVALID",
      },
      select: {
        id: true,
        url: true,
        createdAt: true,
        processingStartedAt: true,
        processingEndedAt: true,
        lastErrorMessage: true,
        apiTokenId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    logger.info(`📊 Encontrados ${invalidJobs.length} jobs com status INVALID`);

    if (invalidJobs.length === 0) {
      logger.info("✅ Nenhum job INVALID encontrado");
      return;
    }

    // Agrupa por mensagem de erro para análise
    const errorGroups: Record<string, number> = {};
    invalidJobs.forEach((job) => {
      const errorMsg = job.lastErrorMessage || "Sem mensagem de erro";
      errorGroups[errorMsg] = (errorGroups[errorMsg] || 0) + 1;
    });

    logger.info("📋 Análise de erros INVALID:");
    Object.entries(errorGroups)
      .sort(([, a], [, b]) => b - a)
      .forEach(([error, count]) => {
        logger.info(`- "${error}": ${count} jobs`);
      });

    // Análise por token (se aplicável)
    const tokenGroups: Record<string, number> = {};
    invalidJobs.forEach((job) => {
      const tokenId = job.apiTokenId || "Sem token";
      tokenGroups[tokenId] = (tokenGroups[tokenId] || 0) + 1;
    });

    logger.info("👤 Análise por token:");
    Object.entries(tokenGroups)
      .sort(([, a], [, b]) => b - a)
      .forEach(([tokenId, count]) => {
        if (tokenId === "Sem token") {
          logger.info(`- Sem token: ${count} jobs`);
        } else {
          logger.info(`- Token ${tokenId}: ${count} jobs`);
        }
      });

    // Análise temporal
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentInvalid = invalidJobs.filter(
      (job) => job.createdAt > oneDayAgo,
    ).length;
    const weekInvalid = invalidJobs.filter(
      (job) => job.createdAt > oneWeekAgo,
    ).length;

    logger.info("⏰ Análise temporal:");
    logger.info(`- Últimas 24h: ${recentInvalid} jobs INVALID`);
    logger.info(`- Última semana: ${weekInvalid} jobs INVALID`);
    logger.info(`- Total histórico: ${invalidJobs.length} jobs INVALID`);

    // Estatísticas gerais
    const totalJobs = await prisma.urlQueue.count();
    const invalidPercentage = ((invalidJobs.length / totalJobs) * 100).toFixed(
      2,
    );

    logger.info("📊 Estatísticas gerais:");
    logger.info(`- Total de jobs: ${totalJobs}`);
    logger.info(
      `- Jobs INVALID: ${invalidJobs.length} (${invalidPercentage}%)`,
    );

    // Sugestões de limpeza
    logger.info("💡 Sugestões:");
    logger.info("- Jobs INVALID são definitivos e não devem ser reprocessados");
    logger.info("- Considere limpar jobs INVALID antigos para liberar espaço");
    logger.info("- Analise padrões de erro para melhorar a detecção");
  } catch (error) {
    logger.error("❌ Erro ao analisar jobs INVALID:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanOldInvalidJobs(daysOld: number = 30) {
  try {
    logger.info(`🧹 Limpando jobs INVALID com mais de ${daysOld} dias...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldInvalidJobs = await prisma.urlQueue.findMany({
      where: {
        status: "INVALID",
        createdAt: {
          lt: cutoffDate,
        },
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

    // Confirmação (em produção, você pode querer adicionar uma flag --force)
    logger.warn(
      `⚠️ ATENÇÃO: Esta operação irá deletar ${oldInvalidJobs.length} jobs INVALID`,
    );
    logger.warn("Para executar a limpeza, chame a função com force=true");

    return oldInvalidJobs;
  } catch (error) {
    logger.error("❌ Erro ao buscar jobs INVALID antigos:", error);
    throw error;
  }
}

// Executa o script se chamado diretamente
if (require.main === module) {
  const command = process.argv[2];

  if (command === "clean") {
    const daysOld = parseInt(process.argv[3]) || 30;
    cleanOldInvalidJobs(daysOld)
      .then((jobs) => {
        if (jobs && jobs.length > 0) {
          logger.info("📋 Jobs que seriam deletados:");
          jobs.forEach((job) => {
            logger.info(
              `- ${job.id}: ${job.url} (${job.createdAt.toISOString()})`,
            );
          });
        }
        process.exit(0);
      })
      .catch((error) => {
        logger.error("❌ Erro:", error);
        process.exit(1);
      });
  } else {
    analyzeInvalidJobs()
      .then(() => {
        logger.info("✅ Análise de jobs INVALID concluída");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("❌ Erro:", error);
        process.exit(1);
      });
  }
}

export { analyzeInvalidJobs, cleanOldInvalidJobs };
