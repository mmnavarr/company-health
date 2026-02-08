/**
 * Ashby scraper — TDD §4.2 (API-based)
 */

import type { ScrapingService } from ".";

/** Address schema for Ashby location objects */
interface AshbyAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

/** Secondary location for a job */
interface AshbySecondaryLocation {
  location: string;
  address?: AshbyAddress;
}

/** Compensation component within a tier */
interface AshbyCompensationComponent {
  id: string;
  summary: string;
  compensationType: string;
  interval: string;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
}

/** Compensation tier (e.g. "$75K – $100K • Offers Equity • Offers Bonus") */
interface AshbyCompensationTier {
  id: string;
  tierSummary: string;
  title: string | null;
  additionalInformation: string | null;
  components: AshbyCompensationComponent[];
}

/** Summary component (flattened view of compensation) */
interface AshbySummaryComponent {
  compensationType: string;
  interval: string;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
}

/** Compensation info (when includeCompensation=true) */
interface AshbyCompensation {
  compensationTierSummary?: string;
  scrapeableCompensationSalarySummary?: string | null;
  compensationTiers?: AshbyCompensationTier[];
  summaryComponents?: AshbySummaryComponent[];
}

/** Job object from Ashby posting-api job-board endpoint */
export interface AshbyJob {
  id: string;
  title: string;
  location: string;
  department?: string;
  team?: string;
  employmentType?:
    | "FullTime"
    | "PartTime"
    | "Intern"
    | "Contract"
    | "Temporary";
  shouldDisplayCompensationOnJobPostings?: boolean;
  secondaryLocations?: AshbySecondaryLocation[];
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  address?: {
    postalAddress?: AshbyAddress;
  };
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: AshbyCompensation;
}

export interface AshbyJobsResponse {
  apiVersion?: string;
  jobs?: AshbyJob[];
}

export class AshbyScrapingService implements ScrapingService {
  static getJobsApiUrl(jobBoardName: string): string {
    return `https://api.ashbyhq.com/posting-api/job-board/${jobBoardName}?includeCompensation=true`;
  }

  async scrape<AshbyJobsResponse>(
    jobBoardName: string
  ): Promise<AshbyJobsResponse> {
    const url = AshbyScrapingService.getJobsApiUrl(jobBoardName);
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch jobs from Ashby: ${res.statusText}`);
    }

    const data = (await res.json()) as AshbyJobsResponse;
    return data;
  }
}
