/**
 * LinkedIn scraper — TDD §4.1
 */

import type { ScrapingService } from ".";

interface LinkedInJob {
  title: string;
  location: string;
  company: string;
  description?: string;
  url?: string;
  postedAt?: string;
}

export class LinkedInScrapingService implements ScrapingService {
  async scrape<LinkedInJob>(_companyName: string): Promise<LinkedInJob> {
    return [] as any;
  }
}
