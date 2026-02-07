/**
 * DataProcessor — Handles raw data storage with type-specific store operations.
 * Layer 2 of the ELT pipeline: parse/extract, store raw to storage, write to DB.
 */

import { createHash } from "node:crypto";
import type { AshbyJob } from "../scraping/ashby-scraper";
import type { JobSource, RawNewsData } from "../types";
import { prisma } from "../lib/prisma";
import { initS3Client, uploadJson } from "../lib/storage";
import { normalizeJob } from "./index";
import { S3Client } from "bun";

export class DataProcessor {
  private static readonly JOB_POSTINGS_BUCKET = "job_postings";
  private static readonly NEWS_ARTICLES_BUCKET = "news_articles";
  
  private s3JobPostings: S3Client;
  private s3NewsArticles: S3Client;

  constructor() {
    this.s3JobPostings = initS3Client(DataProcessor.JOB_POSTINGS_BUCKET);
    this.s3NewsArticles = initS3Client(DataProcessor.NEWS_ARTICLES_BUCKET);
  }

  /**
   * Store raw job data to Supabase Object Storage. Dispatches to type-specific store logic.
   * @returns S3 key where the raw data was stored
   */
  async store<T>(type: JobSource, data: T): Promise<string> {
    switch (type) {
      case "ashby":
        return this.storeAshbyRaw(data as AshbyJob);
      case "linkedin":
        return this.storeLinkedInRaw(data);
      case "website":
        return this.storeWebsiteRaw(data);
      default: {
        throw new Error(`Unknown raw data type: ${data}`);
      }
    }
  }

  /** Store multiple raw jobs to Object Storage. Returns S3 keys in same order as input. */
  async storeBatch<T>(type: JobSource, items: T[]): Promise<string[]> {
    const s3Keys: string[] = [];
    for (const item of items) {
      const key = await this.store(type, item);
      s3Keys.push(key);
    }
    return s3Keys;
  }

  /**
   * Upsert Ashby jobs into the database via Prisma.
   * Ensures the company exists (keyed by companyId), then upserts each job posting.
   * Returns counts of new, updated, and removed jobs.
   */
  async upsertAshbyJobs(
    companyId: string,
    jobBoardName: string,
    jobs: AshbyJob[],
  ): Promise<{ jobsNew: number; jobsUpdated: number; jobsRemoved: number }> {
    const now = new Date();
    let jobsNew = 0;
    let jobsUpdated = 0;

    // Ensure company exists (companyId is the stable unique key)
    await prisma.company.upsert({
      where: { id: companyId },
      update: { updatedAt: now },
      create: {
        id: companyId,
        name: jobBoardName,
        ashbyUrl: `https://jobs.ashbyhq.com/${jobBoardName}`,
      },
    });

    const seenExternalIds = new Set<string>();

    for (const job of jobs) {
      seenExternalIds.add(job.id);

      const { remoteType, seniorityLevel } = normalizeJob(job);
      const description = job.descriptionPlain ?? job.descriptionHtml;
      const descriptionHash = hashContent(description);
      const sourceUrl = job.jobUrl ?? `https://jobs.ashbyhq.com/${jobBoardName}/${job.id}`;

      const jobData = {
        title: job.title?.trim() ?? "",
        description,
        descriptionHtml: job.descriptionHtml,
        location: job.location?.trim(),
        remoteType,
        isRemote: job.isRemote,
        employmentType: job.employmentType?.toLowerCase(),
        seniorityLevel,
        department: job.department ?? job.team,
        team: job.team,
        descriptionHash,
        publishedAt: job.publishedAt ? new Date(job.publishedAt) : undefined,
        jobUrl: job.jobUrl,
        applyUrl: job.applyUrl,
        compensation: job.compensation as any ?? undefined,
        secondaryLocations: job.secondaryLocations as any ?? undefined,
        lastSeenAt: now,
      };

      const existing = await prisma.jobPosting.findUnique({
        where: {
          companyId_source_externalId: {
            companyId,
            source: "ashby",
            externalId: job.id,
          },
        },
      });

      if (existing) {
        const changed = existing.descriptionHash !== descriptionHash;
        await prisma.jobPosting.update({
          where: { id: existing.id },
          data: { ...jobData, removedAt: null },
        });
        if (changed) jobsUpdated++;
      } else {
        await prisma.jobPosting.create({
          data: {
            companyId,
            externalId: job.id,
            source: "ashby",
            sourceUrl,
            ...jobData,
            firstSeenAt: now,
          },
        });
        jobsNew++;
      }
    }

    // Mark jobs not seen in this scrape as removed
    const removedResult = await prisma.jobPosting.updateMany({
      where: {
        companyId,
        source: "ashby",
        removedAt: null,
        externalId: { notIn: [...seenExternalIds] },
      },
      data: { removedAt: now },
    });

    return { jobsNew, jobsUpdated, jobsRemoved: removedResult.count };
  }

  /**
   * Store raw news data to Supabase Object Storage.
   * @returns S3 key where the raw data was stored
   */
  async storeNewsRaw(articles: RawNewsData[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `tavily/batch-${timestamp}.json`;
    return uploadJson(this.s3NewsArticles, key, articles);
  }

  /**
   * Upsert news articles into the database via Prisma.
   * Uses contentHash for change detection, deduplicates by (companyId, externalUrl).
   */
  async upsertNewsArticles(
    companyId: string,
    articles: RawNewsData[]
  ): Promise<{ articlesNew: number; articlesUpdated: number }> {
    const now = new Date();
    let articlesNew = 0;
    let articlesUpdated = 0;

    for (const article of articles) {
      const contentHash = hashContent(article.content);

      const existing = await prisma.newsArticle.findUnique({
        where: {
          companyId_externalUrl: {
            companyId,
            externalUrl: article.url,
          },
        },
      });

      if (existing) {
        const changed = existing.contentHash !== contentHash;
        await prisma.newsArticle.update({
          where: { id: existing.id },
          data: {
            title: article.title,
            snippet: article.snippet,
            content: article.content,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
            source: article.source,

            rawScore: article.score,
            contentHash,
            lastSeenAt: now,
          },
        });
        if (changed) articlesUpdated++;
      } else {
        await prisma.newsArticle.create({
          data: {
            companyId,
            externalUrl: article.url,
            title: article.title,
            snippet: article.snippet,
            content: article.content,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
            source: article.source,

            rawScore: article.score,
            contentHash,
            firstSeenAt: now,
            lastSeenAt: now,
          },
        });
        articlesNew++;
      }
    }

    return { articlesNew, articlesUpdated };
  }

  private async storeAshbyRaw(job: AshbyJob): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = slugify(job.title);
    const key = `ashby/${slug}-${timestamp}.json`;
    return uploadJson(this.s3JobPostings, key, job);
  }

  private async storeLinkedInRaw(data: unknown): Promise<string> {
   throw new Error("Not implemented");
  }

  private async storeWebsiteRaw(data: unknown): Promise<string> {
    throw new Error("Not implemented");
  }
}

function hashContent(content?: string): string {
  return createHash("sha256").update(content ?? "").digest("hex");
}

function slugify(text?: string): string {
  return (text ?? "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

