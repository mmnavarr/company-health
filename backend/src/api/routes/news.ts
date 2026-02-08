/**
 * News API routes - Company news articles
 */

import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";

/** Response models for news */
const NewsArticleItem = t.Object({
  id: t.String(),
  title: t.String(),
  snippet: t.Nullable(t.String()),
  content: t.Nullable(t.String()),
  externalUrl: t.String(),
  source: t.String(),
  publishedAt: t.Nullable(t.Date()),
  sentiment: t.Nullable(t.String()),
  rawScore: t.Nullable(t.Number()),
  firstSeenAt: t.Date(),
});

export const newsRoutes = new Elysia({ prefix: "/api/news" })
  .model({
    "news.list": t.Array(NewsArticleItem),
    "error.notFound": t.Object({ error: t.String() }),
  })

  // GET /api/news/:slug - Get news articles for a company
  .get(
    "/:slug",
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

      const articles = await prisma.newsArticle.findMany({
        where: { companyId: company.id },
        select: {
          id: true,
          title: true,
          snippet: true,
          content: true,
          externalUrl: true,
          source: true,
          publishedAt: true,
          sentiment: true,
          rawScore: true,
          firstSeenAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take,
        skip,
      });

      return articles.map((a) => ({
        ...a,
        rawScore: a.rawScore ? Number(a.rawScore) : null,
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
        200: "news.list",
        404: "error.notFound",
      },
      detail: {
        summary: "Get news articles for a company",
        description: "Returns news articles scraped for the specified company",
        tags: ["News"],
      },
    }
  )

  // GET /api/news - Get all news articles (with optional company filter)
  .get(
    "/",
    async ({ query }) => {
      const { companyId, limit = "20", offset = "0" } = query;
      const take = Math.min(Number.parseInt(limit, 10), 100);
      const skip = Number.parseInt(offset, 10);

      const articles = await prisma.newsArticle.findMany({
        where: companyId ? { companyId } : undefined,
        select: {
          id: true,
          title: true,
          snippet: true,
          content: true,
          externalUrl: true,
          source: true,
          publishedAt: true,
          sentiment: true,
          rawScore: true,
          firstSeenAt: true,
        },
        orderBy: { publishedAt: "desc" },
        take,
        skip,
      });

      return articles.map((a) => ({
        ...a,
        rawScore: a.rawScore ? Number(a.rawScore) : null,
      }));
    },
    {
      query: t.Object({
        companyId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      response: "news.list",
      detail: {
        summary: "Get all news articles",
        description: "Returns news articles with optional company filter",
        tags: ["News"],
      },
    }
  );
