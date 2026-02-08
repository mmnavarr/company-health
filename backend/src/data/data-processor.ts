/**
 * DataProcessor — Handles raw data storage with type-specific store operations.
 * Layer 2 of the ELT pipeline: parse/extract, store raw to storage, write to DB.
 */

import { hashContent, slugify } from "@/utils";
import { prisma } from "../lib/prisma";
import { uploadJson } from "../lib/storage";
import type { AshbyJob } from "../scraping/ashby-scraper";
import type { JobSource, RawNewsData } from "../types";
import { normalizeJob } from "./index";
import { type ILogObj, Logger } from "tslog";
import type { JobPosting } from "backend/generated/prisma/client";
import type { JobPostingCreateManyInput } from "backend/generated/prisma/models/JobPosting";

export class DataProcessor {
  private readonly log: Logger<ILogObj> = new Logger();

  /**
   * Store raw job data to Vercel Blob. Dispatches to type-specific store logic.
   * @returns Blob URL where the raw data was stored
   */
  async store<T>(type: JobSource, data: T): Promise<string> {
    switch (type) {
      case "ashby":
        return await this.storeAshbyRaw(data as AshbyJob);
      case "linkedin":
        return await this.storeLinkedInRaw(data);
      case "website":
        return await this.storeWebsiteRaw(data);
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
   * Upsert ashby jobs into the database via Prisma.
   * 1) Grab existing job postings from de-deduping
   * 2) Prepare all ingested job data before touching the DB
   * 3) In one transaction, for any job posting that did not exist, create a new job posting
   * 4) In one transaction, for any job posting that exists, update the job posting
   * 5) In one transaction, for any job posting that does not exist, mark it as deleted (soft delete, we still want to keep the history of the job posting)
   * 6) Return the counts of new, updated, and removed jobs
   */
  async upsertAshbyJobs(
    companyId: string,
    jobBoardName: string,
    jobs: AshbyJob[]
  ): Promise<{ jobsNew: number; jobsUpdated: number; jobsRemoved: number }> {
    const now = new Date();

    if (jobs.length === 0) {
      return { jobsNew: 0, jobsUpdated: 0, jobsRemoved: 0 };
    }

    // --- Step 1: Grab existing job postings for de-duping ---
    const incomingExternalIds = jobs.map((job) => job.id);
    const existingJobPostings = await prisma.jobPosting.findMany({
      where: {
        companyId,
        source: "ashby",
        externalId: { in: incomingExternalIds },
      },
      select: { id: true, externalId: true, descriptionHash: true },
    });
    this.log.debug(
      `Found ${existingJobPostings.length} existing jobs for company ${companyId}`
    );
    const existingByExternalId = new Map(
      existingJobPostings.map((job) => [job.externalId, job])
    );
    const deletedByExternalId = existingJobPostings.filter(
      (job) => job.externalId && !incomingExternalIds.includes(job.externalId)
    );

    // --- Step 2: Prepare all ingested job data before touching the DB ---
    const seenExternalIds = new Set<string>();
    const createOps: JobPostingCreateManyInput[] = [];
    const updateOps: JobPosting[] = [];

    for (const job of jobs) {
      seenExternalIds.add(job.id);

      const { remoteType, seniorityLevel } = normalizeJob(job);
      const description = job.descriptionPlain ?? job.descriptionHtml;
      const descriptionHash = hashContent(description);
      const sourceUrl =
        job.jobUrl ?? `https://jobs.ashbyhq.com/${jobBoardName}/${job.id}`;

      const jobData: JobPosting = {
        id: crypto.randomUUID(),
        title: job.title?.trim() ?? "",
        description: description ?? null,
        descriptionHtml: job.descriptionHtml ?? null,
        location: job.location?.trim(),
        remoteType,
        isRemote: job.isRemote ?? null,
        employmentType: job.employmentType?.toLowerCase() ?? null,
        seniorityLevel,
        department: job.department ?? job.team ?? null,
        team: job.team ?? null,
        descriptionHash,
        publishedAt: job.publishedAt ? new Date(job.publishedAt) : null,
        jobUrl: job.jobUrl ?? null,
        applyUrl: job.applyUrl ?? null,
        compensation: (job.compensation as unknown) ?? null,
        secondaryLocations: (job.secondaryLocations as unknown) ?? null,
        lastSeenAt: now,
        source: "ashby",
        sourceUrl,
        companyId,
        externalId: job.id,
        firstSeenAt: now,
        createdAt: now,
        updatedAt: now,
        removedAt: null,
        metadata: null,
      };

      if (existingByExternalId.get(job.id)) {
        updateOps.push(jobData);
      } else {
        createOps.push(jobData as JobPostingCreateManyInput);
      }
    }

    // --- Step 4: Execute creates in one transaction ---
    if (createOps.length > 0) {
      this.log.debug(`Creating ${createOps.length} new jobs`);

      await prisma.$transaction(async (tx) => {
        await tx.jobPosting.createMany({ data: createOps });
      });
    }

    // --- Step 5: Execute updates in one transaction ---
    if (updateOps.length > 0) {
      this.log.debug(`Updated ${updateOps.length} existing jobs`);
    }

    // --- Step 6: Execute deletes in one transaction ---
    if (deletedByExternalId.length > 0) {
      this.log.debug(
        `Deleting ${deletedByExternalId.length} jobs no longer on board`
      );

      await prisma.$transaction(async (tx) => {
        await tx.jobPosting.deleteMany({
          where: { id: { in: deletedByExternalId.map((job) => job.id) } },
        });
      });
    }

    return {
      jobsNew: createOps.length,
      jobsUpdated: updateOps.length,
      jobsRemoved: deletedByExternalId.length,
    };
  }

  /**
   * Store raw news data to Vercel Blob.
   * @returns Blob URL where the raw data was stored
   */
  async storeNewsRaw(articles: RawNewsData[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathname = `tavily/batch-${timestamp}.json`;
    return await uploadJson(pathname, articles);
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
    const pathname = `ashby/${timestamp}/${slug}.json`;
    return await uploadJson(pathname, job);
  }

  // biome-ignore lint/suspicious/useAwait: Unimplemented
  private async storeLinkedInRaw(_data: unknown): Promise<string> {
    throw new Error("Not implemented");
  }

  // biome-ignore lint/suspicious/useAwait: Unimplemented
  private async storeWebsiteRaw(_data: unknown): Promise<string> {
    throw new Error("Not implemented");
  }
}
