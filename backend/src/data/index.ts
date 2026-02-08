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

// Pre-compiled regex patterns (top-level scope for performance)
const REMOTE_RE = /remote|anywhere|work from home/i;
const HYBRID_RE = /hybrid/i;
const INTERN_RE = /intern|co-op/i;
const ENTRY_RE = /junior|entry|associate|level 1/i;
const SENIOR_RE = /senior|sr\.?|lead|level 4/i;
const STAFF_RE = /staff|principal|level 5/i;
const EXEC_RE = /director|vp|head of|chief/i;

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
  if (REMOTE_RE.test(text)) {
    return "remote";
  }
  if (HYBRID_RE.test(text)) {
    return "hybrid";
  }
  return "onsite";
}

function extractSeniority(title?: string): string {
  if (!title) {
    return "mid";
  }
  const t = title.toLowerCase();
  if (INTERN_RE.test(t)) {
    return "intern";
  }
  if (ENTRY_RE.test(t)) {
    return "entry";
  }
  if (SENIOR_RE.test(t)) {
    return "senior";
  }
  if (STAFF_RE.test(t)) {
    return "staff";
  }
  if (EXEC_RE.test(t)) {
    return "executive";
  }
  return "mid";
}
