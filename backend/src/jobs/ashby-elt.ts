/**
 * Ashby ELT job — Orchestrates the 3-layer workflow:
 * 1. Scraping: Ashby Scraper fetches jobs
 * 2. Raw Data Processing: Parse/extract, store raw to file + upsert to DB
 * 3. Transformation: Normalize, deduplicate by external_id, detect changes via description hash, update/insert
 */

import { JobProcessingService } from "../services/data-processor";
import { prisma } from "../lib/prisma";
import { VercelBlobStorage } from "../lib/storage";
import {
  type AshbyJobsResponse,
  AshbyScrapingService,
} from "../services/scraping/ashby-scraper";
import { Job } from ".";

export interface AshbyELTPipelineResult {
  jobsFound: number;
  jobsNew: number;
  jobsUpdated: number;
  jobsRemoved: number;
}

export class AshbyELTJob extends Job {
  private readonly jobProcessor: JobProcessingService;

  constructor() {
    super("ashby-elt");

    this.jobProcessor = new JobProcessingService(new VercelBlobStorage());
  }

  /**
   * Run the Ashby ELT pipeline for a job board.
   * @param args - The arguments for the job
   * @param args.companySlug - The slug of the company to run the pipeline for
   * @returns The result of the job execution
   */
  async run(args: { companySlug: string }): Promise<AshbyELTPipelineResult> {
    const companySlug = args.companySlug;
    if (!companySlug) {
      throw new Error("Company slug is required");
    }
    const startTime = Date.now();

    const pipelineResult: AshbyELTPipelineResult = {
      jobsFound: 0,
      jobsNew: 0,
      jobsUpdated: 0,
      jobsRemoved: 0,
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
      throw new Error(
        `Company ${companySlug} does not have an Ashby board name`
      );
    }
    this.log.debug(`Found company ${company.name} with ID ${company.id}`);

    // --- Layer 1: Extract (Scraping) ---
    const scraper = new AshbyScrapingService();
    const response = await scraper.scrape<AshbyJobsResponse>(jobBoardName);
    const jobs = response.jobs ?? [];
    pipelineResult.jobsFound = jobs.length;
    this.log.debug(
      `Found ${pipelineResult.jobsFound} jobs for company ${company.name} and job board ${jobBoardName}`
    );

    if (jobs.length === 0) {
      this.log.info(
        `No jobs found for company ${company.name} and job board ${jobBoardName}`
      );
      return pipelineResult;
    }

    // --- Layer 2: Load (Raw file storage) ---
    const rawPaths = await this.jobProcessor.storeBatch("ashby", jobs);
    this.log.debug(
      `Stored ${rawPaths.length} raw files for company ${company.name} and job board ${jobBoardName}`
    );

    // --- Layer 3: Transform & persist to DB ---
    const dbResult = await this.jobProcessor.syncAshbyJobs(
      company.id,
      jobBoardName,
      jobs
    );
    this.log.debug(
      `Upserted ${dbResult.jobsNew} new jobs, ${dbResult.jobsUpdated} updated jobs, and ${dbResult.jobsRemoved} removed jobs for company ${company.name} and job board ${jobBoardName}`
    );

    pipelineResult.jobsNew = dbResult.jobsNew;
    pipelineResult.jobsUpdated = dbResult.jobsUpdated;
    pipelineResult.jobsRemoved = dbResult.jobsRemoved;

    // Record scraping run
    await prisma.scrapingRun.create({
      data: {
        companyId: company.id,
        companySlug,
        source: "ashby",
        status: "completed",
        jobsFound: pipelineResult.jobsFound,
        jobsNew: pipelineResult.jobsNew,
        jobsUpdated: pipelineResult.jobsUpdated,
        jobsRemoved: pipelineResult.jobsRemoved,
        startedAt: new Date(startTime),
        completedAt: new Date(Date.now()),
      },
    });

    this.log.debug(
      `Recorded scraping run for company ${company.name} and job board ${jobBoardName}`
    );
    return pipelineResult;
  }
}
