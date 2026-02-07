/**
 * Run Ashby ELT job for a job board.
 * Usage: bun run scripts/run-ashby-elt.ts [jobBoardName]
 * Default job board: rain
 */

import { runAshbyELTPipeline } from "../src/jobs/ashby-elt";

const COMPANY_SLUG = process.argv[2];

async function main() {
  try {
    const result = await runAshbyELTPipeline(COMPANY_SLUG);
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
