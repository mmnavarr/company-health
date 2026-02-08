/**
 * Fundraising ELT job — Orchestrates the 3-layer workflow for funding data:
 * 1. Scraping: Tavily funding scraper searches for funding announcements
 * 2. Raw Data Processing: Store raw JSON to blob, extract structured data with LLM
 * 3. Transformation: Upsert funding rounds to DB with deduplication
 */

import { prisma } from "../lib/prisma";
import { VercelBlobStorage } from "../lib/storage";
import { FundraisingProcessingService } from "../services/data-processor/fundraising-processor";
import { FundingDataExtractionService } from "../services/llm/funding-extraction";
import {
  type TavilyFundingResponse,
  TavilyFundingScrapingService,
} from "../services/scraping/tavily-funding-scraper";
import { Job } from ".";

export interface FundraisingELTPipelineResult {
  sourcesFound: number;
  roundsExtracted: number;
  roundsNew: number;
  roundsUpdated: number;
}

export class FundraisingELTJob extends Job {
  private readonly tavilyScrapingService: TavilyFundingScrapingService;
  private readonly fundraisingProcessor: FundraisingProcessingService;

  constructor() {
    super("fundraising-elt");

    this.tavilyScrapingService = new TavilyFundingScrapingService(
      process.env.TAVILY_API_KEY ?? ""
    );

    const llmService = new FundingDataExtractionService(
      process.env.OPENAI_API_KEY ?? ""
    );

    this.fundraisingProcessor = new FundraisingProcessingService(
      new VercelBlobStorage(),
      llmService
    );
  }

  async run(args: {
    companySlug: string;
  }): Promise<FundraisingELTPipelineResult> {
    const companySlug = args.companySlug;
    if (!companySlug) {
      throw new Error("Company slug is required");
    }
    const startTime = Date.now();

    const pipelineResult: FundraisingELTPipelineResult = {
      sourcesFound: 0,
      roundsExtracted: 0,
      roundsNew: 0,
      roundsUpdated: 0,
    };

    // --- Layer 0: Validate company exists ---
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });
    if (!company) {
      throw new Error(`Company ${companySlug} not found`);
    }

    // --- Layer 1: Extract (Scraping) ---
    this.log.info(`Scraping funding data for ${company.name}...`);
    const response =
      await this.tavilyScrapingService.scrape<TavilyFundingResponse>(
        company.name,
        company?.description ?? undefined
      );
    const results = response.results;
    pipelineResult.sourcesFound = results.length;

    this.log.info(`Found ${results.length} potential funding sources`);

    if (results.length === 0) {
      return pipelineResult;
    }

    // --- Layer 2: Load (Raw file storage) ---
    const rawPath = await this.fundraisingProcessor.storeBlob(
      companySlug,
      results
    );
    this.log.info(`Stored raw results to ${rawPath}`);

    // --- Layer 3: Transform & persist to DB (with LLM extraction) ---
    this.log.info("Processing funding rounds with LLM extraction...");
    const dbResult = await this.fundraisingProcessor.processFundingResults(
      company.id,
      company.name,
      results
    );
    pipelineResult.roundsExtracted = dbResult.totalExtracted;
    pipelineResult.roundsNew = dbResult.roundsNew;
    pipelineResult.roundsUpdated = dbResult.roundsUpdated;

    this.log.info(
      `Extracted ${dbResult.totalExtracted} rounds, ${dbResult.roundsNew} new, ${dbResult.roundsUpdated} updated`
    );

    // Record scraping run
    await prisma.scrapingRun.create({
      data: {
        companyId: company.id,
        companySlug: company.slug,
        source: "fundraising",
        status: "completed",
        jobsFound: pipelineResult.sourcesFound,
        jobsNew: pipelineResult.roundsNew,
        jobsUpdated: pipelineResult.roundsUpdated,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      },
    });

    return pipelineResult;
  }
}
