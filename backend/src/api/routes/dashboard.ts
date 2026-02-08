/**
 * Dashboard API routes - Company health dashboard data
 */

import { Elysia, t } from "elysia";
import { prisma } from "../../lib/prisma";

/** Response models for dashboard */
const CompanyInfo = t.Object({
  id: t.String(),
  name: t.String(),
  slug: t.String(),
  industry: t.Nullable(t.String()),
  companySize: t.Nullable(t.String()),
  headquartersLocation: t.Nullable(t.String()),
  ashbyBoardName: t.Nullable(t.String()),
});

const HealthMetrics = t.Object({
  score: t.Number(),
  growthIndicator: t.String(),
  totalActiveJobs: t.Number(),
  jobsAdded7d: t.Number(),
  jobsRemoved7d: t.Number(),
  jobsAdded30d: t.Number(),
  jobsRemoved30d: t.Number(),
  jobVelocityScore: t.Number(),
  departmentDiversityScore: t.Number(),
  locationDiversityScore: t.Number(),
  lastUpdated: t.String(),
});

const DistributionItem = t.Object({
  name: t.String(),
  value: t.Number(),
});

const ScrapingRunItem = t.Object({
  source: t.String(),
  status: t.String(),
  jobsFound: t.Number(),
  jobsNew: t.Number(),
  jobsUpdated: t.Number(),
  jobsRemoved: t.Number(),
  completedAt: t.Nullable(t.String()),
});

const DashboardResponse = t.Object({
  company: CompanyInfo,
  health: HealthMetrics,
  departmentDistribution: t.Array(DistributionItem),
  seniorityDistribution: t.Array(DistributionItem),
  recentRuns: t.Array(ScrapingRunItem),
});

