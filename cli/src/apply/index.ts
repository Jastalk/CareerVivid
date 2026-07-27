/**
 * apply/index.ts — ATS Platform Detector
 *
 * Given a job URL, figures out which ATS platform it belongs to and returns
 * the right adapter to fill the application form.
 */

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
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io") || u.includes("boards.greenhouse.io") || /\/jobs\/(listing|posting)\/[^/]+\/\d+/.test(u)) return "greenhouse";
  if (u.includes("lever.co") || u.includes("jobs.lever.co")) return "lever";
  if (u.includes("ashbyhq.com") || u.includes("jobs.ashbyhq.com") || u.includes("openai.com")) return "ashby";
  if (u.includes("linkedin.com/jobs")) return "linkedin";
  if (u.includes("myworkdayjobs.com") || u.includes("workday.com")) return "workday";
  if (u.includes("icims.com")) return "icims";
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
