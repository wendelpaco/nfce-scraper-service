import { Worker } from "bullmq";
import { redisConfig } from "../jobs/queue";
import { openPage } from "../utils/browserInstance";
import prisma from "../utils/prisma";

export const captchaWorker = new Worker(
  "captchaQueue",
  async (job) => {
    const { url, jobId } = job.data;

    const { page } = await openPage(url);

    // Exemplo: interagir com o CAPTCHA
    await page.waitForSelector("#txtImagem");
    await page.type("#txtImagem", "resposta-do-captcha");

    await page.click("#btnEnviar");

    // Aqui você pode reaproveitar o mesmo scraper ou outro
    const content = await page.content();

    // Salvar resultado, etc.
    await prisma.urlQueue.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        lastErrorMessage: null,
      },
    });

    await page.close();
  },
  {
    connection: redisConfig,
  },
);
