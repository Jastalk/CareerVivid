/**
 * Agent Session Memory — ~/.careervivid/memory.md
 *
 * Architecture
 * ════════════
 * The memory file has TWO layers:
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  LAYER 1 — Knowledge Base (🔒 persisted forever, never deleted) │
 *  │  Structured sections extracted across ALL sessions:             │
 *  │   • Career Goals & Preferences                                  │
 *  │   • Resume State (active IDs, versions, tailoring history)      │
 *  │   • Job Pipeline (tracked companies, statuses, decisions)       │
 *  │   • Skills & Experience Context                                 │
 *  │   • Interview Prep Context                                      │
 *  │   • Cover Letter History                                        │
 *  └─────────────────────────────────────────────────────────────────┘
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  LAYER 2 — Recent Session Log (rolling, auto-compacted)         │
 *  │  Last N sessions with full context of what was done.            │
 *  │  When compaction fires, sessions are merged into the            │
 *  │  Knowledge Base above (not discarded).                          │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * Compaction strategy
 * ───────────────────
 * When total file size > MAX_CHARS:
 *   1. Parse the knowledge base sections
 *   2. Merge each older session's facts INTO the knowledge base (upsert)
 *   3. Drop sessions older than KEEP_SESSIONS, keeping the most recent N
 *   4. Optionally call the LLM (via CV proxy) to produce a true distillation
 *      if an api key is available — this is the "smart" path
 *   5. Write the compacted file back
 *
 * System prompt injection
 * ───────────────────────
 * Only injects the knowledge base + last 2 sessions (≤ PROMPT_INJECT_CHARS).
 * The agent always sees what matters, never sees everything.
 *
 * Public API
 * ──────────
 *  loadMemory()                   → raw file string
 *  buildMemoryBlock()             → string for system prompt injection
 *  saveSessionMemory(opts)        → append + compact
 *  buildSessionSummary(opts)      → build summary string from session data
 *  MEMORY_SECTION                 → static system-prompt header
 */

import { homedir } from "os";
import { join } from "path";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const MEMORY_DIR  = join(homedir(), ".careervivid");
const MEMORY_FILE = join(MEMORY_DIR, "memory.md");

/** Max total file chars before compaction runs. ~20k gives lots of room. */
const MAX_CHARS = 20_000;

/** Number of full sessions to keep in the session log after compaction. */
const KEEP_SESSIONS = 5;

/** Max chars injected into the system prompt. ~2k = ~500 tokens max — lean by design. */
const PROMPT_INJECT_CHARS = 2_000;


// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SessionHighlight {
  tool:    string;   // e.g. "tailor_resume"
  args:    string;   // JSON-stringified args (truncated)
  outcome: string;   // e.g. "Tailored resume for Anthropic SE — new ID: etCYcV5f"
}

export interface KnowledgeBase {
  /** e.g. ["harness engineering", "AI-first companies", "solutions engineering"] */
  careerGoals:     string[];
  /** Preferred role titles */
  targetRoles:     string[];
  /** Preferred companies / sectors */
  targetCompanies: string[];
  /** Active resume ID and title */
  activeResume:    { id: string; title: string; lastUpdated: string } | null;
  /** All known resume IDs */
  resumeHistory:   Array<{ id: string; title: string }>;
  /** Job pipeline entries worth remembering */
  jobPipeline:     Array<{ company: string; role: string; status: string; note?: string }>;
  /** Cover letters generated */
  coverLetters:    Array<{ company: string; role: string; savedId?: string }>;
  /** Interview prep done */
  interviewPrep:   Array<{ company: string; role: string; topics: string[] }>;
  /** Skills the user has mentioned or had added */
  skills:          string[];
  /** Misc facts (work auth, location, salary expectation, etc.) */
  facts:           Record<string, string>;
  /** Last updated ISO timestamp */
  updatedAt:       string;
}

// ═══════════════════════════════════════════════════════════════════════════
// File I/O helpers
// ═══════════════════════════════════════════════════════════════════════════

