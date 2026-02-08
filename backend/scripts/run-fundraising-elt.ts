#!/usr/bin/env bun
/**
 * Run Fundraising ELT job for a company.
 * Usage: bun run scripts/run-fundraising-elt.ts [companySlug]
 * Default company slug: rain
 */

import { FundraisingELTJob } from "../src/jobs/fundraising-elt";

const companySlug = process.argv[2] ?? "rain";

async function main() {
  console.log(`Starting Fundraising ELT pipeline for company: ${companySlug}`);
  console.log("=".repeat(50));
 
  try {
    const job = new FundraisingELTJob();
    const result = await job.run({ companySlug });

    console.log("\nPipeline completed successfully!");
    console.log("=".repeat(50));
    console.log(`Sources found:      ${result.sourcesFound}`);
    console.log(`Rounds extracted:   ${result.roundsExtracted}`);
    console.log(`Rounds new:         ${result.roundsNew}`);
    console.log(`Rounds updated:     ${result.roundsUpdated}`);
  } catch (error) {
    console.error("\nPipeline failed:", error);
    process.exit(1);
  }
}

main();
