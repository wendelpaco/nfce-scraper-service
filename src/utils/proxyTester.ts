/* eslint-disable no-console */
// src/utils/proxyTester.ts

import { openPage } from "./browserInstance";

async function testProxyIp(): Promise<void> {
  try {
    const { browser, page } = await openPage(
      "https://api.ipify.org?format=json",
    );

    const preText = await page.$eval("pre", (el) => el.textContent?.trim());
    if (preText) {
      const json = JSON.parse(preText);
      console.log("✅ IP de saída detectado:", json.ip);
    } else {
      console.error("❌ Não foi possível localizar a tag <pre> com o IP.");
    }

    await browser.close();
  } catch (error) {
    console.error("❌ Erro ao testar proxy:", error);
  }
}

testProxyIp().catch((err) => {
  console.error("❌ Erro geral no testProxyIp:", err);
});
