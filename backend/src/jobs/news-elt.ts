/**
 * News ELT job — Orchestrates the 3-layer workflow for news articles:
 * 1. Scraping: Tavily news scraper fetches articles
 * 2. Raw Data Processing: Store raw JSON to file
 * 3. Transformation: Upsert news articles to DB with content hash change detection
 */

import { NewsProcessingService } from "../services/data-processor";
import { prisma } from "../lib/prisma";
import { VercelBlobStorage } from "../lib/storage";
import {
  type TavilyNewsResponse,
  TavilyNewsScrapingService,
} from "../services/scraping/tavily-news-scraper";
import type { RawNewsData } from "../types";
import { Job } from ".";

export interface NewsELTPipelineResult {
  articlesFound: number;
  articlesNew: number;
  articlesUpdated: number;
  rawPath: string | null;
}

export class NewsELTJob extends Job {
  private readonly tavilyScrapingService: TavilyNewsScrapingService;
  private readonly newsProcessor: NewsProcessingService;

  constructor() {
    super("news-elt");

    this.tavilyScrapingService = new TavilyNewsScrapingService(process.env.TAVILY_API_KEY ?? "");
    this.newsProcessor = new NewsProcessingService(new VercelBlobStorage());
  }

  async run(args: { companySlug: string }): Promise<NewsELTPipelineResult> {
    const companySlug = args.companySlug;
    if (!companySlug) {
      throw new Error("Company slug is required");
    }
    const startTime = Date.now();

    const pipelineResult: NewsELTPipelineResult = {
      articlesFound: 0,
      articlesNew: 0,
      articlesUpdated: 0,
      rawPath: null,
    };

    // --- Layer 0: Validate company exists ---
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });
    if (!company) {
      throw new Error(`Company ${companySlug} not found`);
    }

    // --- Layer 1: Extract (Scraping) ---
    const response = await this.tavilyScrapingService.scrape<TavilyNewsResponse>(company.name);
    const results = response.results;
    pipelineResult.articlesFound = results.length;

    if (results.length === 0) {
      return pipelineResult;
    }

    // Map to RawNewsData
    const articles: RawNewsData[] = results.map((r) => ({
      url: r.url,
      title: r.title,
      snippet: r.content,
      content: r.rawContent ?? r.content,
      publishedAt: r.publishedDate,
      score: r.score,
      source: "tavily" as const,
    }));

    // --- Layer 2: Load (Raw file storage) ---
    pipelineResult.rawPath = await this.newsProcessor.storeBlob(articles);

    // --- Layer 3: Transform & persist to DB ---
    const dbResult = await this.newsProcessor.syncNewsArticles(company.id, articles);
    pipelineResult.articlesNew = dbResult.articlesNew;
    pipelineResult.articlesUpdated = dbResult.articlesUpdated;

    // Record scraping run
    await prisma.scrapingRun.create({
      data: {
        companyId: company.id,
        companySlug: company.slug,
        source: "news",
        status: "completed",
        jobsFound: pipelineResult.articlesFound,
        jobsNew: dbResult.articlesNew,
        jobsUpdated: dbResult.articlesUpdated,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      },
    });

    return pipelineResult;
  }
}
