/**
 * Ashby ELT job — Orchestrates the 3-layer workflow:
 * 1. Scraping: Ashby Scraper fetches jobs
 * 2. Raw Data Processing: Parse/extract, store raw to file
 * 3. Transformation: Normalize, deduplicate by external_id, detect changes via description hash, update/insert
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AshbyScraper, type AshbyJob, type AshbyJobsResponse } from "../scraping/ashby-scraper";
import { DataProcessor, normalizeJob } from "../data";
import type { JobPosting, RawJobData } from "../types";

const DATA_DIR = join(process.cwd(), "data");
const RAW_DIR = join(DATA_DIR, "raw", "ashby");
const POSTINGS_FILE = join(DATA_DIR, "job_postings.json");

function hashDescription(description?: string): string {
  return createHash("sha256").update(description ?? "").digest("hex");
}

/** Map Ashby job to RawJobData */
function ashbyToRawJob(job: AshbyJob, jobBoardName: string): RawJobData {
  const jobUrl = AshbyScraper.getJobsApiUrl(jobBoardName);

  return {
    externalId: job.id,
    title: job.title ?? "",
    description: job.descriptionPlain ?? job.descriptionHtml,
    location: job.location,
    sourceUrl: jobUrl,
    source: "ashby",
    department: job.department ?? job.team,
    employmentType: job.employmentType?.toLowerCase(),
  };
}

/** Load existing job postings from file */
async function loadJobPostings(): Promise<JobPosting[]> {
  try {
    const content = await readFile(POSTINGS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist job postings to file */
async function saveJobPostings(postings: JobPosting[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(POSTINGS_FILE, JSON.stringify(postings, null, 2), "utf-8");
}

/** Transform normalized raw data to JobPosting */
function toJobPosting(
  raw: RawJobData & { remoteType?: string; seniorityLevel?: string },
  companyId: string,
  rawPath: string,
  descriptionHash: string,
  existing?: JobPosting
): JobPosting {
  const now = new Date();

  return {
    id: existing?.id ?? `ashby-${raw.externalId}`,
    companyId,
    externalId: raw.externalId,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    title: raw.title,
    description: raw.description,
    location: raw.location,
    remoteType: (raw.remoteType as JobPosting["remoteType"]) ?? undefined,
    employmentType: (raw.employmentType as JobPosting["employmentType"]) ?? undefined,
    seniorityLevel: raw.seniorityLevel,
    department: raw.department,
    rawHtmlPath: rawPath,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    metadata: { descriptionHash },
  };
}

export interface AshbyELTPipelineResult {
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  rawPaths: string[];
}

/**
 * Run the Ashby ELT pipeline for a job board.
 * @param jobBoardName - Ashby job board identifier (e.g. "rain")
 * @param companyId - Company identifier for normalized storage (defaults to jobBoardName)
 */
export async function runAshbyELTPipeline(
  jobBoardName: string,
  companyId: string = jobBoardName
): Promise<AshbyELTPipelineResult> {
  const pipelineResult: AshbyELTPipelineResult = { jobsFound: 0, jobsNew: 0, jobsUpdated: 0, rawPaths: [] };

  // --- Layer 1: Scraping ---
  const scraper = new AshbyScraper();
  const response = await scraper.scrape<AshbyJobsResponse>(jobBoardName);
  const jobs = response.jobs ?? [];
  pipelineResult.jobsFound = jobs.length;

  if (jobs.length === 0) return pipelineResult;

  // --- Layer 2: Raw Data Processing ---
  const dataProcessor = new DataProcessor();
  pipelineResult.rawPaths = await dataProcessor.storeBatch("ashby", jobs);

  // --- Layer 3: Transformation ---
  const existingPostings = await loadJobPostings();
  const byCompany = existingPostings.filter((p) => p.companyId === companyId);
  const byExternalId = new Map(byCompany.map((p) => [p.externalId ?? p.id, p]));

  const postingsToKeep = existingPostings.filter((p) => p.companyId !== companyId);
  const seenExternalIds = new Set<string>();

  for (const job of jobs) {
    const raw = ashbyToRawJob(job, jobBoardName);
    const normalized = normalizeJob(raw);
    const descriptionHash = hashDescription(normalized.description);
    const rawPath = join(RAW_DIR, jobBoardName, `${job.id}.json`);

    const existing = byExternalId.get(job.id);
    const existingHash = (existing?.metadata as { descriptionHash?: string })?.descriptionHash;
    const hasChanged = existingHash !== undefined && existingHash !== descriptionHash;

    let posting: JobPosting;
    if (existing && !hasChanged) {
      posting = { ...existing, lastSeenAt: new Date(), updatedAt: new Date() };
    } else {
      posting = toJobPosting(normalized, companyId, rawPath, descriptionHash, existing);
      if (existing && hasChanged) pipelineResult.jobsUpdated++;
      else if (!existing) pipelineResult.jobsNew++;
    }

    seenExternalIds.add(job.id);
    postingsToKeep.push(posting);
  }

  // Mark jobs no longer seen as removed (optional: set removedAt)
  for (const p of byCompany) {
    const extId = p.externalId ?? p.id.replace(/^ashby-/, "");
    if (!seenExternalIds.has(extId)) {
      postingsToKeep.push({ ...p, removedAt: new Date(), updatedAt: new Date() });
    }
  }

  await saveJobPostings(postingsToKeep);
  return pipelineResult;
}
