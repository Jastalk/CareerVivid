/**
 * local-tracker.ts — Local CSV job tracker tools for the CareerVivid Job Agent.
 *
 * Schema v2 — 26 columns tracking status, attention, effort, and pipeline health:
 *   Core:        id, company, role, tier, careers_url, ats, status
 *   Timeline:    date_added, date_applied, follow_up_date, last_activity_date
 *   Contact:     contact, contact_email
 *   Salary:      salary_min, salary_max, location
 *   Quality:     notes, fit_score, referral
 *   Attention:   attention_score, apply_effort, prep_time_hours, excitement
 *   Research:    company_stage, open_roles_count, interview_rounds
 *
 * Tools:
 *   list_local_jobs       → read rows, optionally filtered
 *   update_local_job      → update any field on a row by ID
 *   add_local_job         → append a new company row
 *   score_pipeline        → attention-ranked priority view (what should I work on?)
 *   get_pipeline_metrics  → aggregate analytics dashboard
 *   flag_stale_jobs       → surface companies with no recent activity
 */

import { Tool } from "../Tool.js";
import { Type } from "@google/genai";
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, renameSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { verifyUrl } from "./urlVerifier.js";

// ---------------------------------------------------------------------------
// Job entry validation harness
// ---------------------------------------------------------------------------

/** Patterns that strongly suggest an AI-hallucinated company name. */
const HALLUCINATED_COMPANY_PATTERNS = [
  /synthai/i,
  /innovatex/i,
  /innovatech/i,
  /datagenius/i,
  /nexusai/i,
  /quantumflow/i,
  /skymind/i,
  /integratex/i,
  /aiworks/i,
  /techsolutions\s*inc/i,
  /aether\s*systems/i,
  /cogni(serve|tech|flow)/i,
  /gentech\s*ai/i,
  /brightspark\s*labs/i,
  /synapse\s*tech/i,
  /veridian\s*ai/i,
  // Generic filler patterns: "XYZ AI", "XYZ Solutions", "XYZ Labs" with single-word prefix
  /^[A-Z][a-z]+(\s*(AI|Solutions|Labs|Systems|Technologies|Innovations|Tech|Ventures))+$/,
];

export interface JobValidationResult {
  ok: boolean;
  blockers: string[];   // hard failures — do not write
  warnings: string[];   // soft issues — write but annotate in notes
}

/**
 * Pre-add validation harness.
 * Runs structural + network checks before any row is written to jobs.csv.
 */
async function validateJobEntry(
  company: string,
  careersUrl?: string
): Promise<JobValidationResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // ── 1. Company name hallucination check ──────────────────────────────────
  for (const pattern of HALLUCINATED_COMPANY_PATTERNS) {
    if (pattern.test(company)) {
      blockers.push(
        `Company name "${company}" matches a known hallucination pattern. ` +
        `Verify this is a real company before adding.`
      );
      break;
    }
  }

  // ── 2. URL verification (if provided) ────────────────────────────────────
  if (careersUrl && careersUrl.startsWith("http")) {
    const urlResult = await verifyUrl(careersUrl);
    if (!urlResult.ok) {
      blockers.push(
        `URL verification failed: ${urlResult.reason.replace(/^[❌⚠️✅]\s*/u, "")}`
      );
    } else if (urlResult.warning) {
      warnings.push(`URL: ${urlResult.warning}`);
    }

    // ── 3. Domain ↔ company name coherence check ─────────────────────────
    if (careersUrl.startsWith("http")) {
      try {
        const parsed  = new URL(careersUrl);
        const domain  = parsed.hostname.replace(/^www\./, "").split(".")[0].toLowerCase();
        const coName  = company.toLowerCase().replace(/[^a-z0-9]/g, "");
        const coShort = coName.slice(0, 5); // first 5 chars of company (no-spaces)

        // Flag if domain has zero overlap with company name (e.g., stripe.com for "JPMorgan")
        const domainMatchesCompany =
          domain.includes(coShort) ||
          coName.includes(domain) ||
          domain.length < 4; // short generics (e.g., "wk2" for Workday) are inconclusive

        if (!domainMatchesCompany) {
          warnings.push(
            `Domain "${parsed.hostname}" may not match company "${company}" — double-check this is the right URL.`
          );
        }
      } catch {
        // URL parse failed — already caught in verifyUrl
      }
    }
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

// ---------------------------------------------------------------------------
// CSV path resolution
// ---------------------------------------------------------------------------

function getCsvPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = dirname(__filename);
  // 1. Check dev repo locations first (for existing users/contributors)
  const devCandidates = [
    resolve(__dirname, "../../../../career-vivid/data/jobs.csv"),
    resolve(__dirname, "../../../../../career-vivid/data/jobs.csv"),
    resolve(process.cwd(), "career-vivid/data/jobs.csv"),
  ];
  for (const p of devCandidates) { if (existsSync(p)) return p; }

  // 2. Global user data directory (~/.careervivid/jobs.csv) for external/installed users
  return resolve(homedir(), ".careervivid", "jobs.csv");
}

// ---------------------------------------------------------------------------
// Schema v2
// ---------------------------------------------------------------------------

const HEADERS = [
  // Core
  "id", "company", "role", "tier", "careers_url", "ats", "status",
  // Timeline
  "date_added", "date_applied", "follow_up_date",
  // Contact
  "contact", "contact_email",
  // Salary
  "salary_min", "salary_max", "location",
  // Quality
  "notes", "fit_score", "referral",
  // Attention matrix (v2)
  "attention_score",    // 1–10: how top-of-mind is this right now?
  "apply_effort",       // Low / Medium / High
  "prep_time_hours",    // float: estimated hours to prep before applying
  "excitement",         // 1–10: pure enthusiasm independent of fit
  "company_stage",      // Seed / Series A-C / Public / Enterprise
  "open_roles_count",   // how many roles open at the company
  "interview_rounds",   // known rounds (from research or experience)
  "last_activity_date", // auto-stamped on every update
] as const;

type CsvHeader = typeof HEADERS[number];
type CsvRow = Record<CsvHeader, string>;

// ---------------------------------------------------------------------------
// CSV parsing & serialization
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"')             { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(cur); cur = ""; }
    else                        { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const fileHeaders = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Partial<CsvRow> = {};
    HEADERS.forEach((h) => {
      const idx = fileHeaders.indexOf(h);
      row[h] = idx >= 0 ? (cols[idx] ?? "").trim() : "";
    });
    return row as CsvRow;
  });
}

