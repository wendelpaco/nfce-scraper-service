import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

async function checkJobStatus(jobId: string) {
  try {
    logger.info(`🔍 Verificando status do job ${jobId}...`);

    const urlQueue = await prisma.urlQueue.findUnique({
      where: { id: jobId },
      include: { notaResults: true },
    });

    if (!urlQueue) {
      logger.error(`❌ Job ${jobId} não encontrado no banco de dados`);

      // Buscar jobs similares
      logger.info(`🔍 Buscando jobs com ID similar a ${jobId}...`);
      const similarJobs = await prisma.urlQueue.findMany({
        where: {
          id: {
            contains: jobId,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (similarJobs.length > 0) {
        logger.info(`📋 Jobs encontrados com ID similar:`);
        similarJobs.forEach((job) => {
          logger.info(
            `- ${job.id}: ${job.status} (${job.createdAt.toISOString()})`,
          );
        });
      } else {
        logger.info(`📋 Nenhum job com ID similar encontrado`);
      }

      // Mostrar jobs recentes
      logger.info(`📋 Jobs mais recentes:`);
      const recentJobs = await prisma.urlQueue.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
          url: true,
        },
      });

      recentJobs.forEach((job) => {
        logger.info(
          `- ${job.id}: ${job.status} (${job.createdAt.toISOString()}) - ${job.url.substring(0, 50)}...`,
        );
      });

      return;
    }

    logger.info(`📊 Status do job ${jobId}:`);
    logger.info(`- Status: ${urlQueue.status}`);
    logger.info(`- URL: ${urlQueue.url}`);
    logger.info(`- URL Final: ${urlQueue.urlFinal}`);
    logger.info(`- Criado em: ${urlQueue.createdAt}`);
    logger.info(`- Início do processamento: ${urlQueue.processingStartedAt}`);
    logger.info(`- Fim do processamento: ${urlQueue.processingEndedAt}`);
    logger.info(
      `- Mensagem de erro: ${urlQueue.lastErrorMessage || "Nenhuma"}`,
    );
    logger.info(`- Bull Job ID: ${urlQueue.bullJobId || "Nenhum"}`);
    logger.info(`- API Token ID: ${urlQueue.apiTokenId || "Nenhum"}`);
    logger.info(`- Webhook URL: ${urlQueue.webhookUrl || "Nenhuma"}`);
    logger.info(`- Resultados de nota: ${urlQueue.notaResults.length}`);

    if (urlQueue.notaResults.length > 0) {
      logger.info(
        `✅ Job possui ${urlQueue.notaResults.length} resultado(s) de nota`,
      );
      urlQueue.notaResults.forEach((result, index) => {
        logger.info(`  Resultado ${index + 1}:`);
        logger.info(`    - ID: ${result.id}`);
        logger.info(`    - URL: ${result.url}`);
        logger.info(`    - Criado em: ${result.createdAt}`);
        logger.info(`    - Webhook URL: ${result.webhookUrl || "Nenhuma"}`);
      });
    }

    // Verificar se há jobs BullMQ relacionados
    if (urlQueue.bullJobId) {
      logger.info(`🔗 Bull Job ID: ${urlQueue.bullJobId}`);
    }
  } catch (error) {
    logger.error("❌ Erro ao verificar status do job:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const jobId = process.argv[2];

  if (!jobId) {
    logger.error("❌ Por favor, forneça o ID do job como argumento");
    logger.info("Exemplo: npm run check-job-status 2025");
    process.exit(1);
  }

  await checkJobStatus(jobId);
}

main().catch(console.error);
