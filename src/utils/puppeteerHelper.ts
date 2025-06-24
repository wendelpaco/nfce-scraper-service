// // src/utils/puppeteerHelper.ts
// import { Browser, Page } from "puppeteer";
// import { getBrowser } from "./browserInstance";
// // import { proxyConfig } from "./proxyConfig";

// const PROXY = {
//   host: "170.106.118.114",
//   port: 2334,
//   username:
//     "u46e5208057f505d5-zone-custom-region-br-session-ElUmIOSqq-sessTime-1",
//   password: "u46e5208057f505d5",
// };

// export async function openPage(
//   url: string,
// ): Promise<{ browser: Browser; page: Page }> {
//   const browser = await getBrowser();

//   const page = await browser.newPage();
//   await page.authenticate({
//     username: PROXY.username,
//     password: PROXY.password,
//   });

//   await page.setUserAgent(
//     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
//   );

//   await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
//   return { browser, page };
// }
