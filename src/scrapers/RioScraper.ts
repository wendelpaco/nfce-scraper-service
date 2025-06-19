/* eslint-disable no-console */
import { Page } from "puppeteer";
import { Scraper, Totals } from "./ScraperInterface";

export const RioScraper: Scraper = {
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
        divs.forEach((div) => {
          const label = div.querySelector("label")?.textContent?.trim() ?? "";
          const value = div.querySelector("span")?.textContent?.trim() ?? "";

          if (label.includes("Qtd. total de itens")) result.totalItems = value;
          if (label.includes("Valor total R$")) result.totalValue = value;
          if (label.includes("Descontos R$")) result.discount = value;
          if (label.includes("Valor a pagar R$")) result.amountToPay = value;
          if (
            label.includes("Cartão de Débito") ||
            label.includes("Cartão de Crédito")
          ) {
            result.paymentType = label;
            result.paymentAmount = value;
          }
          if (label.includes("Informação dos Tributos Totais Incidentes")) {
            result.taxInfo = value;
          }
        });
        if (!result.paymentMethod && result.paymentType) {
          if (result.paymentType.includes("Crédito"))
            result.paymentMethod = "Cartão de Crédito";
          else if (result.paymentType.includes("Débito"))
            result.paymentMethod = "Cartão de Débito";
          else if (result.paymentType.includes("Dinheiro"))
            result.paymentMethod = "Dinheiro";
          else result.paymentMethod = result.paymentType;
        }
        return result;
      });
    } catch (error) {
      console.warn("⚠️ Não foi possível capturar os totais da nota.", error);
    }

    return {
      totals: totalValues,
      items,
    };
  },
};