export function loadMemory(): string {
  if (!existsSync(MEMORY_FILE)) return "";
  try {
    return readFileSync(MEMORY_FILE, "utf-8").trim();
  } catch {
    return "";
  }
}

function saveMemory(content: string): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  writeFileSync(MEMORY_FILE, content.trim() + "\n", { encoding: "utf-8" });
}

// ═══════════════════════════════════════════════════════════════════════════
// Knowledge Base — parse / merge / serialize
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_KB: KnowledgeBase = {
  careerGoals:     [],
  targetRoles:     [],
  targetCompanies: [],
  activeResume:    null,
  resumeHistory:   [],
  jobPipeline:     [],
  coverLetters:    [],
  interviewPrep:   [],
  skills:          [],
  facts:           {},
  updatedAt:       new Date().toISOString(),
};

/**
 * Extract the JSON knowledge base block from the memory file.
 * The KB is stored as a fenced JSON block after the `<!-- KB_START -->` marker.
 */
function parseKnowledgeBase(raw: string): KnowledgeBase {
  const match = raw.match(/<!-- KB_START -->([\s\S]*?)<!-- KB_END -->/);
  if (!match) return { ...EMPTY_KB };
  try {
    return { ...EMPTY_KB, ...JSON.parse(match[1].trim()) };
  } catch {
    return { ...EMPTY_KB };
  }
}

function serializeKnowledgeBase(kb: KnowledgeBase): string {
  return [
    "<!-- KB_START -->",
    JSON.stringify(kb, null, 2),
    "<!-- KB_END -->",
  ].join("\n");
}

