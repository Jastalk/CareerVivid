/**
 * base-agent.ts — Test cases for `cv agent` (no --resume, no --jobs flags).
 *
 * Covers general reasoning, context retention, coding assistance,
 * and hallucination resistance for the base agent mode.
 *
 * Suite: "base" (6 test cases — BASE-001 through BASE-006)
 */

import type { TestCase } from "../types.js";

export const BASE_AGENT_TESTS: TestCase[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "BASE-001",
    name:      "Identity & Capability Awareness",
    agentMode: "base",
    tags:      ["single-turn", "identity", "intent"],
    turns: [
      {
        prompt: "What are you and what can you help me with as a CareerVivid CLI agent?",
        expectedKeywords: ["careervivid", "agent", "tool"],
      },
    ],
    rubric: {
      intent:      "User wants to understand the agent's identity and capabilities.",
      goodResponse: "Clearly describes being a CareerVivid CLI AI agent, lists key capabilities like coding assistance, job search, resume analysis, publishing, and browser automation.",
      badResponse:  "Gives a generic LLM identity response, fails to mention CareerVivid-specific tools, or claims capabilities it doesn't have.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "BASE-002",
    name:      "Multi-Step Coding Plan",
    agentMode: "base",
    tags:      ["single-turn", "reasoning", "coding"],
    turns: [
      {
        prompt:
          "I want to add a rate-limiting middleware to a Node.js Express API. " +
          "The middleware should allow max 100 requests per IP per minute, " +
          "return a 429 with a Retry-After header when exceeded, and store state in Redis. " +
          "Walk me through the implementation plan including the packages, code structure, and error handling.",
        expectedKeywords: ["redis", "express", "rate", "429", "retry-after"],
      },
    ],
    rubric: {
      intent:      "User wants a concrete, multi-step implementation plan for rate-limiting middleware.",
      goodResponse: "Covers the right npm packages (e.g. express-rate-limit + rate-limit-redis or ioredis manual), explains the middleware function signature, Redis key strategy, the 429 status code, and the Retry-After header. Mentions error handling if Redis is unavailable.",
      badResponse:  "Only gives a vague high-level plan, misses the Redis integration, forgets the Retry-After header, or gives incorrect Express middleware API usage.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "BASE-003",
    name:      "Context Retention — 3-Turn Conversation",
    agentMode: "base",
    tags:      ["multi-turn", "context-retention"],
    turns: [
      {
        prompt: "I'm building a CLI tool in TypeScript. The tool will be called 'snapd' and will let developers snapshot their current directory state to a JSON file.",
      },
      {
        prompt: "Good. Now for snapd, design the schema for the JSON snapshot file. It should capture file names, last-modified timestamps, and file sizes.",
        expectedKeywords: ["snapd", "json", "timestamp", "size"],
      },
      {
        prompt: "Perfect. Based on everything we discussed about snapd, write a TypeScript function that loads a snapshot file and returns a list of files that have changed since the snapshot was taken.",
        expectedKeywords: ["snapd", "function", "typescript", "changed"],
      },
    ],
    rubric: {
      intent:      "User is iteratively designing a CLI tool across multiple turns. Each turn builds on the previous.",
      goodResponse: "In turn 3, correctly references 'snapd', uses the JSON schema from turn 2, and produces a TypeScript function that compares the snapshot's timestamps/sizes against the current filesystem.",
      badResponse:  "Forgets the name 'snapd', ignores the schema designed in turn 2, or writes generic file-comparison code that doesn't match the context.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "BASE-004",
    name:      "Ambiguous Instruction Handling",
    agentMode: "base",
    tags:      ["single-turn", "reasoning", "clarification"],
    turns: [
      {
        prompt: "Make it faster.",
      },
    ],
    rubric: {
      intent:      "User sends a deeply ambiguous command with no context. The agent should ask a clarifying question rather than guess or produce hallucinated output.",
      goodResponse: "Recognizes the ambiguity, asks what 'it' refers to, and requests context (e.g. what code or system the user wants to optimize).",
      badResponse:  "Makes up a codebase or assumes what 'it' is, produces optimization tips for random code, or claims the task was completed.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "BASE-005",
    name:      "Hallucination Trap — Nonexistent File",
    agentMode: "base",
    tags:      ["single-turn", "hallucination"],
    turns: [
      {
        prompt: "Read the file src/megaengine/quantum_optimizer.ts and tell me what the quantumSort function does.",
        forbidTools: ["read_file"],        // Should ask for confirmation or warn first, not blindly call
        expectedKeywords: ["not found", "doesn't exist", "cannot find", "no file", "let me check"],
      },
    ],
    rubric: {
      intent:      "User asks about a file that almost certainly doesn't exist. The agent should attempt to read it, handle the error gracefully, and report no such file — NOT fabricate what the function does.",
      goodResponse: "Attempts to read the file, gets an error (or confirms it doesn't exist), and tells the user the file was not found. Does not fabricate a description of quantumSort.",
      badResponse:  "Fabricates a description of quantumSort without actually reading the file, or states the function exists when it does not.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "BASE-006",
    name:      "Complex Reasoning — Big-O Analysis",
    agentMode: "base",
    tags:      ["single-turn", "reasoning", "technical-depth"],
    turns: [
      {
        prompt: `Analyze the time and space complexity of this algorithm and suggest an optimization:

function findDuplicates(arr: number[]): number[] {
  const duplicates: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}`,
        expectedKeywords: ["O(n^2)", "O(n", "set", "map", "hash"],
      },
    ],
    rubric: {
      intent:      "User wants a Big-O analysis and an optimized version of a quadratic duplicate-finder.",
      goodResponse: "Correctly identifies the current algorithm as O(n³) or O(n²) (the .includes check inside a nested loop makes it O(n³)), explains why, and provides an O(n) solution using a Set or a frequency map.",
      badResponse:  "Incorrectly states the complexity, fails to mention the .includes penalty, or provides an optimization that is still quadratic or worse.",
    },
  },
];
