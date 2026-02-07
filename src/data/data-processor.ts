/**
 * DataProcessor — Handles raw data storage with type-specific store operations.
 * Layer 2 of the ELT pipeline: parse/extract, store raw to storage.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AshbyJobsResponse } from "../scraping/ashby-scraper";
import type { JobSource } from "../types";

const DATA_DIR = join(process.cwd(), "data");
const RAW_DIR = join(DATA_DIR, "raw");

export type RawDataType = JobSource;

export interface StoreContext {
  /** Source identifier (e.g. job board name, company id) */
  identifier: string;
}

export class DataProcessor {
  private baseDir: string;

  constructor(baseDir: string = DATA_DIR) {
    this.baseDir = baseDir;
  }

  /**
   * Store raw job data. Dispatches to type-specific store logic.
   * @returns Path where the raw data was stored
   */
  async store<T>(type: RawDataType, data: T): Promise<string> {
    switch (type) {
      case "ashby":
        return this.storeAshbyRaw(data as AshbyJobsResponse);
      case "linkedin":
        return this.storeLinkedInRaw(data);
      case "website":
        return this.storeWebsiteRaw(data);
      default: {
        throw new Error(`Unknown raw data type: ${data}`);
      }
    }
  }

  /** Store multiple raw jobs. Returns paths in same order as input. */
  async storeBatch<T>(
    type: RawDataType,
    items: T[]
  ): Promise<string[]> {
    const paths: string[] = [];
    for (const item of items) {
      const path = await this.store(type, item);
      paths.push(path);
    }
    return paths;
  }

  private getRawDir(type: RawDataType): string {
    return join(this.baseDir, "raw", type);
  }

  private async storeAshbyRaw(res: AshbyJobsResponse): Promise<string> {
    const dir = join(this.getRawDir("ashby"), res.apiVersion ?? "unknown");
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${res.apiVersion}.json`);
    await writeFile(path, JSON.stringify(res, null, 2), "utf-8");
    return path;
  }

  private async storeLinkedInRaw(data: unknown): Promise<string> {
   throw new Error("Not implemented");
  }

  private async storeWebsiteRaw(data: unknown): Promise<string> {
    throw new Error("Not implemented");
  }
}
