/**
 * Domain types aligned with specs/TDD.md §3 Data Model
 */

export type JobSource = "linkedin" | "ashby" | "website";

export type NewsSource = "tavily";

export type NewsSentiment = "positive" | "negative" | "neutral" | "mixed";

/** Raw news data as returned by news scrapers before normalization */
export interface RawNewsData {
  url: string;
  title: string;
  snippet: string;
  content: string;
  publishedAt?: string;
  score: number;
  source: NewsSource;
}

export type RemoteType = "remote" | "hybrid" | "onsite";

export type EmploymentType = "full-time" | "part-time" | "contract";

export type ScrapingRunStatus = "pending" | "running" | "completed" | "failed";

export type GrowthIndicator = "expanding" | "stable" | "contracting";

export interface Company {
  id: string;
  name: string;
  domain: string;
  linkedinUrl?: string;
  ashbyUrl?: string;
  careersPageUrl?: string;
  industry?: string;
  companySize?: string;
  headquartersLocation?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface JobPosting {
  id: string;
  companyId: string;
  externalId?: string;
  source: JobSource;
  sourceUrl: string;
  title: string;
  description?: string;
  location?: string;
  remoteType?: RemoteType;
  employmentType?: EmploymentType;
  seniorityLevel?: string;
  department?: string;
  rawHtmlPath?: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  removedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ScrapingRun {
  id: string;
  companyId: string;
  source: JobSource;
  status: ScrapingRunStatus;
  jobsFound?: number;
  jobsNew?: number;
  jobsUpdated?: number;
  jobsRemoved?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface CompanyHealthMetrics {
  id: string;
  companyId: string;
  metricDate: string; // ISO date
  totalActiveJobs: number;
  jobsAdded7d?: number;
  jobsRemoved7d?: number;
  jobsAdded30d?: number;
  jobsRemoved30d?: number;
  jobVelocityScore?: number;
  departmentDiversityScore?: number;
  locationDiversityScore?: number;
  seniorityDistribution?: Record<string, number>;
  departmentDistribution?: Record<string, number>;
  healthScore?: number;
  growthIndicator?: GrowthIndicator;
  createdAt: Date;
}

