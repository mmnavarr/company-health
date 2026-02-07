import { describe, expect, test } from "bun:test";
import { normalizeJob } from "./index";

describe("normalizeJob", () => {
  test("sets seniority from title", () => {
    const out = normalizeJob({ title: "  Senior Software Engineer  " });
    expect(out.seniorityLevel).toBe("senior");
  });

  test("detects remote from location", () => {
    const out = normalizeJob({ title: "Engineer", location: "Remote - US" });
    expect(out.remoteType).toBe("remote");
  });

  test("defaults to onsite and mid", () => {
    const out = normalizeJob({ title: "Engineer", location: "New York" });
    expect(out.remoteType).toBe("onsite");
    expect(out.seniorityLevel).toBe("mid");
  });
});
