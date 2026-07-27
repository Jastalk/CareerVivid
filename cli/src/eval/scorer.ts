/**
 * scorer.ts — Two-layer scoring engine for the CareerVivid Agent Eval Framework.
 *
 * Layer 1 — Deterministic (instant, free):
 *   - Tool Invocation Accuracy (TIA): expected vs actual tool calls
 *   - Latency Score (LAT): inverted bucket based on ms
 *   - Keyword bonus/malus applied on top of LLM IRA score
 *
 * Layer 2 — LLM-as-Judge (cheap, ~0.01 credit per test):
 *   - Calls Gemini with a structured rubric prompt
 *   - Scores IRA, RQ, CR, RC, HR on 0–10 scales
 *   - Returns a one-sentence rationale per dimension
 *
 * When --no-judge is set, qualitative dims default to 5.0 (neutral baseline)
 * and only deterministic dims are computed.
 */

import { GoogleGenAI } from "@google/genai";
import type {
  TestCase,
  DimensionScores,
  JudgeOutput,
  EvalResult,
} from "./types.js";
import { SCORE_WEIGHTS, PASS_THRESHOLD } from "./types.js";

// ---------------------------------------------------------------------------
// Latency bucketing
// ---------------------------------------------------------------------------

/**
 * Convert response latency to a 0–10 score.
 * Very fast responses (< 2s) get a perfect 10; anything ≥ 30s gets 0.
 */
