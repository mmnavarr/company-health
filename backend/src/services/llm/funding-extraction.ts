import OpenAI from "openai";

export interface ExtractedFundingRound {
  roundType: string;
  amount?: number;
  amountCcy?: string;
  announcedDate?: string; // ISO 8601 date string
  investors: string[];
  leadInvestors: string[];
  valuation?: number;
  valuationCcy?: string;
  confidenceScore: number; // 0-1
  [key: string]: unknown;
}

export interface ExtractedFundingData {
  rounds: ExtractedFundingRound[];
  totalRaised?: number;
  totalRaisedCcy?: string;
  latestValuation?: number;
  valuationCcy?: string;
}

export class FundingDataExtractionService {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  async extractFundingData(
    companyName: string,
    rawContent: string,
    sourceTitle: string
  ): Promise<ExtractedFundingData> {
    const systemPrompt = `You are a precise financial data extraction assistant. Your task is to extract structured funding information from news articles about startup funding rounds.

Extract the following information:
- Round type (e.g., "Seed", "Series A", "Series B", "Series C", "Series D", "Series E+", "Pre-Seed", "Angel", "IPO", "Acquisition")
- Amount raised (numeric value only)
- Currency code (3-letter ISO code like USD, EUR, GBP)
- Announcement date (ISO 8601 format YYYY-MM-DD)
- Investors (list of investor names)
- Lead investors (subset of investors who led the round)
- Valuation at time of round (numeric value only, if mentioned)
- Valuation currency (3-letter ISO code)

Confidence scoring:
- 0.9-1.0: Explicitly stated facts with clear numbers
- 0.7-0.89: Stated but with minor uncertainties
- 0.5-0.69: Inferred or approximate values
- 0.0-0.49: Very uncertain or missing information

If multiple funding rounds are mentioned, extract all of them. Return data in valid JSON format.`;

    const userPrompt = `Company: ${companyName}
Source Title: ${sourceTitle}

Content:
${rawContent}

Extract all funding round information from this article. Return a JSON object with the following structure:
{
  "rounds": [
    {
      "roundType": "Series A",
      "amount": 10000000,
      "amountCcy": "USD",
      "announcedDate": "2024-01-15",
      "investors": ["Investor 1", "Investor 2"],
      "leadInvestors": ["Lead Investor"],
      "valuation": 50000000,
      "valuationCcy": "USD",
      "confidenceScore": 0.95
    }
  ],
  "totalRaised": 10000000,
  "totalRaisedCcy": "USD",
  "latestValuation": 50000000,
  "valuationCcy": "USD"
}

Only return valid JSON. If no funding information is found, return {"rounds": []}.`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { rounds: [] };
      }

      const parsed = JSON.parse(content) as ExtractedFundingData;

      // Validate and clean the data
      return {
        rounds: (parsed.rounds || []).map((round) => ({
          roundType: round.roundType || "Unknown",
          amount: round.amount,
          amountCcy: round.amountCcy,
          announcedDate: round.announcedDate,
          investors: round.investors || [],
          leadInvestors: round.leadInvestors || [],
          valuation: round.valuation,
          valuationCcy: round.valuationCcy,
          confidenceScore: Math.min(
            1,
            Math.max(0, round.confidenceScore || 0.5)
          ),
        })),
        totalRaised: parsed.totalRaised,
        totalRaisedCcy: parsed.totalRaisedCcy,
        latestValuation: parsed.latestValuation,
        valuationCcy: parsed.valuationCcy,
      };
    } catch (error) {
      console.error("Error extracting funding data with LLM:", error);
      return { rounds: [] };
    }
  }
}
