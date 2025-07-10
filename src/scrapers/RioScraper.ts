/* eslint-disable no-console */
// src/scrapers/RioScraper.ts
import { Page } from "puppeteer";
import { Scraper, Totals } from "./ScraperInterface";

export const RioScraper: Scraper = {
  stateCode: "RJ",
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
        "⚠️ Não foi possível capturar os totais da nota (RIO).",
        error,
      );
    }

    // Bloco para capturar informações extras da seção informativa
    let extraInfo: Record<string, string> = {};
    try {
      const hasExtraInfo = await page.$(
        ".ui-collapsible-content.ui-body-inherit ul.ui-listview li",
      );

      if (hasExtraInfo) {
        extraInfo = await page.$eval(
          ".ui-collapsible-content.ui-body-inherit ul.ui-listview li",
          (element) => {
            const text = element.textContent || "";
            const result: Record<string, string> = {};

            const numberMatch = text.match(/Número:\s*(\d+)/);
            if (numberMatch) result.numero = numberMatch[1];

            const serieMatch = text.match(/Série:\s*(\d+)/);
            if (serieMatch) result.serie = serieMatch[1];

            const emissaoMatch = text.match(/Emissão:\s*([^\n]+)/);
            if (emissaoMatch) result.dataEmissao = emissaoMatch[1].trim();

            const protocoloMatch = text.match(
              /Protocolo de Autorização:\s*(\d+)/,
            );
            if (protocoloMatch) result.protocoloAutorizacao = protocoloMatch[1];

            return result;
          },
        );
      } else {
        console.warn(
          "⚠️ Bloco extraInfo não encontrado na página (pode ser normal para o RJ)",
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ Erro ao tentar capturar informações extras da nota (extraInfo block).",
        error,
      );
    }

    // Captura informações da empresa (nome e CNPJ)
    try {
      const empresaInfo = await page.$eval(".txtCenter", (element) => {
        const txtTopo =
          element.querySelector(".txtTopo")?.textContent?.trim() || "";
        const textElements = element.querySelectorAll(".text");

        let cnpj = "";
        for (const textEl of textElements) {
          const text = textEl.textContent?.trim() || "";
          const cnpjMatch = text.match(
            /CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/,
          );
          if (cnpjMatch) {
            cnpj = cnpjMatch[1];
            break;
          }
        }

        return {
          nomeEmpresa: txtTopo,
          cnpj: cnpj,
        };
      });

      // Adiciona informações da empresa ao metadata
      extraInfo = {
        ...extraInfo,
        nomeEmpresa: empresaInfo.nomeEmpresa,
        cnpj: empresaInfo.cnpj,
      };
    } catch (error) {
      console.warn("⚠️ Erro ao tentar capturar informações da empresa.", error);
    }

    return {
      metadata: extraInfo,
      totals: totalValues,
      items,
    };
  },
};
