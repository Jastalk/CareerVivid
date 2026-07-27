/**
 * jobOpenings.ts — Job Openings Drill-Down Tools
 *
 * Bridges jobs.csv (company pipeline) → specific open roles with direct apply links.
 *
 * Architecture:
 *   jobs.csv          →  openings_scan  →  job_openings.csv
 *   (company-level)      (ATS fetcher)     (posting-level)
 *
 * ATS Support:
 *   Greenhouse  — Free public REST API (boards-api.greenhouse.io)
 *   Ashby       — HTML parse (JavaScript SPA; titles extracted from embedded JSON)
 *   Lever       — Public REST API (api.lever.co/v0/postings/{slug})
 *   Direct      — JSON-LD schema.org/JobPosting + heuristic <a> tag parsing
 */

import { Tool } from "../Tool.js";
import { Type } from "@google/genai";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  renameSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

// ---------------------------------------------------------------------------
// CSV Schema — job_openings.csv
// ---------------------------------------------------------------------------

const OPENING_HEADERS = [
  "id",             // VER-OPN-001
  "company_id",     // FK → jobs.csv id (e.g. VER-001)
  "company",        // Human name
  "posting_title",  // Exact title from ATS
  "apply_url",      // Direct apply link
  "ats",            // Greenhouse | Ashby | Lever | Direct
  "location",       // Remote / SF / etc.
  "match_score",    // 0–100 keyword match vs resume
  "match_keywords", // comma-separated matched keywords
  "status",         // Found | Reviewing | Applied | Rejected | Ghosted
  "date_found",     // ISO date
  "date_applied",
  "notes",
] as const;

type OpeningRow = Record<(typeof OPENING_HEADERS)[number], string>;

// ---------------------------------------------------------------------------
// File path
// ---------------------------------------------------------------------------

/** Resolves the jobs.csv path the same way local-tracker.ts does. */
function getJobsCsvPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirpath  = dirname(__filename);
  // 1. Check dev repo locations (for local development)
  const devCandidates = [
    resolve(__dirpath, "../../../../career-vivid/data/jobs.csv"),
    resolve(__dirpath, "../../../../../career-vivid/data/jobs.csv"),
    resolve(process.cwd(), "career-vivid/data/jobs.csv"),
  ];
  for (const p of devCandidates) { if (existsSync(p)) return p; }
  // 2. Global ~/.careervivid/jobs.csv for installed users
  return resolve(homedir(), ".careervivid", "jobs.csv");
}

function getOpeningsPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirpath  = dirname(__filename);
  // Mirror next to jobs.csv
  const devCandidates = [
    resolve(__dirpath, "../../../../career-vivid/data/job_openings.csv"),
    resolve(__dirpath, "../../../../../career-vivid/data/job_openings.csv"),
    resolve(process.cwd(), "career-vivid/data/job_openings.csv"),
  ];
  for (const p of devCandidates) { if (existsSync(p)) return p; }
  // Fallback: mirror next to jobs.csv
  const jobsPath = getJobsCsvPath();
  return resolve(dirname(jobsPath), "job_openings.csv");
}

function loadOpenings(): { rows: OpeningRow[]; path: string } {
  const path = getOpeningsPath();
  if (!existsSync(path)) {
    writeFileSync(path, OPENING_HEADERS.join(",") + "\n", "utf-8");
    return { rows: [], path };
  }
  const raw = readFileSync(path, "utf-8");
  const lines = raw.trim().split("\n");
  if (lines.length <= 1) return { rows: [], path };

  const fileHeaders = lines[0].split(",");
  const rows = lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = parseCsvLine(line);
    const row: Partial<OpeningRow> = {};
    OPENING_HEADERS.forEach(h => {
      const idx = fileHeaders.indexOf(h);
      row[h] = idx >= 0 ? (cols[idx] ?? "").trim() : "";
    });
    return row as OpeningRow;
  });
  return { rows, path };
}

