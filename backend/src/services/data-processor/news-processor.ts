/**
 * NewsProcessor — Handles raw news storage and DB upserts.
 * Layer 2 of the ELT pipeline: store raw to blob, write to DB.
 */

import { prisma } from "../../lib/prisma";
import type { BlobStorage } from "../../lib/storage";
import type { RawNewsData } from "../../types";
import { hashContent } from "../../utils";

export class NewsProcessingService {
  private readonly storage: BlobStorage;

  constructor(storage: BlobStorage) {
    this.storage = storage;
  }

  /**
   * Store raw news data to Blob storage.
   * @param articles - The raw news data to store
   * @param timestamp - The timestamp to use for the pathname
   * @returns The blob URL where the raw data was stored
   */
  async storeBlob(articles: RawNewsData[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathname = `tavily/${timestamp}/articles.json`;
    return await this.storage.uploadJson(pathname, articles);
  }

  /**
   * Upsert news articles into the database via Prisma.
   * Uses contentHash for change detection, deduplicates by (companyId, externalUrl).
   */
  async syncNewsArticles(
    companyId: string,
    articles: RawNewsData[]
  ): Promise<{ articlesNew: number; articlesUpdated: number }> {
    const now = new Date();
    let articlesNew = 0;
    let articlesUpdated = 0;

    for (const article of articles) {
      const contentHash = hashContent(article.content);

      // Check if article exists
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
}
