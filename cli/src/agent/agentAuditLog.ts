/**
 * agentAuditLog.ts — Forensic audit trail for every agent tool call.
 *
 * Architecture:
 *   PRIMARY:   Local JSONL append at ~/.careervivid/agent-audit.log
 *              Fast, offline, zero network dependency.
 *              Each line is a self-contained JSON record.
 *
 *   SECONDARY: Firebase Firestore (jastalk-firebase / agent_audit_logs)
 *              Written fire-and-forget (non-blocking). Fails silently.
 *              Gives cloud visibility and cross-device forensics via the web dashboard.
 *
 * Usage (in repl.ts):
 *   import { auditLog, flushAuditLog } from "./agentAuditLog.js";
 *   auditLog({ sessionId, tool: name, args, result, durationMs });
 *   // On session end:
 *   await flushAuditLog();
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import { saveSessionMemory, saveCodingSession, type SessionSummaryInput, type SessionHighlight } from "./memory.js";



// ── Types ────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  ts: string;          // ISO timestamp
  sessionId: string;   // unique per cv agent invocation
  tool: string;        // tool name
  args: Record<string, unknown>;  // sanitized args (no secrets)
  resultSummary: string;          // first 200 chars of result
  durationMs: number;
  ok: boolean;         // false if result starts with ❌
}

// ── Session-level state ───────────────────────────────────────────────────────

export let SESSION_ID = randomUUID().slice(0, 8);
const pendingFirestore: AuditEntry[] = [];

/** Rich structured session context — accumulated in real-time from tool results. */
interface SessionState {
  mode:              string;
  model:             string;
  highlights:        SessionHighlight[];
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
  /** Files written or patched during a coding session */
  filesChanged:      string[];
  /** Last thing that was built/created */
  lastBuilt:         string;
}

const sessionState: SessionState = {
  mode:              "general",
  model:             "unknown",
  highlights:        [],
  careerGoals:       [],
  targetRoles:       [],
  targetCompanies:   [],
  skills:            [],
  activeResumeId:    "",
  activeResumeTitle: "",
  jobActions:        [],
  coverLetters:      [],
  interviewPrep:     [],
  facts:             {},
  filesChanged:      [],
  lastBuilt:         "",
};

/** Call once at startup so the session summary records the correct mode and model. */
export function initSessionContext(mode: string, model: string): void {
  sessionState.mode  = mode;
  sessionState.model = model;
}


// ── Local JSONL path ──────────────────────────────────────────────────────────

function getAuditLogPath(): string {
  const dir = resolve(homedir(), ".careervivid");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return resolve(dir, "agent-audit.log");
}

