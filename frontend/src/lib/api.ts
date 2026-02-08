/**
 * API client and types for the Company Health backend
 */

// ============================================================================
// Types matching the ElysiaJS backend API responses
// ============================================================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  companySize: string | null;
  headquartersLocation: string | null;
  ashbyBoardName: string | null;
  activeJobsCount: number;
}

export interface CompanyDetail extends Company {
  linkedinUrl: string | null;
  careersPageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  department: string | null;
  team: string | null;
  location: string | null;
  remoteType: string | null;
  employmentType: string | null;
  seniorityLevel: string | null;
  sourceUrl: string;
  jobUrl: string | null;
  applyUrl: string | null;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  source: string;
}

export interface ApiError {
  error: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardCompany {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  companySize: string | null;
  headquartersLocation: string | null;
  ashbyBoardName: string | null;
}

export interface HealthMetrics {
  score: number;
  growthIndicator: string;
  totalActiveJobs: number;
  jobsAdded7d: number;
  jobsRemoved7d: number;
  jobsAdded30d: number;
  jobsRemoved30d: number;
  jobVelocityScore: number;
  departmentDiversityScore: number;
  locationDiversityScore: number;
  lastUpdated: string;
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface ScrapingRun {
  source: string;
  status: string;
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  jobsRemoved: number;
  completedAt: string | null;
}

export interface DashboardData {
  company: DashboardCompany;
  health: HealthMetrics;
  departmentDistribution: DistributionItem[];
  seniorityDistribution: DistributionItem[];
  recentRuns: ScrapingRun[];
}

// ============================================================================
// API Client
// ============================================================================

const DEFAULT_API_URL = "http://localhost:3000";

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiUrl();
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiRequestError(
        errorData.error || `Request failed with status ${response.status}`,
        response.status
      );
    }

    return response.json();
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return this.fetch<Company[]>("/api/companies");
  }

  async getCompany(slug: string): Promise<CompanyDetail> {
    return this.fetch<CompanyDetail>(`/api/companies/${encodeURIComponent(slug)}`);
  }

  async getCompanyJobs(
    slug: string,
    filters?: {
      department?: string;
      seniority?: string;
      remote?: string;
      search?: string;
    }
  ): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters?.department) params.set("department", filters.department);
    if (filters?.seniority) params.set("seniority", filters.seniority);
    if (filters?.remote) params.set("remote", filters.remote);
    if (filters?.search) params.set("search", filters.search);

    const queryString = params.toString();
    const path = `/api/companies/${encodeURIComponent(slug)}/jobs${queryString ? `?${queryString}` : ""}`;
    return this.fetch<Job[]>(path);
  }

  // Jobs
  async getJobs(filters?: {
    companyId?: string;
    department?: string;
    limit?: number;
  }): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set("companyId", filters.companyId);
    if (filters?.department) params.set("department", filters.department);
    if (filters?.limit) params.set("limit", String(filters.limit));

    const queryString = params.toString();
    const path = `/api/jobs${queryString ? `?${queryString}` : ""}`;
    return this.fetch<Job[]>(path);
  }

  // Dashboard
  async getDashboard(slug: string): Promise<DashboardData> {
    return this.fetch<DashboardData>(`/api/dashboard/${encodeURIComponent(slug)}`);
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// Default client instance
export const api = new ApiClient();
