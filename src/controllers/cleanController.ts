/* eslint-disable no-console */
import { Request, Response } from "express";
import { scraperQueue } from "../jobs/scraperQueue";

export async function cleanQueue(req: Request, res: Response) {
  try {
    await scraperQueue.obliterate({ force: true });
    res.json({ message: "✅ Fila limpa com sucesso!" });
  } catch (error) {
    console.error("Erro ao limpar a fila:", error);
    res.status(500).json({ error: "Erro ao limpar a fila." });
  }
}
