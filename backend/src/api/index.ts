/**
 * API layer — TDD §8
 * REST endpoints for companies, jobs, metrics, scraping control.
 */

export function createApp() {
  // Use Bun.serve or Hono/Elysia when implementing full API
  return {
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);
      if (url.pathname === "/health") {
        return Response.json({ status: "ok", service: "job-service" });
      }
      return new Response("Not Found", { status: 404 });
    },
  };
}