/** Merge new facts from a session into the existing knowledge base. */
function mergeIntoKB(kb: KnowledgeBase, session: ParsedSession): KnowledgeBase {
  const updated = { ...kb, updatedAt: new Date().toISOString() };

  // Merge career goals from session metadata
  if (session.careerGoals?.length) {
    updated.careerGoals = dedupe([...kb.careerGoals, ...session.careerGoals]);
  }
  if (session.targetRoles?.length) {
    updated.targetRoles = dedupe([...kb.targetRoles, ...session.targetRoles]);
  }
  if (session.targetCompanies?.length) {
    updated.targetCompanies = dedupe([...kb.targetCompanies, ...session.targetCompanies]);
  }
  if (session.skills?.length) {
    updated.skills = dedupe([...kb.skills, ...session.skills]);
  }

  // Active resume — prefer most recent
  if (session.activeResumeId) {
    updated.activeResume = {
      id:          session.activeResumeId,
      title:       session.activeResumeTitle || "Untitled Resume",
      lastUpdated: session.timestamp,
    };
    // Also add to history
    const alreadyInHistory = updated.resumeHistory.some(r => r.id === session.activeResumeId);
    if (!alreadyInHistory) {
      updated.resumeHistory = [
        { id: session.activeResumeId, title: session.activeResumeTitle || "Untitled Resume" },
        ...updated.resumeHistory,
      ].slice(0, 10); // keep last 10
    }
  }

  // Job pipeline
  for (const job of session.jobActions) {
    const existing = updated.jobPipeline.findIndex(
      j => j.company.toLowerCase() === job.company.toLowerCase()
    );
    if (existing >= 0) {
      updated.jobPipeline[existing] = { ...updated.jobPipeline[existing], ...job };
    } else {
      updated.jobPipeline = [job, ...updated.jobPipeline].slice(0, 30);
    }
  }

  // Cover letters
  for (const cl of session.coverLetters) {
    const exists = updated.coverLetters.some(
      c => c.company === cl.company && c.role === cl.role
    );
    if (!exists) {
      updated.coverLetters = [cl, ...updated.coverLetters].slice(0, 20);
    }
  }

  // Interview prep
  for (const ip of session.interviewPrep) {
    const existing = updated.interviewPrep.findIndex(
      i => i.company === ip.company
    );
    if (existing >= 0) {
      updated.interviewPrep[existing].topics = dedupe([
        ...updated.interviewPrep[existing].topics,
        ...ip.topics,
      ]);
    } else {
      updated.interviewPrep = [ip, ...updated.interviewPrep].slice(0, 10);
    }
  }

  // Facts (work auth, location, salary, etc.)
  if (session.facts) {
    updated.facts = { ...updated.facts, ...session.facts };
  }

  return updated;
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// ═══════════════════════════════════════════════════════════════════════════
// Session parsing
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedSession {
  timestamp:         string;
  mode:              string;
  model:             string;
  turns:             number;
  summary:           string;       // human-readable paragraph
  highlights:        string[];     // bullet points
  careerGoals:       string[];
  targetRoles:       string[];
  targetCompanies:   string[];
  skills:            string[];
  activeResumeId:    string;
  activeResumeTitle: string;
  jobActions:        Array<{ company: string; role: string; status: string; note?: string }>;
  coverLetters:      Array<{ company: string; role: string; savedId?: string }>;
  interviewPrep:     Array<{ company: string; role: string; topics: string[] }>;
  facts:             Record<string, string>;
}

/** Parse session blocks from the memory file (raw markdown). */
function parseSessions(raw: string): Array<{ header: string; body: string; parsed: ParsedSession }> {
  const blocks = raw.split(/(?=^## Session )/m).filter(b => b.trimStart().startsWith("## Session"));
  return blocks.map(block => {
    const headerLine = block.split("\n")[0];
    const timestamp = headerLine.replace("## Session", "").trim();
    // Parse JSON metadata block within the session if present
    let meta: Partial<ParsedSession> = {};
    const metaMatch = block.match(/<!-- SESSION_META\n([\s\S]*?)\nMETA_END -->/);
    if (metaMatch) {
      try { meta = JSON.parse(metaMatch[1]); } catch { /* ignore */ }
    }
    return {
      header: headerLine,
      body:   block,
      parsed: {
        timestamp,
        mode:              meta.mode              || "general",
        model:             meta.model             || "unknown",
        turns:             meta.turns             || 0,
        summary:           meta.summary           || block.slice(headerLine.length).replace(/<!-- SESSION_META[\s\S]*?META_END -->/g, "").trim(),
        highlights:        meta.highlights        || [],
        careerGoals:       meta.careerGoals       || [],
        targetRoles:       meta.targetRoles       || [],
        targetCompanies:   meta.targetCompanies   || [],
        skills:            meta.skills            || [],
        activeResumeId:    meta.activeResumeId    || "",
        activeResumeTitle: meta.activeResumeTitle || "",
        jobActions:        meta.jobActions        || [],
        coverLetters:      meta.coverLetters      || [],
        interviewPrep:     meta.interviewPrep     || [],
        facts:             meta.facts             || {},
      },
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Compaction engine
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Smart compaction:
 *  1. Parse all sessions
 *  2. Merge ALL sessions into the knowledge base (no data is deleted)
 *  3. Keep only the most recent KEEP_SESSIONS in the session log
 *  4. Serialize back to the two-layer format
 */
function compactMemory(raw: string): string {
  if (raw.length <= MAX_CHARS) return raw;

  const kb       = parseKnowledgeBase(raw);
  const sessions = parseSessions(raw);

  // Merge every session into the KB before we trim the session log
  let mergedKB = kb;
  for (const s of sessions) {
    mergedKB = mergeIntoKB(mergedKB, s.parsed);
  }

  // Keep only the most recent KEEP_SESSIONS
  const recentSessions = sessions.slice(-KEEP_SESSIONS);

  return buildMemoryFile(mergedKB, recentSessions.map(s => s.body));
}

function buildMemoryFile(kb: KnowledgeBase, sessionBlocks: string[]): string {
  const sections: string[] = [
    "# CareerVivid Agent Memory",
    "",
    "> Auto-maintained by the CareerVivid AI agent. Do not edit manually.",
    "",
    "## 🧠 Knowledge Base",
    "",
    "This section accumulates facts across ALL sessions and is never deleted.",
    "",
    serializeKnowledgeBase(kb),
    "",
    "---",
    "",
    "## 📅 Recent Session Log",
    "",
    ...sessionBlocks,
  ];
  return sections.join("\n").trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the system-prompt memory block.
 *
 * Design principle: O(1) token cost regardless of pipeline size.
 *   - 10 jobs  → same output size as 1,000 jobs
 *   - Full details always come from tool calls (tracker_list_jobs, etc.)
 *   - This block is context/orientation, not a data dump
 *
 * Typical output: ~250–400 chars (~65–100 tokens)
 * Hard ceiling:    1,200 chars (~300 tokens) — never exceeded by realistic data
 */
export function buildMemoryBlock(): string {
  const raw = loadMemory();
  if (!raw) return "";

  const kb = parseKnowledgeBase(raw);

  const lines: string[] = [];

  // 1. Career focus (max ~100 chars)
  if (kb.targetRoles.length || kb.careerGoals.length) {
    const focus = [
      ...kb.targetRoles.slice(0, 2),
      ...kb.careerGoals.slice(0, 1),
    ].filter(Boolean).join(" • ");
    if (focus) lines.push(`Focus: ${focus}`);
  }

  // 2. Active resume ID (single line, ~60 chars)
  if (kb.activeResume) {
    lines.push(`Resume: "${kb.activeResume.title}" [${kb.activeResume.id}]`);
  }

  // 3. Pipeline stats — ALWAYS a count summary, never a full list
  //    100 jobs or 1000 jobs = same 1-line output
  if (kb.jobPipeline.length > 0) {
    const counts: Record<string, number> = {};
    for (const j of kb.jobPipeline) {
      const s = j.status || "Unknown";
      counts[s] = (counts[s] || 0) + 1;
    }
    const breakdown = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4) // top 4 statuses only
      .map(([s, n]) => `${n} ${s}`)
      .join(" · ");
    lines.push(`Pipeline: ${kb.jobPipeline.length} jobs tracked (${breakdown})`);

    // Most recent 2 active (Interviewing > Applied > To Apply) — gives user the "hot" context
    const PRIORITY = ["Offered", "Interviewing", "Applied", "To Apply"];
    const hot = kb.jobPipeline
      .filter(j => PRIORITY.indexOf(j.status) >= 0)
      .sort((a, b) => PRIORITY.indexOf(a.status) - PRIORITY.indexOf(b.status))
      .slice(0, 2);
    for (const j of hot) {
      lines.push(`  → ${j.company} (${j.role}) — ${j.status}`);
    }
  }

  // 4. Cover letter count (1 line max)
  if (kb.coverLetters.length > 0) {
    lines.push(`Cover letters: ${kb.coverLetters.length} drafted`);
  }

  // 5. Interview prep (1 line max)
  if (kb.interviewPrep.length > 0) {
    lines.push(`Interview prep: ${kb.interviewPrep.map(i => i.company).slice(0, 3).join(", ")}`);
  }

  // 6. Key facts (work auth, location — max 2)
  const factEntries = Object.entries(kb.facts).slice(0, 2);
  for (const [k, v] of factEntries) {
    lines.push(`${k}: ${v}`);
  }

  if (lines.length === 0) return "";

  // 7. Last session hint (always 1 line, trimmed to 100 chars)
  const sessions   = parseSessions(raw);
  const last       = sessions[sessions.length - 1];
  const lastHint   = last
    ? `Last session: ${last.parsed.summary.slice(0, 100).replace(/\n/g, " ")}`
    : "";

  if (lastHint) lines.push(""); // spacer
  if (lastHint) lines.push(lastHint);

  return ["## Career Context", "", ...lines].join("\n");
}


/**
 * Static system-prompt section instructing the agent how to use memory.
 * Imported by instructions.ts.
 */
export const MEMORY_SECTION = `
## Persistent Career Context

A Career Context block is injected below. It is a HIGH-LEVEL SNAPSHOT only.
The full job pipeline, resume history, and cover letter details are stored locally
and accessed via tool calls when needed.

Rules:
1. GREETING: If the user sends a greeting and the Career Context block has a
   "Last session" line, open with a one-line recap:
   e.g. "Last time we tailored your resume for Anthropic — want to continue?"
   Don't list everything — just the most relevant thread.

2. RESUME ID: If the Career Context block has an active resume ID, use it directly
   when calling resume tools. Never ask the user for it again.

3. PIPELINE DETAILS: The context block shows COUNTS only (e.g. "182 jobs tracked").
   For specifics (which companies, which status), call tracker_list_jobs or
   tracker_dashboard — do NOT guess from the count.

4. COVER LETTERS / INTERVIEW PREP: Context shows counts. Call tools for full content.

5. NEVER fabricate: If it's not in the Career Context block and no tool was called,
   don't reference it as if it happened.
`.trim();


// ═══════════════════════════════════════════════════════════════════════════
// Session summary builder
// ═══════════════════════════════════════════════════════════════════════════

export interface SessionSummaryInput {
  turns:             number;
  mutations:         number;
  highlights:        SessionHighlight[];
  mode:              string;
  model:             string;
  // enrichment — agent tracks these during the session
  careerGoals?:      string[];
  targetRoles?:      string[];
  targetCompanies?:  string[];
  skills?:           string[];
  activeResumeId?:   string;
  activeResumeTitle?:string;
  jobActions?:       Array<{ company: string; role: string; status: string; note?: string }>;
  coverLetters?:     Array<{ company: string; role: string; savedId?: string }>;
  interviewPrep?:    Array<{ company: string; role: string; topics: string[] }>;
  facts?:            Record<string, string>;
  summary?:          string; // human-written summary paragraph (optional)
}

/**
 * Build a rich session entry block.
 * Returns a markdown string with embedded JSON metadata for later parsing.
 */
export function buildSessionSummary(opts: SessionSummaryInput): string {
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");

  // Human-readable summary paragraph
  const summaryPara = opts.summary
    || buildAutoSummary(opts);

  // Highlights bullets
  const highlightLines = opts.highlights.slice(0, 8).map(h => `- ${h.outcome || h.tool}`);

  // Embed structured metadata as a hidden comment for later parsing
  const meta: Partial<ParsedSession> = {
    timestamp,
    mode:              opts.mode,
    model:             opts.model,
    turns:             opts.turns,
    summary:           summaryPara,
    highlights:        highlightLines,
    careerGoals:       opts.careerGoals       || [],
    targetRoles:       opts.targetRoles       || [],
    targetCompanies:   opts.targetCompanies   || [],
    skills:            opts.skills            || [],
    activeResumeId:    opts.activeResumeId    || "",
    activeResumeTitle: opts.activeResumeTitle || "",
    jobActions:        opts.jobActions        || [],
    coverLetters:      opts.coverLetters      || [],
    interviewPrep:     opts.interviewPrep     || [],
    facts:             opts.facts             || {},
  };

  const lines = [
    `## Session ${timestamp}`,
    `**Mode:** ${opts.mode}  |  **Model:** ${opts.model}  |  **Turns:** ${opts.turns}`,
    "",
    summaryPara,
  ];

  if (highlightLines.length > 0) {
    lines.push("", "**Key actions:**", ...highlightLines);
  }

  // Embed metadata for compaction parsing (invisible in rendered markdown)
  lines.push("", `<!-- SESSION_META\n${JSON.stringify(meta, null, 2)}\nMETA_END -->`);
  lines.push("");

  return lines.join("\n");
}

function buildAutoSummary(opts: SessionSummaryInput): string {
  const parts: string[] = [];

  if (opts.mode === "jobs") parts.push("Job search session");
  else if (opts.mode === "resume") parts.push("Resume session");
  else parts.push("General coding session");

  if (opts.targetRoles?.length)     parts.push(`targeting ${opts.targetRoles.join(", ")}`);
  if (opts.targetCompanies?.length) parts.push(`at ${opts.targetCompanies.join(", ")}`);
  if (opts.activeResumeId)          parts.push(`active resume: ${opts.activeResumeId}`);
  if (opts.coverLetters?.length)    parts.push(`drafted ${opts.coverLetters.length} cover letter(s)`);
  if (opts.interviewPrep?.length)   parts.push(`interview prep for ${opts.interviewPrep.map(i => i.company).join(", ")}`);

  return parts.join(" — ") + ".";
}

// ═══════════════════════════════════════════════════════════════════════════
// Save session memory (main entry point called at session end)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Append a session summary to the memory file, merge into KB, compact if needed.
 */
export function saveSessionMemory(opts: SessionSummaryInput): void {
  if (opts.turns === 0) return;

  const entry = buildSessionSummary(opts);
  const existing = loadMemory();

  const base = existing || buildMemoryFile({ ...EMPTY_KB }, []);

  const updated = compactMemory(base + "\n" + entry);
  saveMemory(updated);
}

// =============================================================================
// Coding session file — fast persona-specific pick-up context
// =============================================================================

const CODING_SESSION_FILE = join(MEMORY_DIR, "coding-session.md");

export interface CodingSessionData {
  /** Absolute path of the working directory when the session ended */
  cwd: string;
  /** ISO timestamp of when the session was saved */
  savedAt: string;
  /** Persona mode ("coding", "resume", etc.) */
  mode: string;
  /** Human-readable summary of what happened in the session */
  summary: string;
  /** Files the agent wrote or patched during the session */
  filesChanged: string[];
  /** Short description of the last thing that was built/created */
  lastBuilt: string;
  /** Git branch active during the session (empty if no git repo) */
  branch: string;
}

/**
 * Load the last coding session from ~/.careervivid/coding-session.md.
 * Returns null if the file does not exist or cannot be parsed.
 * Intentionally synchronous — called at startup before the agent loop.
 */
export function loadCodingSession(): CodingSessionData | null {
  if (!existsSync(CODING_SESSION_FILE)) return null;
  try {
    const raw = readFileSync(CODING_SESSION_FILE, "utf-8").trim();
    const match = raw.match(/<!-- CODING_SESSION_START -->([\s\S]*?)<!-- CODING_SESSION_END -->/);
    if (!match) return null;
    return JSON.parse(match[1].trim()) as CodingSessionData;
  } catch {
    return null;
  }
}

/**
 * Save the current coding session to ~/.careervivid/coding-session.md.
 * Overwrites the previous entry — only the most recent session is kept here.
 * Full history is preserved in memory.md via saveSessionMemory().
 */
export function saveCodingSession(data: CodingSessionData): void {
  try {
    if (!existsSync(MEMORY_DIR)) mkdirSync(MEMORY_DIR, { recursive: true });
    const filesList = data.filesChanged.length > 0
      ? "## Files Changed\n" + data.filesChanged.map(f => `- \`${f}\``).join("\n")
      : "";
    const content = [
      "# Last Coding Session",
      "",
      "> Auto-saved by cv agent --coding. Do not edit manually.",
      "",
      `**Saved:** ${data.savedAt}`,
      `**Directory:** \`${data.cwd}\``,
      `**Branch:** ${data.branch || "(no git)"}`,
      "",
      "## Summary",
      data.summary,
      "",
      filesList,
      "",
      "<!-- CODING_SESSION_START -->",
      JSON.stringify(data, null, 2),
      "<!-- CODING_SESSION_END -->",
    ].join("\n");
    writeFileSync(CODING_SESSION_FILE, content, "utf-8");
  } catch {
    // Non-fatal — session save failure must never crash the agent
  }
}
