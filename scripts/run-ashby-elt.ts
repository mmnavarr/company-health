/**
 * Run Ashby ELT job for a job board.
 * Usage: bun run scripts/run-ashby-elt.ts [jobBoardName]
 * Default job board: rain
 */

import { runAshbyElt } from "../src/jobs/ashby-elt";

const JOB_BOARD = process.argv[2] ?? "rain";

async function main() {
  console.log(`Running Ashby ELT for job board: ${JOB_BOARD}\n`);
  const result = await runAshbyElt(JOB_BOARD);
  console.log("Result:", result);
}

main().catch(console.error);
