/**
 * FundraisingProcessor — Handles raw funding data extraction and DB upserts.
 * Layer 2 of the ELT pipeline: extract with LLM, store to DB.
 */

import { prisma } from "../../lib/prisma";
import type { BlobStorage } from "../../lib/storage";
import type { FundingDataExtractionService } from "../llm/funding-extraction";
import type { TavilyFundingResult } from "../scraping/tavily-funding-scraper";

export interface FundingRoundData {
  roundType: string;
  amount?: number;
  amountCcy?: string;
  announcedDate?: Date;
  investors: string[];
  leadInvestors: string[];
  valuation?: number;
  valuationCcy?: string;
  sourceUrl: string;
  sourceTitle: string;
  rawContent: string;
  confidenceScore: number;
  extractedData: Record<string, unknown>;
}

export class FundraisingProcessingService {
  private readonly storage: BlobStorage;
  private readonly llmService: FundingDataExtractionService;

  constructor(storage: BlobStorage, llmService: FundingDataExtractionService) {
    this.storage = storage;
    this.llmService = llmService;
  }

  /**
   * Store raw funding search results to Blob storage.
   */
  async storeBlob(
    companySlug: string,
    results: TavilyFundingResult[]
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const pathname = `tavily-funding/${companySlug}/${timestamp}/results.json`;
    return await this.storage.uploadJson(pathname, results);
  }

  /**
   * Process raw Tavily funding results by extracting structured data with LLM
   * and upserting funding rounds into the database.
   */
  async processFundingResults(
    companyId: string,
    companyName: string,
    results: TavilyFundingResult[]
  ): Promise<{
    roundsNew: number;
    roundsUpdated: number;
    totalExtracted: number;
  }> {
    const now = new Date();
    let roundsNew = 0;
    let roundsUpdated = 0;
    let totalExtracted = 0;

    // Get or create fundraising summary
    let summary = await prisma.fundraisingSummary.findUnique({
      where: { companyId },
    });

    if (!summary) {
      summary = await prisma.fundraisingSummary.create({
        data: {
          companyId,
          roundCount: 0,
          investorCount: 0,
        },
      });
    }

    for (const result of results) {
      // Use LLM to extract structured funding data
      const extracted = await this.llmService.extractFundingData(
        companyName,
        result.rawContent || result.content,
        result.title
      );

      totalExtracted += extracted.rounds.length;

      for (const round of extracted.rounds) {
        // Check if round already exists
        const existing = await prisma.fundingRound.findUnique({
          where: {
            companyId_sourceUrl: {
              companyId,
              sourceUrl: result.url,
            },
          },
        });

        // Serialize extracted data for Prisma JSON field
        const extractedDataJson = JSON.parse(JSON.stringify(round)) as object;

        if (existing) {
          await prisma.fundingRound.update({
            where: { id: existing.id },
            data: {
              roundType: round.roundType,
              amount: round.amount ?? null,
              amountCcy: round.amountCcy ?? null,
              announcedDate: round.announcedDate
                ? new Date(round.announcedDate)
                : null,
              investors: round.investors,
              leadInvestors: round.leadInvestors,
              valuation: round.valuation ?? null,
              valuationCcy: round.valuationCcy ?? null,
              sourceUrl: result.url,
              sourceTitle: result.title,
              rawContent: result.rawContent || result.content,
              extractedData: extractedDataJson as object,
              confidenceScore: round.confidenceScore,
              lastSeenAt: now,
            },
          });
          roundsUpdated++;
        } else {
          await prisma.fundingRound.create({
            data: {
              companyId,
              summaryId: summary.id,
              roundType: round.roundType,
              amount: round.amount ?? null,
              amountCcy: round.amountCcy ?? null,
              announcedDate: round.announcedDate
                ? new Date(round.announcedDate)
                : null,
              investors: round.investors,
              leadInvestors: round.leadInvestors,
              valuation: round.valuation ?? null,
              valuationCcy: round.valuationCcy ?? null,
              sourceUrl: result.url,
              sourceTitle: result.title,
              rawContent: result.rawContent || result.content,
              extractedData: extractedDataJson as object,
              confidenceScore: round.confidenceScore,
              firstSeenAt: now,
              lastSeenAt: now,
            },
          });
          roundsNew++;
        }
      }
    }

    // Update summary stats
    await this.updateSummaryStats(companyId);

    return { roundsNew, roundsUpdated, totalExtracted };
  }

  /**
   * Update fundraising summary statistics based on stored funding rounds.
   */
  private async updateSummaryStats(companyId: string): Promise<void> {
    const rounds = await prisma.fundingRound.findMany({
      where: { companyId },
      orderBy: { announcedDate: "desc" },
    });

    // Calculate totals
    let totalRaised = 0;
    const uniqueInvestors = new Set<string>();

    for (const round of rounds) {
      if (round.amount) {
        totalRaised += Number(round.amount);
      }
      for (const investor of round.investors) {
        uniqueInvestors.add(investor);
      }
    }

    // Get most recent round for valuation
    const latestRound = rounds[0];

    await prisma.fundraisingSummary.update({
      where: { companyId },
      data: {
        totalRaised: totalRaised > 0 ? totalRaised : null,
        totalRaisedCcy: latestRound?.amountCcy || "USD",
        latestValuation: latestRound?.valuation
          ? Number(latestRound.valuation)
          : null,
        valuationCcy: latestRound?.valuationCcy,
        roundCount: rounds.length,
        investorCount: uniqueInvestors.size,
        lastFundingDate: latestRound?.announcedDate,
        lastScrapedAt: new Date(),
      },
    });
  }
}
