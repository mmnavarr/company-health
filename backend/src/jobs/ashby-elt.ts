/**
 * Ashby ELT job — Orchestrates the 3-layer workflow:
 * 1. Scraping: Ashby Scraper fetches jobs
 * 2. Raw Data Processing: Parse/extract, store raw to file + upsert to DB
 * 3. Transformation: Normalize, deduplicate by external_id, detect changes via description hash, update/insert
 */

import { AshbyScraper, type AshbyJobsResponse } from "../scraping/ashby-scraper";
import { DataProcessor } from "../data";
import { prisma } from "../lib/prisma";
import { Logger, ILogObj } from "tslog";

const log: Logger<ILogObj> = new Logger();

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
  companySlug: string,
): Promise<AshbyELTPipelineResult> {
  if (!companySlug) {
    throw new Error("Company slug is required");
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
    where: { slug: companySlug },
  });
  if (!company) {
    throw new Error(`Company ${companySlug} not found`);
  }
  const jobBoardName = company.ashbyBoardName;
  if (!jobBoardName) {
    throw new Error(`Company ${companySlug} does not have an Ashby board name`);
  }
  log.debug(`Found company ${company.name} with ID ${company.id}`);

  // --- Layer 1: Extract (Scraping) ---
  const scraper = new AshbyScraper();
  const response = await scraper.scrape<AshbyJobsResponse>(jobBoardName);
  const jobs = response.jobs ?? [];
  pipelineResult.jobsFound = jobs.length;
  log.debug(`Found ${pipelineResult.jobsFound} jobs for company ${company.name} and job board ${jobBoardName}`);

  if (jobs.length === 0) {
    log.info(`No jobs found for company ${company.name} and job board ${jobBoardName}`);
    return pipelineResult;
  }

  // --- Layer 2: Load (Raw file storage) ---
  const dataProcessor = new DataProcessor();
  pipelineResult.rawPaths = await dataProcessor.storeBatch("ashby", jobs);
  log.debug(`Stored ${pipelineResult.rawPaths.length} raw files for company ${company.name} and job board ${jobBoardName}`);

  // --- Layer 3: Transform & persist to DB ---
  const dbResult = await dataProcessor.upsertAshbyJobs(
    company.id,
    jobBoardName,
    jobs
  );
  log.debug(`Upserted ${dbResult.jobsNew} new jobs, ${dbResult.jobsUpdated} updated jobs, and ${dbResult.jobsRemoved} removed jobs for company ${company.name} and job board ${jobBoardName}`);

  pipelineResult.jobsNew = dbResult.jobsNew;
  pipelineResult.jobsUpdated = dbResult.jobsUpdated;
  pipelineResult.jobsRemoved = dbResult.jobsRemoved;

  // Record scraping run
  await prisma.scrapingRun.create({
    data: {
      companyId: company.id,
      companySlug: companySlug,
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
  
  log.debug(`Recorded scraping run for company ${company.name} and job board ${jobBoardName}`);
  return pipelineResult;
}
