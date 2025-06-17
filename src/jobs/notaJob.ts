/* eslint-disable no-console */
import cron from "node-cron";
import { processNota } from "../services/notaService";
import prisma from "../utils/prismaSingleton";

cron.schedule("*/30 * * * * *", async () => {
  try {
    const urlRecord = await prisma.$transaction(
      async (tx) => {
        const url = await tx.urlQueue.findFirst({
          where: { status: { in: ["PENDING", "ERROR"] } },
          orderBy: { createdAt: "asc" },
        });

        if (!url) return null;

        await tx.urlQueue.update({
          where: { id: url.id },
          data: { status: "PROCESSING" },
        });

        return url;
      },
      { isolationLevel: "Serializable" },
    );

    if (!urlRecord) {
      console.log("✅ Nenhuma URL pendente no momento.");
      return;
    }

    console.log(`Processando URL: ${urlRecord.url}`);

    try {
      await processNota(urlRecord.url, urlRecord.webhookUrl);

      await prisma.urlQueue.update({
        where: { id: urlRecord.id },
        data: { status: "DONE" },
      });

      console.log(`✅ Processado com sucesso: ${urlRecord.url}`);
    } catch (error) {
      console.error(`❌ Erro ao processar URL: ${urlRecord.url}`, error);

      await prisma.urlQueue.update({
        where: { id: urlRecord.id },
        data: { status: "ERROR" },
      });
    }
  } catch (err) {
    console.error("Erro geral no job:", err);
  }
});
