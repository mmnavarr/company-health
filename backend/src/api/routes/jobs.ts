/**
 * Jobs API routes
 */

import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";

/** Response model for jobs with company info */
const JobWithCompany = t.Object({
  id: t.String(),
  companyId: t.String(),
  externalId: t.Nullable(t.String()),
  source: t.String(),
  sourceUrl: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
  descriptionHtml: t.Nullable(t.String()),
  location: t.Nullable(t.String()),
  remoteType: t.Nullable(t.String()),
  isRemote: t.Nullable(t.Boolean()),
  employmentType: t.Nullable(t.String()),
  seniorityLevel: t.Nullable(t.String()),
  department: t.Nullable(t.String()),
  team: t.Nullable(t.String()),
  jobUrl: t.Nullable(t.String()),
  applyUrl: t.Nullable(t.String()),
  publishedAt: t.Nullable(t.Date()),
  firstSeenAt: t.Date(),
  lastSeenAt: t.Date(),
  removedAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  company: t.Object({
    name: t.String(),
    slug: t.String(),
  }),
});

export const jobsRoutes = new Elysia({ prefix: "/api/jobs" })
  .model({
    "job.list": t.Array(JobWithCompany),
  })

  // GET /api/jobs - List all jobs with optional filters
  .get(
    "/",
    async ({ query }) => {
      const { companyId, department, limit = "100" } = query;
      const take = Math.min(Number.parseInt(limit, 10), 500);

      const jobs = await prisma.jobPosting.findMany({
        where: {
          removedAt: null,
          ...(companyId && { companyId }),
          ...(department && { department }),
        },
        include: {
          company: {
            select: { name: true, slug: true },
          },
        },
        take,
        orderBy: { firstSeenAt: "desc" },
      });

      return jobs;
    },
    {
      query: t.Object({
        companyId: t.Optional(t.String()),
        department: t.Optional(t.String()),
        limit: t.Optional(t.String({ default: "100" })),
      }),
      response: "job.list",
      detail: {
        summary: "List all jobs",
        description:
          "Returns jobs across all companies with optional filtering",
        tags: ["Jobs"],
      },
    }
  );
