/**
 * API layer — TDD §8
 * REST endpoints for companies, jobs, metrics, scraping control.
 * Built with ElysiaJS for type-safe, high-performance routing.
 */
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { companiesRoutes } from "./routes/companies";
import { jobsRoutes } from "./routes/jobs";
import { dashboardRoutes } from "./routes/dashboard";

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
  .use(dashboardRoutes);

export type App = typeof app;
