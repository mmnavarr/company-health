/**
 * Run Ashby ELT job for a job board.
 * Usage: bun run scripts/run-ashby-elt.ts [companySlug]
 * Default company slug: rain
 */

import { AshbyELTJob } from "../src/jobs/ashby-elt";

const companySlug = process.argv[2] ?? "rain";

async function main() {
  try {
    const job = new AshbyELTJob();
    const result = await job.run({ companySlug });
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
