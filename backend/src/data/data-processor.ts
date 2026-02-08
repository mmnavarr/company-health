/**
 * DataProcessor — Handles raw data storage with type-specific store operations.
 * Layer 2 of the ELT pipeline: parse/extract, store raw to storage, write to DB.
 */

import { createHash } from "node:crypto";
import { type ILogObj, Logger } from "tslog";
import { prisma } from "../lib/prisma";
import { uploadJson } from "../lib/storage";
import type { AshbyJob } from "../scraping/ashby-scraper";
import type { JobSource, RawNewsData } from "../types";
import { normalizeJob } from "./index";

export class DataProcessor {
  private readonly log: Logger<ILogObj> = new Logger();

  /**
   * Store raw job data to Vercel Blob. Dispatches to type-specific store logic.
   * @returns Blob URL where the raw data was stored
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

  /** Store multiple raw jobs to Vercel Blob. Returns blob URLs in same order as input. */
  async storeBatch<T>(type: JobSource, items: T[]): Promise<string[]> {
    const urls: string[] = [];
    for (const item of items) {
      const url = await this.store(type, item);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Upsert Ashby jobs into the database via Prisma.
   * Ensures the company exists (keyed by companyId), then upserts each job posting.
   * Returns counts of new, updated, and removed jobs.
   */
  async upsertAshbyJobs(
    companyId: string,
    jobBoardName: string,
    jobs: AshbyJob[]
  ): Promise<{ jobsNew: number; jobsUpdated: number; jobsRemoved: number }> {
    const now = new Date();
    let jobsNew = 0;
    let jobsUpdated = 0;

    if (jobs.length === 0) {
      return { jobsNew, jobsUpdated, jobsRemoved: 0 };
    }

    const externalIds = jobs.map((job) => job.id);
    const existingRows = await prisma.jobPosting.findMany({
      where: {
        companyId,
        source: "ashby",
        externalId: { in: externalIds },
      },
      select: { id: true, externalId: true, descriptionHash: true },
    });
    this.log.debug(
      `Found ${existingRows.length} existing jobs for company ${companyId}`
    );
    const existingByExternalId = new Map(
      existingRows.map((row) => [row.externalId, row])
    );

    const seenExternalIds = new Set<string>();

    // Prepare all job data before touching the DB
    const updateOps: Array<{
      existingId: string;
      data: Record<string, any>;
      changed: boolean;
    }> = [];
    const createOps: Array<any> = [];

    for (const job of jobs) {
      seenExternalIds.add(job.id);

      const { remoteType, seniorityLevel } = normalizeJob(job);
      const description = job.descriptionPlain ?? job.descriptionHtml;
      const descriptionHash = hashContent(description);
      const sourceUrl =
        job.jobUrl ?? `https://jobs.ashbyhq.com/${jobBoardName}/${job.id}`;

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
        compensation: (job.compensation as any) ?? undefined,
        secondaryLocations: (job.secondaryLocations as any) ?? undefined,
        lastSeenAt: now,
      };

      const existing = existingByExternalId.get(job.id);

      if (existing) {
        const changed = existing.descriptionHash !== descriptionHash;
        updateOps.push({
          existingId: existing.id,
          data: { ...jobData, removedAt: null },
          changed,
        });
        if (changed) {
          jobsUpdated++;
        }
      } else {
        createOps.push({
          companyId,
          externalId: job.id,
          source: "ashby",
          sourceUrl,
          ...jobData,
          firstSeenAt: now,
        });
      }
    }

    // Execute all writes in a single interactive transaction
    await prisma.$transaction(async (tx) => {
      for (const op of updateOps) {
        await tx.jobPosting.update({
          where: { id: op.existingId },
          data: op.data,
        });
      }

      if (createOps.length > 0) {
        await tx.jobPosting.createMany({ data: createOps });
      }
    });

    jobsNew = createOps.length;

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
   * Store raw news data to Vercel Blob.
   * @returns Blob URL where the raw data was stored
   */
  async storeNewsRaw(articles: RawNewsData[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathname = `tavily/batch-${timestamp}.json`;
    return uploadJson(pathname, articles);
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
            publishedAt: article.publishedAt
              ? new Date(article.publishedAt)
              : undefined,
            source: article.source,

            rawScore: article.score,
            contentHash,
            lastSeenAt: now,
          },
        });
        if (changed) {
          articlesUpdated++;
        }
      } else {
        await prisma.newsArticle.create({
          data: {
            companyId,
            externalUrl: article.url,
            title: article.title,
            snippet: article.snippet,
            content: article.content,
            publishedAt: article.publishedAt
              ? new Date(article.publishedAt)
              : undefined,
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
    const pathname = `ashby/${slug}-${timestamp}.json`;
    return uploadJson(pathname, job);
  }

  private async storeLinkedInRaw(data: unknown): Promise<string> {
    throw new Error("Not implemented");
  }

  private async storeWebsiteRaw(data: unknown): Promise<string> {
    throw new Error("Not implemented");
  }
}

function hashContent(content?: string): string {
  return createHash("sha256")
    .update(content ?? "")
    .digest("hex");
}

function slugify(text?: string): string {
  return (text ?? "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
