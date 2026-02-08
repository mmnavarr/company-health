/**
 * API layer — TDD §8
 * REST endpoints for companies, jobs, metrics, scraping control.
 * Built with ElysiaJS for type-safe, high-performance routing.
 */

import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { companiesRoutes } from "./routes/companies";
import { jobsRoutes } from "./routes/jobs";
import { dashboardRoutes } from "./routes/dashboard";

export const app = new Elysia({ name: "job-service" })
  .use(cors())
  .get("/health", () => ({ status: "ok", service: "job-service" }))
  .use(companiesRoutes)
  .use(jobsRoutes)
  .use(dashboardRoutes);

export type App = typeof app;
