/**
 * Analytics engine — TDD §2.2.3, §6
 * Metrics calculation, health score, growth indicator.
 */

import type { CompanyHealthMetrics } from "../types";

/** Compute health metrics for a company on a given date (placeholder). */
export function computeHealthMetrics(
  _companyId: string,
  _metricDate: string,
  _activeJobCount: number,
  _deltas?: {
    added7d?: number;
    removed7d?: number;
    added30d?: number;
    removed30d?: number;
  }
): Omit<CompanyHealthMetrics, "id" | "createdAt"> {
  return {
    companyId: _companyId,
    metricDate: _metricDate,
    totalActiveJobs: _activeJobCount,
    jobsAdded7d: _deltas?.added7d,
    jobsRemoved7d: _deltas?.removed7d,
    jobsAdded30d: _deltas?.added30d,
    jobsRemoved30d: _deltas?.removed30d,
    healthScore: undefined,
    growthIndicator: undefined,
  };
}
