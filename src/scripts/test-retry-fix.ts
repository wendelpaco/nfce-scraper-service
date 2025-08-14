import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { scraperQueue } from "../jobs/queue";

const prisma = new PrismaClient();

async function testRetryFix() {
  try {
    logger.info("🧪 Testando correção do sistema de retry...");

    // Buscar jobs com status ERROR recentes
    const errorJobs = await prisma.urlQueue.findMany({
      where: {
        status: "ERROR",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    logger.info(
      `📊 Encontrados ${errorJobs.length} jobs com erro nas últimas 24h`,
    );

    if (errorJobs.length === 0) {
      logger.info("✅ Nenhum job com erro encontrado para teste");
      return;
    }

    // Testar com o primeiro job com erro
    const testJob = errorJobs[0];
    logger.info(`\n🔍 Testando com job: ${testJob.id}`);
    logger.info(`- Status: ${testJob.status}`);
    logger.info(`- URL: ${testJob.url}`);
    logger.info(`- Erro: ${testJob.lastErrorMessage || "Nenhum"}`);
    logger.info(`- Bull Job ID: ${testJob.bullJobId || "Nenhum"}`);

    // Verificar se o job BullMQ ainda existe
    if (testJob.bullJobId) {
      const bullJob = await scraperQueue.getJob(testJob.bullJobId);

      if (bullJob) {
        logger.info(`\n📋 Informações do job BullMQ:`);
        logger.info(`- Bull ID: ${bullJob.id}`);
        logger.info(`- Tentativas: ${bullJob.attemptsMade}`);
        logger.info(`- Máximo de tentativas: ${bullJob.opts.attempts}`);
        logger.info(
          `- Status: ${bullJob.finishedOn ? "completed" : bullJob.failedReason ? "failed" : "active"}`,
        );

        if (bullJob.attemptsMade < (bullJob.opts.attempts || 5)) {
          logger.warn(
            `⚠️ Job parou com ${bullJob.attemptsMade} tentativas de ${bullJob.opts.attempts} - problema identificado`,
          );
        } else {
          logger.info(`✅ Job esgotou todas as tentativas corretamente`);
        }
      } else {
        logger.warn(`⚠️ Job BullMQ ${testJob.bullJobId} não encontrado`);
      }
    }

    // Simular reprocessamento
    logger.info(`\n🔄 Simulando reprocessamento...`);

    // Mover job de ERROR para PENDING para teste
    await prisma.urlQueue.update({
      where: { id: testJob.id },
      data: {
        status: "PENDING",
        lastErrorMessage: null,
        processingStartedAt: null,
        processingEndedAt: null,
      },
    });

    logger.info(`✅ Job ${testJob.id} movido para PENDING`);

    // Verificar se o job pode ser reprocessado
    const updatedJob = await prisma.urlQueue.findUnique({
      where: { id: testJob.id },
    });

    if (updatedJob?.status === "PENDING") {
      logger.info(`✅ Job ${testJob.id} está pronto para reprocessamento`);
      logger.info(`- Status atual: ${updatedJob.status}`);
      logger.info(
        `- Pode ser processado: ${["PENDING", "ERROR", "BLOCKED"].includes(updatedJob.status)}`,
      );
    } else {
      logger.error(`❌ Falha ao mover job para PENDING`);
    }

    // Mostrar estatísticas de jobs por status
    logger.info(`\n📊 Estatísticas atuais:`);
    const statusCounts = await prisma.urlQueue.groupBy({
      by: ["status"],
      _count: true,
    });

    statusCounts.forEach(({ status, _count }) => {
      logger.info(`- ${status}: ${_count}`);
    });
  } catch (error) {
    logger.error("❌ Erro ao testar correção do retry:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await testRetryFix();
}

main().catch(console.error);
