import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { scraperQueue } from "../jobs/queue";

const prisma = new PrismaClient();

async function analyzeJobRetries(jobId: string) {
  try {
    logger.info(`🔍 Analisando retries do job ${jobId}...`);

    // Buscar o job no banco
    const urlQueue = await prisma.urlQueue.findUnique({
      where: { id: jobId },
      include: { notaResults: true },
    });

    if (!urlQueue) {
      logger.error(`❌ Job ${jobId} não encontrado no banco de dados`);
      return;
    }

    logger.info(`📊 Informações do job:`);
    logger.info(`- ID: ${urlQueue.id}`);
    logger.info(`- Status: ${urlQueue.status}`);
    logger.info(`- URL: ${urlQueue.url}`);
    logger.info(`- Criado em: ${urlQueue.createdAt}`);
    logger.info(`- Início do processamento: ${urlQueue.processingStartedAt}`);
    logger.info(`- Fim do processamento: ${urlQueue.processingEndedAt}`);
    logger.info(
      `- Mensagem de erro: ${urlQueue.lastErrorMessage || "Nenhuma"}`,
    );
    logger.info(`- Bull Job ID: ${urlQueue.bullJobId || "Nenhum"}`);

    // Buscar o job BullMQ correspondente
    if (urlQueue.bullJobId) {
      const bullJob = await scraperQueue.getJob(urlQueue.bullJobId);

      if (bullJob) {
        logger.info(`\n📋 Informações do job BullMQ:`);
        logger.info(`- Bull ID: ${bullJob.id}`);
        logger.info(
          `- Status: ${bullJob.finishedOn ? "completed" : bullJob.failedReason ? "failed" : "active"}`,
        );
        logger.info(`- Tentativas: ${bullJob.attemptsMade}`);
        logger.info(`- Máximo de tentativas: ${bullJob.opts.attempts}`);
        logger.info(
          `- Processado em: ${bullJob.processedOn ? new Date(bullJob.processedOn).toISOString() : "N/A"}`,
        );
        logger.info(
          `- Finalizado em: ${bullJob.finishedOn ? new Date(bullJob.finishedOn).toISOString() : "N/A"}`,
        );
        logger.info(
          `- Falhou em: ${bullJob.failedReason ? new Date(bullJob.finishedOn!).toISOString() : "N/A"}`,
        );
        logger.info(`- Razão da falha: ${bullJob.failedReason || "N/A"}`);
        logger.info(`- Dados: ${JSON.stringify(bullJob.data, null, 2)}`);

        // Verificar configuração de retry
        logger.info(`\n⚙️ Configuração de retry:`);
        logger.info(`- Attempts: ${bullJob.opts.attempts}`);
        logger.info(`- Delay: ${bullJob.opts.delay}ms`);
        logger.info(`- Backoff type: ${bullJob.opts.backoff?.type || "N/A"}`);
        logger.info(
          `- Backoff delay: ${bullJob.opts.backoff?.delay || "N/A"}ms`,
        );
      } else {
        logger.warn(`⚠️ Job BullMQ ${urlQueue.bullJobId} não encontrado`);
      }
    }

    // Buscar jobs BullMQ similares para análise
    logger.info(`\n🔍 Buscando jobs BullMQ similares...`);
    const allBullJobs = await scraperQueue.getJobs([
      "waiting",
      "active",
      "completed",
      "failed",
    ]);

    const similarJobs = allBullJobs.filter((job) => {
      const jobData = job.data as any;
      return jobData?.jobId === jobId;
    });

    if (similarJobs.length > 1) {
      logger.info(
        `📊 Encontrados ${similarJobs.length} jobs BullMQ para o mesmo jobId:`,
      );
      similarJobs.forEach((job, index) => {
        logger.info(
          `  ${index + 1}. Bull ID: ${job.id}, Status: ${job.finishedOn ? "completed" : job.failedReason ? "failed" : "active"}, Tentativas: ${job.attemptsMade}`,
        );
      });
    }

    // Analisar padrão de erros
    logger.info(`\n🔍 Análise do erro:`);
    if (urlQueue.lastErrorMessage) {
      const errorMsg = urlQueue.lastErrorMessage.toLowerCase();

      if (errorMsg.includes("session closed")) {
        logger.info(
          `⚠️ Erro de sessão fechada detectado - pode indicar problema de timeout ou conexão`,
        );
      } else if (errorMsg.includes("protocol error")) {
        logger.info(
          `⚠️ Erro de protocolo detectado - pode indicar problema de comunicação com o browser`,
        );
      } else if (errorMsg.includes("timeout")) {
        logger.info(
          `⚠️ Timeout detectado - pode indicar página lenta ou bloqueio`,
        );
      } else if (errorMsg.includes("blocked")) {
        logger.info(
          `⚠️ Bloqueio detectado - pode indicar IP bloqueado ou captcha`,
        );
      } else {
        logger.info(`⚠️ Outro tipo de erro: ${urlQueue.lastErrorMessage}`);
      }
    }

    // Verificar se o job deveria ter mais tentativas
    if (urlQueue.bullJobId) {
      const bullJob = await scraperQueue.getJob(urlQueue.bullJobId);
      if (bullJob && bullJob.attemptsMade < (bullJob.opts.attempts || 5)) {
        logger.warn(
          `⚠️ Job parou com ${bullJob.attemptsMade} tentativas de ${bullJob.opts.attempts} - pode ter sido interrompido manualmente`,
        );
      }
    }
  } catch (error) {
    logger.error("❌ Erro ao analisar retries do job:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const jobId = process.argv[2];

  if (!jobId) {
    logger.error("❌ Por favor, forneça o ID do job como argumento");
    logger.info(
      "Exemplo: npm run analyze-job-retries 5200de99-3b00-4765-9fb1-63a75f5b1701",
    );
    process.exit(1);
  }

  await analyzeJobRetries(jobId);
}

main().catch(console.error);
