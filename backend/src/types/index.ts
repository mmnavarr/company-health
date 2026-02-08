/**
 * Domain types aligned with specs/TDD.md §3 Data Model
 */

export type JobSource = "linkedin" | "ashby" | "website";

export type NewsSource = "tavily";

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
