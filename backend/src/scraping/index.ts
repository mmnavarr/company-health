/**
 * Scraping layer — TDD §4
 * LinkedIn, Ashby, and website scrapers.
 */

/**
 * Scraper interface — shared by all scraper implementations.
 */

export interface Scraper {
  /** Scrape jobs for the given company/identifier. */
  scrape<T extends object>(identifier: string): Promise<T>;
}

export { LinkedInScraper } from "./linkedin-scraper";
export { AshbyScraper } from "./ashby-scraper";
export { WebsiteScraper } from "./website-scraper";
export { TavilyNewsScraper } from "./tavily-news-scraper";