/** Validate a parsed row has the minimum viable fields. Returns true if usable. */
function isValidRow(row: CsvRow, lineNum: number): boolean {
  if (!row.id || !/^[A-Z]{1,5}-\d{3,}$/.test(row.id)) {
    process.stderr.write(`[tracker] Skipping corrupt row ${lineNum}: id="${row.id}" is malformed\n`);
    return false;
  }
  if (!row.company) {
    process.stderr.write(`[tracker] Skipping row ${lineNum} (id=${row.id}): missing company\n`);
    return false;
  }
  // Numeric fields must parse or be empty
  for (const field of ["attention_score", "excitement", "fit_score"] as const) {
    const v = row[field];
    if (v !== "" && isNaN(Number(v))) {
      process.stderr.write(`[tracker] Row ${row.id}: field ${field}="${v}" is not numeric — resetting to 7\n`);
      row[field] = "7";
    }
  }
  return true;
}

function serializeCsv(rows: CsvRow[]): string {
  const header = HEADERS.join(",");
  const data = rows.map((row) =>
    HEADERS.map((h) => {
      const val = row[h] ?? "";
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",")
  );
  return [header, ...data].join("\n") + "\n";
}

function loadCsv(): { rows: CsvRow[]; path: string } {
  const path = getCsvPath();
  if (!existsSync(path)) {
    // Auto-bootstrap: create parent directory + empty CSV with headers
    const dir = resolve(path, "..");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, HEADERS.join(",") + "\n", "utf-8");
    console.log(`\n📋 Created your job tracker at: ${path}`);
    console.log(`   Add jobs with cv agent, or edit the CSV directly.\n`);
  }
  const raw = readFileSync(path, "utf-8");
  const allRows = parseCsv(raw);
  // #2 Schema validation — filter out rows that would cause runtime crashes
  const rows = allRows.filter((r, i) => isValidRow(r, i + 2)); // +2: 1-indexed + header line
  return { rows, path };
}

