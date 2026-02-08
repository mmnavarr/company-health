/**
 * Tavily news scraper — fetches news articles about companies via Tavily Search API.
 */

import { tavily } from "@tavily/core";
import type { Scraper } from ".";

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

export class TavilyNewsScraper implements Scraper {
  private client: ReturnType<typeof tavily>;

  constructor(apiKey?: string) {
    this.client = tavily({
      apiKey: apiKey ?? process.env.TAVILY_API_KEY,
    });
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
