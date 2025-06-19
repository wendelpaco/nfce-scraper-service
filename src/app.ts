/* eslint-disable no-console */
import express, { RequestHandler } from "express";
import bodyParser from "body-parser";
// import { getNotaResult, runNota } from "./controllers/notaController";
import { createQueueJob, getJobStatus } from "./controllers/queueController";
// import "./jobs/notaJob";

import { closeBrowser } from "./utils/browserInstance";

const app = express();

app.use(bodyParser.json());

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { scraperQueue } from "./jobs/scraperQueue";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(scraperQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.post("/queue", createQueueJob as RequestHandler);
// app.post("/run", runNota as RequestHandler);
// app.get("/result/:id", getNotaResult as RequestHandler);
app.get("/status/:id", getJobStatus as RequestHandler);

process.on("SIGINT", async () => {
  console.log("🔻 Encerrando aplicação (SIGINT)...");
  await closeBrowser();
  process.exit();
});

process.on("SIGTERM", async () => {
  console.log("🔻 Encerrando aplicação (SIGTERM)...");
  await closeBrowser();
  process.exit();
});

export default app;
