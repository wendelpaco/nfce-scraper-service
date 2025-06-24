/* eslint-disable no-console */
// src/scrapers/BahiaScraper.ts
import { Page } from "puppeteer";
import { Scraper, Totals } from "./ScraperInterface";

export const BahiaScraper: Scraper = {
  async scrape(page: Page) {
    await page.waitForSelector("#tabResult tr", { timeout: 30000 });

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

    let totalValues: Totals = {};
    try {
      totalValues = await page.$$eval("#totalNota > div", (divs) => {
        const result: Totals = {};
        let captureNextAsPayment = false;

        divs.forEach((div) => {
          const label = div.querySelector("label")?.textContent?.trim() ?? "";
          const value = div.querySelector("span")?.textContent?.trim() ?? "";

          if (label.includes("Qtd. total de itens")) result.totalItems = value;
          if (label.includes("Valor total R$")) result.totalValue = value;
          if (label.includes("Descontos R$")) result.discount = value;
          if (label.includes("Valor a pagar R$")) result.amountToPay = value;
          if (label.includes("Informação dos Tributos Totais Incidentes"))
            result.taxInfo = value;

          if (label.includes("Forma de pagamento:"))
            captureNextAsPayment = true;
          else if (captureNextAsPayment && label.match(/^\d+\s*-/)) {
            result.paymentType = label;
            result.paymentAmount = value;

            if (label.includes("Crédito"))
              result.paymentMethod = "Cartão de Crédito";
            else if (label.includes("Débito"))
              result.paymentMethod = "Cartão de Débito";
            else if (label.toLowerCase().includes("dinheiro"))
              result.paymentMethod = "Dinheiro";
            else result.paymentMethod = label;

            captureNextAsPayment = false;
          }
        });

        return result;
      });
    } catch (error) {
      console.warn(
        "⚠️ Não foi possível capturar os totais da nota (Bahia).",
        error,
      );
    }

    return {
      totals: totalValues,
      items,
    };
  },
};
