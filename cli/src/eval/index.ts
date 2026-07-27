/**
 * eval/index.ts — Public entry point for the eval framework.
 *
 * Re-exports the essential pieces needed for external consumers (e.g. scripts,
 * tests, or a future web dashboard that polls the eval results).
 */

export { AgentEvalRunner } from "./runner.js";
export { CsvDataLogger }   from "./storage/CsvDataLogger.js";
export { FirebaseDataLogger } from "./storage/FirebaseDataLogger.js";
export type { IDataLogger }   from "./storage/IDataLogger.js";
export { score, scoreTia, latencyToScore } from "./scorer.js";
export * from "./types.js";
export { ALL_TEST_CASES, TEST_SUITES, TOTAL_TEST_COUNT } from "./test-cases/index.js";
export { BASE_AGENT_TESTS }   from "./test-cases/base-agent.js";
export { RESUME_AGENT_TESTS } from "./test-cases/resume-agent.js";
export { JOBS_AGENT_TESTS }   from "./test-cases/jobs-agent.js";
