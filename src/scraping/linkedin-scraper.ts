/**
 * LinkedIn scraper — TDD §4.1
 */

import type { RawJobData } from "../types";
import type { Scraper } from "./";

type LinkedInJob = {};

/** Placeholder: implement per TDD §4.1 */
export class LinkedInScraper implements Scraper {
  async scrape<LinkedInJob>(_companyName: string): Promise<Array<LinkedInJob>> {
    return [];
  }
}
