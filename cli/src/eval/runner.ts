/**
 * runner.ts — AgentEvalRunner: drives the agent under test programmatically.
 *
 * Key design decisions:
 *
 * 1. ISOLATED HISTORY: Each test case gets a fresh QueryEngine instance, so
 *    conversation history never bleeds between test cases.
 *
 * 2. SAFE TOOL EXECUTION DURING EVAL:
 *    - READ tools: auto-approved (tracker_list_jobs, get_resume, search_jobs, etc.)
 *    - WRITE tools (tracker_add_job, tracker_update_job): auto-denied by default.
 *      Tests marked write-op use a TEMP COPY of jobs.csv so they can test
 *      write operations safely without modifying the real CSV.
 *
 * 3. LATENCY MEASUREMENT: wall-clock time summed across all turns for a test.
 *
 * 4. TOOL TRACKING: `toolsCalled` list is populated via onToolCall hook,
 *    then used by the scorer for deterministic TIA scoring.
 *
 * 5. TIMEOUT: each test case has a configurable timeout (default 120s).
 *    On timeout, the test is scored as a FAIL with latencyScore=0.
 */

import { randomUUID } from "crypto";
import { copyFileSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { QueryEngine, JOBS_SYSTEM_PROMPT }                from "../agent/QueryEngine.js";
import { CareerVividProxyEngine }     from "../agent/CareerVividProxyEngine.js";
import type { IDataLogger }           from "./storage/IDataLogger.js";
import type {
  TestCase, EvalResult, RunSummary, RunnerOptions, DimensionScores,
} from "./types.js";
import { PASS_THRESHOLD, SCORE_WEIGHTS } from "./types.js";
import { score as scoreResult }          from "./scorer.js";
import { ALL_JOB_TOOLS }                from "../agent/tools/jobs.js";
import { ALL_LOCAL_TRACKER_TOOLS }      from "../agent/tools/local-tracker.js";
import type { Tool }                    from "../agent/Tool.js";

// ---------------------------------------------------------------------------
// Agent system prompts (mirrors agent.ts, but stripped of REPL cruft)
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `You are an expert autonomous agent inside the CareerVivid CLI. You have access to tools for reading files, writing files, searching codebases, and running shell commands. Be concise, accurate, and always verify before acting.`;

const RESUME_SYSTEM_PROMPT = `You are the CareerVivid resume agent. You have access to tools to load, analyse, and tailor resumes for the user. Always use get_resume before giving any resume-specific advice. Never fabricate experience.`;

// JOBS_SYSTEM_PROMPT is imported from QueryEngine.js for parity with the main CLI agent

const SYSTEM_PROMPTS: Record<string, string> = {
  base:   BASE_SYSTEM_PROMPT,
  resume: RESUME_SYSTEM_PROMPT,
  jobs:   JOBS_SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Tools injected per mode
// ---------------------------------------------------------------------------

function getToolsForMode(mode: string): Tool[] {
  if (mode === "resume") {
    return ALL_JOB_TOOLS.filter((t) =>
      ["get_resume", "tailor_resume", "list_resumes"].includes(t.name)
    );
  }
  if (mode === "jobs") {
    const jobTools = ALL_JOB_TOOLS.filter((t) =>
      ["get_resume", "search_jobs", "kanban_add_job", "kanban_list_jobs", "kanban_update_status"].includes(t.name)
    );
    // All local tracker tools: list, update, add, tracker_rank_priority, tracker_dashboard, tracker_find_stale
    return [...jobTools, ...ALL_LOCAL_TRACKER_TOOLS];
  }
  return []; // base mode: no domain-specific tools injected
}

// ---------------------------------------------------------------------------
// Write-op isolation: temp copy of jobs.csv
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

function findJobsCsvPath(): string | null {
  const candidates = [
    resolve(__dirname, "../../../../career-vivid/data/jobs.csv"),
    resolve(__dirname, "../../../../../career-vivid/data/jobs.csv"),
    resolve(process.cwd(), "career-vivid/data/jobs.csv"),
  ];
  return candidates.find(existsSync) ?? null;
}

interface CsvSnapshot {
  originalPath: string;
  backupPath:   string;
}

function backupJobsCsv(): CsvSnapshot | null {
  const original = findJobsCsvPath();
  if (!original) return null;
  const backup = original + ".eval-backup";
  copyFileSync(original, backup);
  return { originalPath: original, backupPath: backup };
}

function restoreJobsCsv(snapshot: CsvSnapshot): void {
  if (existsSync(snapshot.backupPath)) {
    copyFileSync(snapshot.backupPath, snapshot.originalPath);
    unlinkSync(snapshot.backupPath);
  }
}

// ---------------------------------------------------------------------------
// Progress rendering
// ---------------------------------------------------------------------------

const STATUS_ICONS = {
  running: chalk.cyan("◌"),
  pass:    chalk.green("✔"),
  fail:    chalk.red("✘"),
  timeout: chalk.yellow("⏱"),
  error:   chalk.red("✖"),
};

function renderProgress(current: number, total: number, tc: TestCase, status: keyof typeof STATUS_ICONS, composite?: number): void {
  const icon    = STATUS_ICONS[status];
  const pct     = Math.round((current / total) * 100);
  const bar     = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  const score   = composite !== undefined ? chalk.bold(` ${composite.toFixed(1)}/10`) : "";
  const suite   = chalk.dim(`[${tc.agentMode.toUpperCase()}]`);
  console.log(`  ${icon} ${suite} ${chalk.white(`${tc.id}`)} — ${tc.name}${score}`);
  process.stdout.write(`  ${chalk.dim(`[${bar}]`)} ${chalk.dim(`${current}/${total} (${pct}%)`)}\r`);
}

// ---------------------------------------------------------------------------
// AgentEvalRunner
// ---------------------------------------------------------------------------

export class AgentEvalRunner {
  private readonly runId: string;
  private readonly opts:  RunnerOptions;
  private readonly logger: IDataLogger;

  constructor(logger: IDataLogger, opts: RunnerOptions) {
    this.runId  = randomUUID();
    this.opts   = opts;
    this.logger = logger;
  }

  /** Run a specific list of TestCases and return the run summary. */
  async runSuite(tests: TestCase[], suiteName: string): Promise<RunSummary> {
    const startTime = Date.now();
    const results:  EvalResult[] = [];

    console.log(chalk.bold.cyan(`\n  🧪 CareerVivid Agent Eval — Run ${this.runId.slice(0, 8)}`));
    console.log(chalk.dim(`  Suite: ${suiteName}  |  ${tests.length} tests  |  Agent: ${this.opts.agentModel}  |  Judge: ${this.opts.noJudge ? "heuristics only" : this.opts.judgeModel ?? "gemini-2.5-flash"}\n`));

    for (let i = 0; i < tests.length; i++) {
      const tc = tests[i];
      renderProgress(i, tests.length, tc, "running");

      let result: EvalResult;
      try {
        result = await this.runTest(tc, suiteName, i + 1, tests.length);
      } catch (err: any) {
        // Catastrophic error — fabricate a zero-score result so the run continues
        result = this.makeErrorResult(tc, suiteName, err.message);
      }

      results.push(result);
      await this.logger.log(result);

      const status = result.pass ? "pass" : "fail";
      renderProgress(i + 1, tests.length, tc, status, result.composite);
      const lat = result.latencyMs < 1000 ? `${result.latencyMs}ms` : `${(result.latencyMs / 1000).toFixed(1)}s`;
      console.log(chalk.dim(`    → Latency: ${lat}  Tools: ${result.toolsCalled.join(", ") || "none"}`));
      if (!result.pass) {
        console.log(chalk.yellow(`    → ${result.judgeRationale}`));
        console.log(chalk.dim(`    → Response: ${result.agentResponse}`));
      }
    }

    const summary = this.buildSummary(results, suiteName, startTime);
    await this.logger.logSummary?.(summary);
    this.printSummary(summary);
    return summary;
  }

  /** Run a single TestCase. Handles write-op isolation automatically. */
  async runTest(tc: TestCase, suite: string, current: number, total: number): Promise<EvalResult> {
    const isWriteOp = tc.tags.includes("write-op") && tc.agentMode === "jobs";
    let csvSnapshot: CsvSnapshot | null = null;

    if (isWriteOp) {
      csvSnapshot = backupJobsCsv();
    }

    try {
      return await this.executeTest(tc, suite);
    } finally {
      if (isWriteOp && csvSnapshot) {
        restoreJobsCsv(csvSnapshot);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: execute one test against a fresh engine
  // ─────────────────────────────────────────────────────────────────────────

  private async executeTest(tc: TestCase, suite: string): Promise<EvalResult> {
    const tools      = getToolsForMode(tc.agentMode);
    const agentModel = this.opts.agentModel ?? "gemini-2.5-flash";
    const isWriteOp  = tc.tags.includes("write-op");
    const cvApiKey   = this.opts.cvApiKey;
    const geminiKey  = this.opts.geminiApiKey;

    // Choose engine: proxy (cv credits) takes priority over direct Gemini key
    let engine: QueryEngine | CareerVividProxyEngine;

    if (cvApiKey) {
      engine = new CareerVividProxyEngine({
        cvApiKey,
        model:             agentModel,
        systemInstruction: SYSTEM_PROMPTS[tc.agentMode] ?? BASE_SYSTEM_PROMPT,
        tools,
        thinkingBudget:    0,  // no thinking in eval — speed + cost
        maxHistoryLength:  40,
      });
    } else if (geminiKey) {
      engine = new QueryEngine({
        apiKey:            geminiKey,
        model:             agentModel,
        systemInstruction: SYSTEM_PROMPTS[tc.agentMode] ?? BASE_SYSTEM_PROMPT,
        tools,
        thinkingBudget:    0,
      });
    } else {
      throw new Error(
        "No API key available for eval. Provide cvApiKey (cv credits) or geminiApiKey (personal key)."
      );
    }

    const toolsCalled:  string[] = [];
    let   lastResponse: string   = "";
    let   totalLatency: number   = 0;

    const onToolCall = async (toolName: string, _args: any): Promise<boolean | void> => {
      toolsCalled.push(toolName);
      // Write tools that mutate jobs.csv — deny on read-only tests
      const isWriteTool = ["tracker_update_job", "tracker_add_job"].includes(toolName);
      if (isWriteTool && !isWriteOp) return false;
      // All read tools (tracker_list_jobs, tracker_rank_priority, tracker_dashboard, tracker_find_stale,
      //   get_resume, search_jobs, kanban_list_jobs) are auto-approved
    };

    for (const turn of tc.turns) {
      const t0 = Date.now();

      // Both ProxyEngine and QueryEngine share the same runLoop signature
      const responseP = engine.runLoop(turn.prompt, { onToolCall } as any);
      const timeoutP  = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), this.opts.timeoutMs ?? 120_000)
      );

      try {
        lastResponse = await Promise.race([responseP, timeoutP]);
      } catch (err: any) {
        if (err.message === "TIMEOUT") {
          lastResponse = "[TIMEOUT — agent did not respond within the time limit]";
          totalLatency += (this.opts.timeoutMs ?? 120_000);
          break;
        }
        throw err;
      }

      totalLatency += Date.now() - t0;
    }

    // Score the result
    // For judge: use geminiKey if available, otherwise proxy judge is not yet
    // supported — fall back to heuristics-only if only cvApiKey provided.
    const judgeGeminiKey = geminiKey ?? "";
    const useJudge = this.opts.noJudge ? false : Boolean(judgeGeminiKey);

    const scored = await scoreResult({
      tc,
      agentResponse: lastResponse,
      latencyMs:     totalLatency,
      toolsCalled,
      scorerOpts: {
        geminiApiKey: judgeGeminiKey,
        judgeModel:   this.opts.judgeModel ?? "gemini-2.5-flash",
        noJudge:      !useJudge,
      },
    });

    const judgeLabel = useJudge
      ? this.opts.judgeModel ?? "gemini-2.5-flash"
      : "heuristics-only";

    return {
      runId:         this.runId,
      timestamp:     new Date().toISOString(),
      suite,
      testCase:      tc,
      agentResponse: lastResponse,
      latencyMs:     totalLatency,
      toolsCalled,
      ...scored,
      agentModel:  cvApiKey ? `proxy:${agentModel}` : agentModel,
      judgeModel:  judgeLabel,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: zero-score error result (used when executeTest throws)
  // ─────────────────────────────────────────────────────────────────────────

  private makeErrorResult(tc: TestCase, suite: string, errorMsg: string): EvalResult {
    const zeroScores: DimensionScores = {
      intentRecognition: 0, reasoningQuality: 0, contextRetention: 0,
      toolInvocation: 0, completeness: 0, hallucinationResistance: 0, latencyScore: 0,
    };
    return {
      runId:         this.runId,
      timestamp:     new Date().toISOString(),
      suite,
      testCase:      tc,
      agentResponse: `[ERROR: ${errorMsg}]`,
      latencyMs:     0,
      toolsCalled:   [],
      scores:        zeroScores,
      composite:     0,
      pass:          false,
      judgeRationale: `Test execution error: ${errorMsg}`,
      agentModel:    this.opts.agentModel ?? "gemini-2.5-flash",
      judgeModel:    this.opts.judgeModel ?? "gemini-2.5-flash",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: build aggregate RunSummary
  // ─────────────────────────────────────────────────────────────────────────

  private buildSummary(results: EvalResult[], suite: string, startTime: number): RunSummary {
    const total   = results.length;
    const passed  = results.filter((r) => r.pass).length;
    const failed  = total - passed;
    const avgComp = total > 0 ? results.reduce((s, r) => s + r.composite, 0) / total : 0;
    const avgLat  = total > 0 ? results.reduce((s, r) => s + r.latencyMs, 0) / total : 0;

    const dims = (Object.keys(SCORE_WEIGHTS) as (keyof DimensionScores)[]);
    const byDimension = dims.reduce((acc, dim) => {
      acc[dim] = total > 0
        ? results.reduce((s, r) => s + r.scores[dim], 0) / total
        : 0;
      return acc;
    }, {} as DimensionScores);

    return {
      runId:         this.runId,
      suites:        [suite],
      total,
      passed,
      failed,
      avgComposite:  parseFloat(avgComp.toFixed(2)),
      avgLatencyMs:  Math.round(avgLat),
      byDimension,
      csvPath:       "",  // filled in by the CLI command
      durationMs:    Date.now() - startTime,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: pretty-print terminal summary
  // ─────────────────────────────────────────────────────────────────────────

  private printSummary(summary: RunSummary): void {
    const passRate = summary.total > 0
      ? Math.round((summary.passed / summary.total) * 100)
      : 0;

    const compositeColor =
      summary.avgComposite >= 8 ? chalk.green :
      summary.avgComposite >= 6 ? chalk.yellow :
      chalk.red;

    console.log(chalk.bold("\n  ═══════════════════════ EVAL SUMMARY ═══════════════════════"));
    console.log(`  Run ID : ${chalk.dim(summary.runId)}`);
    console.log(`  Suite  : ${chalk.cyan(summary.suites.join(", "))}`);
    console.log(`  Total  : ${summary.total}   ${chalk.green(`✔ ${summary.passed} PASS`)}   ${chalk.red(`✘ ${summary.failed} FAIL`)}   (${passRate}%)`);
    console.log(`  Score  : ${compositeColor(summary.avgComposite.toFixed(2))} / 10.00`);
    console.log(`  Latency: ${chalk.dim(`avg ${Math.round(summary.avgLatencyMs)}ms`)}`);
    console.log(`  Time   : ${chalk.dim(`${(summary.durationMs / 1000).toFixed(1)}s`)}`);
    console.log(chalk.bold("\n  Dimension Breakdown:"));

    const dimLabels: Record<keyof DimensionScores, string> = {
      intentRecognition:       "Intent Recognition",
      reasoningQuality:        "Reasoning Quality ",
      contextRetention:        "Context Retention ",
      toolInvocation:          "Tool Invocation   ",
      completeness:            "Completeness      ",
      hallucinationResistance: "Hallucination Res.",
      latencyScore:            "Latency Score     ",
    };

    for (const [dim, label] of Object.entries(dimLabels)) {
      const val  = summary.byDimension[dim as keyof DimensionScores];
      const bar  = "█".repeat(Math.round(val)) + "░".repeat(10 - Math.round(val));
      const col  = val >= 7 ? chalk.green : val >= 5 ? chalk.yellow : chalk.red;
      console.log(`    ${label}  ${col(bar)}  ${col(val.toFixed(1))}`);
    }

    console.log(chalk.bold("  ═══════════════════════════════════════════════════════════\n"));
  }
}
