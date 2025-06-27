/* eslint-disable no-console */
// src/scrapers/BahiaScraper.ts
import { Page } from "puppeteer";
import { Scraper, Totals } from "./ScraperInterface";

export const BahiaScraper: Scraper = {
  stateCode: "BA",
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

        divs.forEach((div, index) => {
          const label = div.querySelector("label")?.textContent?.trim() ?? "";
          const value = div.querySelector("span")?.textContent?.trim() ?? "";

          if (label.includes("Qtd. total de itens")) result.totalItems = value;
          if (label.includes("Valor total R$")) result.totalValue = value;
          if (label.includes("Descontos R$")) result.discount = value;
          if (label.includes("Valor a pagar R$")) result.amountToPay = value;
          if (label.includes("Informação dos Tributos Totais Incidentes"))
            result.taxInfo = value;

          if (label.includes("Forma de pagamento:")) {
            const nextDiv = divs[index + 1];
            if (nextDiv) {
              const paymentLabel =
                nextDiv.querySelector("label")?.textContent?.trim() ?? "";
              const paymentValue =
                nextDiv.querySelector("span")?.textContent?.trim() ?? "";

              if (paymentLabel && paymentValue) {
                result.paymentMethod = paymentLabel;
                result.paymentAmount = paymentValue;
              }
            }
          }
        });

        return result;
      });
    } catch (error) {
      console.warn(
        "⚠️ Não foi possível capturar os totais da nota (BAHIA).",
        error,
      );
    }

    // Bloco para capturar informações extras da seção informativa
    let extraInfo: Record<string, string> = {};
    try {
      extraInfo = await page.$eval(
        ".ui-collapsible-content.ui-body-inherit ul.ui-listview li",
        (element) => {
          const text = element.textContent || "";
          const result: Record<string, string> = {};

          const numberMatch = text.match(/Número:\s*(\d+)/);
          if (numberMatch) result.numero = numberMatch[1];

          const serieMatch = text.match(/Série:\s*(\d+)/);
          if (serieMatch) result.serie = serieMatch[1];

          const emissaoMatch = text.match(
            /Emissão:\s*(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}-\d{2}:\d{2})/,
          );
          if (emissaoMatch) result.dataEmissao = emissaoMatch[1].trim();

          const protocoloMatch = text.match(
            /Protocolo de Autorização:\s*(\d+)/,
          );
          if (protocoloMatch) result.protocoloAutorizacao = protocoloMatch[1];

          return result;
        },
      );
    } catch (error) {
      console.warn(
        "⚠️ Não foi possível capturar informações extras da nota.",
        error,
      );
    }

    return {
      metadata: extraInfo,
      totals: totalValues,
      items,
    };
  },
};
