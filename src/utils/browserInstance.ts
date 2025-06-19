/* eslint-disable no-console */
import puppeteer, { Browser } from "puppeteer";

let browser: Browser | null = null;

const PROXY = {
  host: "170.106.118.114",
  port: 2334,
  username:
    "u46e5208057f505d5-zone-custom-region-br-session-ElUmIOSqq-sessTime-1",
  password: "u46e5208057f505d5",
};

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      // headless: "new", // Use o novo headless
      headless: false,
      args: [
        `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      timeout: 60000,
      defaultViewport: { width: 1280, height: 800 },
    });
    console.log("✅ Browser Puppeteer iniciado.");
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log("✅ Browser Puppeteer fechado.");
  }
}
