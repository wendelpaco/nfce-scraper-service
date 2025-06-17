import { Request, Response } from "express";

import { processNota } from "../services/notaService";
import prisma from "../utils/prismaSingleton";

export async function queueNota(req: Request, res: Response) {
  const { url, webhookUrl } = req.body;
  if (!url) {
    res.status(400).json({ error: "URL não informada" });
    return;
  }

  await prisma.urlQueue.create({ data: { url, webhookUrl } });
  res.json({ status: "Agendado com sucesso" });
}

export async function runNota(req: Request, res: Response) {
  const { url, webhookUrl } = req.body;
  try {
    if (!url) {
      res.status(400).json({ error: "URL não informada" });
      return;
    }

    const result = await processNota(url, webhookUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function getNotaResult(req: Request, res: Response) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const result = await prisma.notaResult.findFirst({
    where: { id },
  });

  if (!result) {
    res.status(404).json({ error: "Resultado não encontrado" });
    return;
  }

  // Renomeia o campo jsonData para items na resposta
  res.json({
    id: result.id,
    url: result.url,
    createdAt: result.createdAt,
    items: result.jsonData,
  });
}
