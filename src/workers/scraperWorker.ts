/* eslint-disable no-console */
import { Worker } from "bullmq";
import { connection } from "../jobs/redisConnection";
import { getScraperByCode } from "../scrapers/scraperRegistry";
import prisma from "../utils/prisma";
import { openPage, getAllPages } from "../utils/browserInstance";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 50;

export const scraperWorker = new Worker(
  "scraperQueue",
  async (job) => {
    const { url, stateCode, requestId } = job.data;

    try {
      const scraper = getScraperByCode(stateCode);
      const { page } = await openPage(url);

      // const pageText = await page.evaluate(() => document.body.innerText);
      // console.log(pageText);

      const result = await scraper.scrape(page);

      await page.close();

      const urlQueueRecord = await prisma.urlQueue.findUnique({
        where: { id: requestId },
      });

      const pushedData = {
        status: "DONE",
        url,
        webhookUrl: urlQueueRecord?.webhookUrl || null,
        metadata: result.metadata,
        items: result.items,
        totals: result.totals,
      };

      await prisma.notaResult.create({
        data: {
          url,
          jsonData: JSON.parse(
            JSON.stringify({
              metadata: pushedData.metadata,
              items: pushedData.items,
              totals: pushedData.totals,
            }),
          ),
          webhookUrl: urlQueueRecord?.webhookUrl || null,
          urlQueueId: requestId,
        },
      });

      await prisma.urlQueue.update({
        where: { id: requestId },
        data: { status: "DONE" },
      });

      if (urlQueueRecord?.webhookUrl) {
        try {
          await import("axios").then(({ default: axios }) =>
            axios.post(urlQueueRecord.webhookUrl!, pushedData),
          );
          console.log(`✅ Webhook enviado para: ${urlQueueRecord.webhookUrl}`);
        } catch (err) {
          console.error(
            `❌ Erro ao enviar webhook: ${urlQueueRecord.webhookUrl}`,
            err,
          );
        }
      }

      return pushedData;
    } catch (error) {
      console.error(`❌ Job ${job.id} falhou:`, error);

      await prisma.urlQueue.update({
        where: { id: requestId },
        data: { status: "ERROR" },
      });

      try {
        const pages = await getAllPages();
        for (const page of pages) {
          try {
            const content = await page.content();
            if (
              content.includes(
                "SECRETARIA DE ESTADO DE FAZENDA DO RIO DE JANEIRO",
              )
            ) {
              console.warn(
                `🔴 Detecção de bloqueio de IP para job ${job.id}, fechando a aba...`,
              );
              await page.close();
            }
          } catch (innerError) {
            console.warn(
              `⚠️ Não foi possível analisar ou fechar a página:`,
              innerError,
            );
            try {
              await page.close();
            } catch (closeError) {
              console.warn(`⚠️ Erro ao fechar página após falha:`, closeError);
            }
          }
        }
      } catch (pageCloseError) {
        console.error(
          `❌ Erro ao tentar obter páginas após falha no job ${job.id}:`,
          pageCloseError,
        );
      }

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
              console.warn(
                `🧹 Página aberta há mais de 2 minutos detectada. Fechando...`,
              );
              await page.close();
            }
          } catch (err) {
            console.warn(`⚠️ Erro ao tentar fechar página antiga:`, err);
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
    connection,
    concurrency: 3, // Limite de 3 jobs simultâneos
    lockDuration: 300000, // 5 minutos em ms
    stalledInterval: 60000, // 1 minuto em ms
    maxStalledCount: 3, // até 3 detecções antes de falhar
  },
);

scraperWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} finalizado`);
});

scraperWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} falhou:`, err);
});
