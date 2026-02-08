/**
 * Run Ashby ELT job for a job board.
 * Usage: bun run scripts/run-ashby-elt.ts [companySlug]
 * Default company slug: rain
 */

import { AshbyELTJob } from "../src/jobs/ashby-elt";

const companySlug = process.argv[2] ?? "rain";

async function main() {
  console.log(`Starting Ashby Jobs ELT pipeline for company: ${companySlug}`);
  console.log("=".repeat(50));

  try {
    const job = new AshbyELTJob();
    await job.run({ companySlug });

    console.log("\nPipeline completed successfully!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\nPipeline failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