// ── Sanitize args (remove any key that looks like a secret) ─────────────────

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const REDACT_KEYS = /key|secret|password|token|auth|credential/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (REDACT_KEYS.test(k)) {
      out[k] = "***REDACTED***";
    } else if (typeof v === "string" && v.length > 300) {
      out[k] = v.slice(0, 300) + "…";
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── Core log function (sync local + async Firestore) ─────────────────────────

export function auditLog(entry: {
  sessionId?: string;
  tool: string;
  args: Record<string, unknown>;
  result: string;
  durationMs: number;
}): void {
  const record: AuditEntry = {
    ts:            new Date().toISOString(),
    sessionId:     entry.sessionId ?? SESSION_ID,
    tool:          entry.tool,
    args:          sanitizeArgs(entry.args),
    resultSummary: entry.result.slice(0, 200).replace(/\n/g, " "),
    durationMs:    Math.round(entry.durationMs),
    ok:            !entry.result.startsWith("❌"),
  };

  // ── 1. Local JSONL (synchronous, never fails) ─────────────────────────────
  try {
    appendFileSync(getAuditLogPath(), JSON.stringify(record) + "\n", "utf-8");
  } catch {
    // Silently swallow — never break the agent because of logging
  }

  // ── 1b. Extract structured session facts from tool results ─────────────────
  // This is the core of the rich memory system — we mine tool call results
  // in real-time to populate the structured knowledge base.
  if (record.ok) {
    extractSessionFacts(entry.tool, entry.args, entry.result);
  }

  // ── 2. Firebase Firestore (fire-and-forget — non-blocking) ───────────────
  pendingFirestore.push(record);
  void writeToFirestore(record).catch(() => {
    // Silently swallow — Firebase being unavailable must not affect the agent
  });
}

// ── Session fact extractor ────────────────────────────────────────────────────────────────────

function extractSessionFacts(
  tool:   string,
  args:   Record<string, unknown>,
  result: string,
): void {
  const MAX_HIGHLIGHTS = 12;

  const addHighlight = (outcome: string): void => {
    if (sessionState.highlights.length < MAX_HIGHLIGHTS) {
      sessionState.highlights.push({ tool, args: JSON.stringify(args).slice(0, 60), outcome });
    }
  };

  const addCompany = (c: string): void => {
    if (c && !sessionState.targetCompanies.includes(c)) {
      sessionState.targetCompanies.push(c);
    }
  };

  switch (tool) {
    // ── Resume tools ────────────────────────────────────────────────────────────────────
    case "get_resume":
    case "list_resumes": {
      // Extract resume ID from result string e.g. "ID: abc123"
      const idMatch = result.match(/ID:\s*([\w\-]+)/);
      const titleMatch = result.match(/Resume:\s*"([^"]+)"/);
      if (idMatch) {
        sessionState.activeResumeId    = idMatch[1];
        sessionState.activeResumeTitle = titleMatch?.[1] || "Resume";
      }
      break;
    }
    case "tailor_resume": {
      // Extract new resume ID from result
      const idMatch = result.match(/\/edit\/([\w]+)/);
      const company = String(args.job_description || "").match(/(\w[\w\s]*)(?:\s+role|\s+position)/i)?.[1]?.trim() || "";
      if (idMatch) {
        sessionState.activeResumeId = idMatch[1];
        addHighlight(`Tailored resume${company ? ` for ${company}` : ""} → new ID: ${idMatch[1]}`);
      }
      break;
    }

    // ── Job search tools ───────────────────────────────────────────────────────────────────
    case "search_jobs": {
      const role     = String(args.role     || "");
      const location = String(args.location || "");
      if (role && !sessionState.targetRoles.includes(role)) sessionState.targetRoles.push(role);
      addHighlight(`Searched: "${role}"${location ? ` in ${location}` : ""}`);
      break;
    }
    case "kanban_add_job":
    case "tracker_add_job": {
      const company = String(args.company_name || args.company || "");
      const role    = String(args.job_title   || args.role    || "");
      addCompany(company);
      sessionState.jobActions.push({ company, role, status: "To Apply", note: `Added ${new Date().toLocaleDateString()}` });
      addHighlight(`Added ${company} (${role}) to pipeline`);
      break;
    }
    case "kanban_update_status":
    case "tracker_update_job": {
      const status  = String(args.new_status || args.status || "");
      const jobId   = String(args.job_id     || args.id     || "");
      const note    = String(args.notes      || "");
      // Try to find this job in our local pipeline to enrich the entry
      const existing = sessionState.jobActions.find(j => j.note?.includes(jobId));
      if (existing) existing.status = status;
      addHighlight(`Updated job ${jobId} → ${status}${note ? `: ${note.slice(0, 50)}` : ""}`);
      break;
    }
    case "openings_scan": {
      const companies = (args.companies as string[] | undefined) || [];
      companies.forEach(addCompany);
      addHighlight(`Scanned ${companies.join(", ")} for open roles`);
      break;
    }

    // ── Cover letter tools ─────────────────────────────────────────────────────────────────
    case "save_cover_letter": {
      const company = String(args.company || args.company_name || "");
      const role    = String(args.role    || args.job_title    || "");
      const clIdMatch = result.match(/ID:\s*([\w\-]+)/);
      addCompany(company);
      sessionState.coverLetters.push({ company, role, savedId: clIdMatch?.[1] });
      addHighlight(`Drafted cover letter for ${company} (${role})`);
      break;
    }

    // ── Browser/apply tools ────────────────────────────────────────────────────────────────
    case "browser_autofill_application": {
      const company = String(args.company_name || "");
      const role    = String(args.job_title    || "");
      const url     = String(args.job_url      || "");
      addCompany(company);
      const existingJob = sessionState.jobActions.find(j => j.company === company);
      if (existingJob) {
        existingJob.status = "Auto-fill completed (not submitted)";
      } else {
        sessionState.jobActions.push({ company, role, status: "Auto-fill completed (not submitted)", note: url.slice(0, 80) });
      }
      addHighlight(`Auto-filled application: ${company} (${role})`);
      break;
    }

    // ── Coding file tools ───────────────────────────────────────────────────────────────────
    case "write_file": {
      const filePath = String(args.path || "");
      if (filePath && !sessionState.filesChanged.includes(filePath)) {
        sessionState.filesChanged.push(filePath);
      }
      // Track what was built from the path name
      const fileName = filePath.split("/").pop() || filePath;
      sessionState.lastBuilt = fileName;
      addHighlight(`Created/wrote: ${filePath}`);
      break;
    }
    case "patch_file": {
      const filePath = String(args.path || "");
      if (filePath && !sessionState.filesChanged.includes(filePath)) {
        sessionState.filesChanged.push(filePath);
      }
      addHighlight(`Patched: ${filePath} (lines ${args.start_line}–${args.end_line})`);
      break;
    }

    default:
      break;
  }
}


