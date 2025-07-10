import { getScraperByCode } from "../scrapers/scraperRegistry";
import { openPage } from "../utils/browserInstance";
import { logger } from "../utils/logger";

async function testScraper() {
  // URL de teste (substitua por uma URL real)
  const testUrl =
    "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33250533381286007598650110002489881011583725|2|1|3|9AEE97C9C4C51337F4D79669F601DA2B96C75FDF";

  try {
    logger.info("🧪 Iniciando teste do scraper...");

    const stateCode = testUrl.split("p=")[1]?.split("|")[0];
    if (!stateCode) {
      throw new Error("Parâmetro 'p' inválido na URL");
    }

    const scraper = getScraperByCode(stateCode);
    logger.info(`📋 Usando scraper para estado: ${scraper.stateCode}`);

    const { page } = await openPage(testUrl);

    logger.info("🔍 Executando scraper...");
    const result = await scraper.scrape(page);

    await page.close();

    logger.info("📊 Resultados do scraper:");
    logger.info(`- Metadata:`, result.metadata);
    logger.info(`- Items count: ${result.items.length}`);
    logger.info(`- Totals:`, result.totals);

    // Verificar se os novos campos estão presentes
    if (result.metadata && (result.metadata as any).nomeEmpresa) {
      logger.info(
        `✅ Nome da empresa capturado: ${(result.metadata as any).nomeEmpresa}`,
      );
    } else {
      logger.warn("⚠️ Nome da empresa NÃO foi capturado");
    }

    if (result.metadata && (result.metadata as any).cnpj) {
      logger.info(`✅ CNPJ capturado: ${(result.metadata as any).cnpj}`);
    } else {
      logger.warn("⚠️ CNPJ NÃO foi capturado");
    }

    logger.info("✅ Teste concluído com sucesso!");
  } catch (error) {
    logger.error("❌ Erro no teste:", error);
  }
}

testScraper().catch(console.error);
