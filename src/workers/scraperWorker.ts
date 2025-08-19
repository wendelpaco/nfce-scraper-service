import { Worker } from "bullmq";
import { getScraperByCode } from "../scrapers/scraperRegistry";
import prisma from "../utils/prisma";
import { openPage, getAllPages } from "../utils/browserInstance";
import { solvePageCaptchas } from "../core/solveRecaptchas";
import { EventEmitter } from "events";
import { redisConfig } from "../jobs/queue";
import { logger } from "../utils/logger";
import axios from "axios";
import { TargetWithCreationTime } from "../types/browser";

EventEmitter.defaultMaxListeners = 10;

type JobStatus = "DONE" | "INVALID" | "BLOCKED" | "ERROR";

function classifyErrorOrContent(error: unknown, pageText?: string): JobStatus {
  const errorStr = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  const contentStr = pageText?.toLowerCase() || "";

  // if (contentStr.trim().length === 0) {
  //   return "INVALID"; // Página sem conteúdo esperado deve ser considerada inválida
  // }

  if (
    contentStr.includes("secretaria de estado de fazenda do rio de janeiro") ||
    contentStr.includes("bloqueia acessos provenientes desses endereços ip") ||
    errorStr.includes("blocked") ||
    errorStr.includes("captcha") ||
    contentStr.includes("não foi possível validar o acesso") ||
    contentStr.includes("rejeição: consumo indevido") ||
    contentStr.includes("656-rejeição: consumo indevido.") ||
    errorStr.includes("invalid") ||
    errorStr.includes("não encontrado")
  ) {
    return "BLOCKED";
  }

  if (error && errorStr.trim().length > 0) return "ERROR";

  return "DONE"; // Conteúdo parece válido
}

