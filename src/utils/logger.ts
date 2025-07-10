/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { format } from "date-fns";

type LogLevel = "debug" | "info" | "warn" | "error";
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel) {
  return levelPriority[level] >= levelPriority[LOG_LEVEL as LogLevel];
}

export const logger = {
  debug: (msg: string, ...args: any[]) => {
    if (shouldLog("debug")) {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      console.debug(`[${timestamp}] [DEBUG]`, msg, ...args);
    }
  },
  info: (msg: string, ...args: any[]) => {
    if (shouldLog("info")) {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      console.info(`[${timestamp}] [INFO]`, msg, ...args);
    }
  },
  warn: (msg: string, ...args: any[]) => {
    if (shouldLog("warn")) {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      console.warn(`[${timestamp}] [WARN]`, msg, ...args);
    }
  },
  error: (msg: string, ...args: any[]) => {
    if (shouldLog("error")) {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      console.error(`[${timestamp}] [ERROR]`, msg, ...args);
    }
  },
};
