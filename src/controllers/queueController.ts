import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { normalizeNotaUrl } from "../utils";
import { getScraperByCode } from "../scrapers/scraperRegistry";
import { scraperQueue } from "../jobs/queue";
import { logger } from "../utils/logger";

interface NotaJsonData {
  metadata: {
    numero?: unknown;
    serie?: unknown;
    dataEmissao?: unknown;
    protocoloAutorizacao?: unknown;
    nomeEmpresa?: unknown;
    cnpj?: unknown;
    items: unknown;
    totals: unknown;
  };
}

export async function createQueueJob(req: Request, res: Response) {
  const { url, webhookUrl } = req.body;
  // Captura o apiToken injetado pelo middleware de autenticação
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiToken = (req as any).apiToken as { id: string } | undefined;

  const stateCode = url.split("p=")[1]?.split("|")[0];
  if (!stateCode) {
    return res.status(400).json({ error: "Parâmetro 'p' inválido na URL" });
  }

  const normalizedUrl = normalizeNotaUrl(url, stateCode);

  const urlQueue = await prisma.urlQueue.create({
    data: {
      url: url,
      urlFinal: normalizedUrl,
      status: "PENDING",
      webhookUrl: webhookUrl || null,
      apiTokenId: apiToken?.id ?? null,
    },
  });

  const job = await scraperQueue.add(
    `PROCESSAMENTO DE NOTAS - ESTADO [${getScraperByCode(stateCode).stateCode}]`,
    {
      url: normalizedUrl,
      stateCode,
      jobId: urlQueue.id,
      webhookUrl: webhookUrl || null,
    },
    {
      delay: 25000, // Adiciona um delay inicial de 5 segundos
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10000,
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
      where: { id: jobId, apiTokenId: (req as any).apiToken?.id },
      include: { notaResults: true },
    });

    if (!urlQueue) {
      res.status(404).json({ status: "Job não encontrado" });
      return;
    }

    let metadata = null;

    if (urlQueue.notaResults.length > 0) {
      const jsonData = urlQueue.notaResults[0]
        .jsonData as unknown as NotaJsonData;

      metadata = {
        numero: jsonData?.metadata?.numero,
        serie: jsonData?.metadata?.serie,
        dataEmissao: jsonData?.metadata?.dataEmissao,
        protocoloAutorizacao: jsonData?.metadata?.protocoloAutorizacao,
        nomeEmpresa: jsonData?.metadata?.nomeEmpresa,
        cnpj: jsonData?.metadata?.cnpj,
        items: jsonData?.metadata?.items,
        totals: jsonData?.metadata?.totals,
      };
    }

    res.json({
      status: urlQueue.status,
      id: urlQueue.notaResults.length > 0 ? urlQueue.notaResults[0].id : null,
      url: urlQueue.notaResults.length > 0 ? urlQueue.notaResults[0].url : null,
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
      // Campos de tempo de processamento
      processingStartedAt: urlQueue.processingStartedAt,
      processingEndedAt: urlQueue.processingEndedAt,
      processingDurationMs:
        urlQueue.processingStartedAt && urlQueue.processingEndedAt
          ? urlQueue.processingEndedAt.getTime() -
            urlQueue.processingStartedAt.getTime()
          : null,
      metadata,
    });
  } catch (error) {
    logger.error(String(error));
    res.status(500).json({ error: "Erro ao buscar o job" });
  }
}