export const scraperWorker = new Worker(
  "scraperQueue",
  async (job) => {
    const { url, stateCode, jobId } = job.data;

    // Validação: garantir que jobId está definido
    if (!jobId) {
      logger.error("jobId está undefined! Dados do job:", job.data);
      throw new Error(
        "jobId está undefined! Não é possível processar este job.",
      );
    }

    const urlQueueRecord = await prisma.urlQueue.findFirst({
      where: {
        id: jobId,
        status: { in: ["PENDING", "ERROR", "BLOCKED"] },
      },
    });

    if (!urlQueueRecord) {
      logger.warn(
        `⚠️ Job ${job.id} não está pendente. Ignorando processamento.`,
      );
      return;
    }

    try {
      // Marca início do processamento
      const now = new Date();
      await prisma.urlQueue.update({
        where: { id: jobId },
        data: { processingStartedAt: now },
      });

      const scraper = getScraperByCode(stateCode);
      const { page } = await openPage(url);

      await page
        .waitForSelector("#tabResult tr", { timeout: 30000 })
        .catch(() => {
          logger.debug(
            "[DEBUG] Timeout esperando seletor #tabResult tr. Pode não ter carregado.",
          );
        });

      // Verificação explícita de iframe de reCAPTCHA para melhorar detecção
      const recaptchaFrame = page
        .frames()
        .find((frame) =>
          frame.url().includes("https://www.google.com/recaptcha/api2/anchor"),
        );

      if (recaptchaFrame) {
        logger.info(
          "🎯 reCAPTCHA detectado via iframe na página. Tentando resolver...",
        );
        const captchaResult = await solvePageCaptchas(page);
        if (captchaResult.error) {
          logger.error(`⚠️ Erro ao resolver captcha: ${captchaResult.error}`);
        } else if (captchaResult.solved) {
          logger.info("✅ Captcha resolvido com sucesso.");
        } else {
          logger.warn("⚠️ reCAPTCHA detectado, mas não foi possível resolver.");
        }
      } else {
        logger.info("ℹ️ Nenhum reCAPTCHA detectado na página via iframe.");
      }

      logger.debug(
        `[DEBUG] Aguardando seletor #tabResult tr para garantir carregamento da página...`,
      );
      let pageText = "";
      try {
        pageText = await page.evaluate(() => {
          const avisoErro = document.querySelector(".avisoErro");
          if (avisoErro && avisoErro.textContent?.trim()) {
            return avisoErro.textContent.trim();
          }
          return document.body?.innerText || "";
        });
      } catch (err) {
        logger.error("⚠️ Erro ao extrair innerText do body:", err);
        pageText = "";
      }
      logger.debug(
        "[DEBUG] Texto extraído da página:",
        pageText.substring(0, 80).replace(/\n/g, " "),
      );

      // Classifica o conteúdo da página antes de tentar resolver captchas
      const preCheckStatus = classifyErrorOrContent(null, pageText);
      logger.debug(`[DEBUG] Status pré-check da página: ${preCheckStatus}`);

      if (preCheckStatus === "DONE") {
        const hasTable = await page.$("#tabResult tr");
        if (hasTable) {
          logger.info(
            `✅ Página carregada com sucesso para job ${job.id}. Nota fiscal parece válida.`,
          );
        } else {
          logger.error(
            `⚠️ Elemento esperado (#tabResult tr) não encontrado mesmo após status DONE. Marcando como ERROR.`,
          );
          await prisma.urlQueue.update({
            where: { id: jobId },
            data: {
              status: "ERROR",
              lastErrorMessage: `${pageText} - Elemento #tabResult tr não encontrado na página.`,
            },
          });
          await page.close();
          throw new Error("Elemento #tabResult tr não encontrado na página.");
        }
      }

      if (preCheckStatus === "BLOCKED") {
        logger.warn(
          `⏳ Bloqueio temporário detectado para job ${job.id}. Reagendando para reprocessamento.`,
        );

        await prisma.urlQueue.update({
          where: { id: jobId },
          data: {
            status: "BLOCKED",
            lastErrorMessage: `${pageText} - Bloqueio temporário detectado na página.`,
          },
        });

        await page.close();

        // Faz o worker lançar erro controlado para permitir reprocessamento via retry
        throw new Error("BLOCKED_TEMPORARILY");
      }

      await page.waitForTimeout(2000); // Aguarda carregamento inicial da página

      const result = await scraper.scrape(page);

      await page.close();

      // CORREÇÃO: Removida a verificação que impedia retry
      // A verificação anterior estava impedindo o retry quando o status era ERROR
      // Agora o job pode ser reprocessado mesmo com status ERROR

      // Debug: verificar se os campos estão sendo capturados
      logger.debug(`[DEBUG] Dados do scraper para job ${job.id}:`, {
        metadata: result.metadata,
        itemsCount: result.items.length,
        totals: result.totals,
      });

      const metadata = {
        ...result.metadata,
        items: result.items,
        totals: result.totals,
      };

      await prisma.notaResult.create({
        data: {
          url,
          jsonData: JSON.parse(JSON.stringify({ metadata })),
          webhookUrl: urlQueueRecord?.webhookUrl || null,
          urlQueueId: jobId,
        },
      });

      await prisma.urlQueue.update({
        where: { id: jobId },
        data: {
          status: "DONE",
          lastErrorMessage: null,
          processingEndedAt: new Date(),
        },
      });

      // Busca os dados atualizados do urlQueue para incluir os timestamps
      // (agora após definir o processingEndedAt)
      const updatedUrlQueue = await prisma.urlQueue.findUnique({
        where: { id: jobId },
        include: { notaResults: true },
      });

      const pushedData = {
        status: updatedUrlQueue?.status || "DONE",
        id: updatedUrlQueue?.notaResults?.[0]?.id || null,
        url: updatedUrlQueue?.notaResults?.[0]?.url || url,
        webhookUrl:
          updatedUrlQueue?.notaResults?.[0]?.webhookUrl ||
          urlQueueRecord?.webhookUrl ||
          null,
        createdAt: updatedUrlQueue?.createdAt || null,
        urlQueueId: updatedUrlQueue?.notaResults?.[0]?.urlQueueId || jobId,
        // Campos de tempo de processamento
        processingStartedAt: updatedUrlQueue?.processingStartedAt,
        processingEndedAt: updatedUrlQueue?.processingEndedAt,
        processingDurationMs:
          updatedUrlQueue?.processingStartedAt &&
          updatedUrlQueue?.processingEndedAt
            ? updatedUrlQueue.processingEndedAt.getTime() -
              updatedUrlQueue.processingStartedAt.getTime()
            : null,
        metadata,
      };

      if (urlQueueRecord?.webhookUrl) {
        logger.info(
          `🚀 Tentando enviar webhook para: ${urlQueueRecord.webhookUrl}`,
        );
        try {
          const response = await axios.post(
            urlQueueRecord.webhookUrl!,
            pushedData,
          );
          logger.info(
            `✅ Webhook enviado com sucesso! Status: ${response.status}`,
          );
        } catch (err) {
          logger.error(
            `❌ Falha ao enviar webhook para: ${urlQueueRecord.webhookUrl}`,
            err,
          );
        }
      } else {
        logger.warn(`⚠️ Nenhum webhookUrl configurado para job ${job.id}`);
      }

      return pushedData;
    } catch (error) {
      logger.error(`❌ Job ${job.id} falhou:`);

      // Tenta avaliar se o erro indica bloqueio temporário ou definitivo
      let pageText = "";
      try {
        const pages = await getAllPages();
        for (const page of pages) {
          try {
            const content = await page.content();
            if (
              content.includes(
                "SECRETARIA DE ESTADO DE FAZENDA DO RIO DE JANEIRO",
              ) ||
              content
                .toLowerCase()
                .includes("bloqueia acessos provenientes desses endereços ip")
            ) {
              logger.warn(
                `🔴 Detecção de bloqueio de IP para job ${job.id}, fechando a aba...`,
              );
              await page.close();
            }
          } catch (innerError) {
            logger.error(
              `⚠️ Não foi possível analisar ou fechar a página:`,
              innerError,
            );
            try {
              await page.close();
            } catch (closeError) {
              logger.error(`⚠️ Erro ao fechar página após falha:`, closeError);
            }
          }
        }

        // Pega o texto de uma das páginas abertas para análise
        if (pages.length > 0) {
          pageText = await pages[0].evaluate(() => document.body.innerText);
        }
      } catch (pageCloseError) {
        logger.error(
          `❌ Erro ao tentar obter páginas após falha no job ${job.id}:`,
          pageCloseError,
        );
      }

      const finalStatus = classifyErrorOrContent(error, pageText);

      // Garantir consistência dos timestamps
      const urlQueueTimestamps = await prisma.urlQueue.findUnique({
        where: { id: jobId },
        select: { processingStartedAt: true },
      });
      const now = new Date();
      let processingStartedAt = urlQueueTimestamps?.processingStartedAt;
      let processingEndedAt = now;
      if (!processingStartedAt || processingStartedAt > now) {
        processingStartedAt = now;
        processingEndedAt = now;
      }

      await prisma.urlQueue.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          lastErrorMessage:
            error instanceof Error
              ? `${pageText} - ${error.message}`
              : `${pageText} - ${String(error)}`,
          processingStartedAt,
          processingEndedAt,
        },
      });

      // Busca os dados atualizados do urlQueue para incluir os timestamps no erro
      // (agora após definir o processingEndedAt)
      const updatedUrlQueue = await prisma.urlQueue.findUnique({
        where: { id: jobId },
        include: { notaResults: true },
      });

      // Log de debug para investigar urlQueueId
      // logger.error("DEBUG urlQueueId:", {
      //   jobId,
      //   updatedUrlQueueId: updatedUrlQueue?.id,
      //   notaResultUrlQueueId: updatedUrlQueue?.notaResults?.[0]?.urlQueueId,
      // });

      // Cria um objeto de erro com os dados de tempo de processamento
      const errorData = {
        status: updatedUrlQueue?.status || finalStatus,
        id: updatedUrlQueue?.notaResults?.[0]?.id || null,
        url:
          updatedUrlQueue?.notaResults?.[0]?.url || updatedUrlQueue?.url || url,
        webhookUrl:
          updatedUrlQueue?.notaResults?.[0]?.webhookUrl ||
          updatedUrlQueue?.webhookUrl ||
          urlQueueRecord?.webhookUrl ||
          null,
        createdAt: updatedUrlQueue?.createdAt || null,
        urlQueueId:
          updatedUrlQueue?.notaResults?.[0]?.urlQueueId ||
          updatedUrlQueue?.id ||
          jobId,
        // Campos de tempo de processamento
        processingStartedAt: updatedUrlQueue?.processingStartedAt,
        processingEndedAt: updatedUrlQueue?.processingEndedAt,
        processingDurationMs:
          updatedUrlQueue?.processingStartedAt &&
          updatedUrlQueue?.processingEndedAt
            ? updatedUrlQueue.processingEndedAt.getTime() -
              updatedUrlQueue.processingStartedAt.getTime()
            : null,
        metadata: null, // No caso de erro, metadata é null
        error: error instanceof Error ? error.message : String(error),
        lastErrorMessage: `${pageText} - ${error instanceof Error ? error.message : String(error)}`,
      };

      // Se houver webhook, envia os dados de erro com timestamps
      if (urlQueueRecord?.webhookUrl) {
        logger.info(
          `🚀 Tentando enviar webhook de erro para: ${urlQueueRecord.webhookUrl}`,
        );
        try {
          const response = await axios.post(
            urlQueueRecord.webhookUrl!,
            errorData,
          );
          logger.info(
            `✅ Webhook de erro enviado com sucesso! Status: ${response.status}`,
          );
        } catch (err) {
          logger.error(
            `❌ Falha ao enviar webhook de erro para: ${urlQueueRecord.webhookUrl}`,
            err,
          );
        }
      }

      // Fecha páginas abertas muito antigas para liberar memória
      try {
        const pages = await getAllPages();
        const now = Date.now();

        for (const page of pages) {
          try {
            const target = page.target() as TargetWithCreationTime;
            const creationTime = target._targetInfo?.targetCreationTime;
            const creationTimestamp = creationTime
              ? new Date(creationTime).getTime()
              : null;
            const duration = creationTimestamp ? now - creationTimestamp : null;

            if (duration !== null && duration > 2 * 60 * 1000) {
              logger.warn(
                `🧹 Página aberta há mais de 2 minutos detectada. Fechando...`,
              );
              await page.close();
            }
          } catch (err) {
            logger.error(`⚠️ Erro ao tentar fechar página antiga:`, err);
          }
        }
      } catch (cleanupError) {
        logger.error(
          `⚠️ Erro ao tentar realizar limpeza de abas antigas:`,
          cleanupError,
        );
      }

      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "1", 10),
    lockDuration: parseInt(process.env.WORKER_LOCK_DURATION || "600000", 10),
    stalledInterval: parseInt(
      process.env.WORKER_STALLED_INTERVAL || "120000",
      10,
    ),
    maxStalledCount: parseInt(process.env.WORKER_MAX_STALLED || "3", 10),
  },
);

scraperWorker.on("completed", (job) => {
  logger.info(`✅ Job ${job.id} finalizado`);
});

scraperWorker.on("failed", (job, err) => {
  logger.error(`❌ Job ${job?.id} falhou:`, err);
});
