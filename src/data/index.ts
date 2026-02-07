/**
 * Data processing layer — TDD §5
 * Normalization, deduplication, change detection.
 */

import type { RawJobData } from "../types";

export { DataProcessor } from "./data-processor";
export type { RawDataType, StoreContext } from "./data-processor";

/** Normalizes job data across sources (TDD §5.1). */
export function normalizeJob(raw: RawJobData): RawJobData & { remoteType?: string; seniorityLevel?: string } {
  return {
    ...raw,
    title: raw.title?.trim() ?? "",
    location: raw.location?.trim(),
    remoteType: detectRemoteType(raw.location, raw.title),
    seniorityLevel: extractSeniority(raw.title),
  };
}

function detectRemoteType(location?: string, title?: string): string | undefined {
  const text = [location, title].filter(Boolean).join(" ").toLowerCase();
  if (/remote|anywhere|work from home/i.test(text)) return "remote";
  if (/hybrid/i.test(text)) return "hybrid";
  return "onsite";
}

function extractSeniority(title?: string): string {
  if (!title) return "mid";
  const t = title.toLowerCase();
  if (/intern|co-op/i.test(t)) return "intern";
  if (/junior|entry|associate|level 1/i.test(t)) return "entry";
  if (/senior|sr\.?|lead|level 4/i.test(t)) return "senior";
  if (/staff|principal|level 5/i.test(t)) return "staff";
  if (/director|vp|head of|chief/i.test(t)) return "executive";
  return "mid";
}
