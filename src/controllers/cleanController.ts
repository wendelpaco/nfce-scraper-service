import { Request, Response } from "express";
import { scraperQueue } from "../jobs/queue";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";

export async function cleanQueue(req: Request, res: Response) {
  try {
    await scraperQueue.obliterate({ force: true });

    await prisma.notaResult.deleteMany();
    await prisma.urlQueue.deleteMany();

    res.json({ message: "✅ Fila limpa com sucesso!" });
  } catch (error) {
    logger.error("Erro ao limpar a fila:", error);
    res.status(500).json({ error: "Erro ao limpar a fila." });
  }
}