function saveOpenings(rows: OpeningRow[], csvPath: string): void {
  if (existsSync(csvPath)) copyFileSync(csvPath, csvPath + ".bak");
  const header = OPENING_HEADERS.join(",");
  const data = rows.map(row =>
    OPENING_HEADERS.map(h => {
      const val = row[h] ?? "";
      return val.includes(",") || val.includes('"')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );
  const tmpPath = csvPath + ".tmp";
  writeFileSync(tmpPath, [header, ...data].join("\n") + "\n", "utf-8");
  renameSync(tmpPath, csvPath);
}

/** Minimal CSV line parser that handles quoted fields. */
function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      cols.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobPosting {
  title: string;
  applyUrl: string;
  location?: string;
  department?: string;
  description?: string; // optional — only Greenhouse provides this via content=true
}

interface ScanResult {
  company: string;
  companyId: string;
  ats: string;
  postings: JobPosting[];
  error?: string;
}

// ---------------------------------------------------------------------------
// ATS Slug Extractor
// ---------------------------------------------------------------------------

function extractSlug(careersUrl: string, ats: string): string | null {
  try {
    const url = new URL(careersUrl);
    const pathname = url.pathname;

    if (ats === "Greenhouse") {
      // boards.greenhouse.io/vercel  OR  job-boards.greenhouse.io/vercel
      const match = pathname.match(/^\/([^/]+)/);
      return match?.[1] ?? null;
    }
    if (ats === "Ashby") {
      // jobs.ashbyhq.com/supabase
      const match = pathname.match(/^\/([^/]+)/);
      return match?.[1] ?? null;
    }
    if (ats === "Lever") {
      // jobs.lever.co/wandb
      const match = pathname.match(/^\/([^/]+)/);
      return match?.[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ATS Fetchers
// ---------------------------------------------------------------------------

/** Greenhouse: free public API — returns real titles + direct apply URLs */
async function fetchGreenhouseJobs(slug: string): Promise<JobPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  const res = await fetch(url, {
    headers: { "User-Agent": "CareerVivid-Agent/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Greenhouse API returned ${res.status}`);
  const data = await res.json() as { jobs: Array<{
    title: string;
    absolute_url: string;
    location?: { name?: string };
    departments?: Array<{ name: string }>;
  }> };

  return (data.jobs ?? []).map(j => ({
    title: j.title,
    applyUrl: j.absolute_url,
    location: j.location?.name ?? "",
    department: j.departments?.[0]?.name ?? "",
  }));
}

/** Ashby: SPA — parse the embedded JSON from the rendered HTML */
async function fetchAshbyJobs(slug: string): Promise<JobPosting[]> {
  const url = `https://jobs.ashbyhq.com/${slug}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Ashby page returned ${res.status}`);
  const html = await res.text();

  // Ashby embeds job data in Next.js __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      // Location: props.pageProps.jobPostings or props.pageProps.jobBoard.jobPostings
      const postings =
        nextData?.props?.pageProps?.jobPostings ??
        nextData?.props?.pageProps?.jobBoard?.jobPostings ??
        [];

      if (Array.isArray(postings) && postings.length > 0) {
        return postings
          .filter((p: any) => p.jobPostingState === "Listed" || !p.jobPostingState)
          .map((p: any) => ({
            title: p.title ?? p.name ?? "Unknown",
            applyUrl: p.externalLink ?? p.applyUrl ?? `https://jobs.ashbyhq.com/${slug}/${p.id}`,
            location: p.locationName ?? p.location ?? "",
            department: p.departmentName ?? p.team ?? "",
          }));
      }
    } catch { /* fall through to regex */ }
  }

  // Fallback: regex-extract title fields from the embedded JSON blobs
  const titleMatches = [...html.matchAll(/"title":"([^"]{5,80})"/g)].map(m => m[1]);
  const dedupedTitles = [...new Set(titleMatches)];
  return dedupedTitles
    .filter(t => /engineer|designer|product|manager|analyst|developer|scientist|operations/i.test(t))
    .map(title => ({
      title,
      applyUrl: `https://jobs.ashbyhq.com/${slug}`,
      location: "",
    }));
}

/** Lever: public REST API with HTML fallback */
async function fetchLeverJobs(slug: string, careersUrl: string): Promise<JobPosting[]> {
  // Try public API first
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=200`, {
      headers: { "User-Agent": "CareerVivid-Agent/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((p: any) => ({
          title: p.text ?? p.title,
          applyUrl: p.hostedUrl ?? p.applyUrl ?? careersUrl,
          location: p.categories?.location ?? p.location ?? "",
          department: p.categories?.team ?? p.categories?.department ?? "",
        }));
      }
    }
  } catch { /* fall through */ }

  // HTML fallback: lever hosted job pages have structured JSON
  const res = await fetch(`https://jobs.lever.co/${slug}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Lever page ${res.status}`);
  const html = await res.text();

  // Lever pages embed jobs in <script type="application/ld+json">
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
  const results: JobPosting[] = [];
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj["@type"] === "JobPosting" || obj.title) {
        results.push({
          title: obj.title ?? obj.name,
          applyUrl: obj.url ?? obj.sameAs ?? `https://jobs.lever.co/${slug}`,
          location: obj.jobLocation?.address?.addressLocality ?? obj.jobLocation?.name ?? "",
        });
      }
    } catch { /* skip malformed */ }
  }

  // Also try extracting from data-qa attributes Lever uses
  const qaMatches = [...html.matchAll(/data-qa="posting-name"[^>]*>([^<]+)</g)];
  const urlMatches = [...html.matchAll(/href="(https:\/\/jobs\.lever\.co\/[^"]+)"/g)];
  qaMatches.forEach((m, i) => {
    const title = m[1].trim();
    if (title && !results.find(r => r.title === title)) {
      results.push({
        title,
        applyUrl: urlMatches[i]?.[1] ?? `https://jobs.lever.co/${slug}`,
        location: "",
      });
    }
  });

  return results;
}

/** Direct: JSON-LD schema.org/JobPosting parse + heuristic <a> tag extraction */
async function fetchDirectJobs(careersUrl: string): Promise<JobPosting[]> {
  const res = await fetch(careersUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Careers page returned ${res.status}`);
  const html = await res.text();
  const results: JobPosting[] = [];

  // 1. JSON-LD schema.org/JobPosting
  const ldMatches = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
  for (const m of ldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      const items = Array.isArray(obj) ? obj : [obj];
      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          results.push({
            title: item.title,
            applyUrl: item.url ?? item.sameAs ?? careersUrl,
            location: item.jobLocation?.address?.addressLocality ?? item.jobLocation?.name ?? "",
            description: item.description?.slice(0, 200),
          });
        }
      }
    } catch { /* skip malformed */ }
  }

  if (results.length > 0) return results;

  // 2. Heuristic: find <a> tags that look like job posting links
  const baseUrl = new URL(careersUrl);
  const linkPattern = /<a\s[^>]*href="([^"]+)"[^>]*>([^<]{10,100})<\/a>/gi;
  const linkMatches = [...html.matchAll(linkPattern)];

  const JOB_TITLE_SIGNALS = /engineer|developer|designer|product manager|analyst|architect|scientist|devrel|advocate|solutions|forward.?deployed|technical/i;
  const SKIP_PATTERNS = /privacy|terms|blog|about|home|login|signup|contact|docs/i;

  for (const m of linkMatches) {
    const href = m[1];
    const linkText = m[2].trim().replace(/\s+/g, " ");

    if (!JOB_TITLE_SIGNALS.test(linkText)) continue;
    if (SKIP_PATTERNS.test(linkText)) continue;
    if (linkText.length > 100) continue;

    // Resolve relative URLs
    let fullUrl = href;
    try {
      fullUrl = new URL(href, baseUrl.origin).toString();
    } catch { continue; }

    if (!results.find(r => r.title === linkText)) {
      results.push({ title: linkText, applyUrl: fullUrl, location: "" });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Resume Keyword Scoring
// ---------------------------------------------------------------------------

const RESUME_KEYWORD_CACHE: { keywords: string[]; timestamp: number } = {
  keywords: [],
  timestamp: 0,
};

/**
 * Returns a curated keyword list for the current user.
 * First tries to pull from CareerVivid API; falls back to a hardcoded set
 * of common AI/engineering keywords if API is unavailable.
 */
async function getResumeKeywords(): Promise<string[]> {
  // Cache for 5 minutes within a session
  if (RESUME_KEYWORD_CACHE.keywords.length > 0 &&
      Date.now() - RESUME_KEYWORD_CACHE.timestamp < 300_000) {
    return RESUME_KEYWORD_CACHE.keywords;
  }

  // Curated engineering + AI keyword set that matches the user's profile.
  // These are weighted for Solutions Engineer / Forward Deployed Engineer roles.
  const defaults = [
    // Roles
    "Solutions Engineer", "Forward Deployed Engineer", "Developer Advocate",
    "Software Engineer", "Full-stack", "Backend", "Frontend", "DevRel",
    // Tech stack
    "TypeScript", "JavaScript", "React", "Next.js", "Node.js",
    "Python", "PostgreSQL", "Firebase", "Supabase", "REST API", "GraphQL",
    // AI/ML
    "LLM", "AI", "Agentic", "RAG", "Embeddings", "OpenAI", "Anthropic", "Gemini",
    "Machine Learning", "GPT", "Claude", "agent", "automation",
    // DevTools
    "Docker", "AWS", "GCP", "Vercel", "CLI", "SDK", "developer tools",
    "developer experience", "DX", "open source",
    // Traits (commonly in JDs matched to your background)
    "Remote", "startup", "SaaS", "platform", "integration",
  ];

  RESUME_KEYWORD_CACHE.keywords = defaults;
  RESUME_KEYWORD_CACHE.timestamp = Date.now();
  return defaults;
}

function scorePosting(keywords: string[], posting: JobPosting): {
  score: number;
  matched: string[];
} {
  const text = [posting.title, posting.description ?? "", posting.department ?? ""]
    .join(" ")
    .toLowerCase();

  const matched = keywords.filter(k => text.includes(k.toLowerCase()));
  // Title match is worth more — double-count title hits
  const titleText = posting.title.toLowerCase();
  const titleMatched = keywords.filter(k => titleText.includes(k.toLowerCase()));

  const weightedMatches = new Set([...matched, ...titleMatched, ...titleMatched]); // title 2x
  const score = Math.min(100, Math.round((weightedMatches.size / Math.max(keywords.length * 0.3, 8)) * 100));
  return { score, matched };
}

// ---------------------------------------------------------------------------
// ID generator for openings
// ---------------------------------------------------------------------------

function generateOpeningId(companyId: string, existingRows: OpeningRow[]): string {
  const prefix = companyId.replace(/-\d+$/, ""); // VER-001 → VER
  const existing = existingRows.filter(r => r.id.startsWith(prefix + "-OPN-"));
  const maxN = existing.reduce((max, r) => {
    const n = parseInt(r.id.split("-OPN-")[1] ?? "0", 10);
    return Math.max(max, isNaN(n) ? 0 : n);
  }, 0);
  return `${prefix}-OPN-${String(maxN + 1).padStart(3, "0")}`;
}

// ---------------------------------------------------------------------------
// Tool: openings_scan
// ---------------------------------------------------------------------------

export const OpeningsScanTool: Tool = {
  name: "openings_scan",
  description: `Scans companies already in the user's job tracker (jobs.csv) to find their ACTUAL open roles with direct apply links.

This is the CORRECT way to find specific job postings — it uses the company's real ATS (Greenhouse, Ashby, Lever) to return verified, clickable apply URLs instead of hallucinating jobs.

Use this when the user asks:
- "What specific roles are open at my tracked companies?"
- "Find me specific jobs I can apply to"  
- "Drill into openings at Vercel / LangChain / Supabase"
- "What's open at my Tier 1 companies?"
- "Show me real job postings with direct links"

The tool reads careers_url + ats from jobs.csv, fetches live postings,
scores them against the user's resume, and returns a ranked table.

DO NOT use search_jobs for this — search_jobs is for discovering new companies.
openings_scan is for drilling into companies the user has already vetted.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      companies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Optional. Company names to scan (e.g. ['Vercel', 'LangChain']). Default: all Tier 1 companies with status 'To Apply' or 'Applied'.",
      },
      tier: {
        type: Type.NUMBER,
        description: "Optional. Filter by tier (1, 2, or 3). Default: 1.",
      },
      role_filter: {
        type: Type.STRING,
        description: "Optional. Keyword to filter job titles (e.g. 'engineer', 'solutions'). Case-insensitive.",
      },
      min_score: {
        type: Type.NUMBER,
        description: "Optional. Minimum resume match score to include (0–100). Default: 40.",
      },
      save: {
        type: Type.BOOLEAN,
        description: "Optional. Save discovered openings to job_openings.csv. Default: true.",
      },
      max_companies: {
        type: Type.NUMBER,
        description: "Optional. Max number of companies to scan per call. Default: 10 (to avoid long waits).",
      },
    },
    required: [],
  },
  execute: async (args: {
    companies?: string[];
    tier?: number;
    role_filter?: string;
    min_score?: number;
    save?: boolean;
    max_companies?: number;
  }) => {
    try {
      // Load companies from jobs.csv — use the same path-resolution as local-tracker.ts
      const csvPath = getJobsCsvPath();

      if (!existsSync(csvPath)) {
        return "❌ No jobs.csv found. Add some companies to your tracker first with tracker_add_job.";
      }

      const raw = readFileSync(csvPath, "utf-8");
      const lines = raw.trim().split("\n");
      const headers = lines[0].split(",");
      type CsvRow = Record<string, string>;
      const allJobs: CsvRow[] = lines.slice(1).filter(l => l.trim()).map(line => {
        const cols = parseCsvLine(line);
        const row: CsvRow = {};
        headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
        return row;
      });

      // Filter companies to scan
      let candidates = allJobs;

      if (args.companies && args.companies.length > 0) {
        const names = args.companies.map(c => c.toLowerCase());
        candidates = allJobs.filter(j =>
          names.some(n => j.company?.toLowerCase().includes(n))
        );
      } else {
        // Default: Tier 1 (or specified tier) with non-terminal status
        const targetTier = String(args.tier ?? 1);
        const TERMINAL_STATUSES = ["Rejected", "Ghosted", "Withdrawn", "Closed"];
        candidates = allJobs.filter(j =>
          j.tier === targetTier &&
          !TERMINAL_STATUSES.includes(j.status) &&
          j.careers_url?.startsWith("http")
        );
      }

      const maxCompanies = Math.min(args.max_companies ?? 10, 20);
      candidates = candidates.slice(0, maxCompanies);

      if (candidates.length === 0) {
        return "ℹ️ No matching companies found in your tracker. Add companies with tracker_add_job first, or broaden the filter.";
      }

      const minScore = args.min_score ?? 40;
      const keywords = await getResumeKeywords();
      const scanResults: ScanResult[] = [];

      process.stderr.write(`[openings_scan] Scanning ${candidates.length} companies...\n`);

      // Fetch from each ATS
      for (const job of candidates) {
        const { id, company, careers_url: careersUrl, ats } = job;
        const slug = extractSlug(careersUrl, ats);

        let postings: JobPosting[] = [];
        let error: string | undefined;

        try {
          if (ats === "Greenhouse" && slug) {
            postings = await fetchGreenhouseJobs(slug);
          } else if (ats === "Ashby" && slug) {
            postings = await fetchAshbyJobs(slug);
          } else if (ats === "Lever" && slug) {
            postings = await fetchLeverJobs(slug, careersUrl);
          } else {
            // Direct or unknown ATS — try HTML parse
            postings = await fetchDirectJobs(careersUrl);
          }
        } catch (err: any) {
          error = err.message?.slice(0, 100);
        }

        scanResults.push({ company, companyId: id, ats, postings, error });
        process.stderr.write(`  ${company}: ${postings.length} postings${error ? ` (⚠️ ${error})` : ""}\n`);
      }

      // Score + filter postings
      const { rows: existingOpenings, path: openingsPath } = loadOpenings();
      const newRows: OpeningRow[] = [];
      const reportSections: string[] = [];

      for (const result of scanResults) {
        const { company, companyId, ats, postings, error } = result;

        if (error && postings.length === 0) {
          reportSections.push(`\n⚠️  ${company} (${ats}): Could not fetch — ${error}`);
          continue;
        }

        // Apply role filter
        let filtered = postings;
        if (args.role_filter) {
          const kw = args.role_filter.toLowerCase();
          filtered = postings.filter(p => p.title.toLowerCase().includes(kw));
        }

        // Score + sort
        const scored = filtered
          .map(p => ({ posting: p, ...scorePosting(keywords, p) }))
          .filter(s => s.score >= minScore)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
          reportSections.push(
            `\n○ ${company} (${ats}) — ${postings.length} postings, none matched score ≥${minScore}%`
          );
          continue;
        }

        const lines: string[] = [
          `\n◆ ${company} (${ats}) — ${postings.length} open roles → ${scored.length} match above ${minScore}%`,
        ];

        for (const { posting, score, matched } of scored.slice(0, 8)) {
          lines.push(
            `  ★ [${score}%] ${posting.title}${posting.location ? `  [${posting.location}]` : ""}`,
            `     → ${posting.applyUrl}`
          );
          if (matched.length > 0) {
            lines.push(`     ✓ Keywords: ${matched.slice(0, 5).join(", ")}`);
          }

          // Build new row for job_openings.csv
          if (args.save !== false) {
            const existing = existingOpenings.find(
              r => r.company_id === companyId && r.posting_title === posting.title
            );
            if (!existing) {
              const newId = generateOpeningId(companyId, [...existingOpenings, ...newRows]);
              newRows.push({
                id: newId,
                company_id: companyId,
                company,
                posting_title: posting.title,
                apply_url: posting.applyUrl,
                ats,
                location: posting.location ?? "",
                match_score: String(score),
                match_keywords: matched.slice(0, 10).join("; "),
                status: "Found",
                date_found: today(),
                date_applied: "",
                notes: "",
              });
            }
          }
        }
        reportSections.push(lines.join("\n"));
      }

      // Persist new rows
      let savedCount = 0;
      if (args.save !== false && newRows.length > 0) {
        const allRows = [...existingOpenings, ...newRows];
        saveOpenings(allRows, openingsPath);
        savedCount = newRows.length;
      }

      const totalFound = scanResults.reduce((s, r) => s + r.postings.length, 0);
      const totalMatched = scanResults.reduce((s, r) =>
        s + r.postings.filter(p => scorePosting(keywords, p).score >= minScore).length, 0);

      return [
        `🔍 Job Openings Scan — ${candidates.length} companies, ${totalFound} live postings, ${totalMatched} matches`,
        "─".repeat(70),
        ...reportSections,
        "─".repeat(70),
        savedCount > 0
          ? `\n✅ Saved ${savedCount} new openings to job_openings.csv. Say "show my openings" to list them.`
          : "\n(No new openings saved — all already tracked or save=false.)",
        `\nTo apply: tell me which role interests you and I can help autofill the application.`,
      ].join("\n");
    } catch (err: any) {
      return `❌ openings_scan failed: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: openings_list
// ---------------------------------------------------------------------------

export const OpeningsListTool: Tool = {
  name: "openings_list",
  description: `List saved job openings from job_openings.csv.
Shows specific postings found by openings_scan, with match scores and direct apply URLs.
Use this to review what's been found and decide what to apply to.

Use when the user asks:
- "Show my job openings"
- "What openings have you found?"
- "List the jobs I should apply to"
- "What did the scan find?"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      status_filter: {
        type: Type.STRING,
        description: "Optional. Filter by status: Found | Reviewing | Applied | Rejected | Ghosted. Default: all.",
      },
      company_filter: {
        type: Type.STRING,
        description: "Optional. Filter by company name (partial match).",
      },
      min_score: {
        type: Type.NUMBER,
        description: "Optional. Minimum match score to show. Default: 0.",
      },
      sort_by: {
        type: Type.STRING,
        description: "Optional. Sort by: match_score | date_found | company. Default: match_score.",
      },
    },
    required: [],
  },
  execute: async (args: {
    status_filter?: string;
    company_filter?: string;
    min_score?: number;
    sort_by?: string;
  }) => {
    try {
      const { rows } = loadOpenings();

      if (rows.length === 0) {
        return "ℹ️ No job openings saved yet. Run openings_scan to discover real job postings from your tracked companies.";
      }

      let filtered = rows;

      if (args.status_filter) {
        filtered = filtered.filter(r =>
          r.status.toLowerCase() === args.status_filter!.toLowerCase()
        );
      }
      if (args.company_filter) {
        const kw = args.company_filter.toLowerCase();
        filtered = filtered.filter(r => r.company.toLowerCase().includes(kw));
      }
      if (args.min_score) {
        filtered = filtered.filter(r => Number(r.match_score) >= args.min_score!);
      }

      // Sort
      const sortBy = args.sort_by ?? "match_score";
      filtered.sort((a, b) => {
        if (sortBy === "match_score") return Number(b.match_score) - Number(a.match_score);
        if (sortBy === "date_found") return b.date_found.localeCompare(a.date_found);
        if (sortBy === "company") return a.company.localeCompare(b.company);
        return 0;
      });

      const lines: string[] = [
        `📋 Job Openings — ${filtered.length} of ${rows.length} total`,
        "─".repeat(70),
      ];

      // Group by status
      const byStatus = new Map<string, OpeningRow[]>();
      for (const r of filtered) {
        const s = r.status || "Found";
        if (!byStatus.has(s)) byStatus.set(s, []);
        byStatus.get(s)!.push(r);
      }

      const STATUS_ICONS: Record<string, string> = {
        Found: "🔍", Reviewing: "📖", Applied: "✅", Rejected: "❌", Ghosted: "👻",
      };

      for (const [status, group] of byStatus) {
        lines.push(`\n${STATUS_ICONS[status] ?? "○"} ${status} (${group.length})`);
        for (const r of group) {
          lines.push(
            `  [${String(r.match_score).padStart(3)}%] ${r.company} — ${r.posting_title}`,
            `         📍 ${r.location || "Location not specified"}`,
            `         🔗 ${r.apply_url}`
          );
          if (r.date_applied) lines.push(`         Applied: ${r.date_applied}`);
        }
      }

      lines.push("─".repeat(70));
      lines.push(`\nTo apply: say "mark [opening-id] as applied on [date]" or "help me apply to [company] [role]".`);
      lines.push(`Opening IDs: ${filtered.slice(0, 5).map(r => r.id).join(", ")}${filtered.length > 5 ? ", ..." : ""}`);

      return lines.join("\n");
    } catch (err: any) {
      return `❌ openings_list failed: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: openings_apply
// ---------------------------------------------------------------------------

const OPENING_VALID_STATUSES = ["Found", "Reviewing", "Applied", "Rejected", "Ghosted"] as const;

export const OpeningsApplyTool: Tool = {
  name: "openings_apply",
  description: `Mark a specific job opening in job_openings.csv as Applied (or update its status).
REQUIRES explicit date_applied when marking as Applied — never infer the date autonomously.

Use when the user says:
- "I applied to the Vercel Developer Success Engineer role today"
- "Mark VER-OPN-001 as applied on 2026-04-14"
- "Update the LangChain opening status to Reviewing"`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      opening_id: {
        type: Type.STRING,
        description: "The opening ID from job_openings.csv (e.g. VER-OPN-001). Required.",
      },
      status: {
        type: Type.STRING,
        description: `New status: Found | Reviewing | Applied | Rejected | Ghosted.`,
      },
      date_applied: {
        type: Type.STRING,
        description: "ISO date of application (e.g. 2026-04-14). REQUIRED when status = Applied.",
      },
      notes: {
        type: Type.STRING,
        description: "Optional notes to append (not replace).",
      },
    },
    required: ["opening_id"],
  },
  execute: async (args: {
    opening_id: string;
    status?: string;
    date_applied?: string;
    notes?: string;
  }) => {
    try {
      const { rows, path } = loadOpenings();
      const idx = rows.findIndex(r => r.id.toLowerCase() === args.opening_id.toLowerCase());

      if (idx === -1) {
        const ids = rows.slice(0, 10).map(r => r.id).join(", ");
        return `❌ Opening ID "${args.opening_id}" not found.\nAvailable IDs: ${ids}`;
      }

      const row = { ...rows[idx] };
      const changes: string[] = [];

      if (args.status) {
        if (!OPENING_VALID_STATUSES.includes(args.status as any)) {
          return `❌ Invalid status "${args.status}". Valid: ${OPENING_VALID_STATUSES.join(", ")}`;
        }
        // Gate: Applied requires explicit date
        if (args.status === "Applied" && !args.date_applied && row.status !== "Applied") {
          return (
            `⚠️  CONFIRMATION REQUIRED\n` +
            `To mark "${row.company} — ${row.posting_title}" as Applied, provide the date:\n` +
            `  Example: "Yes, mark ${args.opening_id} as Applied on ${today()}"`
          );
        }
        changes.push(`status: ${row.status} → ${args.status}`);
        row.status = args.status;
      }

      if (args.date_applied) {
        row.date_applied = args.date_applied;
        changes.push(`date_applied: ${args.date_applied}`);
      } else if (row.status === "Applied" && !row.date_applied) {
        row.date_applied = today();
        changes.push(`date_applied: ${today()} (auto)`);
      }

      if (args.notes) {
        const existing = row.notes ? row.notes + "; " : "";
        row.notes = (existing + args.notes).slice(0, 500);
        changes.push(`notes: appended`);
      }

      rows[idx] = row;
      saveOpenings(rows, path);

      return [
        `✅ Updated opening ${args.opening_id}:`,
        ...changes.map(c => `  • ${c}`),
        ``,
        `${row.company} — ${row.posting_title}`,
        `Status: ${row.status}${row.date_applied ? ` (applied ${row.date_applied})` : ""}`,
        `🔗 ${row.apply_url}`,
      ].join("\n");
    } catch (err: any) {
      return `❌ openings_apply failed: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ALL_JOB_OPENINGS_TOOLS: Tool[] = [
  OpeningsScanTool,
  OpeningsListTool,
  OpeningsApplyTool,
];
