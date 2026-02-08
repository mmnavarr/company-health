/**
 * Analytics Service — TDD §2.2.3, §6
 * Metrics calculation, health score, growth indicator.
 */

import type { PrismaClient } from "../../../generated/prisma/client";
import type { CompanyHealthMetrics } from "../../types";

export class HealthMetricsService {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async calculateHealthMetrics(
    companyId: string,
    metricDate: string
  ): Promise<CompanyHealthMetrics> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }
    const [counts] = await this.prisma.$queryRaw<
      Array<{
        total_active: bigint;
        added_7d: bigint;
        removed_7d: bigint;
        added_30d: bigint;
        removed_30d: bigint;
      }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE removed_at IS NULL) AS total_active,
        COUNT(*) FILTER (WHERE removed_at IS NULL AND first_seen_at >= ${new Date(metricDate)}::timestamp - INTERVAL '7 days') AS added_7d,
        COUNT(*) FILTER (WHERE removed_at IS NOT NULL AND removed_at >= ${new Date(metricDate)}::timestamp - INTERVAL '7 days') AS removed_7d,
        COUNT(*) FILTER (WHERE removed_at IS NULL AND first_seen_at >= ${new Date(metricDate)}::timestamp - INTERVAL '30 days') AS added_30d,
        COUNT(*) FILTER (WHERE removed_at IS NOT NULL AND removed_at >= ${new Date(metricDate)}::timestamp - INTERVAL '30 days') AS removed_30d
      FROM job_postings
      WHERE company_id = ${companyId}::uuid
    `;
    const totalActiveJobs = Number(counts.total_active);
    const jobsAdded7d = Number(counts.added_7d);
    const jobsRemoved7d = Number(counts.removed_7d);
    const jobsAdded30d = Number(counts.added_30d);
    const jobsRemoved30d = Number(counts.removed_30d);
    const jobVelocityScore = (jobsAdded30d - jobsRemoved30d) / totalActiveJobs;
    const departmentDiversityScore = await this.prisma.jobPosting.count({
      where: { companyId, removedAt: null, department: { not: null } },
    });
    const locationDiversityScore = await this.prisma.jobPosting.count({
      where: { companyId, removedAt: null, location: { not: null } },
    });
    const healthScore =
      (jobVelocityScore + departmentDiversityScore + locationDiversityScore) /
      3;
    const growthIndicator =
      jobVelocityScore > 0
        ? "expanding"
        : jobVelocityScore < 0
          ? "contracting"
          : "stable";

    return {
      id: company.id,
      companyId: company.id,
      metricDate,
      totalActiveJobs,
      jobsAdded7d,
      jobsRemoved7d: jobsRemoved7d ? jobsRemoved7d : undefined,
      jobsAdded30d,
      jobsRemoved30d: jobsRemoved30d ? jobsRemoved30d : undefined,
      jobVelocityScore,
      departmentDiversityScore,
      locationDiversityScore,
      // seniorityDistribution: seniorityDistribution,
      // departmentDistribution: departmentDistribution,
      healthScore,
      growthIndicator,
      createdAt: new Date(),
    };
  }
}