export function latencyToScore(ms: number): number {
  if (ms < 2_000)  return 10;
  if (ms < 5_000)  return 8;
  if (ms < 10_000) return 6;
  if (ms < 20_000) return 4;
  if (ms < 30_000) return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// Deterministic TIA scoring
// ---------------------------------------------------------------------------

/**
 * Score tool invocation accuracy by comparing expected vs actual tool calls.
 *
 * Scoring rationale:
 *  - All expected tools called → 10
 *  - Partial → proportional credit (floor 2 per expected tool)
 *  - Zero expected tools → 10 (not applicable)
 *  - Forbidden tool called → penalty applied (−2 per forbidden tool)
 */
export function scoreTia(
  expectedTools: string[],
  forbiddenTools: string[],
  actualTools: string[],
): number {
  if (expectedTools.length === 0 && forbiddenTools.length === 0) return 10;

  let score = 10;

  // Positive: check expected tools are present
  if (expectedTools.length > 0) {
    const hitCount = expectedTools.filter((t) =>
      actualTools.includes(t)
    ).length;
    score = (hitCount / expectedTools.length) * 10;
  }

  // Negative: penalise forbidden tools that were called
  for (const forbidden of forbiddenTools) {
    if (actualTools.includes(forbidden)) {
      score = Math.max(0, score - 2);
    }
  }

  return parseFloat(score.toFixed(1));
}

/**
 * Returns true when a test required specific tools but NONE of them were called.
 * Used to apply a hard composite cap in the scorer — bypassing the 5.0 neutral
 * heuristics baseline that would otherwise mask the tool-invocation failure.
 */
export function didMissAllRequiredTools(
  expectedTools: string[],
  actualTools: string[],
): boolean {
  if (expectedTools.length === 0) return false;
  return !expectedTools.some((t) => actualTools.includes(t));
}

// ---------------------------------------------------------------------------
// Keyword bonus
// ---------------------------------------------------------------------------

/**
 * Apply a small keyword-based bonus/penalty to an existing IRA score.
 * Missing expected keywords: −0.5 per keyword (max −2)
 * All keywords present: +0.5 bonus (capped at 10)
 */
export function applyKeywordBonus(
  iraBase: number,
  expectedKeywords: string[],
  responseText: string,
): number {
  if (expectedKeywords.length === 0) return iraBase;

  const lowerResponse = responseText.toLowerCase();
  const missingCount = expectedKeywords.filter(
    (kw) => !lowerResponse.includes(kw.toLowerCase())
  ).length;

  let adjusted = iraBase;
  if (missingCount === 0) {
    adjusted = Math.min(10, iraBase + 0.5);
  } else {
    adjusted = Math.max(0, iraBase - Math.min(missingCount * 0.5, 2));
  }

  return parseFloat(adjusted.toFixed(1));
}

// ---------------------------------------------------------------------------
// LLM-as-Judge
// ---------------------------------------------------------------------------

const JUDGE_SYSTEM_PROMPT = `You are an impartial AI evaluation judge scoring a job-hunting AI agent's responses.
Your output must always be valid JSON and nothing else. Do not include prose, markdown fences, or explanations outside the JSON object.`;

function buildJudgePrompt(tc: TestCase, response: string): string {
  const allPrompts = tc.turns.map((t, i) => `Turn ${i + 1}: ${t.prompt}`).join("\n");
  return `Evaluate this AI agent response according to the rubric below.

## Test: ${tc.id} — ${tc.name}

## Rubric
INTENT: ${tc.rubric.intent}
GOOD_RESPONSE: ${tc.rubric.goodResponse}
BAD_RESPONSE: ${tc.rubric.badResponse}

## Conversation
${allPrompts}

## Agent Final Response
${response.substring(0, 1500)}

## Instructions
1. VERIFY EXPECTATIONS: Compare the Agent Response to the GOOD_RESPONSE. If the agent acts passively, asks for permission, or requires a conversational handoff instead of actually executing the implied task, it has FAILED the interaction.
2. SCORE DIMENSIONS: Rate the following on a 0–10 integer scale (10 = perfect):
- ira: Did the agent capture the intent? (Must be ≤ 4 if it asked for permission rather than executing)
- rq: Did the agent reason through the problem with depth and logic?
- cr: Did the agent maintain state/context? (10 if single-turn)
- rc: Did the agent address all aspects of the prompt completely?
- hr: Did the agent avoid hallucinating facts/tools?

Return ONLY this JSON object (no markdown, no explanation):
{
  "ira": <0-10>,
  "rq": <0-10>,
  "cr": <0-10>,
  "rc": <0-10>,
  "hr": <0-10>,
  "rationale": "<one sentence summarizing why it succeeded or failed. MUST start with VERDICT: PASS or VERDICT: FAIL>"
}`;
}

async function callJudge(
  ai: GoogleGenAI,
  model: string,
  tc: TestCase,
  response: string,
): Promise<JudgeOutput> {
  const result = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: buildJudgePrompt(tc, response) }] }],
    config: {
      systemInstruction: JUDGE_SYSTEM_PROMPT,
      // Disable thinking for the judge — we want pure JSON output
      thinkingConfig: { thinkingBudget: 0 },
    } as any,
  });

  const raw = result.text?.trim() ?? "";
  // Strip accidental markdown fences if the model adds them
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      ira: Math.min(10, Math.max(0, Number(parsed.ira ?? 5))),
      rq:  Math.min(10, Math.max(0, Number(parsed.rq  ?? 5))),
      cr:  Math.min(10, Math.max(0, Number(parsed.cr  ?? 5))),
      rc:  Math.min(10, Math.max(0, Number(parsed.rc  ?? 5))),
      hr:  Math.min(10, Math.max(0, Number(parsed.hr  ?? 5))),
      rationale: String(parsed.rationale ?? "No rationale provided."),
    };
  } catch {
    // Judge returned non-JSON — fall back to neutral scores
    return { ira: 5, rq: 5, cr: 5, rc: 5, hr: 5, rationale: `Judge parse error: ${raw.substring(0, 100)}` };
  }
}

// ---------------------------------------------------------------------------
// Composite score
// ---------------------------------------------------------------------------

