/* eslint-disable no-console */
import { Worker } from "bullmq";
import { getScraperByCode } from "../scrapers/scraperRegistry";
import prisma from "../utils/prisma";
import { openPage, getAllPages } from "../utils/browserInstance";
import { solvePageCaptchas } from "../core/solveRecaptchas";
import { EventEmitter } from "events";
import { captchaQueue, redisConfig } from "../jobs/queue";
import { logger } from "../utils/logger";
import axios from "axios";

EventEmitter.defaultMaxListeners = 50;

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
    errorStr.includes("captcha")
  ) {
    return "BLOCKED";
  }

  if (
    contentStr.includes("não foi possível validar o acesso") ||
    contentStr.includes("rejeição: consumo indevido") ||
    contentStr.includes("656-rejeição: consumo indevido.") ||
    errorStr.includes("invalid") ||
    errorStr.includes("não encontrado")
  ) {
    return "INVALID";
  }

  if (error && errorStr.trim().length > 0) return "ERROR";

  return "DONE"; // Conteúdo parece válido
}

export const scraperWorker = new Worker(
  "scraperQueue",
  async (job) => {
    const { url, stateCode, jobId } = job.data;

    const urlQueueRecord = await prisma.urlQueue.findFirst({
      where: {
        id: jobId,
        status: { in: ["PENDING", "ERROR"] },
      },
    });

    if (!urlQueueRecord) {
      logger(`⚠️ Job ${job.id} não está pendente. Ignorando processamento.`);
      return;
    }

    try {
      const scraper = getScraperByCode(stateCode);
      const { page } = await openPage(url);

      await page
        .waitForSelector("#tabResult tr", { timeout: 30000 })
        .catch(() => {
          logger(
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
        logger(
          "🎯 reCAPTCHA detectado via iframe na página. Tentando resolver...",
        );
        const captchaResult = await solvePageCaptchas(page);
        if (captchaResult.error) {
          logger(`⚠️ Erro ao resolver captcha: ${captchaResult.error}`);
        } else if (captchaResult.solved) {
          logger("✅ Captcha resolvido com sucesso.");
        } else {
          logger("⚠️ reCAPTCHA detectado, mas não foi possível resolver.");
        }
      } else {
        logger("ℹ️ Nenhum reCAPTCHA detectado na página via iframe.");
      }

      logger(
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
        logger("⚠️ Erro ao extrair innerText do body:", err);
        pageText = "";
      }
      logger(
        "[DEBUG] Texto extraído da página:",
        pageText.substring(0, 80).replace(/\n/g, " "),
      );

      // Classifica o conteúdo da página antes de tentar resolver captchas
      const preCheckStatus = classifyErrorOrContent(null, pageText);
      logger(`[DEBUG] Status pré-check da página: ${preCheckStatus}`);

      if (preCheckStatus === "DONE") {
        const hasTable = await page.$("#tabResult tr");
        if (hasTable) {
          logger(
            `✅ Página carregada com sucesso para job ${job.id}. Nota fiscal parece válida.`,
          );
        } else {
          logger(
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

      if (preCheckStatus === "INVALID") {
        const lowerText = pageText.toLowerCase();

        // Se for erro que exige resolver captcha, encaminha para captchaQueue
        if (
          lowerText.includes("não foi possível validar o acesso") ||
          lowerText.includes("erro no captcha")
        ) {
          logger(`➡️ Redirecionando job ${job.id} para fila de CAPTCHA.`);

          await captchaQueue.add("captchaSolver", {
            url,
            jobId,
            originalStateCode: stateCode,
          });

          await prisma.urlQueue.update({
            where: { id: jobId },
            data: {
              status: "WAITING_CAPTCHA",
              lastErrorMessage: `${pageText} - Aguardando resolução alternativa via CAPTCHA.`,
            },
          });

          await page.close();
          return;
        }

        logger(
          `🚫 Conteúdo inválido detectado para job ${job.id}. Removendo da fila.`,
        );
        await prisma.urlQueue.update({
          where: { id: jobId },
          data: {
            status: "INVALID",
            lastErrorMessage: `${pageText} - Conteúdo inválido detectado na página.`,
          },
        });
        await page.close();
        return;
      }

      if (preCheckStatus === "BLOCKED") {
        logger(
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

      if (!urlQueueRecord || urlQueueRecord.status !== "PENDING") {
        logger(
          `⚠️ Ignorando job ${job.id} com status não pendente ou inexistente.`,
        );
        return;
      }

      const metadata = {
        ...result.metadata,
        items: result.items,
        totals: result.totals,
      };

      const pushedData = {
        status: "DONE",
        url,
        webhookUrl: urlQueueRecord?.webhookUrl || null,
        metadata,
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
        data: { status: "DONE", lastErrorMessage: null },
      });

      if (urlQueueRecord?.webhookUrl) {
        logger(`🚀 Tentando enviar webhook para: ${urlQueueRecord.webhookUrl}`);
        try {
          const response = await axios.post(
            urlQueueRecord.webhookUrl!,
            pushedData,
          );
          logger(`✅ Webhook enviado com sucesso! Status: ${response.status}`);
        } catch (err) {
          console.error(
            `❌ Falha ao enviar webhook para: ${urlQueueRecord.webhookUrl}`,
            err,
          );
        }
      } else {
        console.warn(`⚠️ Nenhum webhookUrl configurado para job ${job.id}`);
      }

      return pushedData;
    } catch (error) {
      console.error(`❌ Job ${job.id} falhou:`, error);

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
              logger(
                `🔴 Detecção de bloqueio de IP para job ${job.id}, fechando a aba...`,
              );
              await page.close();
            }
          } catch (innerError) {
            logger(
              `⚠️ Não foi possível analisar ou fechar a página:`,
              innerError,
            );
            try {
              await page.close();
            } catch (closeError) {
              logger(`⚠️ Erro ao fechar página após falha:`, closeError);
            }
          }
        }

        // Pega o texto de uma das páginas abertas para análise
        if (pages.length > 0) {
          pageText = await pages[0].evaluate(() => document.body.innerText);
        }
      } catch (pageCloseError) {
        console.error(
          `❌ Erro ao tentar obter páginas após falha no job ${job.id}:`,
          pageCloseError,
        );
      }

      const finalStatus = classifyErrorOrContent(error, pageText);

      await prisma.urlQueue.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          lastErrorMessage:
            error instanceof Error
              ? `${pageText} - ${error.message}`
              : `${pageText} - ${String(error)}`,
        },
      });

      // Fecha páginas abertas muito antigas para liberar memória
      try {
        const pages = await getAllPages();
        const now = Date.now();

        for (const page of pages) {
          try {
            const target = page.target();
            const creationTime = (target as any)._targetInfo
              ?.targetCreationTime;
            const creationTimestamp = creationTime
              ? new Date(creationTime).getTime()
              : null;
            const duration = creationTimestamp ? now - creationTimestamp : null;

            if (duration !== null && duration > 2 * 60 * 1000) {
              logger(
                `🧹 Página aberta há mais de 2 minutos detectada. Fechando...`,
              );
              await page.close();
            }
          } catch (err) {
            logger(`⚠️ Erro ao tentar fechar página antiga:`, err);
          }
        }
      } catch (cleanupError) {
        console.error(
          `⚠️ Erro ao tentar realizar limpeza de abas antigas:`,
          cleanupError,
        );
      }

      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "2", 10),
    lockDuration: parseInt(process.env.WORKER_LOCK_DURATION || "600000", 10),
    stalledInterval: parseInt(
      process.env.WORKER_STALLED_INTERVAL || "120000",
      10,
    ),
    maxStalledCount: parseInt(process.env.WORKER_MAX_STALLED || "3", 10),
  },
);

scraperWorker.on("completed", (job) => {
  logger(`✅ Job ${job.id} finalizado`);
});

scraperWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} falhou:`, err);
});
