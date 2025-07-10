import {
  processFileWithPParam,
  formatLinesWithQuotes,
  formatLinesWithQuotesAndComma,
} from "../utils";
import { logger } from "../utils/logger";

async function main() {
  logger.info("=== Formatando URLs com aspas duplas e vírgula ===\n");

  try {
    // Processa o arquivo de URLs filtradas
    const urls = await processFileWithPParam("./src/urls-filtradas.txt");

    logger.info(`📁 Processando ${urls.length} URLs do arquivo...\n`);

    // Formatação 1: Todas as linhas com vírgula
    logger.info("1. Formatação com vírgula em todas as linhas:");
    const urlsComVirgula = formatLinesWithQuotes(urls);

    // Mostra as primeiras 5 linhas como exemplo
    urlsComVirgula.slice(0, 5).forEach((url, index) => {
      logger.info(`  ${index + 1}. ${url}`);
    });
    logger.info("  ...\n");

    // Formatação 2: Última linha sem vírgula (para arrays JavaScript)
    logger.info("2. Formatação para arrays (última linha sem vírgula):");
    const urlsParaArray = formatLinesWithQuotesAndComma(urls);

    // Mostra as primeiras 5 linhas como exemplo
    urlsParaArray.slice(0, 5).forEach((url, index) => {
      logger.info(`  ${index + 1}. ${url}`);
    });
    logger.info("  ...\n");

    // Salva os resultados em arquivos
    logger.info("3. Salvando arquivos formatados...");

    const fs = require("fs").promises;

    // Salva versão com vírgula em todas as linhas
    await fs.writeFile(
      "./src/urls-com-virgula.txt",
      urlsComVirgula.join("\n"),
      "utf-8",
    );

    // Salva versão para arrays JavaScript
    await fs.writeFile(
      "./src/urls-para-array.txt",
      urlsParaArray.join("\n"),
      "utf-8",
    );

    // Salva versão completa para copiar e colar em código
    const arrayCompleto = `const urls = [\n${urlsParaArray.map((url) => `  ${url}`).join("\n")}\n];`;
    await fs.writeFile("./src/urls-array-completo.js", arrayCompleto, "utf-8");

    logger.info("✅ Arquivos salvos:");
    logger.info("  - src/urls-com-virgula.txt (todas com vírgula)");
    logger.info("  - src/urls-para-array.txt (última sem vírgula)");
    logger.info("  - src/urls-array-completo.js (array JavaScript completo)");

    logger.info(`\n📊 Resumo:`);
    logger.info(`  - Total de URLs processadas: ${urls.length}`);
    logger.info(`  - Primeira URL: ${urls[0]}`);
    logger.info(`  - Última URL: ${urls[urls.length - 1]}`);
  } catch (error) {
    logger.error("❌ Erro ao processar arquivo:", error);
  }
}

// Executa o script
if (require.main === module) {
  main().catch(console.error);
}
