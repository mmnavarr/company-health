/**
 * LinkedIn scraper — TDD §4.1
 */

import type { ScrapingService } from ".";

export interface LinkedInJob {
  title: string;
  location: string;
  company: string;
  description?: string;
  url?: string;
  postedAt?: string;
}

export class LinkedInScrapingService implements ScrapingService {

  // biome-ignore lint/suspicious/useAwait: Unimplemented
    async scrape<LinkedInJob>(_companyName: string): Promise<LinkedInJob> {
    return [] as LinkedInJob;
  }
}
