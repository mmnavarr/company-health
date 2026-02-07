import { describe, expect, test } from "bun:test";
import { normalizeJob } from "./index";

describe("normalizeJob", () => {
  test("trims title and sets seniority from title", () => {
    const raw = {
      title: "  Senior Software Engineer  ",
      sourceUrl: "https://example.com/job/1",
      source: "ashby" as const,
    };
    const out = normalizeJob(raw);
    expect(out.title).toBe("Senior Software Engineer");
    expect(out.seniorityLevel).toBe("senior");
  });

  test("detects remote from location", () => {
    const raw = {
      title: "Engineer",
      location: "Remote - US",
      sourceUrl: "https://example.com/job/2",
      source: "website" as const,
    };
    const out = normalizeJob(raw);
    expect(out.remoteType).toBe("remote");
  });
});
