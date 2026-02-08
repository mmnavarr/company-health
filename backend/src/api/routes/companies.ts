/**
 * Companies API routes
 */

import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";

/** Response models for companies */
const CompanyListItem = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  industry: t.Nullable(t.String()),
  companySize: t.Nullable(t.String()),
  headquartersLocation: t.Nullable(t.String()),
  ashbyBoardName: t.Nullable(t.String()),
  activeJobsCount: t.Number(),
});

const CompanyDetail = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  industry: t.Nullable(t.String()),
  companySize: t.Nullable(t.String()),
  headquartersLocation: t.Nullable(t.String()),
  linkedinUrl: t.Nullable(t.String()),
  ashbyBoardName: t.Nullable(t.String()),
  careersPageUrl: t.Nullable(t.String()),
  activeJobsCount: t.Number(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const JobItem = t.Object({
  id: t.String(),
  title: t.String(),
  department: t.Nullable(t.String()),
  team: t.Nullable(t.String()),
  location: t.Nullable(t.String()),
  remoteType: t.Nullable(t.String()),
  employmentType: t.Nullable(t.String()),
  seniorityLevel: t.Nullable(t.String()),
  sourceUrl: t.String(),
  jobUrl: t.Nullable(t.String()),
  applyUrl: t.Nullable(t.String()),
  publishedAt: t.Nullable(t.Date()),
  firstSeenAt: t.Date(),
  lastSeenAt: t.Date(),
  source: t.String(),
});

export const companiesRoutes = new Elysia({ prefix: "/api/companies" })
  .model({
    "company.list": t.Array(CompanyListItem),
    "company.detail": CompanyDetail,
    "company.jobs": t.Array(JobItem),
    "error.notFound": t.Object({ error: t.String() }),
  })

  // GET /api/companies - List all companies
  .get(
    "/",
    async () => {
      const companies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          companySize: true,
          headquartersLocation: true,
          ashbyBoardName: true,
          _count: {
            select: {
              jobPostings: {
                where: { removedAt: null },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return companies.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        companySize: c.companySize,
        headquartersLocation: c.headquartersLocation,
        ashbyBoardName: c.ashbyBoardName,
        activeJobsCount: c._count.jobPostings,
      }));
    },
    {
      response: "company.list",
      detail: {
        summary: "List all companies",
        tags: ["Companies"],
      },
    }
  )

  // GET /api/companies/:slug - Get company details
  .get(
    "/:slug",
    async ({ params: { slug }, status }) => {
      const company = await prisma.company.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              jobPostings: {
                where: { removedAt: null },
              },
            },
          },
        },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        industry: company.industry,
        companySize: company.companySize,
        headquartersLocation: company.headquartersLocation,
        linkedinUrl: company.linkedinUrl,
        ashbyBoardName: company.ashbyBoardName,
        careersPageUrl: company.careersPageUrl,
        activeJobsCount: company._count.jobPostings,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      };
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      response: {
        200: "company.detail",
        404: "error.notFound",
      },
      detail: {
        summary: "Get company by slug",
        tags: ["Companies"],
      },
    }
  )

  // GET /api/companies/:slug/jobs - Get jobs for a company
  .get(
    "/:slug/jobs",
    async ({ params: { slug }, query, status }) => {
      const company = await prisma.company.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      const { department, seniority, remote, search } = query;

      const jobs = await prisma.jobPosting.findMany({
        where: {
          companyId: company.id,
          removedAt: null,
          ...(department && { department }),
          ...(seniority && { seniorityLevel: seniority }),
          ...(remote && { remoteType: remote }),
          ...(search && {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { department: { contains: search, mode: "insensitive" as const } },
              { location: { contains: search, mode: "insensitive" as const } },
            ],
          }),
        },
        select: {
          id: true,
          title: true,
          department: true,
          team: true,
          location: true,
          remoteType: true,
          employmentType: true,
          seniorityLevel: true,
          sourceUrl: true,
          jobUrl: true,
          applyUrl: true,
          publishedAt: true,
          firstSeenAt: true,
          lastSeenAt: true,
          source: true,
        },
        orderBy: [{ department: "asc" }, { title: "asc" }],
      });

      return jobs;
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        department: t.Optional(t.String()),
        seniority: t.Optional(t.String()),
        remote: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      response: {
        200: "company.jobs",
        404: "error.notFound",
      },
      detail: {
        summary: "Get jobs for a company",
        tags: ["Companies", "Jobs"],
      },
    }
  );
