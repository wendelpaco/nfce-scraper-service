/* eslint-disable no-console */
// import { getNotaResult, runNota } from "./controllers/notaController";
// import "./jobs/notaJob";
import express, { RequestHandler } from "express";
import bodyParser from "body-parser";
import { createQueueJob, getJobStatus } from "./controllers/queueController";

import { closeBrowser } from "./utils/browserInstance";

const app = express();

app.use(bodyParser.json());

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { scraperQueue } from "./jobs/scraperQueue";
import { cleanQueue } from "./controllers/cleanJob";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(scraperQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());
app.post("/queue", createQueueJob as RequestHandler);
app.get("/status/:id", getJobStatus as RequestHandler);
app.get("/clean", cleanQueue as RequestHandler);

// app.post("/run", runNota as RequestHandler);
// app.get("/result/:id", getNotaResult as RequestHandler);

async function shutdown(signal: string) {
  console.log(`🔻 Encerrando aplicação (${signal})...`);
  await closeBrowser();
  process.exit();
}

["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

export default app;
