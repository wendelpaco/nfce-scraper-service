"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperQueue = void 0;
var bullmq_1 = require("bullmq");
var redisConnection_1 = require("./redisConnection");
exports.scraperQueue = new bullmq_1.Queue("scraperQueue", { connection: redisConnection_1.connection });
