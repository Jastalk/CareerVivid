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
import {
  canonicalInterviewStudioUrl,
  getAutomaticEmailWindowSuppressionReason,
  getEmailPreferenceSuppressionReason,
  isNonDeliverableEmail,
} from "./emailPolicy";

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

describe("automatic email window", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 1_700_000_000_000;
  const user = (ageDays: number, prefs: Record<string, unknown> = {}) => ({
    createdAt: now - ageDays * DAY,
    emailPreferences: prefs,
  });

  it("sends optional email inside the first week", () => {
    expect(getAutomaticEmailWindowSuppressionReason(user(3), "weekly_digest", now)).toBeNull();
  });

  it("stops optional email once the week has passed", () => {
    expect(getAutomaticEmailWindowSuppressionReason(user(9), "weekly_digest", now))
      .toBe("automatic_window_elapsed");
  });

  it("keeps sending after an explicit opt-in", () => {
    expect(
      getAutomaticEmailWindowSuppressionReason(user(60, { optInAt: now - DAY }), "weekly_digest", now)
    ).toBeNull();
  });

  it("never withholds a required category", () => {
    expect(getAutomaticEmailWindowSuppressionReason(user(400), "billing", now)).toBeNull();
    expect(getAutomaticEmailWindowSuppressionReason(user(400), "transactional", now)).toBeNull();
  });

  it("still announces a real product change", () => {
    expect(getAutomaticEmailWindowSuppressionReason(user(400), "feature_spotlight", now)).toBeNull();
  });

  it("sends when the account age is unknown rather than silently withholding", () => {
    expect(getAutomaticEmailWindowSuppressionReason({ emailPreferences: {} }, "weekly_digest", now)).toBeNull();
  });
});

describe("non-deliverable addresses", () => {
  it("recognises seeded demo mailboxes", () => {
    expect(isNonDeliverableEmail("alex.morgan.demo@careervivid.app")).toBe(true);
    expect(isNonDeliverableEmail("demo@careervivid.app")).toBe(true);
    expect(isNonDeliverableEmail("test@careervivid.app")).toBe(true);
    expect(isNonDeliverableEmail("someone@example.com")).toBe(true);
  });

  it("leaves real addresses alone", () => {
    expect(isNonDeliverableEmail("zhujiawen519@gmail.com")).toBe(false);
    expect(isNonDeliverableEmail("demo.person@gmail.com")).toBe(false);
    expect(isNonDeliverableEmail("")).toBe(false);
    expect(isNonDeliverableEmail(undefined)).toBe(false);
  });

  it("blocks even a required category, since the bounce is the same", () => {
    const demoUser = { email: "nora.kim.demo@careervivid.app", emailPreferences: {} };
    expect(getEmailPreferenceSuppressionReason(demoUser, "billing")).toBe("non_deliverable_address");
  });
});
