/**
 * Website scraper — TDD §4.3 (adaptive careers page)
 */

import type { Scraper } from ".";

/** Placeholder: implement per TDD §4.3 (adaptive careers page) */
export class WebsiteScraper implements Scraper {
  async scrape<T>(_careersPageUrl: string): Promise<T> {
    return [] as any;
  }
}
