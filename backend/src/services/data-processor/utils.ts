/** Fields derived by normalization, to be written to job_postings */

export type RemoteType = "Remote" | "Hybrid" | "Onsite";
export type SeniorityLevel =
  | "Intern"
  | "Entry"
  | "Mid"
  | "Senior"
  | "Staff"
  | "Executive";

export interface NormalizedJobFields {
  remoteType: RemoteType;
  seniorityLevel: SeniorityLevel;
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

/**
 * Detect the remote type from a job's location and title.
 * @param location - The job location
 * @param title - The job title
 * @returns The remote type
 */
function detectRemoteType(location?: string, title?: string): RemoteType {
  const text = [location, title].filter(Boolean).join(" ").toLowerCase();
  if (REMOTE_RE.test(text)) {
    return "Remote";
  }
  if (HYBRID_RE.test(text)) {
    return "Hybrid";
  }
  return "Onsite";
}

/**
 * Extract seniority level from a job title.
 * @param title - The job title
 * @returns The seniority level
 */
function extractSeniority(title?: string): SeniorityLevel {
  if (!title) {
    return "Mid";
  }
  const t = title.toLowerCase();
  if (INTERN_RE.test(t)) {
    return "Intern";
  }
  if (ENTRY_RE.test(t)) {
    return "Entry";
  }
  if (SENIOR_RE.test(t)) {
    return "Senior";
  }
  if (STAFF_RE.test(t)) {
    return "Staff";
  }
  if (EXEC_RE.test(t)) {
    return "Executive";
  }
  return "Mid";
}
