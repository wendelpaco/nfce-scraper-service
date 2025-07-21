import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import { scraperQueue, redisConfig } from "../jobs/queue";

const prisma = new PrismaClient();

async function checkBullJobs() {
  try {
    logger.info("🔍 Verificando jobs BullMQ...");

    // Buscar jobs BullMQ
    const bullJobs = await scraperQueue.getJobs([
      "waiting",
      "active",
      "completed",
      "failed",
    ]);

    logger.info(`📊 Total de jobs BullMQ encontrados: ${bullJobs.length}`);

    // Agrupar por status
    const jobsByStatus: Record<string, any[]> = {};
    bullJobs.forEach((job) => {
      const status = job.finishedOn
        ? "completed"
        : job.failedReason
          ? "failed"
          : job.processedOn
            ? "active"
            : "waiting";
      if (!jobsByStatus[status]) jobsByStatus[status] = [];
      jobsByStatus[status].push(job);
    });

    Object.entries(jobsByStatus).forEach(([status, jobs]) => {
      logger.info(`📋 Jobs ${status}: ${jobs.length}`);
    });

    // Verificar jobs órfãos (BullMQ sem correspondência no banco)
    logger.info("\n🔍 Verificando jobs órfãos...");
    let orphanCount = 0;

    for (const job of bullJobs) {
      const jobData = job.data as any;
      const jobId = jobData?.jobId;

      if (jobId) {
        const dbJob = await prisma.urlQueue.findUnique({
          where: { id: jobId },
        });

        if (!dbJob) {
          logger.warn(
            `⚠️ Job BullMQ ${job.id} (jobId: ${jobId}) não encontrado no banco`,
          );
          orphanCount++;
        } else {
          logger.debug(
            `✅ Job BullMQ ${job.id} -> DB: ${dbJob.id} (${dbJob.status})`,
          );
        }
      } else {
        logger.warn(`⚠️ Job BullMQ ${job.id} sem jobId nos dados`);
        orphanCount++;
      }
    }

    logger.info(`📊 Jobs órfãos encontrados: ${orphanCount}`);

    // Verificar jobs no banco sem BullMQ correspondente
    logger.info("\n🔍 Verificando jobs no banco sem BullMQ...");
    const dbJobs = await prisma.urlQueue.findMany({
      where: {
        bullJobId: { not: null },
      },
      select: {
        id: true,
        status: true,
        bullJobId: true,
        createdAt: true,
      },
    });

    let missingBullCount = 0;
    for (const dbJob of dbJobs) {
      const bullJob = bullJobs.find((job) => job.id === dbJob.bullJobId);
      if (!bullJob) {
        logger.warn(
          `⚠️ Job DB ${dbJob.id} (Bull ID: ${dbJob.bullJobId}) não encontrado no BullMQ`,
        );
        missingBullCount++;
      }
    }

    logger.info(`📊 Jobs no banco sem BullMQ: ${missingBullCount}`);

    // Mostrar jobs recentes com problemas
    logger.info("\n📋 Jobs recentes com problemas:");
    const recentProblemJobs = bullJobs
      .filter((job) => {
        const jobData = job.data as any;
        return !jobData?.jobId || job.finishedOn || job.failedReason;
      })
      .slice(0, 10);

    recentProblemJobs.forEach((job) => {
      const jobData = job.data as any;
      logger.info(
        `- Bull ID: ${job.id}, JobId: ${jobData?.jobId || "N/A"}, Status: ${job.finishedOn ? "completed" : job.failedReason ? "failed" : "active"}`,
      );
    });
  } catch (error) {
    logger.error("❌ Erro ao verificar jobs BullMQ:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkBullJobs();
}

main().catch(console.error);
