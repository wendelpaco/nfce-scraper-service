import { Queue } from "bullmq";
import { connection } from "./redisConnection";

export const scraperQueue = new Queue("scraperQueue", { connection });
