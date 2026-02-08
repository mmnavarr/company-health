import { describe, expect, test } from "bun:test";
import { normalizeJob } from "./utils";

describe("normalizeJob", () => {
  test("sets seniority from title", () => {
    const out = normalizeJob({ title: "  Senior Software Engineer  " });
    expect(out.seniorityLevel).toBe("Senior");
  });

  test("detects remote from location", () => {
    const out = normalizeJob({ title: "Engineer", location: "Remote - US" });
    expect(out.remoteType).toBe("Remote");
  });

  test("defaults to onsite and mid", () => {
    const out = normalizeJob({ title: "Engineer", location: "New York" });
    expect(out.remoteType).toBe("Onsite");
    expect(out.seniorityLevel).toBe("Mid");
  });
});
