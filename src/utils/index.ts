import { getScraperByCode } from "../scrapers/scraperRegistry";
import { logger } from "../utils/logger";

export function normalizeNotaUrl(inputUrl: string, stateCode: string): string {
  const scraper = getScraperByCode(stateCode);
  const state = scraper.stateCode;

  const stateUrlMap: Record<string, string> = {
    BA: process.env.URL_BASE_BA || inputUrl,
    RJ: process.env.URL_BASE_RJ || inputUrl,
  };

  const base = stateUrlMap[state] || inputUrl;

  const pParam = inputUrl.split("p=")[1];
  if (!pParam) return inputUrl;

  return `${base}?p=${pParam}`;
}

/**
 * Filtra linhas que contêm o parâmetro ?p= e retorna um array de strings
 * @param content - Conteúdo do arquivo ou texto com múltiplas linhas
 * @returns Array de strings contendo apenas as linhas com o parâmetro ?p=
 */
export function filterLinesWithPParam(content: string): string[] {
  // Divide o conteúdo em linhas
  const lines = content.split("\n");

  // Filtra apenas as linhas que contêm o parâmetro ?p=
  const filteredLines = lines.filter((line) => {
    const trimmedLine = line.trim();
    return trimmedLine.includes("?p=") && trimmedLine.length > 0;
  });

  // Remove espaços em branco e retorna o array
  return filteredLines.map((line) => line.trim());
}

/**
 * Processa um arquivo de texto e retorna um array de strings com linhas que contêm ?p=
 * @param filePath - Caminho do arquivo a ser processado
 * @returns Promise com array de strings
 */
export async function processFileWithPParam(
  filePath: string,
): Promise<string[]> {
  try {
    const fs = require("fs").promises;
    const content = await fs.readFile(filePath, "utf-8");
    return filterLinesWithPParam(content);
  } catch (error) {
    logger.error("Erro ao processar arquivo:", error);
    return [];
  }
}

/**
 * Formata linhas com aspas duplas e vírgula para uso em arrays
 * @param lines - Array de strings para formatar
 * @returns Array de strings formatadas com aspas duplas e vírgula
 */
export function formatLinesWithQuotes(lines: string[]): string[] {
  return lines.map((line) => `"${line}",`);
}

/**
 * Formata linhas com aspas duplas e vírgula, removendo a vírgula da última linha
 * @param lines - Array de strings para formatar
 * @returns Array de strings formatadas com aspas duplas e vírgula (exceto a última)
 */
export function formatLinesWithQuotesAndComma(lines: string[]): string[] {
  return lines.map((line, index) => {
    if (index === lines.length - 1) {
      return `"${line}"`; // Última linha sem vírgula
    }
    return `"${line}",`; // Outras linhas com vírgula
  });
}
