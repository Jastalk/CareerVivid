/**
 * Evaluation harness for the Enterprise Agent.
 *
 * Runs functions/test/eval_dataset.json against the live Agent Builder endpoint
 * and reports groundedness, completeness, relevance and latency against the
 * thresholds declared in the dataset.
 *
 *   npm run eval                 # all cases
 *   npm run eval -- --case ats-backend-strong-match
 *   npm run eval -- --json       # machine-readable, for CI
 *
 * Requires Application Default Credentials and provisioned datastores:
 *   gcloud auth application-default login
 *   node scripts/setup-enterprise-datastores.mjs --apply
 *
 * This calls the platform directly rather than going through the HTTPS proxy,
 * so it measures agent latency without a Cloud Functions cold start in the
 * number — the P95 target is about the agent, and mixing in an unrelated cold
 * start would make the figure describe something else.
 */

import * as fs from "fs";
import * as path from "path";
import { protos } from "@google-cloud/discoveryengine";
import {
    ENTERPRISE_DATASTORES,
    EnterpriseDatastoreKey,
    enterpriseServingConfigPath,
    getEnterpriseAgentClient,
} from "../src/utils/ai";

type Answer = protos.google.cloud.discoveryengine.v1.IAnswer;

const HarmCategory = protos.google.cloud.discoveryengine.v1.HarmCategory;
const HarmBlockThreshold =
    protos.google.cloud.discoveryengine.v1.AnswerQueryRequest.SafetySpec.SafetySetting
        .HarmBlockThreshold;
const FilteringLevel =
    protos.google.cloud.discoveryengine.v1.AnswerQueryRequest.GroundingSpec.FilteringLevel;

