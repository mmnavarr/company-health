/**
 * Data processing layer — TDD §5
 * Normalization, deduplication, change detection.
 */

export { DataProcessor } from "./data-processor";

/** Fields derived by normalization, to be written to job_postings */
export interface NormalizedJobFields {
  remoteType: string;
  seniorityLevel: string;
}

/**
 * Derive normalized fields from a job's title and location.
 * Works with any source type — no dependency on a raw intermediate schema.
 */
export function normalizeJob(job: {
  title?: string;
  location?: string;
}): NormalizedJobFields {
  return {
    remoteType: detectRemoteType(job.location, job.title),
    seniorityLevel: extractSeniority(job.title),
  };
}

function detectRemoteType(location?: string, title?: string): string {
  const text = [location, title].filter(Boolean).join(" ").toLowerCase();
  if (/remote|anywhere|work from home/i.test(text)) {
    return "remote";
  }
  if (/hybrid/i.test(text)) {
    return "hybrid";
  }
  return "onsite";
}

function extractSeniority(title?: string): string {
  if (!title) {
    return "mid";
  }
  const t = title.toLowerCase();
  if (/intern|co-op/i.test(t)) {
    return "intern";
  }
  if (/junior|entry|associate|level 1/i.test(t)) {
    return "entry";
  }
  if (/senior|sr\.?|lead|level 4/i.test(t)) {
    return "senior";
  }
  if (/staff|principal|level 5/i.test(t)) {
    return "staff";
  }
  if (/director|vp|head of|chief/i.test(t)) {
    return "executive";
  }
  return "mid";
}
