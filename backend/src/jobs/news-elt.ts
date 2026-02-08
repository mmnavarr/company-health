/**
 * News ELT job — Orchestrates the 3-layer workflow for news articles:
 * 1. Scraping: Tavily news scraper fetches articles
 * 2. Raw Data Processing: Store raw JSON to file
 * 3. Transformation: Upsert news articles to DB with content hash change detection
 */

import { DataProcessor } from "../data";
import { prisma } from "../lib/prisma";
import {
  type TavilyNewsResponse,
  TavilyNewsScraper,
} from "../scraping/tavily-news-scraper";
import type { RawNewsData } from "../types";

export interface NewsELTPipelineResult {
  articlesFound: number;
  articlesNew: number;
  articlesUpdated: number;
  rawPath: string | null;
}

/**
 * Run the News ELT pipeline for a company.
 * @param companyName - Company name to search for news
 * @param companyId - Company identifier
 * @param companyDomain - Company domain for the companies table
 */
export async function runNewsELTPipeline(
  companySlug: string
): Promise<NewsELTPipelineResult> {
  if (!companySlug) {
    throw new Error("Company slug is required");
  }

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
  const scraper = new TavilyNewsScraper();
  const response = await scraper.scrape<TavilyNewsResponse>(company.name);
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
  const dataProcessor = new DataProcessor();
  pipelineResult.rawPath = await dataProcessor.storeNewsRaw(articles);

  // --- Layer 3: Transform & persist to DB ---
  const dbResult = await dataProcessor.upsertNewsArticles(company.id, articles);
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
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  return pipelineResult;
}
