/**
 * index.ts — Aggregates and exports all test case suites.
 *
 * To add a new suite:
 *   1. Create test-cases/my-suite.ts with a MY_SUITE_TESTS: TestCase[] export
 *   2. Import it here and add it to ALL_TEST_CASES / TEST_SUITES
 */

import type { TestCase } from "../types.js";
import { BASE_AGENT_TESTS }   from "./base-agent.js";
import { RESUME_AGENT_TESTS } from "./resume-agent.js";
import { JOBS_AGENT_TESTS }   from "./jobs-agent.js";

export { BASE_AGENT_TESTS, RESUME_AGENT_TESTS, JOBS_AGENT_TESTS };

/** All test cases across all suites */
export const ALL_TEST_CASES: TestCase[] = [
  ...BASE_AGENT_TESTS,
  ...RESUME_AGENT_TESTS,
  ...JOBS_AGENT_TESTS,
];

/** Map of suite name → test cases (used by --suite CLI flag) */
export const TEST_SUITES: Record<string, TestCase[]> = {
  base:   BASE_AGENT_TESTS,
  resume: RESUME_AGENT_TESTS,
  jobs:   JOBS_AGENT_TESTS,
};

/** Total number of test cases */
export const TOTAL_TEST_COUNT = ALL_TEST_CASES.length;
