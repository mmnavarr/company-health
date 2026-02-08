import { tavily } from "@tavily/core";
import type { ScrapingService } from ".";

export interface TavilyFundingResult {
  title: string;
  url: string;
  content: string;
  rawContent?: string;
  publishedDate?: string;
  score: number;
}

export interface TavilyFundingResponse {
  results: TavilyFundingResult[];
  query: string;
}

export class TavilyFundingScrapingService implements ScrapingService {
  private readonly client: ReturnType<typeof tavily>;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Tavily API key is required");
    }
    this.client = tavily({ apiKey });
  }

  async scrape<TavilyFundingResponse>(
    companyName: string,
    description?: string
  ): Promise<TavilyFundingResponse> {
    // Search for funding-related news about the company
    const context = description ? ` (${description})` : "";
    const query = `"${companyName}"${context} funding round raised or investment`;

    const response = await this.client.search(query, {
      searchDepth: "advanced",
      topic: "news",
      includeRawContent: "markdown",
      maxResults: 20, // Get more results to find funding announcements
    });

    const results: TavilyFundingResult[] = (response.results ?? [])
      .filter((r) => {
        // Filter results that mention funding-related keywords
        const content = `${r.content} ${r.rawContent ?? ""}`.toLowerCase();
        const fundingKeywords = [
          "funding",
          "raised",
          "investment",
          "series",
          "round",
          "million",
          "billion",
          "valuation",
          "investor",
          "venture",
          "vc",
          "capital",
        ];
        return fundingKeywords.some((keyword) => content.includes(keyword));
      })
      .map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        rawContent: r.rawContent ?? undefined,
        publishedDate: r.publishedDate ?? undefined,
        score: r.score,
      }));

    return { results, query } as TavilyFundingResponse;
  }
}
