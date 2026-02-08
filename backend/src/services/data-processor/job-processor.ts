/**
 * JobProcessor — Handles raw job storage and DB upserts.
 * Layer 2 of the ELT pipeline: store raw to blob, write to DB.
 */

import type { JobPosting } from "backend/generated/prisma/client";
import type { JobPostingCreateManyInput } from "backend/generated/prisma/models/JobPosting";
import { type ILogObj, Logger } from "tslog";
import { hashContent, slugify } from "@/utils";
import { prisma } from "../../lib/prisma";
import type { BlobStorage } from "../../lib/storage";
import type { JobSource } from "../../types";
import type { AshbyJob } from "../scraping/ashby-scraper";
import { normalizeJob } from "./utils";

export class JobProcessingService {
  private readonly log: Logger<ILogObj>;
  private readonly storage: BlobStorage;

  constructor(storage: BlobStorage) {
    this.log = new Logger();
    this.storage = storage;
  }

  /**
   * Store raw job data to Blob storage. Dispatches to type-specific store logic.
   * @param type - The type of raw data to store
   * @param data - The raw data to store
   * @returns The blob URL where the raw data was stored
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

  /** Store multiple raw jobs to Blob storage. Returns blob URLs in same order as input. */
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
   * 1) Grab existing job postings for de-deduping
   * 2) Prepare all ingested job data before touching the DB
   * 3) Create new job postings
   * 4) Update existing job postings
   * 5) Delete job postings no longer on board
   * 6) Return the counts of new, updated, and removed jobs
   */
  async syncAshbyJobs(
    companyId: string,
    jobBoardName: string,
    jobs: AshbyJob[]
  ): Promise<{ jobsNew: number; jobsUpdated: number; jobsRemoved: number }> {
    const now = new Date();

    if (jobs.length === 0) {
      return { jobsNew: 0, jobsUpdated: 0, jobsRemoved: 0 };
    }

    // --- Step 1: Grab existing job postings for de-deduping ---
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
    const createOps: JobPostingCreateManyInput[] = [];
    const updateOps: JobPosting[] = [];

    for (const job of jobs) {
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
        compensation: job.compensation ? JSON.parse(JSON.stringify(job.compensation)) : null,
        secondaryLocations: job.secondaryLocations ? JSON.parse(JSON.stringify(job.secondaryLocations)) : null,
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

      const existing = existingByExternalId.get(job.id);
      if (existing) {
        updateOps.push({ ...jobData, id: existing.id });
      } else {
        createOps.push(jobData as JobPostingCreateManyInput);
      }
    }

    // --- Step 3: Execute creates ---
    if (createOps.length > 0) {
      this.log.debug(`Creating ${createOps.length} new jobs`);
      await prisma.jobPosting.createMany({ data: createOps });
    }

    // --- Step 4: Execute updates ---
    if (updateOps.length > 0) {
      this.log.debug(`Updating ${updateOps.length} existing jobs`);
      // Having issues wih updateMany, moving on but this is not ideal as an O(n) db operation
      for (const job of updateOps) {
        await prisma.jobPosting.update({
          where: { id: job.id },
          data: {
            title: job.title,
            description: job.description,
            descriptionHtml: job.descriptionHtml,
            location: job.location,
            remoteType: job.remoteType,
            isRemote: job.isRemote,
            employmentType: job.employmentType,
            seniorityLevel: job.seniorityLevel,
            department: job.department,
            team: job.team,
            descriptionHash: job.descriptionHash,
            publishedAt: job.publishedAt,
            jobUrl: job.jobUrl,
            applyUrl: job.applyUrl,
            compensation: job.compensation ? JSON.parse(JSON.stringify(job.compensation)) : undefined,
            secondaryLocations: job.secondaryLocations ? JSON.parse(JSON.stringify(job.secondaryLocations)) : undefined,
            lastSeenAt: job.lastSeenAt,
            removedAt: null,
          },
          select: { id: true },
        });
      }
    }

    // --- Step 5: Execute deletes ---
    if (deletedByExternalId.length > 0) {
      this.log.debug(
        `Deleting ${deletedByExternalId.length} jobs no longer on board`
      );
      await prisma.jobPosting.deleteMany({
        where: {
          id: {
            in: deletedByExternalId.map(
              (j: (typeof existingJobPostings)[number]) => j.id
            ),
          },
        },
      });
    }

    return {
      jobsNew: createOps.length,
      jobsUpdated: updateOps.length,
      jobsRemoved: deletedByExternalId.length,
    };
  }

  private async storeAshbyRaw(job: AshbyJob): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const slug = slugify(job.title);
    const pathname = `ashby/${timestamp}/${slug}.json`;
    return await this.storage.uploadJson(pathname, job);
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
