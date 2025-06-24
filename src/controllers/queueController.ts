/* eslint-disable no-console */
import { Request, Response } from "express";
import { scraperQueue } from "../jobs/scraperQueue";
import prisma from "../utils/prisma";

type NotaJsonData = {
  items: unknown;
  totals: unknown;
  extraInfo: unknown;
};

export async function createQueueJob(req: Request, res: Response) {
  const { url } = req.body;

  const stateCode = url.split("p=")[1]?.split("|")[0];
  if (!stateCode) {
    return res.status(400).json({ error: "Parâmetro 'p' inválido na URL" });
  }

  const urlQueue = await prisma.urlQueue.create({
    data: {
      url,
      status: "PENDING",
      webhookUrl: req.body.webhookUrl || null,
    },
  });

  const job = await scraperQueue.add(
    "scrape",
    {
      url,
      stateCode,
      requestId: urlQueue.id,
      webhookUrl: req.body.webhookUrl || null,
    },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 30000, // 30 segundos base para backoff exponencial
      },
    },
  );

  await prisma.urlQueue.update({
    where: { id: urlQueue.id },
    data: { bullJobId: job.id },
  });

  res.json({ message: "Job enfileirado", jobId: urlQueue.id });
}

export async function getJobStatus(req: Request, res: Response): Promise<void> {
  const jobId = req.params.id;

  try {
    const urlQueue = await prisma.urlQueue.findUnique({
      where: { id: jobId },
      include: { notaResults: true },
    });

    if (!urlQueue) {
      res.status(404).json({ error: "Job não encontrado" });
      return;
    }

    let items = null;
    let totals = null;
    let extraInfo = null;

    if (urlQueue.notaResults.length > 0) {
      const jsonData = urlQueue.notaResults[0].jsonData as NotaJsonData;
      items = jsonData?.items ?? null;
      totals = jsonData?.totals ?? null;
      extraInfo = jsonData?.extraInfo ?? null;
    }

    res.json({
      status: urlQueue.status,
      id: urlQueue.notaResults.length > 0 ? urlQueue.notaResults[0].id : null,
      url: urlQueue.notaResults.length > 0 ? urlQueue.notaResults[0].url : null,
      extraInfo,
      webhookUrl:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].webhookUrl
          : null,
      createdAt:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].createdAt
          : null,
      urlQueueId:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].urlQueueId
          : null,
      items,
      totals,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Erro ao buscar o job" });
  }
}
