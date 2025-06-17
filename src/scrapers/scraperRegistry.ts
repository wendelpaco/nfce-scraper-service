// src/scrapers/scraperRegistry.ts
import { Scraper } from "./ScraperInterface";
import { BahiaScraper } from "./BahiaScraper";
import { RioScraper } from "./RioScraper";

const scraperRegistry: Record<string, Scraper> = {
  "29": BahiaScraper,
  "33": RioScraper,
};

export function getScraperByCode(code: string): Scraper {
  const ufCode = code.substring(0, 2);
  const scraper = scraperRegistry[ufCode];

  if (!scraper) {
    throw new Error(`Estado com código ${ufCode} não suportado`);
  }
  return scraper;
}
