/**
 * Tavily news scraper — fetches news articles about companies via Tavily Search API.
 */

import { tavily } from "@tavily/core";
import type { ScrapingService } from ".";

export interface TavilyNewsResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  publishedDate?: string;
  score: number;
}

export interface TavilyNewsResponse {
  results: TavilyNewsResult[];
  query: string;
}

export class TavilyNewsScrapingService implements ScrapingService {
  private readonly client: ReturnType<typeof tavily>;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Tavily API key is required");
    }
    this.client = tavily({ apiKey });
  }

  /**
   * Scrape news articles for a company.
   * @param companyName - The company name to search for
   * @returns Array of news results
   */
  async scrape<TavilyNewsResponse>(
    companyName: string
  ): Promise<TavilyNewsResponse> {
    const query = `"${companyName}" company news`;

    const response = await this.client.search(query, {
      searchDepth: "advanced",
      topic: "news",
      includeRawContent: "markdown",
    });

    const results: TavilyNewsResult[] = (response.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      rawContent: r.rawContent ?? undefined,
      publishedDate: r.publishedDate ?? undefined,
      score: r.score,
    }));

    return { results, query } as TavilyNewsResponse;
  }
}
