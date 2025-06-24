/* eslint-disable no-console */
import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser | null = null;

const PROXY = {
  host: "170.106.118.114",
  port: 2334,
  username:
    "u46e5208057f505d5-zone-custom-region-br-session-ElUmIOSqq-sessTime-1",
  password: "u46e5208057f505d5",
};

export async function openPage(
  url: string,
): Promise<{ browser: Browser; page: Page }> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      // headless: true,
      ignoreHTTPSErrors: true,
      devtools: false,
      args: [
        `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      timeout: 60000,
      defaultViewport: { width: 1280, height: 800 },
      protocolTimeout: 120000,
      slowMo: 50,
    });

    console.log("✅ Browser Puppeteer iniciado.");
  }

  const page = await browser.newPage();
  await page.authenticate({
    username: PROXY.username,
    password: PROXY.password,
  });

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  );

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  // try {
  //   await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
  // } catch (err) {
  //   console.warn(
  //     "⚠️ Timeout esperando o redirecionamento pós-Recaptcha. Seguindo mesmo assim...",
  //     err,
  //   );
  // }

  return { browser, page };
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log("✅ Browser Puppeteer fechado.");
  }
}
