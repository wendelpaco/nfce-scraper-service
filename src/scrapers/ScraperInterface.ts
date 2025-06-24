// src/scrapers/ScraperInterface.ts
import { Page } from "puppeteer";

export interface Item {
  code: string;
  unit: string;
  title: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

export interface Totals {
  totalItems?: string;
  totalValue?: string;
  discount?: string;
  amountToPay?: string;
  paymentMethod?: string;
  paymentType?: string;
  paymentAmount?: string;
  taxInfo?: string;
}

export interface ExtraInfo {
  numero?: string;
  serie?: string;
  dataEmissao?: string;
  protocoloAutorizacao?: string;
}

export interface ScrapeResult {
  items: Item[];
  totals: Totals;
  extraInfo?: ExtraInfo;
}

export interface Scraper {
  scrape(page: Page): Promise<ScrapeResult>;
}
