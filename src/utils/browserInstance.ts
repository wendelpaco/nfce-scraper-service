/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const randomUserAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
  ];
  const selectedUserAgent =
    randomUserAgents[Math.floor(Math.random() * randomUserAgents.length)];

  if (!browser) {
    browser = await puppeteer.launch({
      // headless: "new",
      headless: false,
      ignoreHTTPSErrors: true,
      devtools: false,
      args: [
        `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-features=site-per-process",
      ],
      timeout: 180000,
      protocolTimeout: 180000,
      defaultViewport: { width: 1280, height: 800 },
      slowMo: 50,
    });

    console.log("✅ Browser Puppeteer iniciado.");
  }

  const page = await browser.newPage();
  await page.authenticate({
    username: PROXY.username,
    password: PROXY.password,
  });

  await page.setUserAgent(selectedUserAgent);
  console.log(`🎭 User-Agent usado: ${selectedUserAgent}`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (err: any) {
    console.error("❌ Erro no page.goto:", err);
    if (err.message.includes("browser has disconnected")) {
      await closeBrowser();
      throw new Error(
        "Browser crashed or was closed unexpectedly during navigation.",
      );
    }
    throw err;
  }

  return { browser, page };
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log("✅ Browser Puppeteer fechado.");
  }
}

export async function getAllPages() {
  if (!browser) return [];
  return await browser.pages();
}
