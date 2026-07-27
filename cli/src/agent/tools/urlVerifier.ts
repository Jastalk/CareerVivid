/**
 * urlVerifier.ts — URL safety & reachability checker for the CareerVivid Job Agent.
 *
 * Harness Engineering Mindset:
 *   The agent must think like a real user clicking a link. A 98%-match job means
 *   nothing if the URL is broken, hallucinated, or redirects to a homepage.
 *   Every URL we return to the user must pass this verification harness BEFORE
 *   we present it.
 *
 * The harness performs layered checks:
 *   1. Structural validity — is this even a parseable URL?
 *   2. Domain plausibility — does this look like a real company domain?
 *   3. HTTP reachability — does it respond with 200/301/302?
 *   4. Content sanity   — does the final page look like a real job listing?
 *   5. ATS legitimacy   — is it on a known ATS (Ashby, Greenhouse, Lever, etc.)?
 */

import { Tool } from "../Tool.js";
import { Type } from "@google/genai";
import { getChromeBinaryPath } from "../../apply/browser.js";
import { chromium } from "playwright-core";
import { hostMatches } from "../../utils/host.js";

// ── Known ATS domains that still need direct-job validation ───────────────────
const TRUSTED_ATS_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workday.com",
  "workdayjobs.com",
  "myworkdayjobs.com",
  "icims.com",
  "smartrecruiters.com",
  "jobvite.com",
  "taleo.net",
  "oracle.com",
  "brassring.com",
  "successfactors.com",
  "linkedin.com/jobs",
  "indeed.com",
  "careers.google.com",
  "jobs.microsoft.com",
  "amazon.jobs",
  "meta.com/careers",
  "apple.com/jobs",
  "openai.com/careers",
  "anthropic.com/careers",
  "jobs.ashbyhq.com",
  "boards.greenhouse.io",
  "apply.workable.com",
  "recruitee.com",
  "bamboohr.com",
  "rippling.com",
  "ripplinghq.com",
];

// ── Suspicious patterns — usually hallucinated or spam ────────────────────────
const SUSPICIOUS_PATTERNS = [
  /localhost/i,
  /127\.0\.0\./,
  /^https?:\/\/0\.0\.0\.0/i,
  /^https?:\/\/\[?::1\]?/i,
  /example\.(com|org|net)/i,
  /test\.(com|org)/i,
  /careers\.(io|app|xyz|online|site|info|biz)$/i, // generic TLDs on "careers" domains
  /jobs\.(io|app|xyz|online|site|info|biz)$/i,
];

const APPLY_PATTERNS = [
  /\bapply\b/i,
  /\bapply now\b/i,
  /\bapply for this job\b/i,
  /\bsubmit application\b/i,
  /\bstart application\b/i,
  /\beasy apply\b/i,
];

const EXPIRED_CONTENT_PATTERNS = [
  /job (is )?no longer available/i,
  /job.*no longer open/i,
  /position has been filled/i,
  /this job has expired/i,
  /job posting has expired/i,
  /no longer accepting applications/i,
  /this (position|role|job) (is )?no longer/i,
  /this job (listing )?is closed/i,
  /job (listing )?not found/i,
  /the job you are looking for is no longer open/i,
];

const JOB_SIGNALS = [
  "apply", "job description", "responsibilities", "requirements",
  "qualifications", "salary", "full-time", "part-time", "remote",
  "position", "role", "candidate", "experience", "interview",
  "benefits", "compensation", "jobposting", "about the role",
  "what you'll do", "what you will do",
];

function normalizePath(pathname: string): string {
  const cleaned = pathname.replace(/\/+$/, "");
  return cleaned || "/";
}

export function isGenericJobLanding(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = normalizePath(parsed.pathname.toLowerCase());
    const hasJobQuery = ["gh_jid", "jobid", "job_id", "jid", "currentjobid"].some((key) =>
      parsed.searchParams.has(key)
    );
    if (hasJobQuery) return false;

    const host = parsed.hostname.toLowerCase();
    const segments = path.split("/").filter(Boolean);

    if (["/", "/careers", "/career", "/jobs", "/job", "/jobs/search", "/search"].includes(path)) {
      return true;
    }
    if (host === "jobs.ashbyhq.com" && segments.length <= 1) return true;
    if (host === "jobs.lever.co" && segments.length <= 1) return true;
    if (hostMatches(host, "greenhouse.io") && segments.length <= 1) return true;
    return false;
  } catch {
    return false;
  }
}

function isJobSpecificUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const path = normalizePath(parsed.pathname.toLowerCase());
    const host = parsed.hostname.toLowerCase();
    if (["gh_jid", "jobid", "job_id", "jid", "currentjobid"].some((key) => parsed.searchParams.has(key))) {
      return true;
    }
    if (host === "jobs.ashbyhq.com") {
      return /^\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/application)?$/.test(path);
    }
    if (host === "jobs.lever.co") return /^\/[^/]+\/[^/]+/.test(path);
    if (hostMatches(host, "greenhouse.io")) return /\/jobs?\/\d+/.test(path);
    return /\/apply\/|\/jobs?\/\d+|\/job-postings?\//.test(path);
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  // The closing-tag patterns allow whitespace and stray attributes, e.g.
  // `</script >`. The stricter `<\/script>` missed those, leaving the script
  // body to survive as text — and this text is fed to the agent as job
  // content, so anything left in it is model input.
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*[^>]*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*[^>]*>/gi, " ")
    // Unterminated script/style blocks: drop everything to the end rather than
    // letting the body through.
    .replace(/<script\b[^>]*>[\s\S]*$/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*$/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBodyText(url: string, signal: AbortSignal): Promise<string> {
  const bodyRes = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  return stripHtml(await bodyRes.text());
}

export interface UrlVerificationResult {
  url: string;
  ok: boolean;
  status?: number;
  finalUrl?: string;            // after redirects
  isTrustedAts: boolean;
  redirected: boolean;
  reason: string;               // human-readable verdict
  warning?: string;             // show to user if suspicious
}

/**
 * Playwright browser fallback verifier for JS-heavy job application sites.
 */
async function verifyUrlWithPlaywright(url: string): Promise<{
  ok: boolean;
  status?: number;
  finalUrl?: string;
  bodyText?: string;
  reason?: string;
}> {
  const executablePath = getChromeBinaryPath();
  if (!executablePath) {
    return { ok: false, reason: "Local Chrome binary not found." };
  }

  let browser;
  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
    const finalUrl = page.url();
    const status = response ? response.status() : 200;
    const html = await page.content();
    const bodyText = stripHtml(html);
    return {
      ok: true,
      status,
      finalUrl,
      bodyText,
    };
  } catch (err: any) {
    return {
      ok: false,
      reason: err.message,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Verify a single URL is reachable and looks like a legitimate job posting.
 * Uses harness-engineering thinking: emulate a real user clicking the link.
 */
export async function verifyUrl(url: string): Promise<UrlVerificationResult> {
  // ── 1. Structural check ───────────────────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      url, ok: false, isTrustedAts: false, redirected: false,
      reason: `❌ Malformed URL — not a valid link: "${url}"`,
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      url, ok: false, isTrustedAts: false, redirected: false,
      reason: `❌ Non-HTTP URL — cannot open in browser: "${url}"`,
    };
  }

  // ── 2. Suspicious pattern check ───────────────────────────────────────────
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) {
      return {
        url, ok: false, isTrustedAts: false, redirected: false,
        reason: `❌ URL looks hallucinated or is a placeholder domain: "${url}"`,
        warning: "This URL matches a known fake/test domain pattern.",
      };
    }
  }

  // ── 3. Trusted ATS domain shortcut ───────────────────────────────────────
  const isTrustedAts = TRUSTED_ATS_DOMAINS.some(
    (d) => parsed.hostname.includes(d) || url.includes(d)
  );

  // Helper to evaluate text body and url
  const evaluateContent = (
    status: number,
    finalUrl: string,
    bodyText: string,
    redirected: boolean
  ): { ok: boolean; reason: string; warning?: string; fallback?: boolean } => {
    if (status === 404) {
      return {
        ok: false,
        reason: `❌ Page not found (404) — this job posting may have been removed or the URL is incorrect.`,
      };
    }

    if (status === 403 || status === 401) {
      return {
        ok: false,
        reason: `⚠️ Page requires authentication (${status}) — link may be valid but access restricted.`,
        fallback: true,
      };
    }

    if (status >= 500) {
      return {
        ok: false,
        reason: `❌ Server error (${status}) — the job site is having issues. Try again later.`,
        fallback: true,
      };
    }

    if (redirected && isGenericJobLanding(finalUrl)) {
      return {
        ok: false,
        reason: `❌ URL redirects to a generic jobs page (${finalUrl}) — job posting likely no longer exists.`,
        warning: "This job posting may have been removed.",
      };
    }

    if (isGenericJobLanding(finalUrl)) {
      return {
        ok: false,
        reason: `❌ URL points to a generic careers/jobs page (${finalUrl}), not a specific apply page.`,
        warning: "Use a direct job posting URL before applying.",
      };
    }

    const lowerBody = bodyText.toLowerCase();

    if (lowerBody && EXPIRED_CONTENT_PATTERNS.some((pattern) => pattern.test(lowerBody))) {
      return {
        ok: false,
        reason: "❌ Apply page says the job is closed, unavailable, or not found.",
      };
    }

    const signalCount = lowerBody
      ? JOB_SIGNALS.filter((signal) => lowerBody.includes(signal)).length
      : 0;
    const hasApplyAction = lowerBody ? APPLY_PATTERNS.some((pattern) => pattern.test(lowerBody)) : false;

    if (isTrustedAts && !isJobSpecificUrl(finalUrl)) {
      return {
        ok: false,
        reason: `❌ Trusted ATS URL is not a specific job posting (${finalUrl}).`,
      };
    }

    if (
      isTrustedAts &&
      isJobSpecificUrl(finalUrl) &&
      /^jobs you need to enable javascript to run this app\.?$/i.test(lowerBody)
    ) {
      return {
        ok: false,
        reason: "❌ ATS page loaded a generic jobs shell, not a specific job posting.",
        fallback: true,
      };
    }

    if (
      lowerBody.includes("enable javascript") ||
      lowerBody.includes("javascript is required") ||
      lowerBody.length < 300
    ) {
      return {
        ok: false,
        reason: "❌ Static HTML requires JavaScript or is sparse.",
        fallback: true,
      };
    }

    if (lowerBody && isJobSpecificUrl(finalUrl) && !isTrustedAts && !hasApplyAction && signalCount < 2) {
      return {
        ok: false,
        reason: "❌ Page loaded, but it does not expose a job description or apply action.",
        fallback: true,
      };
    }

    let contentWarning: string | undefined;
    if (lowerBody && isTrustedAts && isJobSpecificUrl(finalUrl) && !hasApplyAction && signalCount < 2) {
      contentWarning = "Static HTML is sparse, but the URL is a specific trusted ATS posting. Browser verification may still be needed before submission.";
    }

    if (lowerBody && !isTrustedAts && signalCount < 2) {
      contentWarning = `Page at ${finalUrl || url} lacks typical job-posting keywords — may redirect to homepage or be an error page.`;
    }

    const verdict = isTrustedAts
      ? `✅ Verified — reachable on trusted ATS (${parsed.hostname})`
      : `✅ Reachable (status ${status})${redirected ? ` → redirected to ${finalUrl}` : ""}`;

    return {
      ok: true,
      reason: verdict,
      warning: contentWarning,
    };
  };

  // Try fast fetch first
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

  let fetchResult: UrlVerificationResult | null = null;
  let needsFallback = false;

  try {
    let res: Response;
    let finalUrl = url;

    try {
      res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      finalUrl = res.url;
    } catch {
      // HEAD blocked — try GET (some servers reject HEAD)
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      finalUrl = res.url;
    }

    const status = res.status;
    const redirected = finalUrl !== url;

    let bodyText = "";
    if (status >= 200 && status < 400) {
      try {
        bodyText = await fetchBodyText(finalUrl, controller.signal);
      } catch {
        // failed reading body text
      }
    }

    const evaluation = evaluateContent(status, finalUrl, bodyText, redirected);
    if (evaluation.fallback) {
      needsFallback = true;
    } else {
      fetchResult = {
        url,
        ok: evaluation.ok,
        status,
        finalUrl,
        isTrustedAts,
        redirected,
        reason: evaluation.reason,
        warning: evaluation.warning,
      };
    }
  } catch (err: unknown) {
    needsFallback = true;
  } finally {
    clearTimeout(timeout);
  }

  if (needsFallback) {
    // Run Playwright fallback
    const pwResult = await verifyUrlWithPlaywright(url);
    if (pwResult.ok && pwResult.status !== undefined && pwResult.finalUrl !== undefined && pwResult.bodyText !== undefined) {
      const redirected = pwResult.finalUrl !== url;
      const evaluation = evaluateContent(pwResult.status, pwResult.finalUrl, pwResult.bodyText, redirected);
      return {
        url,
        ok: evaluation.ok,
        status: pwResult.status,
        finalUrl: pwResult.finalUrl,
        isTrustedAts,
        redirected,
        reason: evaluation.ok ? `✅ Verified via headless browser: ${evaluation.reason}` : evaluation.reason,
        warning: evaluation.warning,
      };
    } else {
      // Playwright failed or was not available, return failure reason or fast fetch error
      return {
        url,
        ok: false,
        isTrustedAts,
        redirected: false,
        reason: pwResult.reason || `❌ Connection failed or timed out — site may be down or unreachable.`,
      };
    }
  }

  return fetchResult!;
}

