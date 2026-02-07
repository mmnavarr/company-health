/**
 * Job Service — Company Health Job Scraping System
 * Implementation aligned with specs/TDD.md
 */

import { createApp } from "./api";

const app = createApp();
const port = Number(process.env.PORT) || 3000;

if (import.meta.main) {
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  console.log(`Job service running at http://localhost:${port}`);
}

export default { port, fetch: app.fetch };
