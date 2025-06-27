/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { format } from "date-fns";

export function logger(message: string, ...args: any[]) {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  console.log(`[${timestamp}]`, message, ...args);
}
