import { Queue, RedisOptions } from "bullmq";
import { logger } from "../utils/logger";

// Configuração explícita de conexão com Redis
export const redisConfig: RedisOptions = {
  host: "31.97.19.138",
  port: 6379,
  username: "default",
  password: "senharedis",
};

export const scraperQueue = new Queue("scraperQueue", {
  connection: redisConfig,
});

export const captchaQueue = new Queue("captchaQueue", {
  connection: redisConfig,
});
// Tratamento de erro para fila principal
scraperQueue.on("error", (err) => logger("Erro na fila scraperQueue:", err));

// Tratamento de erro para fila de retry
captchaQueue.on("error", (err) => logger("Erro na fila captchaQueue:", err));
