import assert from "node:assert/strict";
import test from "node:test";
import { canonicalInterviewStudioUrl } from "./emailPolicy";

test("canonicalInterviewStudioUrl uses the production history route for scheduled practice", () => {
  const url = canonicalInterviewStudioUrl("designing-a-real-time-recommendation-engine-scheduled-practice-2913ha");

  assert.equal(
    url,
    "https://careervivid.app/interview-studio/designing-a-real-time-recommendation-engine-scheduled-practice-2913ha"
  );
  assert.equal(url.includes("#/"), false);
  assert.equal(url.includes("careervivid.web.app"), false);
});

test("canonicalInterviewStudioUrl preserves an explicit email source", () => {
  assert.equal(
    canonicalInterviewStudioUrl("practice/42", "lifecycle_interview_reminder"),
    "https://careervivid.app/interview-studio/practice%2F42?source=lifecycle_interview_reminder"
  );
});
