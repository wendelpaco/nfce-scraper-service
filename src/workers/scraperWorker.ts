/* eslint-disable no-console */
import { Worker } from "bullmq";
import { connection } from "../jobs/redisConnection";
import { getScraperByCode } from "../scrapers/scraperRegistry";
import prisma from "../utils/prisma";
import { openPage } from "../utils/browserInstance";
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
        ...result.extraInfo,
        items: result.items,
        ...result.totals,
      };

      await prisma.notaResult.create({
        data: {
          url,
          jsonData: JSON.parse(
            JSON.stringify({
              extraInfo: result.extraInfo,
              items: result.items,
              totals: result.totals,
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

      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Limite de 3 jobs simultâneos
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
