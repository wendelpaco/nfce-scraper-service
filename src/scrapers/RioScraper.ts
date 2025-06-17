/* eslint-disable no-console */
import { Page } from "puppeteer";
import { Scraper } from "./ScraperInterface";

export const RioScraper: Scraper = {
  async scrape(page: Page) {
    try {
      await page
        .waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 })
        .catch(() => {});
      await page.waitForTimeout(2000);
      await page.waitForSelector("#tabResult tr", { timeout: 15000 });
    } catch (error) {
      console.error("Erro ao carregar página da SEFAZ RJ:", error);
      throw error;
    }

    // Agora faz o scraping dos itens, igual ao BahiaScraper.
    const items = await page.$$eval("#tabResult tr", (rows) => {
      return rows.map((row) => {
        const title = row.querySelector(".txtTit")?.textContent?.trim() ?? "";
        const codeRaw = row.querySelector(".RCod")?.textContent ?? "";
        const code = codeRaw.replace(/[^\d]/g, "").replace(/\.$/, "");

        const quantityRaw = row.querySelector(".Rqtd")?.textContent ?? "";
        const quantity = quantityRaw
          .replace(/[^\d,]/g, "")
          .replace(",", ".")
          .trim();
        const quantityFormatted = parseFloat(quantity).toString();

        const unitRaw = row.querySelector(".RUN")?.textContent ?? "";
        const unit = unitRaw
          .replace(/.*UN:\s*/i, "")
          .trim()
          .toUpperCase();

        const unitPriceRaw = row.querySelector(".RvlUnit")?.textContent ?? "";
        const unitPrice = unitPriceRaw.replace(/[^\d,]/g, "").trim();

        const totalPrice =
          row.querySelector(".valor")?.textContent?.trim() ?? "";

        return {
          title,
          code,
          quantity: quantityFormatted,
          unit,
          unitPrice,
          totalPrice,
        };
      });
    });

    const totals = await page.$$eval("#totalNota #linhaTotal", (lines) => {
      const result: Record<string, string> = {};
      lines.forEach((line) => {
        const label = line.querySelector("label")?.textContent?.trim() ?? "";
        const value = line.querySelector("span")?.textContent?.trim() ?? "";
        if (label && value) {
          if (label.includes("Qtd. total de itens")) result.totalItems = value;
          else if (label.includes("Valor total R$")) result.totalValue = value;
          else if (label.includes("Descontos R$")) result.discount = value;
          else if (label.includes("Valor a pagar R$"))
            result.amountToPay = value;
          else if (label.includes("Cartão") || label.includes("Dinheiro"))
            result.paymentMethod = label.trim();
        }
      });
      return result;
    });

    return { items, totals };
  },
};
