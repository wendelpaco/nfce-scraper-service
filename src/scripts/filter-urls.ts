import { filterLinesWithPParam, processFileWithPParam } from "../utils";

async function main() {
  console.log("=== Filtro de URLs com parâmetro ?p= ===\n");

  // Exemplo 1: Processando um arquivo
  console.log("1. Processando arquivo exemplo.txt...");
  try {
    const urls = await processFileWithPParam("./src/exemplo.txt");
    console.log(`✅ Encontradas ${urls.length} URLs com parâmetro ?p=`);
    console.log("Primeiras 5 URLs:");
    urls.slice(0, 5).forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log("");
  } catch (error) {
    console.error("❌ Erro ao processar arquivo:", error);
  }

  // Exemplo 2: Processando texto diretamente
  console.log("2. Processando texto diretamente...");
  const sampleText = `
    http://exemplo1.com?p=123456
    http://exemplo2.com/sem-parametro
    http://exemplo3.com?p=789012
    linha vazia
    
    http://exemplo4.com?p=345678
  `;

  const filteredUrls = filterLinesWithPParam(sampleText);
  console.log(`✅ Encontradas ${filteredUrls.length} URLs com parâmetro ?p=`);
  filteredUrls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });

  // Exemplo 3: Salvando resultado em arquivo
  console.log("\n3. Salvando resultado filtrado...");
  try {
    const fs = require("fs").promises;
    const urls = await processFileWithPParam("./src/exemplo.txt");
    const outputContent = urls.join("\n");
    await fs.writeFile("./src/urls-filtradas.txt", outputContent, "utf-8");
    console.log("✅ URLs filtradas salvas em src/urls-filtradas.txt");
  } catch (error) {
    console.error("❌ Erro ao salvar arquivo:", error);
  }
}

// Executa o script
if (require.main === module) {
  main().catch(console.error);
}
