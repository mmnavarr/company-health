/**
 * Ashby ELT job — Orchestrates the 3-layer workflow:
 * 1. Scraping: Ashby Scraper fetches jobs
 * 2. Raw Data Processing: Parse/extract, store raw to file + upsert to DB
 * 3. Transformation: Normalize, deduplicate by external_id, detect changes via description hash, update/insert
 */

import { randomUUID } from "node:crypto";
import { AshbyScraper, type AshbyJobsResponse } from "../scraping/ashby-scraper";
import { DataProcessor } from "../data";
import { prisma } from "../lib/prisma";

export interface AshbyELTPipelineResult {
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  jobsRemoved: number;
  rawPaths: string[];
}

/**
 * Run the Ashby ELT pipeline for a job board.
 * @param jobBoardName - Ashby job board identifier (e.g. "rain")
 * @param companyId - Company identifier (defaults to a new UUID)
 */
export async function runAshbyELTPipeline(
  companyId: string,
  jobBoardName: string,
): Promise<AshbyELTPipelineResult> {
  if (!companyId) {
    throw new Error("Company ID is required");
  }
  if (!jobBoardName) {
    throw new Error("Job board name is required");
  }

  const pipelineResult: AshbyELTPipelineResult = {
    jobsFound: 0,
    jobsNew: 0,
    jobsUpdated: 0,
    jobsRemoved: 0,
    rawPaths: [],
  };

  // --- Layer 0: Validate company exists ---
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  // --- Layer 1: Extract (Scraping) ---
  const scraper = new AshbyScraper();
  const response = await scraper.scrape<AshbyJobsResponse>(jobBoardName);
  const jobs = response.jobs ?? [];
  pipelineResult.jobsFound = jobs.length;

  if (jobs.length === 0) {
    console.log(`No jobs found for ${jobBoardName}`);
    return pipelineResult;
  }

  // --- Layer 2: Load (Raw file storage) ---
  const dataProcessor = new DataProcessor();
  pipelineResult.rawPaths = await dataProcessor.storeBatch("ashby", jobs);

  // --- Layer 3: Transform & persist to DB ---
  const dbResult = await dataProcessor.upsertAshbyJobs(
    companyId,
    jobBoardName,
    jobs
  );

  pipelineResult.jobsNew = dbResult.jobsNew;
  pipelineResult.jobsUpdated = dbResult.jobsUpdated;
  pipelineResult.jobsRemoved = dbResult.jobsRemoved;

  // Record scraping run
  await prisma.scrapingRun.create({
    data: {
      companyId,
      source: "ashby",
      status: "completed",
      jobsFound: pipelineResult.jobsFound,
      jobsNew: dbResult.jobsNew,
      jobsUpdated: dbResult.jobsUpdated,
      jobsRemoved: dbResult.jobsRemoved,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  return pipelineResult;
}