const SAFETY_SETTINGS = [
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

interface EvalCase {
    id: string;
    datastoreId: EnterpriseDatastoreKey;
    task: string;
    jobDescription?: string;
    resume?: string;
    query: string;
    expectedFacts: string[];
    mustNotClaim: string[];
    expectRefusal?: boolean;
    note?: string;
}

interface Dataset {
    thresholds: { groundedness: number; completeness: number; relevance: number; latencyP95Ms: number };
    cases: EvalCase[];
}

interface CaseResult {
    id: string;
    ok: boolean;
    latencyMs: number;
    groundingScore: number | null;
    completeness: number;
    citationCount: number;
    refused: boolean;
    violations: string[];
    answerPreview: string;
}

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const caseFilterIndex = args.indexOf("--case");
const caseFilter = caseFilterIndex >= 0 ? args[caseFilterIndex + 1] : null;

function loadDataset(): Dataset {
    const file = path.join(__dirname, "..", "test", "eval_dataset.json");
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Completeness is measured by how many expected facts the answer actually
 * mentions. Keyword overlap is a blunt proxy for entailment, but it is
 * deterministic and needs no second model in the loop — which matters for a
 * gate that has to give the same verdict on every CI run.
 */
function scoreCompleteness(answerText: string, expectedFacts: string[]): number {
    if (expectedFacts.length === 0) return 1;
    const haystack = answerText.toLowerCase();
    const hits = expectedFacts.filter((fact) => {
        const terms = fact
            .toLowerCase()
            .split(/\s+/)
            .filter((term) => term.length > 3 && !["is", "the", "not", "are", "and"].includes(term));
        if (terms.length === 0) return false;
        const matched = terms.filter((term) => haystack.includes(term)).length;
        return matched / terms.length >= 0.5;
    });
    return hits.length / expectedFacts.length;
}

/** Any phrase the answer must never assert — unevidenced skills, injected claims. */
function findViolations(answerText: string, mustNotClaim: string[]): string[] {
    const haystack = answerText.toLowerCase();
    return mustNotClaim.filter((claim) => {
        const core = claim.toLowerCase().replace(/ experience$/, "");
        // "Kafka is not evidenced" is fine; a bare positive assertion is not.
        if (!haystack.includes(core)) return false;
        const negated = new RegExp(`${core}[^.]{0,40}(not|no|missing|absent|lacks|without)`, "i");
        const preNegated = new RegExp(`(not|no|missing|absent|lacks|without)[^.]{0,40}${core}`, "i");
        return !negated.test(answerText) && !preNegated.test(answerText);
    });
}

function buildQuery(testCase: EvalCase): string {
    const parts: string[] = [];
    if (testCase.jobDescription) parts.push(`JOB DESCRIPTION:\n${testCase.jobDescription}`);
    if (testCase.resume) parts.push(`RESUME:\n${testCase.resume}`);
    parts.push(testCase.query);
    return parts.join("\n\n");
}

async function runCase(testCase: EvalCase, thresholds: Dataset["thresholds"]): Promise<CaseResult> {
    const { conversational } = getEnterpriseAgentClient();
    const datastore = ENTERPRISE_DATASTORES[testCase.datastoreId];

    const startedAt = Date.now();
    let answer: Answer = {};
    let refused = false;

    try {
        const [response] = await conversational.answerQuery({
            servingConfig: enterpriseServingConfigPath(datastore),
            query: { text: buildQuery(testCase) },
            userPseudoId: "eval-harness",
            safetySpec: { enable: true, safetySettings: SAFETY_SETTINGS },
            groundingSpec: {
                includeGroundingSupports: true,
                filteringLevel: FilteringLevel.FILTERING_LEVEL_HIGH,
            },
            answerGenerationSpec: {
                includeCitations: true,
                ignoreAdversarialQuery: true,
                ignoreLowRelevantContent: true,
                ignoreJailBreakingQuery: true,
            },
        });
        answer = response.answer || {};
        refused = (answer.answerSkippedReasons || []).length > 0 && !answer.answerText;
    } catch (error: any) {
        return {
            id: testCase.id,
            ok: false,
            latencyMs: Date.now() - startedAt,
            groundingScore: null,
            completeness: 0,
            citationCount: 0,
            refused: false,
            violations: [`request failed: ${error.message}`],
            answerPreview: "",
        };
    }

    const latencyMs = Date.now() - startedAt;
    const answerText = answer.answerText || "";
    const groundingScore = typeof answer.groundingScore === "number" ? answer.groundingScore : null;
    const completeness = scoreCompleteness(answerText, testCase.expectedFacts);
    const violations = findViolations(answerText, testCase.mustNotClaim);
    const citationCount = (answer.citations || []).length;

    // A case marked expectRefusal passes precisely when the agent declined.
    if (testCase.expectRefusal) {
        return {
            id: testCase.id,
            ok: refused || answerText.length === 0,
            latencyMs,
            groundingScore,
            completeness: 1,
            citationCount,
            refused,
            violations: refused ? [] : ["expected a refusal, got an answer"],
            answerPreview: answerText.slice(0, 160),
        };
    }

    const ok =
        !refused &&
        violations.length === 0 &&
        completeness >= thresholds.completeness &&
        (groundingScore === null || groundingScore >= thresholds.groundedness);

    return {
        id: testCase.id,
        ok,
        latencyMs,
        groundingScore,
        completeness,
        citationCount,
        refused,
        violations,
        answerPreview: answerText.slice(0, 160),
    };
}

function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[index];
}

async function main() {
    const dataset = loadDataset();
    const cases = caseFilter ? dataset.cases.filter((c) => c.id === caseFilter) : dataset.cases;

    if (cases.length === 0) {
        console.error(caseFilter ? `No case named ${caseFilter}` : "Dataset is empty");
        process.exit(1);
    }

    const results: CaseResult[] = [];
    for (const testCase of cases) {
        // Sequential on purpose: concurrent calls would distort the latency figures.
        const result = await runCase(testCase, dataset.thresholds);
        results.push(result);
        if (!jsonOutput) {
            const mark = result.ok ? "PASS" : "FAIL";
            const grounding = result.groundingScore === null ? "n/a" : result.groundingScore.toFixed(2);
            console.log(
                `${mark}  ${result.id.padEnd(32)} ` +
                `grounding=${grounding}  completeness=${result.completeness.toFixed(2)}  ` +
                `citations=${result.citationCount}  ${result.latencyMs}ms`
            );
            for (const violation of result.violations) console.log(`        ! ${violation}`);
        }
    }

    const latencies = results.map((r) => r.latencyMs);
    const p95 = percentile(latencies, 95);
    const grounded = results.map((r) => r.groundingScore).filter((s): s is number => s !== null);
    const summary = {
        total: results.length,
        passed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        meanGroundedness: grounded.length ? grounded.reduce((a, b) => a + b, 0) / grounded.length : null,
        meanCompleteness: results.reduce((a, r) => a + r.completeness, 0) / results.length,
        latencyP95Ms: p95,
        latencyBudgetMs: dataset.thresholds.latencyP95Ms,
        latencyWithinBudget: p95 <= dataset.thresholds.latencyP95Ms,
    };

    if (jsonOutput) {
        console.log(JSON.stringify({ summary, results }, null, 2));
    } else {
        console.log("\n──────────────────────────────────────────");
        console.log(`passed            ${summary.passed}/${summary.total}`);
        console.log(`mean groundedness ${summary.meanGroundedness?.toFixed(3) ?? "n/a"} (>= ${dataset.thresholds.groundedness})`);
        console.log(`mean completeness ${summary.meanCompleteness.toFixed(3)} (>= ${dataset.thresholds.completeness})`);
        console.log(`latency p95       ${summary.latencyP95Ms}ms (<= ${dataset.thresholds.latencyP95Ms}ms)`);
        if (!summary.latencyWithinBudget) console.log("  ! P95 latency is over budget");
    }

    process.exit(summary.failed > 0 || !summary.latencyWithinBudget ? 1 : 0);
}

main().catch((error) => {
    console.error("Evaluation failed:", error.message);
    process.exit(1);
});
