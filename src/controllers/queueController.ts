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

// export async function getStats(req: Request, res: Response) {
//   try {
//     // Filtro de datas (opcional)
//     const { from, to } = req.query;
//     const where: any = {};
//     if (from || to) {
//       where.createdAt = {};
//       if (from) where.createdAt.gte = new Date(from as string);
//       if (to) where.createdAt.lte = new Date(to as string);
//     }

//     // Buscar todas as notas processadas
//     const notas = await prisma.notaResult.findMany({
//       where,
//       select: {
//         id: true,
//         createdAt: true,
//         jsonData: true,
//       },
//     });

//     // Agregações
//     let totalVendas = 0;
//     let totalNotas = 0;
//     let totalItens = 0;
//     const produtosMap: Record<string, any> = {};
//     const vendasPorMes: Record<string, number> = {};
//     let ticketMedio = 0;

//     notas.forEach((nota) => {
//       const jsonData = nota.jsonData as unknown as NotaJsonData;
//       const meta = jsonData?.metadata;
//       if (!meta) return;
//       totalNotas++;
//       const valor = parseFloat(
//         (meta.totals as any)?.totalValue?.replace(",", ".") || "0",
//       );
//       totalVendas += valor;
//       totalItens += parseInt((meta.totals as any)?.totalItems || "0");

//       // Produtos
//       ((meta.items as any) || []).forEach((item: any) => {
//         const code = item.code;
//         if (!produtosMap[code]) {
//           produtosMap[code] = {
//             code,
//             title: item.title,
//             totalVendido: 0,
//             faturamento: 0,
//             unit: item.unit,
//           };
//         }
//         produtosMap[code].totalVendido += parseFloat(
//           item.quantity.replace(",", ".") || 0,
//         );
//         produtosMap[code].faturamento += parseFloat(
//           item.totalPrice.replace(",", ".") || 0,
//         );
//       });

//       // Vendas por mês
//       if (nota.createdAt) {
//         const mes = nota.createdAt.toISOString().slice(0, 7); // yyyy-mm
//         vendasPorMes[mes] = (vendasPorMes[mes] || 0) + valor;
//       }
//     });

//     ticketMedio = totalNotas > 0 ? totalVendas / totalNotas : 0;

//     // Top produtos
//     const produtosTop = Object.values(produtosMap)
//       .sort((a: any, b: any) => b.faturamento - a.faturamento)
//       .slice(0, 10);

//     // Vendas por mês (array)
//     const vendasPorMesArr = Object.entries(vendasPorMes).map(
//       ([mes, total]) => ({ mes, total }),
//     );

//     res.json({
//       totalVendas,
//       totalNotas,
//       totalItens,
//       ticketMedio,
//       produtosTop,
//       vendasPorMes: vendasPorMesArr,
//     });
//   } catch (err) {
//     logger.error(String(err));
//     res.status(500).json({ error: "Erro ao gerar estatísticas" });
//   }
// }

export async function createQueueJob(req: Request, res: Response) {
  const { url, webhookUrl } = req.body;
  // Captura o apiToken injetado pelo middleware de autenticação

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
      delay: 25000, // 25 segundos de delay inicial
      attempts: 5, // 5 tentativas
      backoff: {
        type: "exponential", // Backoff exponencial
        delay: 10000, // 10 segundos base
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
      id:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].id
          : urlQueue.id,
      url:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].url
          : urlQueue.url,
      urlFinal: urlQueue.urlFinal,
      webhookUrl:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].webhookUrl
          : urlQueue.webhookUrl,
      createdAt: urlQueue.createdAt,
      urlQueueId:
        urlQueue.notaResults.length > 0
          ? urlQueue.notaResults[0].urlQueueId
          : urlQueue.id,
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

export async function getAllJobs(req: Request, res: Response): Promise<void> {
  try {
    const urlQueues = await prisma.urlQueue.findMany({
      where: { apiTokenId: (req as any).apiToken?.id },
      include: { notaResults: true },
      orderBy: { createdAt: "desc" },
    });

    const jobs = urlQueues.map((urlQueue) => {
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

      return {
        status: urlQueue.status,
        id:
          urlQueue.notaResults.length > 0
            ? urlQueue.notaResults[0].id
            : urlQueue.id,
        url:
          urlQueue.notaResults.length > 0
            ? urlQueue.notaResults[0].url
            : urlQueue.url,
        urlFinal: urlQueue.urlFinal,
        webhookUrl:
          urlQueue.notaResults.length > 0
            ? urlQueue.notaResults[0].webhookUrl
            : urlQueue.webhookUrl,
        createdAt: urlQueue.createdAt,
        urlQueueId:
          urlQueue.notaResults.length > 0
            ? urlQueue.notaResults[0].urlQueueId
            : urlQueue.id,
        // Campos de tempo de processamento
        processingStartedAt: urlQueue.processingStartedAt,
        processingEndedAt: urlQueue.processingEndedAt,
        processingDurationMs:
          urlQueue.processingStartedAt && urlQueue.processingEndedAt
            ? urlQueue.processingEndedAt.getTime() -
              urlQueue.processingStartedAt.getTime()
            : null,
        metadata,
      };
    });

    res.json({
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    logger.error(String(error));
    res.status(500).json({ error: "Erro ao buscar os jobs" });
  }
}
