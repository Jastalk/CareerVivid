/*
 * Vitest, not `node:test`.
 *
 * This was the repo's only remaining `node:test` file under functions/src. The
 * root runner collects it and cannot bundle Node's built-in test module, so it
 * reported as a failed suite with zero tests — while the assertions themselves
 * only ever ran against the compiled copy in functions/lib, which is build
 * output nobody runs deliberately. Same assertions, one runner.
 */

import { describe, it, expect } from "vitest";
import { canonicalInterviewStudioUrl } from "./emailPolicy";

describe("canonicalInterviewStudioUrl", () => {
  it("uses the production history route for scheduled practice", () => {
    const url = canonicalInterviewStudioUrl(
      "designing-a-real-time-recommendation-engine-scheduled-practice-2913ha"
    );

    expect(url).toBe(
      "https://careervivid.app/interview-studio/designing-a-real-time-recommendation-engine-scheduled-practice-2913ha"
    );
    expect(url).not.toContain("#/");
    expect(url).not.toContain("careervivid.web.app");
  });

  it("preserves an explicit email source", () => {
    expect(canonicalInterviewStudioUrl("practice/42", "lifecycle_interview_reminder")).toBe(
      "https://careervivid.app/interview-studio/practice%2F42?source=lifecycle_interview_reminder"
    );
  });
});
