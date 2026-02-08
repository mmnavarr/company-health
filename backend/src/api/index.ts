/**
 * API layer — TDD §8
 * REST endpoints for companies, jobs, metrics, scraping control.
 * Built with ElysiaJS for type-safe, high-performance routing.
 */
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { companiesRoutes } from "./routes/companies";
import { dashboardRoutes } from "./routes/dashboard";
import { jobsRoutes } from "./routes/jobs";
import { newsRoutes } from "./routes/news";

export const app = new Elysia({ name: "company-health-api" })
  .use(cors())
  .onError(({ code, error, set }) => {
    console.error(`[API Error] ${code}:`, error);

    if (code === "VALIDATION") {
      set.status = 400;
      return { error: `Validation error: ${error.message}` };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }

    set.status = 500;
    return { error: "Internal server error. Please try again later." };
  })
  .get("/health", () => ({ status: "ok", service: "company-health-api" }))
  .use(companiesRoutes)
  .use(jobsRoutes)
  .use(dashboardRoutes)
  .use(newsRoutes);

export type App = typeof app;

// Start server if this file is run directly
if (import.meta.main) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port);
  console.log(`🚀 API server running at http://localhost:${port}`);
}
