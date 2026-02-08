#!/usr/bin/env bun
/**
 * Run News ELT job for a company.
 * Usage: bun run scripts/run-news-elt.ts [companySlug]
 * Default company slug: rain
 */

import { NewsELTJob } from "../src/jobs/news-elt";

const companySlug = process.argv[2] ?? "rain";

async function main() {
  console.log(`Starting News ELT pipeline for company: ${companySlug}`);
  console.log("=".repeat(50));

  try {
    const job = new NewsELTJob();
    const result = await job.run({ companySlug });

    console.log("\nPipeline completed successfully!");
    console.log("=".repeat(50));
    console.log(`Articles found:   ${result.articlesFound}`);
    console.log(`Articles new:     ${result.articlesNew}`);
    console.log(`Articles updated: ${result.articlesUpdated}`);
    console.log(`Raw data path:    ${result.rawPath ?? "N/A"}`);
  } catch (error) {
    console.error("\nPipeline failed:", error);
    process.exit(1);
  }
}

main();
