/**
 * apply/index.ts — ATS Platform Detector
 *
 * Given a job URL, figures out which ATS platform it belongs to and returns
 * the right adapter to fill the application form.
 */

import { hostMatches, hostnameOf } from "../utils/host.js";

export type ATSPlatform =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "linkedin"
  | "workday"
  | "icims"
  | "generic";

export interface ATSAdapter {
  platform: ATSPlatform;
  /** Navigate to the application page (may click "Apply" button) */
  navigateToForm: (page: import("playwright-core").Page, jobUrl: string) => Promise<void>;
  /** Extract form fields from the current page */
  extractFields: (page: import("playwright-core").Page) => Promise<FormField[]>;
  /** Fill a single field given selector + answer */
  fillField: (page: import("playwright-core").Page, field: FormField, answer: string) => Promise<void>;
  /** Click the final submit button */
  submit: (page: import("playwright-core").Page) => Promise<void>;
  /** Optional: fill standard fields directly from saved user profile (no AI needed) */
  fillFromProfile?: (
    page: import("playwright-core").Page,
    profile: import("./gemini-agent.js").ApplyProfile,
  ) => Promise<{ filled: string[]; skipped: string[] }>;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "radio" | "file" | "unknown";
  selector: string;
  required: boolean;
  options?: string[]; // for select/radio
  placeholder?: string;
}

// ── URL → Platform detection ──────────────────────────────────────────────────

export function detectPlatform(url: string): ATSPlatform {
  // Matched against the parsed hostname, not a substring of the whole URL.
  // `https://evil.example/?ref=lever.co` used to be detected as Lever, which
  // then ran the Lever adapter — and the adapters fill in name, email, phone
  // and resume. See utils/host.ts.
  const host = hostnameOf(url);
  const u = url.toLowerCase();

  if (hostMatches(host, "greenhouse.io")) return "greenhouse";
  if (hostMatches(host, "lever.co")) return "lever";
  if (hostMatches(host, "ashbyhq.com") || hostMatches(host, "openai.com")) return "ashby";
  if (hostMatches(host, "linkedin.com") && u.includes("/jobs")) return "linkedin";
  if (hostMatches(host, "myworkdayjobs.com") || hostMatches(host, "workday.com")) return "workday";
  if (hostMatches(host, "icims.com")) return "icims";

  // Path-shaped fallback for self-hosted Greenhouse boards on a customer's own
  // domain, which have no recognisable hostname.
  if (/\/jobs\/(listing|posting)\/[^/]+\/\d+/.test(u)) return "greenhouse";

  return "generic";
}

// ── Adapter loader ────────────────────────────────────────────────────────────

export async function getAdapter(platform: ATSPlatform): Promise<ATSAdapter> {
  switch (platform) {
    case "greenhouse": {
      const { GreenhouseAdapter } = await import("./adapters/greenhouse.js");
      return new GreenhouseAdapter();
    }
    case "lever": {
      const { LeverAdapter } = await import("./adapters/lever.js");
      return new LeverAdapter();
    }
    case "ashby": {
      const { AshbyAdapter } = await import("./adapters/ashby.js");
      return new AshbyAdapter();
    }
    case "linkedin": {
      const { LinkedInAdapter } = await import("./adapters/linkedin.js");
      return new LinkedInAdapter();
    }
    case "icims": {
      const { IcimsAdapter } = await import("./adapters/icims.js");
      return new IcimsAdapter();
    }
    default: {
      const { GenericAdapter } = await import("./adapters/generic.js");
      return new GenericAdapter();
    }
  }
}
