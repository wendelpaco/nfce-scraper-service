import {
  processFileWithPParam,
  formatLinesWithQuotes,
  formatLinesWithQuotesAndComma,
} from "../utils";

async function main() {
  console.log("=== Formatando URLs com aspas duplas e vírgula ===\n");

  try {
    // Processa o arquivo de URLs filtradas
    const urls = await processFileWithPParam("./src/urls-filtradas.txt");

    console.log(`📁 Processando ${urls.length} URLs do arquivo...\n`);

    // Formatação 1: Todas as linhas com vírgula
    console.log("1. Formatação com vírgula em todas as linhas:");
    const urlsComVirgula = formatLinesWithQuotes(urls);

    // Mostra as primeiras 5 linhas como exemplo
    urlsComVirgula.slice(0, 5).forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log("  ...\n");

    // Formatação 2: Última linha sem vírgula (para arrays JavaScript)
    console.log("2. Formatação para arrays (última linha sem vírgula):");
    const urlsParaArray = formatLinesWithQuotesAndComma(urls);

    // Mostra as primeiras 5 linhas como exemplo
    urlsParaArray.slice(0, 5).forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log("  ...\n");

    // Salva os resultados em arquivos
    console.log("3. Salvando arquivos formatados...");

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

    console.log("✅ Arquivos salvos:");
    console.log("  - src/urls-com-virgula.txt (todas com vírgula)");
    console.log("  - src/urls-para-array.txt (última sem vírgula)");
    console.log("  - src/urls-array-completo.js (array JavaScript completo)");

    console.log(`\n📊 Resumo:`);
    console.log(`  - Total de URLs processadas: ${urls.length}`);
    console.log(`  - Primeira URL: ${urls[0]}`);
    console.log(`  - Última URL: ${urls[urls.length - 1]}`);
  } catch (error) {
    console.error("❌ Erro ao processar arquivo:", error);
  }
}

// Executa o script
if (require.main === module) {
  main().catch(console.error);
}
