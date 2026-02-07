/**
 * Test script for Ashby scraper using job board "rain".
 * Run: bun run scripts/test-ashby.ts
 */

import { AshbyScraper } from "../src/scraping";
import { AshbyJobsResponse } from "../src/scraping/ashby-scraper";

const JOB_BOARD_NAME = "rain";

async function main() {
  const scraper = new AshbyScraper();
  console.log(`Scraping jobs from Ashby job board: ${JOB_BOARD_NAME}\n`);

  const res = await scraper.scrape<AshbyJobsResponse>(JOB_BOARD_NAME);

  const { jobs, ...rest } = res;
  const outPath = "scripts/ashby-rest.json";
  await Bun.write(outPath, JSON.stringify(res, null, 2));
  console.log(`Dumped rest to ${outPath}`);
  console.log("Top-level fields (minus jobs):", rest);
  console.log("\nFirst job:", Array.isArray(jobs) ? jobs[0] : undefined);
}

main().catch(console.error);
