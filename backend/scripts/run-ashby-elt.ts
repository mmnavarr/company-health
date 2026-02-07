/**
 * Run Ashby ELT job for a job board.
 * Usage: bun run scripts/run-ashby-elt.ts [jobBoardName]
 * Default job board: rain
 */

import { runAshbyELTPipeline } from "../src/jobs/ashby-elt";

const COMPANY_ID = process.argv[2];
const JOB_BOARD_NAME = process.argv[3];

async function main() {
  console.log(`Running Ashby ELT for company: ${COMPANY_ID} and job board: ${JOB_BOARD_NAME}\n`);
  const result = await runAshbyELTPipeline(COMPANY_ID, JOB_BOARD_NAME!);
  console.log("Result:", result);
}

main().catch(console.error);
