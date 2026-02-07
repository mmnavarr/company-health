/**
 * Website scraper — TDD §4.3 (adaptive careers page)
 */

import type { RawJobData } from "../types";
import type { Scraper } from "./";

/** Placeholder: implement per TDD §4.3 (adaptive careers page) */
export class WebsiteScraper implements Scraper {
  async scrape<RawJobData>(_careersPageUrl: string): Promise<Array<RawJobData>> {
    return [];
  }
}
