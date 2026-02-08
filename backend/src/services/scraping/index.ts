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

export { AshbyScrapingService } from "./ashby-scraper";
export { LinkedInScrapingService } from "./linkedin-scraper";
export { TavilyNewsScrapingService } from "./tavily-news-scraper";
