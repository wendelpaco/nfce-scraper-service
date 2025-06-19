/* eslint-disable no-console */
// src/services/notaService.ts
import axios from "axios";
import { openPage } from "../utils/puppeteerHelper";
import { getScraperByCode } from "../scrapers/scraperRegistry";
import prisma from "../utils/prisma";

export async function processNota(
  url: string,
  webhookUrl: string | null = null,
  requestId: string,
) {
  const pParam = url.split("p=")[1]?.split("|")[0];
  if (!pParam) throw new Error("Parâmetro 'p' inválido na URL");

  const scraper = getScraperByCode(pParam);
  const { browser, page } = await openPage(url);

  try {
    const { items, totals } = await scraper.scrape(page);

    await prisma.notaResult.create({
      data: {
        url,
        webhookUrl,
        jsonData: JSON.parse(JSON.stringify({ items, totals })),
        urlQueue: {
          connect: {
            id: requestId,
          },
        },
      },
    });

    const pushedData = {
      status: "DONE",
      url,
      webhookUrl: webhookUrl,
      items,
      ...totals,
    };

    // Se houver webhook, dispara a notificação
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, pushedData);
        console.log(`✅ Notificação enviada para webhook: ${webhookUrl}`);
      } catch (err) {
        console.error(`❌ Falha ao notificar webhook: ${webhookUrl}`, err);
      }
    }

    return pushedData;
  } finally {
    await browser.close();
  }
}
