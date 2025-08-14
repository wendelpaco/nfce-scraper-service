/* eslint-disable no-console */
// import { getNotaResult, runNota } from "./controllers/notaController";
// import "./jobs/notaJob";
import express, { RequestHandler } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  createQueueJob,
  getJobStatus,
  getAllJobs,
} from "./controllers/queueController";

import { apiTokenAuthMiddleware } from "./middlewares/apiTokenAuthMiddleware";

import { closeBrowser } from "./utils/browserInstance";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { cleanQueue } from "./controllers/cleanController";
import { scraperQueue } from "./jobs/queue";

import basicAuth from "express-basic-auth";
import { getStats } from "./controllers/statsController";
import {
  getDashboardOverview,
  getTopLojas,
  getAnalisePagamentos,
  getAnaliseClientes,
  getAnaliseTemporal,
} from "./controllers/dashboardController";

const app = express();

// Configuração do CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Permite todas as origens por padrão
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true, // Permite cookies e headers de autenticação
    optionsSuccessStatus: 200, // Para compatibilidade com alguns navegadores
  }),
);

app.use(bodyParser.json());

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(scraperQueue)],
  serverAdapter,
});

app.use(
  "/admin/queues",
  basicAuth({
    users: { admin: process.env.BULLBOARD_PASSWORD || "admin" },
    challenge: true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    unauthorizedResponse: (req: any) => "🚫 Acesso não autorizado.",
  }),
);

app.use("/admin/queues", serverAdapter.getRouter());
app.post("/queue", apiTokenAuthMiddleware, createQueueJob as RequestHandler);
app.get("/clean", cleanQueue as RequestHandler);
app.get("/api/status/:id", getJobStatus as RequestHandler);
app.get("/queue/jobs", getAllJobs as RequestHandler);

// ROTAS DE DASHBOARD PARA SHOPPING CENTERS
app.get("/api/dashboard/overview", getDashboardOverview as RequestHandler);
app.get("/api/dashboard/lojas", getTopLojas as RequestHandler);
app.get("/api/dashboard/pagamentos", getAnalisePagamentos as RequestHandler);
app.get("/api/dashboard/clientes", getAnaliseClientes as RequestHandler);
app.get("/api/dashboard/temporal", getAnaliseTemporal as RequestHandler);

// ROTA DE ESTATÍSTICAS GERAL
app.get("/api/stats", getStats as RequestHandler);

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