/**
 * Verify a batch of URLs in parallel (max 5 concurrent).
 * Returns results in the same order as input.
 */
export async function verifyUrlBatch(
  urls: string[]
): Promise<UrlVerificationResult[]> {
  const CONCURRENCY = 5;
  const results: UrlVerificationResult[] = new Array(urls.length);

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((u) => verifyUrl(u)));
    batchResults.forEach((r, j) => {
      results[i + j] = r;
    });
  }

  return results;
}

// ── Tool: verify_url ─────────────────────────────────────────────────────────

export const VerifyUrlTool: Tool = {
  name: "verify_url",
  description: `Verify that a URL is actually reachable and looks like a real job posting before showing it to the user.

HARNESS ENGINEERING RULE: You MUST call this tool before presenting any job URL to the user.
Think like a user clicking a link — a broken or hallucinated URL wastes their time and destroys trust.

Use this tool when:
- You have a job URL from search_jobs or any other source
- You are about to tell the user "here is the link to apply"
- You suspect a URL might be invalid, outdated, or hallucinated
- You want to confirm a job is still accepting applications

This tool checks: URL validity, HTTP reachability, redirect detection, homepage-redirect detection,
and whether the URL is on a trusted ATS (Ashby, Greenhouse, Lever, etc.).`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL to verify (must start with http:// or https://).",
      },
    },
    required: ["url"],
  },
  execute: async (args: { url: string }) => {
    const result = await verifyUrl(args.url);

    const lines: string[] = [result.reason];

    if (result.redirected && result.finalUrl) {
      lines.push(`   Redirected to: ${result.finalUrl}`);
    }
    if (result.isTrustedAts) {
      lines.push(`   ✓ Trusted ATS domain — application form should be available`);
    }
    if (result.warning) {
      lines.push(`   ⚠️  ${result.warning}`);
    }

    if (!result.ok) {
      lines.push(
        `\nAgent Instruction: Do NOT show this URL to the user — it is broken or unreachable.`,
        `Instead, tell the user you couldn't verify the application link and suggest they`,
        `search for the job directly on the company's careers page or LinkedIn.`
      );
    }

    return lines.join("\n");
  },
};

