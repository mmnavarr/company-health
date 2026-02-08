/**
 * Job Service — Company Health Job Scraping System
 * Implementation aligned with specs/TDD.md
 * Built with ElysiaJS for type-safe API
 */

import { app } from "./api";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Job service running at http://localhost:${port}`);
});

export default app;
