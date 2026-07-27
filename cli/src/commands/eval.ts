/**
 * eval.ts — `cv eval` command registration.
 *
 * Usage:
 *   cv eval                         Run all suites (base + resume + jobs)
 *   cv eval --suite base            Only run the base agent suite
 *   cv eval --suite resume          Only run the resume agent suite
 *   cv eval --suite jobs            Only run the jobs agent suite
 *   cv eval --test BASE-003         Run a single test by ID
 *   cv eval --no-judge              Skip LLM-as-judge (heuristics only, free)
 *   cv eval --output /path/out.csv  Override CSV output directory
 *   cv eval --agent-model gemini-2.5-flash  Override the agent model
 *   cv eval --judge-model gemini-2.5-flash  Override the judge model
 */

import { Command }       from "commander";
import chalk             from "chalk";
import { loadConfig, getGeminiKey, getLlmConfig, getApiKey } from "../config.js";
import { AgentEvalRunner }          from "../eval/runner.js";
import { CsvDataLogger }            from "../eval/storage/CsvDataLogger.js";
import { ALL_TEST_CASES, TEST_SUITES, TOTAL_TEST_COUNT } from "../eval/test-cases/index.js";
import type { TestCase, RunnerOptions } from "../eval/types.js";
import { promptForAgentModel } from "./agent/configurator.js";

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerEvalCommand(program: Command): void {
  program
    .command("eval")
    .description("Benchmark the CareerVivid CLI agent suite across 7 intelligence dimensions")
    .option("--suite <name>",     "Run only one suite: base | resume | jobs")
    .option("--test <id>",        "Run a single test case by ID (e.g. BASE-003)")
    .option("--no-judge",         "Skip LLM-as-judge scoring (deterministic heuristics only — free)")
    .option("--output <dir>",     "Override CSV output directory (default: career-ops/eval/)")
    .option("--agent-model <m>",  "Gemini model for the agent under test (default: gemini-2.5-flash)")
    .option("--judge-model <m>",  "Gemini model for the LLM-as-judge (default: gemini-2.5-flash)")
    .option("--timeout <ms>",     "Per-test timeout in milliseconds (default: 120000)", "120000")
    .addHelpText("after", `
Examples:
  cv eval                         Run all ${TOTAL_TEST_COUNT} test cases
  cv eval --suite base            Run only the 6 base-agent tests
  cv eval --suite jobs --no-judge Fast heuristics-only run
  cv eval --test BASE-003         Run a single test
`)
    .action(async (opts) => {
      await runEval(opts);
    });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function runEval(opts: {
  suite?:      string;
  test?:       string;
  noJudge?:    boolean;
  output?:     string;
  agentModel?: string;
  judgeModel?: string;
  timeout?:    string;
}): Promise<void> {
  // ── Interactive Model Selection ──────────────────────────────────────────
  if (!opts.agentModel) {
    console.log(chalk.bold.cyan("\n🤖 CareerVivid Agent Evaluation suite"));
    const result = await promptForAgentModel();
    if (result.selectedProvider !== "careervivid" && result.selectedProvider !== "gemini") {
      console.error(chalk.red("\n  ✖ Eval suite currently only supports stateful Proxy/Query engines (CareerVivid Cloud or Gemini direct)."));
      console.error(chalk.dim("  BYO providers (OpenAI, Anthropic, etc.) are not yet supported for autonomous loop evaluation.\n"));
      process.exit(1);
    }
    opts.agentModel = result.selectedModel;
    if (result.apiKey) {
      // Temporarily store it so runner can see it if it's gemini
      process.env.GOOGLE_API_KEY = result.apiKey;
    }
  }

  // ── Resolve API keys ─────────────────────────────────────────────────────
  // Priority:
  //   1. Personal Gemini key (getLlmConfig) — most capable, enables LLM judge
  //   2. CareerVivid platform key (getApiKey) — uses cloud credits, judge = heuristics
  const llmCfg   = getLlmConfig();
  const geminiApiKey  = llmCfg.apiKey || process.env.GOOGLE_API_KEY || "";
  const cvApiKey = getApiKey() || "";

  if (!geminiApiKey && !cvApiKey) {
    console.error(chalk.red("\n  ✖ No API key found.\n"));
    console.error(
      `  Option 1 (personal Gemini key):   ${chalk.cyan("cv agent config")}  → choose 'Gemini (personal key)'\n` +
      `  Option 2 (CareerVivid credits):   ${chalk.cyan("cv login")}\n` +
      `  Option 3 (env var):               ${chalk.cyan("export GEMINI_API_KEY=AIza...")}\n`
    );
    process.exit(1);
  }

  // Inform user which engine will be used for eval
  if (geminiApiKey) {
    console.log(chalk.dim(`\n  ▶ Engine: Gemini direct (${llmCfg.model}) | Judge: LLM-as-Judge`));
  } else {
    console.log(chalk.dim(`\n  ▶ Engine: CareerVivid cloud proxy | Judge: heuristics-only (no personal Gemini key)\n  ▶ Tip: Set GEMINI_API_KEY to enable LLM-as-Judge scoring`));
  }

  // ── Resolve test cases ───────────────────────────────────────────────────
  let tests: TestCase[];
  let suiteName: string;

  if (opts.test) {
    // Single test by ID
    const found = ALL_TEST_CASES.find(
      (tc) => tc.id.toUpperCase() === opts.test!.toUpperCase()
    );
    if (!found) {
      console.error(chalk.red(`\n  ✖ Test "${opts.test}" not found.\n`));
      console.error(`  Available IDs: ${ALL_TEST_CASES.map((t) => t.id).join(", ")}\n`);
      process.exit(1);
    }
    tests     = [found];
    suiteName = found.agentMode;

  } else if (opts.suite) {
    const lower = opts.suite.toLowerCase();
    if (!TEST_SUITES[lower]) {
      console.error(chalk.red(`\n  ✖ Unknown suite "${opts.suite}". Valid suites: base, resume, jobs\n`));
      process.exit(1);
    }
    tests     = TEST_SUITES[lower];
    suiteName = lower;

  } else {
    // All suites
    tests     = ALL_TEST_CASES;
    suiteName = "all";
  }

  // ── Build runner options ─────────────────────────────────────────────────
  const runnerOpts: RunnerOptions = {
    cvApiKey:     cvApiKey || undefined,
    geminiApiKey: geminiApiKey || undefined,
    agentModel:   opts.agentModel ?? "gemini-2.5-flash",
    judgeModel:   opts.judgeModel ?? "gemini-2.5-flash",
    noJudge:      opts.noJudge ?? !geminiApiKey,
    outputDir:    opts.output,
    timeoutMs:    parseInt(opts.timeout ?? "120000", 10),
  };

  // ── Instantiate logger with DIP ──────────────────────────────────────────
  // To swap to Firebase: replace CsvDataLogger with FirebaseDataLogger here.
  const logger = new CsvDataLogger({
    outputDir: runnerOpts.outputDir,
  });

  // ── Run ──────────────────────────────────────────────────────────────────
  const runner = new AgentEvalRunner(logger, runnerOpts);

  try {
    const summary = await runner.runSuite(tests, suiteName);

    // Patch csvPath into summary (logger knows the path)
    summary.csvPath = logger.filePath;

    await logger.flush();

    console.log(`  📁  Results saved → ${chalk.cyan(logger.filePath)}\n`);

  } catch (err: any) {
    console.error(chalk.red(`\n  ✖ Eval run failed: ${err.message}\n`));
    process.exit(1);
  } finally {
    await logger.close();
  }
}