// ── Tool: verify_search_results ──────────────────────────────────────────────

export const VerifySearchResultsTool: Tool = {
  name: "verify_job_urls",
  description: `Verify a batch of job URLs returned from search_jobs are all reachable.
Use this after search_jobs to filter out dead or hallucinated links before showing results to the user.
Returns a summary of which URLs passed and which failed, so you can present only working links.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      urls: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Array of job URLs to verify in parallel.",
      },
    },
    required: ["urls"],
  },
  execute: async (args: { urls: string[] }) => {
    if (!args.urls || args.urls.length === 0) {
      return "No URLs provided to verify.";
    }

    const results = await verifyUrlBatch(args.urls);

    const passed = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    const lines: string[] = [
      `URL Verification Results (${passed.length}/${results.length} passed):\n`,
    ];

    for (const r of results) {
      lines.push(`${r.ok ? "✅" : "❌"} ${r.url}`);
      lines.push(`   ${r.reason}`);
      if (r.warning) lines.push(`   ⚠️  ${r.warning}`);
    }

    if (failed.length > 0) {
      lines.push(
        `\nAgent Instruction: Only show the ${passed.length} passing URLs to the user.`,
        `For the ${failed.length} failed URL(s), do NOT include them in your response.`,
        `If too many failed, tell the user you couldn't verify all links and suggest`,
        `they search directly on LinkedIn or the company careers page.`
      );
    } else {
      lines.push(`\nAll URLs verified successfully — safe to show to the user.`);
    }

    return lines.join("\n");
  },
};

export const ALL_URL_VERIFIER_TOOLS: Tool[] = [
  VerifyUrlTool,
  VerifySearchResultsTool,
];
