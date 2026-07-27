/**
 * types.ts — Shared type definitions for the CareerVivid Agent Evaluation Framework.
 *
 * All cross-cutting types live here so every module (runner, scorer, storage,
 * test cases) imports from a single canonical source.
 */

// ---------------------------------------------------------------------------
// Agent modes
// ---------------------------------------------------------------------------

/** The three cv agent invocation modes that can be benchmarked. */
export type AgentMode = "base" | "resume" | "jobs";

// ---------------------------------------------------------------------------
// Test case definition
// ---------------------------------------------------------------------------

/**
 * A single conversation turn inside a test case.
 *
 * For multi-turn tests, turns are injected sequentially into the same
 * QueryEngine instance so history is preserved.
 */
export interface TestTurn {
  /** The user prompt to inject. */
  prompt: string;
  /**
   * Optional keywords that MUST appear in the response for this turn.
   * Used for deterministic keyword scoring on top of the LLM judge.
   */
  expectedKeywords?: string[];
  /**
   * Tool names that must be called during this turn (deterministic TIA check).
   * Order does not matter.
   */
  expectTools?: string[];
  /**
   * Tool names that must NOT be called (hallucinated tool guard).
   */
  forbidTools?: string[];
}

/**
 * Rubric provided to the LLM-as-judge for qualitative scoring.
 */
export interface TestRubric {
  /** Plain-English description of what the user is trying to accomplish. */
  intent: string;
  /** Description of what an ideal response looks like. */
  goodResponse: string;
  /** Description of what a failing response looks like. */
  badResponse: string;
}

/**
 * A single test case (possibly multi-turn).
 *
 * Each test is run with a fresh QueryEngine so histories don't bleed
 * across test cases. Within a test, turns share the same history.
 */
export interface TestCase {
  /** Unique identifier, e.g. "BASE-001" */
  id: string;
  /** Human-readable name shown in progress output */
  name: string;
  /** Which agent mode to instantiate */
  agentMode: AgentMode;
  /** Ordered conversation turns */
  turns: TestTurn[];
  /** Qualitative rubric for the LLM-as-judge */
  rubric: TestRubric;
  /** Metadata tags for filtering (e.g. "multi-turn", "tool-use", "hallucination") */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Seven-dimensional score for a single test case evaluation.
 * All values are 0–10 (float).
 */
export interface DimensionScores {
  /** Intent Recognition Accuracy — Did agent understand what was asked? */
  intentRecognition: number;
  /** Reasoning Quality — Multi-step logic, depth, coherence */
  reasoningQuality: number;
  /** Context Retention — Does state persist across turns? (multi-turn only) */
  contextRetention: number;
  /** Tool Invocation Accuracy — Were the right tools called? */
  toolInvocation: number;
  /** Response Completeness — Did it address all sub-questions? */
  completeness: number;
  /** Hallucination Resistance — Did it avoid fabricating data? */
  hallucinationResistance: number;
  /** Latency Score — Inverted latency bucket (fast = high score) */
  latencyScore: number;
}

/** Weights applied to each dimension when computing the composite score. */
export const SCORE_WEIGHTS: Record<keyof DimensionScores, number> = {
  intentRecognition:       0.20,
  reasoningQuality:        0.20,
  contextRetention:        0.15,
  toolInvocation:          0.15,
  completeness:            0.15,
  hallucinationResistance: 0.10,
  latencyScore:            0.05,
};

/** Weighted composite score threshold above which a test is considered PASS. */
export const PASS_THRESHOLD = 6.0;

// ---------------------------------------------------------------------------
// Judge output
// ---------------------------------------------------------------------------

/**
 * Structured output from the LLM-as-judge prompt.
 * Covers only the qualitative dimensions (latency and TIA are deterministic).
 */
export interface JudgeOutput {
  ira: number;   // intentRecognition
  rq:  number;   // reasoningQuality
  cr:  number;   // contextRetention
  rc:  number;   // completeness
  hr:  number;   // hallucinationResistance
  rationale: string;
}

// ---------------------------------------------------------------------------
// Eval result (one per test case)
// ---------------------------------------------------------------------------

/**
 * Full result record that gets persisted to the data logger after every test.
 */
export interface EvalResult {
  /** UUID for this eval run batch (all tests in one `cv eval` invocation share this). */
  runId: string;
  /** ISO 8601 timestamp when this specific test completed. */
  timestamp: string;
  /** Suite name ("base" | "resume" | "jobs") */
  suite: string;
  /** The test case definition */
  testCase: TestCase;
  /** The agent's final text response (last turn of a multi-turn test) */
  agentResponse: string;
  /** Total wall-clock time in milliseconds (summed across all turns) */
  latencyMs: number;
  /** Names of all tools called during the test (ordered, may repeat) */
  toolsCalled: string[];
  /** Scores across all 7 dimensions */
  scores: DimensionScores;
  /** Weighted composite (0–10) */
  composite: number;
  /** true if composite >= PASS_THRESHOLD */
  pass: boolean;
  /** One-sentence rationale from the LLM judge (empty if --no-judge) */
  judgeRationale: string;
  /** Gemini model used for the agent */
  agentModel: string;
  /** Gemini model used for the judge */
  judgeModel: string;
}

// ---------------------------------------------------------------------------
// Runner summary
// ---------------------------------------------------------------------------

/** Aggregate statistics printed at the end of a `cv eval` run. */
export interface RunSummary {
  runId: string;
  suites: string[];
  total: number;
  passed: number;
  failed: number;
  avgComposite: number;
  avgLatencyMs: number;
  byDimension: DimensionScores; // averages
  csvPath: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Runner options
// ---------------------------------------------------------------------------

export interface RunnerOptions {
  /**
   * CareerVivid platform key (cv_live_...) — used when routing through the
   * CareerVivid proxy engine. Takes priority over geminiApiKey if both are set.
   */
  cvApiKey?: string;
  /** Direct Gemini API key — used when calling Gemini without the proxy. */
  geminiApiKey?: string;
  /** Gemini model for the agent under test. Default: gemini-2.5-flash */
  agentModel?: string;
  /** Gemini model for the LLM-as-judge. Default: gemini-2.5-flash */
  judgeModel?: string;
  /** Skip LLM-as-judge; use heuristics only (sets qualitative dims to 5.0). */
  noJudge?: boolean;
  /** Override output CSV directory. Default: career-ops/eval/ */
  outputDir?: string;
  /** Timeout per test case in ms. Default: 120_000 */
  timeoutMs?: number;
}
