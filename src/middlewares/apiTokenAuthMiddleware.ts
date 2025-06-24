/* eslint-disable no-console */
import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";

export const apiTokenAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      res.status(401).json({ error: "API Token obrigatório." });
      return;
    }

    // Extrai só o token, removendo "Bearer " (se existir)
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
    });

    if (!apiToken) {
      res.status(403).json({ error: "Token inválido." });
      return;
    }

    // Anexa o apiToken ao objeto req para uso posterior
    (req as any).apiToken = apiToken;

    next();
  } catch (error) {
    console.error("Erro no apiTokenAuthMiddleware:", error);
    res.status(500).json({ error: "Erro interno de autenticação." });
  }
};
