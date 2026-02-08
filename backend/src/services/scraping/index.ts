/**
 * Scraping layer — TDD §4
 * LinkedIn, Ashby, and website scrapers.
 */

/**
 * Scraper interface — shared by all scraper implementations.
 */

export interface ScrapingService {
  /** Scrape jobs for the given company/identifier. */
  scrape<T extends object>(identifier: string): Promise<T>;
}

export { AshbyScrapingService as AshbyScraper } from "./ashby-scraper";
export { LinkedInScrapingService as LinkedInScrapingService } from "./linkedin-scraper";
export { TavilyNewsScrapingService as TavilyNewsScrapingService } from "./tavily-news-scraper";
