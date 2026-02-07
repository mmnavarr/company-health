/**
 * Ashby scraper — TDD §4.2 (API-based)
 */

import type { Scraper } from "./";

/** Address schema for Ashby location objects */
type AshbyAddress = {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
};

/** Secondary location for a job */
type AshbySecondaryLocation = {
  location: string;
  address?: AshbyAddress;
};

/** Compensation component within a tier */
type AshbyCompensationComponent = {
  id: string;
  summary: string;
  compensationType: string;
  interval: string;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
};

/** Compensation tier (e.g. "$75K – $100K • Offers Equity • Offers Bonus") */
type AshbyCompensationTier = {
  id: string;
  tierSummary: string;
  title: string | null;
  additionalInformation: string | null;
  components: AshbyCompensationComponent[];
};

/** Summary component (flattened view of compensation) */
type AshbySummaryComponent = {
  compensationType: string;
  interval: string;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
};

/** Compensation info (when includeCompensation=true) */
type AshbyCompensation = {
  compensationTierSummary?: string;
  scrapeableCompensationSalarySummary?: string | null;
  compensationTiers?: AshbyCompensationTier[];
  summaryComponents?: AshbySummaryComponent[];
};

/** Job object from Ashby posting-api job-board endpoint */
export type AshbyJob = {
  id: string;
  title: string;
  location: string;
  department?: string;
  team?: string;
  employmentType?: "FullTime" | "PartTime" | "Intern" | "Contract" | "Temporary";
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
};

export type AshbyJobsResponse = {
  apiVersion?: string;
  jobs?: AshbyJob[];
};

export class AshbyScraper implements Scraper {
  public static getJobsApiUrl(jobBoardName: string): string {
    return `https://api.ashbyhq.com/posting-api/job-board/${jobBoardName}?includeCompensation=true`;
  }

  async scrape<AshbyJobsResponse>(jobBoardName: string): Promise<AshbyJobsResponse> {
    const url = AshbyScraper.getJobsApiUrl(jobBoardName);
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Failed to fetch jobs from Ashby: ${res.statusText}`);

    const data = (await res.json()) as AshbyJobsResponse;
    return data;
  }
}