function saveCsv(rows: CsvRow[], csvPath: string): void {
  const lockPath = csvPath + ".lock";

  // #8 Lock file — prevent concurrent session writes
  if (existsSync(lockPath)) {
    let staleMs = 30_000; // if lock is >30s old, assume stale and proceed
    try { staleMs = Date.now() - statSync(lockPath).mtimeMs; } catch { /* */ }
    if (staleMs < 10_000) {
      throw new Error(
        "⛔ Another agent session is writing to jobs.csv. Wait a moment and try again."
      );
    }
    // Stale lock — remove it
    try { unlinkSync(lockPath); } catch { /* */ }
  }

  // Acquire lock
  writeFileSync(lockPath, String(Date.now()), "utf-8");

  try {
    // #1 Backup
    if (existsSync(csvPath)) {
      copyFileSync(csvPath, csvPath + ".bak");
    }

    // #1 Atomic write — write to .tmp then rename (crash-safe)
    const tmpPath = csvPath + ".tmp";
    writeFileSync(tmpPath, serializeCsv(rows), "utf-8");
    renameSync(tmpPath, csvPath);
  } finally {
    // Always release the lock
    try { unlinkSync(lockPath); } catch { /* */ }
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const then = new Date(dateStr).getTime();
  return Math.floor((Date.now() - then) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Priority score formula
// attention (40%) + excitement (30%) + fit_score (20%) + latency_bonus (10%)
// ---------------------------------------------------------------------------

function priorityScore(row: CsvRow): number {
  const att  = Math.min(10, Math.max(0, Number(row.attention_score) || 5));
  const exc  = Math.min(10, Math.max(0, Number(row.excitement) || 5));
  const fit  = Math.min(10, Math.max(0, Number(row.fit_score)   || 5));
  const stale = Math.max(0, 10 - daysSince(row.last_activity_date));
  return (0.40 * att + 0.30 * exc + 0.20 * fit + 0.10 * stale);
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const VALID_STATUSES = [
  "To Apply", "Applied", "Phone Screen", "Interview", "Offer", "Rejected", "Ghosted",
] as const;

const STATUS_ICONS: Record<string, string> = {
  "To Apply":    "⬜",
  "Applied":     "📤",
  "Phone Screen":"📞",
  "Interview":   "🎯",
  "Offer":       "🎉",
  "Rejected":    "❌",
  "Ghosted":     "👻",
};

const EFFORT_ICONS: Record<string, string> = {
  "Low":    "🟢",
  "Medium": "🟡",
  "High":   "🔴",
};

// ---------------------------------------------------------------------------
// Tool: list_local_jobs
// ---------------------------------------------------------------------------

export const ListLocalJobsTool: Tool = {
  name: "tracker_list_jobs",
  description: `Read the job pipeline from jobs.csv (the career-ops tracker spreadsheet).
Returns a formatted summary of target companies grouped by tier and status.
Use this when the user asks to "show my job pipeline", "list target companies",
"what companies am I targeting?", "check my pipeline", etc.
Shows attention scores, apply effort, excitement, and follow-up dates.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      _run: {
        type: Type.BOOLEAN,
        description: "Always set this to true to execute the tool.",
      },
      tier: {
        type: Type.NUMBER,
        description: "Optional. Filter to a specific priority tier (1, 2, or 3).",
      },
      status: {
        type: Type.STRING,
        description:
          'Optional. Filter by status: "To Apply", "Applied", "Phone Screen", "Interview", "Offer", "Rejected", "Ghosted".',
      },
      show_applied_only: {
        type: Type.BOOLEAN,
        description: "Optional. If true, only show companies already applied to.",
      },
      sort_by: {
        type: Type.STRING,
        description: 'Optional. "priority" (att+exc+fit formula), "attention", "excitement", "fit". Default: none.',
      },
    },
    required: ["_run"],
  },
  execute: async (args: {
    tier?: number;
    status?: string;
    show_applied_only?: boolean;
    sort_by?: string;
  }) => {
    try {
      const { rows } = loadCsv();
      if (rows.length === 0) {
        return "jobs.csv is empty.";
      }

      let filtered = rows;
      if (args.tier)             filtered = filtered.filter((r) => r.tier === String(args.tier));
      if (args.status)           filtered = filtered.filter((r) => r.status.toLowerCase() === args.status!.toLowerCase());
      if (args.show_applied_only) filtered = filtered.filter((r) => r.status !== "To Apply");

      // Sort
      if (args.sort_by === "priority") {
        filtered = [...filtered].sort((a, b) => priorityScore(b) - priorityScore(a));
      } else if (args.sort_by === "attention") {
        filtered = [...filtered].sort((a, b) => Number(b.attention_score) - Number(a.attention_score));
      } else if (args.sort_by === "excitement") {
        filtered = [...filtered].sort((a, b) => Number(b.excitement) - Number(a.excitement));
      } else if (args.sort_by === "fit") {
        filtered = [...filtered].sort((a, b) => Number(b.fit_score) - Number(a.fit_score));
      }

      if (filtered.length === 0) {
        return `No jobs found matching the filter. Try list_local_jobs with no filters.`;
      }

      const TIER_LABELS: Record<string, string> = {
        "1": "🥇 Tier 1 — Dream Targets",
        "2": "🥈 Tier 2 — Strong Fit",
        "3": "🥉 Tier 3 — Pipeline",
      };

      const byTier: Record<string, CsvRow[]> = {};
      for (const row of filtered) {
        const t = row.tier || "?";
        if (!byTier[t]) byTier[t] = [];
        byTier[t].push(row);
      }

      const lines: string[] = [
        `Local Job Pipeline — ${filtered.length} of ${rows.length} companies`,
        "─".repeat(62),
      ];

      for (const tier of ["1", "2", "3", "?"]) {
        const group = byTier[tier];
        if (!group || group.length === 0) continue;
        lines.push(`\n${TIER_LABELS[tier] || `Tier ${tier}`} (${group.length})`);

        for (const r of group) {
          const icon      = STATUS_ICONS[r.status] ?? "⬜";
          const effort    = EFFORT_ICONS[r.apply_effort] ?? "🟡";
          const attention = r.attention_score ? `👁 ${r.attention_score}/10` : "";
          const excitement = r.excitement ? `⚡${r.excitement}/10` : "";
          const fit       = r.fit_score ? `🎯${r.fit_score}/10` : "";
          const salary    = r.salary_min && r.salary_max
            ? ` $${Number(r.salary_min).toLocaleString()}–$${Number(r.salary_max).toLocaleString()}`
            : "";
          const followUp  = r.follow_up_date ? ` | ⏰ Follow up: ${r.follow_up_date}` : "";
          const stale     = r.last_activity_date && daysSince(r.last_activity_date) > 7
            ? ` ⚠️ ${daysSince(r.last_activity_date)}d stale`
            : "";

          lines.push(`  ${icon} [${r.id}] ${r.company} — ${r.role}`);
          lines.push(`     ${attention}  ${excitement}  ${fit}  ${effort} effort${salary}`);
          lines.push(`     Status: ${r.status} | ATS: ${r.ats} | ${r.location}${followUp}${stale}`);
          if (r.notes) lines.push(`     📝 ${r.notes.substring(0, 100)}`);
          lines.push("");
        }
      }

      // Summary
      const counts: Record<string, number> = {};
      for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
      lines.push("─".repeat(62));
      lines.push("Pipeline Summary:");
      for (const [status, count] of Object.entries(counts)) {
        const icon = STATUS_ICONS[status] ?? "⬜";
        lines.push(`  ${icon} ${status.padEnd(14)} ${count}`);
      }

      return lines.join("\n");
    } catch (err: any) {
      return `❌ Error reading jobs.csv: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: update_local_job
// ---------------------------------------------------------------------------

export const UpdateLocalJobTool: Tool = {
  name: "tracker_update_job",
  description: `Update any field on a row in jobs.csv by job ID.
Use this for:
- Status changes: "Mark WorkOS as Applied"
- Attention updates: "Set attention_score for CUR-001 to 10"
- Follow-up dates: "Set follow-up for NEO-001 to 2026-04-20"
- Notes: "Add note to VER-001: great culture, hiring manager is Jane"
- Excitement: "Update excitement for TMP-001 to 9"
Auto-stamps last_activity_date on every update.
IMPORTANT: To change status to 'Applied', you MUST also provide date_applied (YYYY-MM-DD). Otherwise return a confirmation prompt.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      job_id:           { type: Type.STRING,  description: "The job ID to update, e.g. SUP-001. Get IDs via list_local_jobs." },
      status:           { type: Type.STRING,  description: 'New status. One of: "To Apply","Applied","Phone Screen","Interview","Offer","Rejected","Ghosted".' },
      date_applied:     { type: Type.STRING,  description: "Date applied, YYYY-MM-DD." },
      follow_up_date:   { type: Type.STRING,  description: "Follow-up date, YYYY-MM-DD." },
      contact:          { type: Type.STRING,  description: "Recruiter or hiring manager name." },
      contact_email:    { type: Type.STRING,  description: "Recruiter email." },
      notes:            { type: Type.STRING,  description: "Notes to append (not replace) to existing notes." },
      attention_score:  { type: Type.NUMBER,  description: "Attention score 1–10: how top-of-mind is this company right now?" },
      apply_effort:     { type: Type.STRING,  description: 'Apply effort: "Low", "Medium", or "High".' },
      prep_time_hours:  { type: Type.NUMBER,  description: "Estimated prep hours before applying." },
      excitement:       { type: Type.NUMBER,  description: "Excitement 1–10: pure enthusiasm for this company/role." },
      company_stage:    { type: Type.STRING,  description: 'Company stage: "Seed", "Series A-C", "Public", "Enterprise".' },
      open_roles_count: { type: Type.NUMBER,  description: "Number of currently open roles at the company." },
      interview_rounds: { type: Type.NUMBER,  description: "Known number of interview rounds." },
    },
    required: ["job_id"],
  },
  execute: async (args: {
    job_id: string;
    status?: string;
    date_applied?: string;
    follow_up_date?: string;
    contact?: string;
    contact_email?: string;
    notes?: string;
    attention_score?: number;
    apply_effort?: string;
    prep_time_hours?: number;
    excitement?: number;
    company_stage?: string;
    open_roles_count?: number;
    interview_rounds?: number;
  }) => {
    try {
      const { rows, path } = loadCsv();
      const idx = rows.findIndex((r) => r.id.toLowerCase() === args.job_id.toLowerCase());
      if (idx === -1) {
        return `❌ Job ID "${args.job_id}" not found.\nAvailable IDs: ${rows.map((r) => r.id).join(", ")}`;
      }

      const row = { ...rows[idx] };
      const changes: string[] = [];

      if (args.status) {
        if (!VALID_STATUSES.includes(args.status as any)) {
          return `❌ Invalid status "${args.status}". Valid: ${VALID_STATUSES.join(", ")}`;
        }
        // Gate: Applied requires explicit date_applied to prevent autonomous escalation
        if (args.status === "Applied" && !args.date_applied && row.status !== "Applied") {
          return (
            `⚠️  CONFIRMATION REQUIRED\n` +
            `To mark "${row.company} — ${row.role}" as Applied, please confirm with a date:\n` +
            `  Example: "Yes, mark ${args.job_id} as Applied on ${today()}"`
          );
        }
        changes.push(`status: ${row.status} → ${args.status}`);
        row.status = args.status;
        if (args.status === "Applied" && !row.date_applied) {
          row.date_applied = args.date_applied ?? today();
          changes.push(`date_applied: ${row.date_applied}`);
        }
      }
      if (args.date_applied)     { changes.push(`date_applied: ${args.date_applied}`);    row.date_applied = args.date_applied; }
      if (args.follow_up_date)   { changes.push(`follow_up_date: ${args.follow_up_date}`); row.follow_up_date = args.follow_up_date; }
      if (args.contact)          { changes.push(`contact: ${args.contact}`);               row.contact = args.contact; }
      if (args.contact_email) {
        // #10 Email sanitization — allow only valid email characters
        const sanitized = args.contact_email.replace(/[^a-zA-Z0-9@._+\-]/g, "").slice(0, 254);
        if (sanitized !== args.contact_email) {
          changes.push(`contact_email (sanitized): ${sanitized}`);
        } else {
          changes.push(`contact_email: ${sanitized}`);
        }
        row.contact_email = sanitized;
      }
      if (args.attention_score !== undefined) {
        const v = Math.min(10, Math.max(1, Math.round(args.attention_score)));
        changes.push(`attention_score: ${row.attention_score} → ${v}`);
        row.attention_score = String(v);
      }
      if (args.apply_effort)     { changes.push(`apply_effort: ${args.apply_effort}`);     row.apply_effort = args.apply_effort; }
      if (args.prep_time_hours !== undefined) {
        // #5 Clamp 0-200 hours (reasonable upper bound)
        const v = Math.max(0, Math.min(200, Math.round(Number(args.prep_time_hours) || 0)));
        changes.push(`prep_time_hours: ${v}`);
        row.prep_time_hours = String(v);
      }
      if (args.excitement !== undefined) {
        const v = Math.min(10, Math.max(1, Math.round(args.excitement)));
        changes.push(`excitement: ${row.excitement} → ${v}`);
        row.excitement = String(v);
      }
      if (args.company_stage)    { changes.push(`company_stage: ${args.company_stage}`);   row.company_stage = args.company_stage; }
      if (args.open_roles_count !== undefined) {
        changes.push(`open_roles_count: ${args.open_roles_count}`);
        row.open_roles_count = String(args.open_roles_count);
      }
      if (args.interview_rounds !== undefined) {
        changes.push(`interview_rounds: ${args.interview_rounds}`);
        row.interview_rounds = String(args.interview_rounds);
      }
      if (args.notes) {
        const MAX_NOTES = 500;
        const appendText = args.notes.length > 200 ? args.notes.slice(0, 200) + "…" : args.notes;
        const existing = row.notes ? row.notes + "; " : "";
        row.notes = (existing + appendText).replace(/,/g, ";").slice(0, MAX_NOTES);
        changes.push(`notes: appended "${appendText.substring(0, 60)}"`);
      }

      if (changes.length === 0) {
        return `No changes specified for ${args.job_id}. Provide at least one field to update.`;
      }

      // Always stamp last_activity_date
      row.last_activity_date = today();

      rows[idx] = row;
      saveCsv(rows, path);

      const priority = priorityScore(row).toFixed(1);
      return (
        `✅ Updated ${row.id} — ${row.company} (${row.role})\n` +
        changes.map((c) => `  • ${c}`).join("\n") +
        `\n  • last_activity_date: ${today()}` +
        `\n\nPriority Score: ${priority}/10`
      );
    } catch (err: any) {
      return `❌ Error updating jobs.csv: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: add_local_job
// ---------------------------------------------------------------------------

export const AddLocalJobTool: Tool = {
  name: "tracker_add_job",
  description: `Add a new company/role row to jobs.csv (the career-ops pipeline tracker).
Use this when the user says:
- "Add Linear to my job tracker"
- "Track this company: [name], [role], [url]"
- "Add a Tier 1 target: Neon"
Auto-generates a unique ID (e.g. LIN-001) and sets date_added + last_activity_date to today.
IMPORTANT: Before calling this, check tracker_list_jobs to ensure the company+role is not already tracked.
IMPORTANT: Provide a careers_url. The tool will verify the URL is live before writing.
IMPORTANT: The tool auto-validates: dead URLs and hallucinated company names are BLOCKED.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      company:          { type: Type.STRING,  description: "Company name." },
      role:             { type: Type.STRING,  description: "Job title / role." },
      tier:             { type: Type.NUMBER,  description: "Priority tier: 1, 2, or 3. Default: 2." },
      careers_url:      { type: Type.STRING,  description: "URL to job posting or careers page." },
      ats:              { type: Type.STRING,  description: 'ATS: "Ashby", "Greenhouse", "Lever", "Direct", "Other". Default: "Direct".' },
      location:         { type: Type.STRING,  description: 'Location. Default: "Remote".' },
      salary_min:       { type: Type.NUMBER,  description: "Min salary (number only)." },
      salary_max:       { type: Type.NUMBER,  description: "Max salary (number only)." },
      notes:            { type: Type.STRING,  description: "Notes about the role." },
      fit_score:        { type: Type.NUMBER,  description: "Fit score 1–10. Default: 7." },
      attention_score:  { type: Type.NUMBER,  description: "Attention score 1–10. Default: 7." },
      excitement:       { type: Type.NUMBER,  description: "Excitement 1–10. Default: 7." },
      apply_effort:     { type: Type.STRING,  description: '"Low", "Medium", or "High". Default: "Medium".' },
      company_stage:    { type: Type.STRING,  description: '"Seed", "Series A-C", "Public", "Enterprise". Default: "Series A-C".' },
    },
    required: ["company"],
  },
  execute: async (args: {
    company: string; role?: string; tier?: number;
    careers_url?: string; ats?: string; location?: string;
    salary_min?: number; salary_max?: number; notes?: string;
    fit_score?: number; attention_score?: number; excitement?: number;
    apply_effort?: string; company_stage?: string;
  }) => {
    try {
      const { rows, path } = loadCsv();

      // ── Fix 1: Duplicate detection (company + role must be unique) ──────
      const duplicate = rows.find(
        (r) =>
          r.company.toLowerCase() === args.company.toLowerCase() &&
          (r.role ?? "").toLowerCase() === (args.role ?? "").toLowerCase()
      );
      if (duplicate) {
        return (
          `⚠️  Duplicate detected: "${args.company} — ${args.role ?? "TBD"}" already exists (ID: ${duplicate.id}).\n` +
          `Use tracker_update_job with job_id="${duplicate.id}" to update it instead.`
        );
      }

      const prefix   = args.company.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "JOB";
      const existing = rows.filter((r) => r.id.startsWith(prefix + "-")).length;
      const id       = `${prefix}-${String(existing + 1).padStart(3, "0")}`;
      const todayStr = today();

      // ── Validation harness (URL + company name) ────────────────────────
      const validation = await validateJobEntry(args.company, args.careers_url);
      if (!validation.ok) {
        return (
          `❌ Cannot add "${args.company}" — validation failed:\n` +
          validation.blockers.map(b => `  • ${b}`).join("\n") +
          `\n\nFix these issues and try again, or ask the user to confirm the company is real.`
        );
      }

      // ── Fix 2: No URL = unverified origin → cap attention, add warning ──
      const hasUrl = !!(args.careers_url && args.careers_url.startsWith("http"));
      const cappedAttention = hasUrl
        ? Math.min(10, args.attention_score ?? 7)
        : Math.min(4, args.attention_score ?? 4);
      const unverifiedNote = hasUrl ? "" : "⚠️ No verified URL — confirm role exists before applying.";

      // ── Fix 4: Salary fields must be numeric only ─────────────────────
      const parseSalary = (v?: number) => (v && !isNaN(v) ? String(Math.round(v)) : "");

      const baseNotes = (args.notes ?? "").replace(/,/g, ";");
      const warningNotes = validation.warnings.map(w => `⚠️ ${w}`).join("; ");
      const combinedNotes = [baseNotes, unverifiedNote, warningNotes].filter(Boolean).join("; ").slice(0, 500);

      const newRow: CsvRow = {
        id,
        company:          args.company,
        role:             args.role ?? "TBD",
        tier:             String(args.tier ?? 2),
        careers_url:      args.careers_url ?? "",
        ats:              args.ats ?? "Direct",
        status:           "To Apply",   // Fix 3: always To Apply — never Applied at creation
        date_added:       todayStr,
        date_applied:     "",
        follow_up_date:   "",
        contact:          "",
        contact_email:    "",
        salary_min:       parseSalary(args.salary_min),
        salary_max:       parseSalary(args.salary_max),
        location:         args.location ?? "Remote",
        notes:            combinedNotes,
        fit_score:        String(args.fit_score ?? 7),
        referral:         "false",
        attention_score:  String(cappedAttention),
        apply_effort:     args.apply_effort ?? "Medium",
        prep_time_hours:  "2",
        excitement:       String(Math.min(10, args.excitement ?? 7)),
        company_stage:    args.company_stage ?? "Series A-C",
        open_roles_count: "",
        interview_rounds: "",
        last_activity_date: todayStr,
      };

      rows.push(newRow);
      saveCsv(rows, path);

      const salary = args.salary_min && args.salary_max
        ? `$${args.salary_min.toLocaleString()}–$${args.salary_max.toLocaleString()}`
        : "Not specified";
      const priority = priorityScore(newRow).toFixed(1);

      const urlBadge = hasUrl ? "✅ Verified" : "⚠️ Unverified";
      const warningSection = validation.warnings.length > 0
        ? `\n  Warnings:\n` + validation.warnings.map(w => `    ⚠️  ${w}`).join("\n")
        : "";

      return (
        `✅ Added to jobs.csv!\n\n` +
        `  ID:             ${id}\n` +
        `  Company:        ${args.company}\n` +
        `  Role:           ${args.role ?? "TBD"}\n` +
        `  Tier:           ${args.tier ?? 2}\n` +
        `  ATS:            ${args.ats ?? "Direct"}\n` +
        `  Location:       ${args.location ?? "Remote"}\n` +
        `  Salary:         ${salary}\n` +
        `  Attention:      ${cappedAttention}/10\n` +
        `  Excitement:     ${args.excitement ?? 7}/10\n` +
        `  Apply Effort:   ${args.apply_effort ?? "Medium"}\n` +
        `  Priority Score: ${priority}/10\n` +
        `  Status:         To Apply\n` +
        `  URL:            ${args.careers_url || "None"} [${urlBadge}]\n` +
        warningSection
      );
    } catch (err: any) {
      return `❌ Error adding to jobs.csv: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: score_pipeline
// ---------------------------------------------------------------------------

export const ScorePipelineTool: Tool = {
  name: "tracker_rank_priority",
  description: `Rank the jobs.csv pipeline by weighted priority score.
  Formula: 40% attention_score + 30% excitement + 20% fit_score + 10% recency_bonus
Use this when the user asks: "What should I work on today?", "Which jobs are highest priority?",
"What's my best ROI right now?", "Rank my pipeline", "Easy wins first".
Also returns quick-apply opportunities (Low effort + high score) separately.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      _run: {
        type: Type.BOOLEAN,
        description: "Always set this to true to execute the tool.",
      },
      top_n: {
        type: Type.NUMBER,
        description: "How many top companies to show. Default: 10.",
      },
      status_filter: {
        type: Type.STRING,
        description: 'Limit to a status. E.g. "To Apply" to see only unapplied roles.',
      },
      highlight_easy: {
        type: Type.BOOLEAN,
        description: "If true, highlight Low-effort quick-apply opportunities separately. Default: true.",
      },
    },
    required: ["_run"],
  },
  execute: async (args: { top_n?: number; status_filter?: string; highlight_easy?: boolean }) => {
    try {
      const { rows } = loadCsv();
      const active = args.status_filter
        ? rows.filter((r) => r.status.toLowerCase() === args.status_filter!.toLowerCase())
        : rows.filter((r) => !["Rejected", "Ghosted"].includes(r.status));

      const sorted = [...active].sort((a, b) => priorityScore(b) - priorityScore(a));
      const topN = sorted.slice(0, args.top_n ?? 10);

      const lines: string[] = [
        "🏆 Priority-Ranked Pipeline",
        "  Formula: 40% attention + 30% excitement + 20% fit + 10% recency",
        "─".repeat(62),
      ];

      topN.forEach((r, i) => {
        const ps      = priorityScore(r).toFixed(1);
        const effort  = EFFORT_ICONS[r.apply_effort] ?? "🟡";
        const status  = STATUS_ICONS[r.status] ?? "⬜";
        const stale   = r.last_activity_date && daysSince(r.last_activity_date) > 7
          ? ` ⚠️ ${daysSince(r.last_activity_date)}d`
          : "";
        lines.push(
          `  ${String(i + 1).padStart(2)}. [${ps}/10] ${r.company.padEnd(20)} ${r.role.substring(0, 28).padEnd(28)}`
        );
        lines.push(
          `      ${status} ${r.status.padEnd(12)} ${effort} ${r.apply_effort.padEnd(7)} ` +
          `👁${r.attention_score} ⚡${r.excitement} 🎯${r.fit_score}${stale}`
        );
      });

      // Quick-apply highlight
      if (args.highlight_easy !== false) {
        const easy = sorted.filter((r) => r.apply_effort === "Low" && r.status === "To Apply");
        if (easy.length > 0) {
          lines.push("\n" + "─".repeat(62));
          lines.push("🟢 Quick Apply Opportunities (Low Effort + To Apply):");
          easy.slice(0, 5).forEach((r) => {
            lines.push(`  • [${r.id}] ${r.company} — ${r.role} (Priority: ${priorityScore(r).toFixed(1)}/10)`);
            lines.push(`    ${r.careers_url}`);
          });
        }
      }

      // Upcoming follow-ups
      const followUps = rows.filter((r) => r.follow_up_date && r.follow_up_date >= today());
      if (followUps.length > 0) {
        lines.push("\n" + "─".repeat(62));
        lines.push("⏰ Upcoming Follow-Ups:");
        followUps.sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));
        followUps.slice(0, 5).forEach((r) => {
          const daysLeft = Math.max(0, Math.ceil((new Date(r.follow_up_date).getTime() - Date.now()) / 86_400_000));
          lines.push(`  • [${r.id}] ${r.company} — ${r.follow_up_date} (${daysLeft}d from now)`);
        });
      }

      return lines.join("\n");
    } catch (err: any) {
      return `❌ Error scoring pipeline: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: get_pipeline_metrics
// ---------------------------------------------------------------------------

export const GetPipelineMetricsTool: Tool = {
  name: "tracker_dashboard",
  description: `Return comprehensive analytics dashboard for the jobs.csv pipeline.
Includes: apply rate, avg attention/excitement/fit, ATS breakdown, salary stats,
stale company count, estimated total prep time, and a smart recommendation.
Use this when the user asks: "How is my job search going?", "Give me pipeline stats",
"What's my apply rate?", "Dashboard view of my search", "pipeline analytics".`,
  parameters: { 
    type: Type.OBJECT, 
    properties: {
      _run: {
        type: Type.BOOLEAN,
        description: "Always set this to true to execute the tool.",
      }
    },
    required: ["_run"]
  },
  execute: async () => {
    try {
      const { rows } = loadCsv();
      if (rows.length === 0) return "jobs.csv is empty.";

      const total     = rows.length;
      const applied   = rows.filter((r) => !["To Apply"].includes(r.status)).length;
      const active    = rows.filter((r) => !["Rejected", "Ghosted"].includes(r.status));
      const rejected  = rows.filter((r) => r.status === "Rejected").length;
      const interview = rows.filter((r) => r.status === "Interview").length;
      const stale     = rows.filter((r) => r.last_activity_date && daysSince(r.last_activity_date) > 14).length;

      const avg = (fn: (r: CsvRow) => number) =>
        active.length > 0 ? (active.reduce((s, r) => s + fn(r), 0) / active.length).toFixed(1) : "N/A";

      const avgAtt  = avg((r) => Number(r.attention_score) || 5);
      const avgExc  = avg((r) => Number(r.excitement) || 5);
      const avgFit  = avg((r) => Number(r.fit_score) || 5);
      const avgPrio = avg((r) => priorityScore(r));

      const totalPrep = active.reduce((s, r) => s + (Number(r.prep_time_hours) || 0), 0);

      const salaries    = rows.filter((r) => r.salary_max).map((r) => Number(r.salary_max));
      const avgSal      = salaries.length
        ? `$${Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length).toLocaleString()}`
        : "N/A";
      const maxSal      = salaries.length ? `$${Math.max(...salaries).toLocaleString()}` : "N/A";

      // ATS breakdown
      const atsCounts: Record<string, number> = {};
      for (const r of rows) atsCounts[r.ats] = (atsCounts[r.ats] ?? 0) + 1;
      const atsBreakdown = Object.entries(atsCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([ats, n]) => `${ats.padEnd(12)} ${n}`)
        .join("\n    ");

      // Attention breakdown
      const highAtt = rows.filter((r) => Number(r.attention_score) >= 8).length;
      const lowAtt  = rows.filter((r) => Number(r.attention_score) <= 4).length;

      // Effort breakdown
      const effortBreak = ["Low", "Medium", "High"].map((e) => {
        const n = rows.filter((r) => r.apply_effort === e).length;
        return `${EFFORT_ICONS[e]} ${e.padEnd(8)} ${n}`;
      }).join("  ");

      // Smart recommendation
      const quickWins   = rows.filter((r) => r.apply_effort === "Low" && r.status === "To Apply");
      const topPriority = [...rows].sort((a, b) => priorityScore(b) - priorityScore(a))[0];
      let recommendation = "";
      if (quickWins.length > 0) {
        recommendation = `🚀 You have ${quickWins.length} quick-apply (Low effort) jobs waiting — start with ${quickWins[0].company}!`;
      } else if (stale > 3) {
        recommendation = `⚠️  ${stale} jobs are going stale (14+ days). Run flag_stale_jobs for a focused action list.`;
      } else if (interview > 0) {
        recommendation = `🎯 You have ${interview} active interview(s)! Prioritize interview prep over new applications.`;
      } else if (topPriority) {
        recommendation = `💡 Highest priority target: ${topPriority.company} (score: ${priorityScore(topPriority).toFixed(1)}/10). Apply next!`;
      }

      return [
        "📊 Job Search Pipeline Dashboard",
        "─".repeat(52),
        `Total companies tracked:   ${total}`,
        `Applied / Active:          ${applied} / ${active.length} (${Math.round(applied / total * 100)}% apply rate)`,
        `In Interview:              ${interview}`,
        `Rejected:                  ${rejected}`,
        `Stale (14+ days):          ${stale} ⚠️`,
        "",
        "Attention Metrics (active companies):",
        `  Avg Attention Score:     ${avgAtt}/10  (${highAtt} high 🔥, ${lowAtt} cold 🧊)`,
        `  Avg Excitement:          ${avgExc}/10`,
        `  Avg Fit Score:           ${avgFit}/10`,
        `  Avg Priority Score:      ${avgPrio}/10`,
        "",
        `Total Est. Prep Time:      ${totalPrep.toFixed(0)}h across ${active.length} active companies`,
        "",
        "Salary Range:",
        `  Avg Max Salary:          ${avgSal}`,
        `  Highest Target:          ${maxSal}`,
        "",
        "Apply Effort Breakdown:",
        `  ${effortBreak}`,
        "",
        "ATS Breakdown:",
        `    ${atsBreakdown}`,
        "",
        "─".repeat(52),
        recommendation,
      ].join("\n");
    } catch (err: any) {
      return `❌ Error computing metrics: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: flag_stale_jobs
// ---------------------------------------------------------------------------

export const FlagStaleJobsTool: Tool = {
  name: "tracker_find_stale",
  description: `Find jobs in jobs.csv with no recent activity and suggest next actions.
Use this when the user asks: "What jobs am I neglecting?", "Anything going stale?",
"Which companies need attention?", "Clean up my pipeline", "what's cold?".
Read-only — returns a prioritized action list: Apply Now / Follow Up / Deprioritize.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      _run: {
        type: Type.BOOLEAN,
        description: "Always set this to true to execute the tool.",
      },
      stale_threshold_days: {
        type: Type.NUMBER,
        description: "Days of inactivity to consider stale. Default: 7.",
      },
    },
    required: ["_run"],
  },
  execute: async (args: { stale_threshold_days?: number }) => {
    try {
      const { rows } = loadCsv();
      const threshold = args.stale_threshold_days ?? 7;
      const active = rows.filter((r) => !["Rejected", "Ghosted", "Offer"].includes(r.status));
      const stale  = active.filter((r) => daysSince(r.last_activity_date) >= threshold);

      if (stale.length === 0) {
        return `✅ All ${active.length} active companies have been touched in the last ${threshold} days. Pipeline is fresh!`;
      }

      const sorted = [...stale].sort((a, b) => priorityScore(b) - priorityScore(a));

      const lines: string[] = [
        `⚠️  ${stale.length} Stale Jobs (${threshold}+ days without activity)`,
        "─".repeat(62),
      ];

      for (const r of sorted) {
        const age    = daysSince(r.last_activity_date);
        const ps     = priorityScore(r).toFixed(1);
        const effort = r.apply_effort;
        
        let action = "";
        if (r.status === "To Apply" && effort === "Low")    action = "🚀 Apply Now!";
        else if (r.status === "To Apply" && ps >= "7.5")    action = "📋 Schedule Application";
        else if (r.status === "Applied")                    action = "📞 Follow Up";
        else if (Number(r.attention_score) <= 4)            action = "🗑️  Deprioritize?";
        else                                                action = "👀 Review";

        lines.push(`  ${action.padEnd(28)} [${r.id}] ${r.company}`);
        lines.push(`    ${age}d stale | Priority ${ps}/10 | ${r.status} | ${effort} effort | 👁${r.attention_score} ⚡${r.excitement}`);
        if (r.notes) lines.push(`    📝 ${r.notes.substring(0, 80)}`);
        lines.push("");
      }

      // Quick summary
      const applyNow = sorted.filter((r) => r.status === "To Apply" && r.apply_effort === "Low").length;
      const followUp = sorted.filter((r) => r.status === "Applied").length;

      lines.push("─".repeat(62));
      lines.push(`Actions needed: 🚀 Apply Now: ${applyNow}  📞 Follow Up: ${followUp}  Total stale: ${stale.length}`);

      return lines.join("\n");
    } catch (err: any) {
      return `❌ Error flagging stale jobs: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: tracker_inspect_quality
// ---------------------------------------------------------------------------

export const InspectQualityTool: Tool = {
  name: "tracker_inspect_quality",
  description: `Scan jobs.csv for data quality issues without modifying anything.
Detects and reports: duplicate company+role entries, rows with no careers_url (unverified/hallucinated risk),
rows where salary fields contain non-numeric text (corruption), and notes fields over 400 chars.
Use this when the user asks: "clean up my tracker", "find duplicates", "audit my pipeline", "any bad data?".`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      _run: { type: Type.BOOLEAN, description: "Always set to true to run the tool." },
    },
    required: ["_run"],
  },
  execute: async () => {
    try {
      const { rows, path } = loadCsv();
      const issues: string[] = [];

      // 1. Duplicates by company+role
      const seen = new Map<string, string>();
      for (const r of rows) {
        const key = `${r.company.toLowerCase()}|${r.role.toLowerCase()}`;
        if (seen.has(key)) {
          issues.push(`  🔁 Duplicate: [${r.id}] ${r.company} — ${r.role}  (first seen: ${seen.get(key)})`);
        } else {
          seen.set(key, r.id);
        }
      }

      // 2. Missing careers_url
      const noUrl = rows.filter((r) => !r.careers_url || !r.careers_url.startsWith("http"));
      if (noUrl.length > 0) {
        issues.push(`\n  ⚠️  ${noUrl.length} rows have no verified careers_url:`);
        noUrl.slice(0, 10).forEach((r) => issues.push(`    [${r.id}] ${r.company} — ${r.role}`));
        if (noUrl.length > 10) issues.push(`    ... and ${noUrl.length - 10} more.`);
      }

      // 3. Salary fields containing non-numeric text
      const badSalary = rows.filter(
        (r) => (r.salary_min && isNaN(Number(r.salary_min))) ||
               (r.salary_max && isNaN(Number(r.salary_max)))
      );
      if (badSalary.length > 0) {
        issues.push(`\n  💸 ${badSalary.length} rows with corrupted salary fields:`);
        badSalary.forEach((r) => issues.push(`    [${r.id}] salary_min="${r.salary_min}" salary_max="${r.salary_max}"  (first 60 chars)`));
      }

      // 4. Notes overflow
      const longNotes = rows.filter((r) => r.notes && r.notes.length > 400);
      if (longNotes.length > 0) {
        issues.push(`\n  📝 ${longNotes.length} rows with notes > 400 chars:`);
        longNotes.forEach((r) => issues.push(`    [${r.id}] ${r.company} (${r.notes.length} chars)`));
      }

      if (issues.length === 0) {
        return `✅ jobs.csv looks clean! ${rows.length} rows, no duplicates, all URLs present, salary fields valid.`;
      }

      return [
        `🔍 Quality Report — ${rows.length} rows in ${path}`,
        "─".repeat(60),
        ...issues,
        "─".repeat(60),
        `\nTotal issues found: ${issues.filter(l => l.startsWith("  🔁")).length} duplicates, ${noUrl.length} missing URLs, ${badSalary.length} bad salaries, ${longNotes.length} long notes.`,
        `\nTo fix: say "remove duplicates from my tracker" or "fix salary fields" and I will present a confirmation before writing.`,
      ].join("\n");
    } catch (err: any) {
      return `❌ Error inspecting jobs.csv: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Tool: tracker_recheck_urls (#7 — Stale URL recheck)
// ---------------------------------------------------------------------------

export const RecheckUrlsTool: Tool = {
  name: "tracker_recheck_urls",
  description: `Re-verify all careers_url fields in jobs.csv to find dead job postings.
Only checks entries that have a URL and haven't been re-verified in the last 7 days.
Updates the notes field with a ⚠️ DEAD LINK tag for any URL that fails verification.
Returns a full report of live vs dead URLs.
Use when the user asks: "are my job links still active?", "check stale URLs", "audit my links".`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      force: {
        type: Type.BOOLEAN,
        description: "Optional. If true, re-checks ALL URLs regardless of when they were last checked. Default false.",
      },
      status_filter: {
        type: Type.STRING,
        description: "Optional. Only check entries with this status (e.g. 'To Apply'). Default: all statuses.",
      },
    },
    required: [],
  },
  execute: async (args: { force?: boolean; status_filter?: string }) => {
    try {
      const { rows, path } = loadCsv();
      const { verifyUrlBatch } = await import("./urlVerifier.js");

      // Filter rows that have a URL and are candidates for recheck
      let candidates = rows.filter(r => r.careers_url && r.careers_url.startsWith("http"));
      if (args.status_filter) {
        candidates = candidates.filter(r =>
          r.status.toLowerCase() === args.status_filter!.toLowerCase()
        );
      }

      if (candidates.length === 0) {
        return "ℹ️ No entries with verified URLs to check.";
      }

      process.stderr.write(`[tracker_recheck_urls] Checking ${candidates.length} URLs in batches...\n`);

      const urls = candidates.map(r => r.careers_url);
      const results = await verifyUrlBatch(urls);

      const dead: string[] = [];
      const alive: string[] = [];
      const warnings: string[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const row = candidates[i];
        const result = results[i];
        if (!result) continue;

        if (!result.ok) {
          dead.push(`  ❌ [${row.id}] ${row.company} — ${row.role} (${row.status})\n     ${result.reason}`);
          // Mark the row with a dead link note
          const deadNote = "⚠️ DEAD LINK — URL failed recheck on " + today();
          const existingNotes = row.notes || "";
          const hasDeadNote = existingNotes.includes("⚠️ DEAD LINK");
          if (!hasDeadNote) {
            const rowIdx = rows.findIndex(r => r.id === row.id);
            if (rowIdx >= 0) {
              rows[rowIdx].notes = [deadNote, existingNotes].filter(Boolean).join("; ").slice(0, 500);
            }
          }
        } else {
          alive.push(`  ✅ [${row.id}] ${row.company} — ${row.status}`);
          if (result.warning) {
            warnings.push(`  ⚠️  [${row.id}] ${result.warning}`);
          }
          // Clear stale dead link note if now alive
          const rowIdx = rows.findIndex(r => r.id === row.id);
          if (rowIdx >= 0 && rows[rowIdx].notes?.includes("⚠️ DEAD LINK")) {
            rows[rowIdx].notes = rows[rowIdx].notes.replace(/⚠️ DEAD LINK[^;]*(;?\s*)?/g, "").trim();
          }
        }
      }

      // Write back any dead link annotations
      if (dead.length > 0) {
        saveCsv(rows, path);
      }

      const sections: string[] = [
        `🔗 URL Recheck Report — ${candidates.length} URLs checked`,
        "─".repeat(60),
      ];
      if (alive.length > 0) sections.push(`\n✅ Live (${alive.length}):\n${alive.join("\n")}`);
      if (warnings.length > 0) sections.push(`\n⚠️  Warnings (${warnings.length}):\n${warnings.join("\n")}`);
      if (dead.length > 0) {
        sections.push(`\n❌ Dead links (${dead.length}) — annotated in notes:\n${dead.join("\n")}`);
        sections.push(`\nRecommendation: For dead links in "To Apply" status, search for the current posting or remove from tracker.`);
      } else {
        sections.push(`\n🟢 All URLs are reachable!`);
      }

      return sections.join("\n");
    } catch (err: any) {
      return `❌ Error rechecking URLs: ${err.message}`;
    }
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ALL_LOCAL_TRACKER_TOOLS: Tool[] = [
  ListLocalJobsTool,
  UpdateLocalJobTool,
  AddLocalJobTool,
  ScorePipelineTool,
  GetPipelineMetricsTool,
  FlagStaleJobsTool,
  InspectQualityTool,
  RecheckUrlsTool,
];
