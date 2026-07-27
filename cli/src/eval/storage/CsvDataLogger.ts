/**
 * CsvDataLogger.ts — CSV-backed implementation of IDataLogger.
 *
 * Writes one row per EvalResult to a dated CSV file at:
 *   <outputDir>/results-YYYY-MM-DD.csv
 *
 * Default output directory: career-vivid/eval/
 *
 * Features:
 *   - Append-safe: if the file already exists from an earlier run today, new
 *     rows are appended (so re-runs don't overwrite history).
 *   - Header auto-detection: headers are written only on file creation.
 *   - Sync write: each log() call flushes immediately (no data loss on crash).
 *   - Summary row: logSummary() appends a blank-then-summary row at the end.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { IDataLogger } from "./IDataLogger.js";
import type { EvalResult, RunSummary } from "../types.js";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CsvDataLoggerOptions {
  /**
   * Directory to write CSV files into.
   * Defaults to <repo_root>/career-vivid/eval/
   */
  outputDir?: string;
}

// ---------------------------------------------------------------------------
// CSV column definitions
// ---------------------------------------------------------------------------

const COLUMNS = [
  "run_id",
  "timestamp",
  "suite",
  "test_id",
  "test_name",
  "agent_mode",
  "prompt",
  "response_preview",
  "latency_ms",
  "ira_score",
  "rq_score",
  "cr_score",
  "tia_score",
  "rc_score",
  "hr_score",
  "lat_score",
  "composite_score",
  "pass_fail",
  "tools_called",
  "judge_rationale",
  "agent_model",
  "judge_model",
  "tags",
] as const;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Escape a field for CSV: wrap in quotes if it contains comma, quote, or newline. */
function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Resolve the default output directory relative to the monorepo root. */
function defaultOutputDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname  = dirname(__filename);
  // From dist/eval/storage/ or src/eval/storage/, go up 4 levels to repo root
  const candidates = [
    resolve(__dirname, "../../../../career-vivid/eval"),
    resolve(__dirname, "../../../../../career-vivid/eval"),
    resolve(process.cwd(), "career-vivid/eval"),
  ];
  // Return the first parent that exists, or the cwd-relative fallback
  for (const c of candidates) {
    // We only care if the career-vivid dir exists — create eval/ inside it
    if (existsSync(resolve(c, ".."))) return c;
  }
  return resolve(process.cwd(), "career-vivid/eval");
}

/** Format date as YYYY-MM-DD in local time. */
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// CsvDataLogger
// ---------------------------------------------------------------------------

export class CsvDataLogger implements IDataLogger {
  private readonly csvPath: string;
  private readonly outputDir: string;
  private headerWritten: boolean;

  constructor(options: CsvDataLoggerOptions = {}) {
    this.outputDir = options.outputDir ?? defaultOutputDir();

    // Ensure directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    this.csvPath = join(this.outputDir, `results-${todayStr()}.csv`);
    this.headerWritten = existsSync(this.csvPath);

    // Write header if file is new
    if (!this.headerWritten) {
      writeFileSync(this.csvPath, COLUMNS.join(",") + "\n", "utf-8");
      this.headerWritten = true;
    }
  }

  /** Full path to the CSV file being written to. */
  get filePath(): string {
    return this.csvPath;
  }

  async log(result: EvalResult): Promise<void> {
    const { scores, testCase } = result;

    // Use first turn's prompt for display; multi-turn cases label as MULTI-TURN
    const displayPrompt =
      testCase.turns.length === 1
        ? testCase.turns[0].prompt.substring(0, 120)
        : `MULTI-TURN (${testCase.turns.length} turns)`;

    const row: Record<typeof COLUMNS[number], unknown> = {
      run_id:           result.runId,
      timestamp:        result.timestamp,
      suite:            result.suite,
      test_id:          testCase.id,
      test_name:        testCase.name,
      agent_mode:       testCase.agentMode,
      prompt:           displayPrompt,
      response_preview: result.agentResponse.replace(/\n/g, " ").substring(0, 200),
      latency_ms:       result.latencyMs,
      ira_score:        scores.intentRecognition.toFixed(1),
      rq_score:         scores.reasoningQuality.toFixed(1),
      cr_score:         scores.contextRetention.toFixed(1),
      tia_score:        scores.toolInvocation.toFixed(1),
      rc_score:         scores.completeness.toFixed(1),
      hr_score:         scores.hallucinationResistance.toFixed(1),
      lat_score:        scores.latencyScore.toFixed(1),
      composite_score:  result.composite.toFixed(2),
      pass_fail:        result.pass ? "PASS" : "FAIL",
      tools_called:     result.toolsCalled.join(";"),
      judge_rationale:  result.judgeRationale.replace(/\n/g, " ").substring(0, 300),
      agent_model:      result.agentModel,
      judge_model:      result.judgeModel,
      tags:             testCase.tags.join(";"),
    };

    const line = COLUMNS.map((col) => csvEscape(row[col])).join(",") + "\n";
    appendFileSync(this.csvPath, line, "utf-8");
  }

  async flush(): Promise<void> {
    // appendFileSync is synchronous, so nothing to flush
  }

  async close(): Promise<void> {
    // No handles to close for sync file writes
  }

  async logSummary(summary: RunSummary): Promise<void> {
    // Append a human-readable summary block after all result rows
    const lines: string[] = [
      "",
      `# Run Summary — ${summary.runId}`,
      `# Date: ${new Date().toISOString()}`,
      `# Suites: ${summary.suites.join(", ")}`,
      `# Total: ${summary.total}  Passed: ${summary.passed}  Failed: ${summary.failed}`,
      `# Avg Composite: ${summary.avgComposite.toFixed(2)}`,
      `# Avg Latency: ${Math.round(summary.avgLatencyMs)}ms`,
      `# Duration: ${(summary.durationMs / 1000).toFixed(1)}s`,
      "",
    ];
    appendFileSync(this.csvPath, lines.join("\n"), "utf-8");
  }
}
