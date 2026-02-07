/**
 * LinkedIn scraper — TDD §4.1
 */

import type { Scraper } from ".";

type LinkedInJob = {};

/** Placeholder: implement per TDD §4.1 */
export class LinkedInScraper implements Scraper {
  async scrape<LinkedInJob>(_companyName: string): Promise<LinkedInJob> {
    return [] as any;
  }
}