export function computeComposite(scores: DimensionScores): number {
  const weighted = (Object.entries(SCORE_WEIGHTS) as [keyof DimensionScores, number][])
    .reduce((sum, [dim, weight]) => sum + scores[dim] * weight, 0);
  return parseFloat(weighted.toFixed(2));
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export interface ScorerOptions {
  geminiApiKey: string;
  judgeModel: string;
  noJudge: boolean;
}

/**
 * Score a test case result.
 *
 * Accepts the raw agent response, latency, and tool calls, then returns
 * the fully populated DimensionScores + composite + pass/fail + rationale.
 */
export async function score(opts: {
  tc: TestCase;
  agentResponse: string;
  latencyMs: number;
  toolsCalled: string[];
  scorerOpts: ScorerOptions;
}): Promise<Pick<EvalResult, "scores" | "composite" | "pass" | "judgeRationale">> {
  const { tc, agentResponse, latencyMs, toolsCalled, scorerOpts } = opts;

  // ── Layer 1: Deterministic ──────────────────────────────────────────────

  // Aggregate expected + forbidden tools across ALL turns
  const allExpectedTools  = tc.turns.flatMap((t) => t.expectTools  ?? []);
  const allForbiddenTools = tc.turns.flatMap((t) => t.forbidTools  ?? []);
  const allExpectedKws    = tc.turns.flatMap((t) => t.expectedKeywords ?? []);

  const tiaScore = scoreTia(allExpectedTools, allForbiddenTools, toolsCalled);
  const latScore = latencyToScore(latencyMs);

  // ── Layer 2: LLM-as-Judge (or neutral fallback) ─────────────────────────

  let judgeOut: JudgeOutput;

  if (scorerOpts.noJudge) {
    // Heuristics-only: use keyword presence to estimate IRA rather than flat 5.0.
    // Start at 6.0 (slightly above neutral) so a well-formed keyword response can pass.
    const kwBaseline = 6.0;
    const keywordIra = applyKeywordBonus(kwBaseline, allExpectedKws, agentResponse);

    // If the agent didn't call any expected tool, it almost certainly gave a
    // conversational non-answer — treat that as intent recognition failure.
    const missedTools = didMissAllRequiredTools(allExpectedTools, toolsCalled);
    const finalIra = missedTools ? Math.min(keywordIra, 2.0) : keywordIra;

    judgeOut = {
      ira: finalIra,
      rq:  missedTools ? 3.0 : 5.0,  // reasoning penalty for tool-skip
      cr:  5.0,
      rc:  missedTools ? 2.0 : 5.0,  // completeness penalty for tool-skip
      hr:  5.0,
      rationale: missedTools
        ? `(heuristics) Agent responded without calling required tool(s): ${allExpectedTools.join(", ")}`
        : "(heuristics) Judge disabled — qualitative dims estimated from tool calls and keywords.",
    };
  } else {
    const ai = new GoogleGenAI({ apiKey: scorerOpts.geminiApiKey });
    judgeOut = await callJudge(ai, scorerOpts.judgeModel, tc, agentResponse);
  }

  // In LLM-judge mode, still apply keyword bonus to IRA
  const adjustedIra = scorerOpts.noJudge
    ? judgeOut.ira  // already keyword-adjusted above
    : applyKeywordBonus(judgeOut.ira, allExpectedKws, agentResponse);

  const scores: DimensionScores = {
    intentRecognition:       adjustedIra,
    reasoningQuality:        judgeOut.rq,
    contextRetention:        judgeOut.cr,
    toolInvocation:          tiaScore,
    completeness:            judgeOut.rc,
    hallucinationResistance: judgeOut.hr,
    latencyScore:            latScore,
  };

  let composite = computeComposite(scores);

  // HARD CAP: if expected tools were defined but NONE were called, cap at 3.5
  // regardless of other scores. This prevents a fluent but wrong response from
  // scoring above the pass threshold when tool use was mandatory.
  if (didMissAllRequiredTools(allExpectedTools, toolsCalled)) {
    composite = Math.min(composite, 3.5);
  }

  return {
    scores,
    composite,
    pass: composite >= PASS_THRESHOLD,
    judgeRationale: judgeOut.rationale,
  };
}