// ── Firebase write (dynamic import to avoid hard dependency) ─────────────────

async function writeToFirestore(record: AuditEntry): Promise<void> {
  // Only attempt if firebase-admin is installed (it's optional)
  let admin: any;
  try {
    admin = await import("firebase-admin");
  } catch {
    return; // firebase-admin not installed — skip silently
  }

  try {
    if (!admin.apps?.length) {
      // Use Application Default Credentials (works in GCP/Cloud Shell)
      // or the service account key if present
      const keyPath = resolve(homedir(), ".careervivid", "firebase-service-account.json");
      const credential = existsSync(keyPath)
        ? admin.credential.cert(keyPath)
        : admin.credential.applicationDefault();

      admin.initializeApp({
        credential,
        projectId: "jastalk-firebase",
      });
    }

    const db = admin.firestore();
    await db.collection("agent_audit_logs").add({
      ...record,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Any Firebase error is silently swallowed
  }
}

// ── Flush pending entries (call on session end) ───────────────────────────────

export async function flushAuditLog(): Promise<void> {
  // Pending Firestore writes are already in-flight via fire-and-forget.
  // Give them 2 seconds to complete before exit.
  if (pendingFirestore.length > 0) {
    await new Promise(r => setTimeout(r, 2000));
  }
}

// ── Session summary (call on exit) ─────────────────────────────────────────

export async function writeSessionSummary(stats: {
  turns: number;
  mutations: number;
  toolCalls: number;
  creditsUsed?: number;
}): Promise<void> {
  const record = {
    type:       "session_summary",
    sessionId:  SESSION_ID,
    ts:         new Date().toISOString(),
    ...stats,
  };

  try {
    appendFileSync(getAuditLogPath(), JSON.stringify(record) + "\n", "utf-8");
  } catch { /* silent */ }

  // ── Save rich structured memory for next session ──────────────────────────────
  if (stats.turns > 0) {
    try {
      const memoryInput: SessionSummaryInput = {
        turns:             stats.turns,
        mutations:         stats.mutations,
        highlights:        sessionState.highlights,
        mode:              sessionState.mode,
        model:             sessionState.model,
        careerGoals:       sessionState.careerGoals,
        targetRoles:       sessionState.targetRoles,
        targetCompanies:   sessionState.targetCompanies,
        skills:            sessionState.skills,
        activeResumeId:    sessionState.activeResumeId,
        activeResumeTitle: sessionState.activeResumeTitle,
        jobActions:        sessionState.jobActions,
        coverLetters:      sessionState.coverLetters,
        interviewPrep:     sessionState.interviewPrep,
        facts:             sessionState.facts,
      };
      saveSessionMemory(memoryInput);

      // ── For coding mode: also save the fast pick-up file ──────────────────
      if (sessionState.mode === "coding" && sessionState.filesChanged.length > 0) {
        const { execSync } = await import("child_process");
        let branch = "";
        try { branch = execSync("git branch --show-current", { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* no git */ }

        const summaryParts = sessionState.highlights.slice(0, 5).map(h => h.outcome);
        const summary = summaryParts.length > 0
          ? summaryParts.join(" · ")
          : `Coding session — ${stats.turns} turns, ${sessionState.filesChanged.length} file(s) changed.`;

        saveCodingSession({
          cwd:          process.cwd(),
          savedAt:      new Date().toISOString(),
          mode:         "coding",
          summary,
          filesChanged: sessionState.filesChanged,
          lastBuilt:    sessionState.lastBuilt,
          branch,
        });
      }
    } catch { /* memory write failure is non-fatal */ }
  }

  // Firestore session summary
  let admin: any;
  try { admin = await import("firebase-admin"); } catch { return; }
  try {
    if (admin.apps?.length) {
      const db = admin.firestore();
      await db.collection("agent_session_summaries").add({
        ...record,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch { /* silent */ }
}
