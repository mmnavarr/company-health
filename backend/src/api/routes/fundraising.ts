/**
 * Fundraising API routes - Company funding rounds and fundraising summary
 */

import { Elysia, t } from "elysia";
import { FundraisingELTJob } from "../../jobs/fundraising-elt";
import { prisma } from "../../lib/prisma";

/** Response models for fundraising */
const FundingRoundItem = t.Object({
  id: t.String(),
  roundType: t.String(),
  amount: t.Nullable(t.Number()),
  amountCcy: t.Nullable(t.String()),
  announcedDate: t.Nullable(t.Date()),
  investors: t.Array(t.String()),
  leadInvestors: t.Array(t.String()),
  valuation: t.Nullable(t.Number()),
  valuationCcy: t.Nullable(t.String()),
  sourceUrl: t.String(),
  sourceTitle: t.String(),
  confidenceScore: t.Nullable(t.Number()),
  firstSeenAt: t.Date(),
});

const FundraisingSummaryItem = t.Object({
  id: t.String(),
  totalRaised: t.Nullable(t.Number()),
  totalRaisedCcy: t.Nullable(t.String()),
  latestValuation: t.Nullable(t.Number()),
  valuationCcy: t.Nullable(t.String()),
  roundCount: t.Number(),
  investorCount: t.Number(),
  lastFundingDate: t.Nullable(t.Date()),
  lastScrapedAt: t.Nullable(t.Date()),
});

const FundraisingDetail = t.Object({
  summary: t.Nullable(FundraisingSummaryItem),
  rounds: t.Array(FundingRoundItem),
});

export const fundraisingRoutes = new Elysia({ prefix: "/api/fundraising" })
  .model({
    "fundraising.detail": FundraisingDetail,
    "fundraising.rounds": t.Array(FundingRoundItem),
    "fundraising.summary": t.Nullable(FundraisingSummaryItem),
    "error.notFound": t.Object({ error: t.String() }),
  })

  // GET /api/fundraising/:slug - Get fundraising data for a company
  .get(
    "/:slug",
    async ({ params: { slug }, status }) => {
      const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      // Get summary
      const summary = await prisma.fundraisingSummary.findUnique({
        where: { companyId: company.id },
        select: {
          id: true,
          totalRaised: true,
          totalRaisedCcy: true,
          latestValuation: true,
          valuationCcy: true,
          roundCount: true,
          investorCount: true,
          lastFundingDate: true,
          lastScrapedAt: true,
        },
      });

      // Get funding rounds
      const rounds = await prisma.fundingRound.findMany({
        where: { companyId: company.id },
        select: {
          id: true,
          roundType: true,
          amount: true,
          amountCcy: true,
          announcedDate: true,
          investors: true,
          leadInvestors: true,
          valuation: true,
          valuationCcy: true,
          sourceUrl: true,
          sourceTitle: true,
          confidenceScore: true,
          firstSeenAt: true,
        },
        orderBy: { announcedDate: "desc" },
      });

      return {
        summary: summary
          ? {
              ...summary,
              totalRaised: summary.totalRaised
                ? Number(summary.totalRaised)
                : null,
              latestValuation: summary.latestValuation
                ? Number(summary.latestValuation)
                : null,
            }
          : null,
        rounds: rounds.map((r) => ({
          ...r,
          amount: r.amount ? Number(r.amount) : null,
          valuation: r.valuation ? Number(r.valuation) : null,
          confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : null,
        })),
      };
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      response: {
        200: "fundraising.detail",
        404: "error.notFound",
      },
      detail: {
        summary: "Get fundraising data for a company",
        description:
          "Returns fundraising summary and funding rounds for the specified company",
        tags: ["Fundraising"],
      },
    }
  )

  // GET /api/fundraising/:slug/rounds - Get funding rounds for a company
  .get(
    "/:slug/rounds",
    async ({ params: { slug }, query, status }) => {
      const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      const { limit = "20", offset = "0" } = query;
      const take = Math.min(Number.parseInt(limit, 10), 100);
      const skip = Number.parseInt(offset, 10);

      const rounds = await prisma.fundingRound.findMany({
        where: { companyId: company.id },
        select: {
          id: true,
          roundType: true,
          amount: true,
          amountCcy: true,
          announcedDate: true,
          investors: true,
          leadInvestors: true,
          valuation: true,
          valuationCcy: true,
          sourceUrl: true,
          sourceTitle: true,
          confidenceScore: true,
          firstSeenAt: true,
        },
        orderBy: { announcedDate: "desc" },
        take,
        skip,
      });

      return rounds.map((r) => ({
        ...r,
        amount: r.amount ? Number(r.amount) : null,
        valuation: r.valuation ? Number(r.valuation) : null,
        confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : null,
      }));
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      response: {
        200: "fundraising.rounds",
        404: "error.notFound",
      },
      detail: {
        summary: "Get funding rounds for a company",
        description: "Returns funding rounds for the specified company",
        tags: ["Fundraising"],
      },
    }
  )

  // GET /api/fundraising/:slug/summary - Get fundraising summary for a company
  .get(
    "/:slug/summary",
    async ({ params: { slug }, status }) => {
      const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      const summary = await prisma.fundraisingSummary.findUnique({
        where: { companyId: company.id },
        select: {
          id: true,
          totalRaised: true,
          totalRaisedCcy: true,
          latestValuation: true,
          valuationCcy: true,
          roundCount: true,
          investorCount: true,
          lastFundingDate: true,
          lastScrapedAt: true,
        },
      });

      if (!summary) {
        return null;
      }

      return {
        ...summary,
        totalRaised: summary.totalRaised ? Number(summary.totalRaised) : null,
        latestValuation: summary.latestValuation
          ? Number(summary.latestValuation)
          : null,
      };
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      response: {
        200: "fundraising.summary",
        404: "error.notFound",
      },
      detail: {
        summary: "Get fundraising summary for a company",
        description: "Returns fundraising summary for the specified company",
        tags: ["Fundraising"],
      },
    }
  )

  // POST /api/fundraising/:slug/scrape - Trigger fundraising scraper
  .post(
    "/:slug/scrape",
    async ({ params: { slug }, status }) => {
      const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true, name: true },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      try {
        const job = new FundraisingELTJob();
        const result = await job.run({ companySlug: slug });

        return {
          success: true,
          message: `Scraped fundraising data for ${company.name}`,
          sourcesFound: result.sourcesFound,
          roundsExtracted: result.roundsExtracted,
          roundsNew: result.roundsNew,
          roundsUpdated: result.roundsUpdated,
        };
      } catch (error) {
        console.error("Fundraising scraper failed:", error);
        return status(500, {
          error: "Scraper failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          sourcesFound: t.Number(),
          roundsExtracted: t.Number(),
          roundsNew: t.Number(),
          roundsUpdated: t.Number(),
        }),
        404: "error.notFound",
        500: t.Object({ error: t.String(), message: t.String() }),
      },
      detail: {
        summary: "Trigger fundraising scraper",
        description:
          "Runs the Tavily+OpenAI scraper to fetch and extract funding data",
        tags: ["Fundraising"],
      },
    }
  );