export const dashboardRoutes = new Elysia({ prefix: "/api/dashboard" })
  .model({
    "dashboard.response": DashboardResponse,
    "error.notFound": t.Object({ error: t.String() }),
  })

  // GET /api/dashboard/:slug - Get full dashboard data for a company
  .get(
    "/:slug",
    async ({ params: { slug }, status }) => {
      // Fetch company
      const company = await prisma.company.findUnique({
        where: { slug },
      });

      if (!company) {
        return status(404, { error: "Company not found" });
      }

      // Fetch latest health metrics
      const latestMetrics = await prisma.companyHealthMetric.findFirst({
        where: { companyId: company.id },
        orderBy: { metricDate: "desc" },
      });

      // Count active jobs
      const activeJobsCount = await prisma.jobPosting.count({
        where: {
          companyId: company.id,
          removedAt: null,
        },
      });

      // Calculate job stats if no metrics exist
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Jobs added/removed in last 7 days
      const [jobsAdded7d, jobsRemoved7d] = await Promise.all([
        prisma.jobPosting.count({
          where: {
            companyId: company.id,
            firstSeenAt: { gte: sevenDaysAgo },
          },
        }),
        prisma.jobPosting.count({
          where: {
            companyId: company.id,
            removedAt: { gte: sevenDaysAgo },
          },
        }),
      ]);

      // Jobs added/removed in last 30 days
      const [jobsAdded30d, jobsRemoved30d] = await Promise.all([
        prisma.jobPosting.count({
          where: {
            companyId: company.id,
            firstSeenAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.jobPosting.count({
          where: {
            companyId: company.id,
            removedAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      // Get department distribution from active jobs
      const departmentStats = await prisma.jobPosting.groupBy({
        by: ["department"],
        where: {
          companyId: company.id,
          removedAt: null,
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      const departmentDistribution = departmentStats
        .filter((d): d is typeof d & { department: string } => !!d.department)
        .map((d) => ({
          name: d.department,
          value: d._count.id,
        }));

      // Get seniority distribution from active jobs
      const seniorityStats = await prisma.jobPosting.groupBy({
        by: ["seniorityLevel"],
        where: {
          companyId: company.id,
          removedAt: null,
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      });

      // Map seniority levels to display names
      const seniorityMap: Record<string, string> = {
        intern: "Intern",
        entry: "Entry",
        mid: "Mid",
        senior: "Senior",
        staff: "Staff+",
        executive: "Executive",
      };

      const seniorityDistribution = seniorityStats
        .filter(
          (s): s is typeof s & { seniorityLevel: string } => !!s.seniorityLevel
        )
        .map((s) => ({
          name: seniorityMap[s.seniorityLevel] || s.seniorityLevel,
          value: s._count.id,
        }));

      // Get recent scraping runs
      const recentRuns = await prisma.scrapingRun.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      // Calculate diversity scores if not in metrics
      const uniqueDepartments = departmentDistribution.length;
      const uniqueLocations = await prisma.jobPosting.groupBy({
        by: ["location"],
        where: {
          companyId: company.id,
          removedAt: null,
          location: { not: null },
        },
      });

      // Simple diversity score: percentage of possible diversity (max 100)
      const departmentDiversityScore = Math.min(uniqueDepartments * 10, 100);
      const locationDiversityScore = Math.min(uniqueLocations.length * 8, 100);

      // Calculate velocity score (jobs added - removed in 30d, normalized)
      const netJobChange = jobsAdded30d - jobsRemoved30d;
      const jobVelocityScore = Math.max(
        0,
        Math.min(100, 50 + netJobChange * 2)
      );

      // Determine growth indicator
      let growthIndicator = "stable";
      if (netJobChange > 5) {
        growthIndicator = "expanding";
      } else if (netJobChange < -5) {
        growthIndicator = "contracting";
      }

      // Calculate final scores - use stored metrics if available, otherwise calculate
      const finalJobVelocityScore =
        latestMetrics?.jobVelocityScore != null
          ? Number(latestMetrics.jobVelocityScore)
          : jobVelocityScore;

      const finalDepartmentDiversityScore =
        latestMetrics?.departmentDiversityScore != null
          ? Number(latestMetrics.departmentDiversityScore)
          : departmentDiversityScore;

      const finalLocationDiversityScore =
        latestMetrics?.locationDiversityScore != null
          ? Number(latestMetrics.locationDiversityScore)
          : locationDiversityScore;

      // Calculate health score
      const healthScore =
        latestMetrics?.healthScore != null
          ? Number(latestMetrics.healthScore)
          : Math.round(
              (finalJobVelocityScore * 0.4 +
                finalDepartmentDiversityScore * 0.3 +
                finalLocationDiversityScore * 0.3) *
                10
            ) / 10;

      return {
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          industry: company.industry,
          companySize: company.companySize,
          headquartersLocation: company.headquartersLocation,
          ashbyBoardName: company.ashbyBoardName,
        },
        health: {
          score: healthScore,
          growthIndicator: latestMetrics?.growthIndicator || growthIndicator,
          totalActiveJobs: activeJobsCount,
          jobsAdded7d: latestMetrics?.jobsAdded7d ?? jobsAdded7d,
          jobsRemoved7d: latestMetrics?.jobsRemoved7d ?? jobsRemoved7d,
          jobsAdded30d: latestMetrics?.jobsAdded30d ?? jobsAdded30d,
          jobsRemoved30d: latestMetrics?.jobsRemoved30d ?? jobsRemoved30d,
          jobVelocityScore: finalJobVelocityScore,
          departmentDiversityScore: finalDepartmentDiversityScore,
          locationDiversityScore: finalLocationDiversityScore,
          lastUpdated: latestMetrics?.metricDate
            ? latestMetrics.metricDate.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        },
        departmentDistribution,
        seniorityDistribution,
        recentRuns: recentRuns.map((run) => ({
          source: run.source,
          status: run.status,
          jobsFound: run.jobsFound ?? 0,
          jobsNew: run.jobsNew ?? 0,
          jobsUpdated: run.jobsUpdated ?? 0,
          jobsRemoved: run.jobsRemoved ?? 0,
          completedAt: run.completedAt
            ? run.completedAt.toISOString().replace("T", " ").slice(0, 16)
            : null,
        })),
      };
    },
    {
      params: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
      response: {
        200: "dashboard.response",
        404: "error.notFound",
      },
      detail: {
        summary: "Get company dashboard data",
        description:
          "Returns all data needed for the company health dashboard including metrics, distributions, and recent scraping runs",
        tags: ["Dashboard"],
      },
    }
  );
