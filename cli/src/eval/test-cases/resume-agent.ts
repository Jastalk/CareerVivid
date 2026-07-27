/**
 * resume-agent.ts — Test cases for `cv agent --resume`.
 *
 * Tests resume loading, skill-gap analysis, tailoring, coaching,
 * and hallucination resistance for the resume-enhanced agent mode.
 *
 * Suite: "resume" (5 test cases — RES-001 through RES-005)
 *
 * NOTE: These tests call get_resume which hits the CareerVivid API.
 *       Ensure CAREERVIVID_API_KEY is set in the eval environment.
 *       If the user has no resume, RES-001 through RES-005 may get
 *       graceful "no resume found" responses; the rubric accounts for this.
 */

import type { TestCase } from "../types.js";

export const RESUME_AGENT_TESTS: TestCase[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "RES-001",
    name:      "Resume Load and Experience Summary",
    agentMode: "resume",
    tags:      ["single-turn", "tool-use", "intent"],
    turns: [
      {
        prompt: "Load my resume and give me a 3-sentence summary of my professional background.",
        expectTools:      ["get_resume"],
        expectedKeywords: ["experience", "skills", "background"],
      },
    ],
    rubric: {
      intent:      "User wants a brief professional summary derived from their actual resume data.",
      goodResponse: "Calls get_resume, retrieves real data, and produces a concise 3-sentence summary that accurately reflects the loaded resume content (role, key skills, years of experience).",
      badResponse:  "Fabricates a summary without calling get_resume, ignores the resume content after loading it, or produces a summary with details not present in the resume.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "RES-002",
    name:      "Skill Gap Analysis vs Job Description",
    agentMode: "resume",
    tags:      ["multi-turn", "reasoning", "context-retention"],
    turns: [
      {
        prompt: "Load my resume.",
        expectTools: ["get_resume"],
      },
      {
        prompt: `Here is a job description. What skills am I missing, and how can I address each gap?

Job: Senior Backend Engineer at a fintech startup
Requirements:
- 5+ years Go or Rust
- Hands-on experience with Kafka or Pulsar event streaming
- Kubernetes cluster operations at scale
- Experience with PCI-DSS compliance
- Strong SQL (PostgreSQL) and NoSQL (Redis/Cassandra) skills`,
        expectedKeywords: ["gap", "missing", "experience", "recommend"],
      },
    ],
    rubric: {
      intent:      "User wants a specific skills gap analysis comparing their resume to a job description provided in turn 2.",
      goodResponse: "Uses loaded resume data from turn 1, correctly identifies skills the user has vs lacks relative to the job requirements, and gives actionable suggestions for each gap (courses, projects, certifications).",
      badResponse:  "Ignores the resume from turn 1, lists generic gaps without reference to the user's actual background, or fabricates skills the user has.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "RES-003",
    name:      "Resume Tailoring for Target Role",
    agentMode: "resume",
    tags:      ["multi-turn", "tool-use", "reasoning"],
    turns: [
      {
        prompt: "I want to tailor my resume for a Staff Software Engineer role at Stripe focused on payment infrastructure. Please load my resume first.",
        expectTools: ["get_resume"],
      },
      {
        prompt: "Now tailor the resume for that Stripe role. Use action verbs, quantify impact where possible, and highlight distributed systems experience.",
        expectTools:      ["tailor_resume"],
        expectedKeywords: ["stripe", "payment", "tailored", "engineer"],
      },
    ],
    rubric: {
      intent:      "User wants their resume tailored for a specific high-impact role using the tailor_resume tool.",
      goodResponse: "Calls tailor_resume with the Stripe role context, uses strong action verbs (led, designed, scaled), attempts to quantify impact, surfaces relevant distributed systems experience from the loaded resume.",
      badResponse:  "Fails to call tailor_resume, writes generic resume advice, produces a generic template that doesn't reference the actual resume content, or fails to connect skills to the Stripe role.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "RES-004",
    name:      "Hallucination Resistance — Fabricated Experience",
    agentMode: "resume",
    tags:      ["single-turn", "hallucination"],
    turns: [
      {
        prompt: "Load my resume, then tell me about my 8-year tenure at Meta and my role as VP of Infrastructure.",
        expectTools:  ["get_resume"],
        forbidTools:  [],
        expectedKeywords: ["not found", "doesn't show", "not listed", "no record", "unable to find"],
      },
    ],
    rubric: {
      intent:      "User makes a false claim about their own resume (8 years at Meta, VP title). The agent should load the resume and report the discrepancy — NOT fabricate or agree with the false claim.",
      goodResponse: "Loads the resume, then clearly states that the claimed experience (8 years at Meta, VP of Infrastructure) does not appear in the resume, and accurately reports what is there instead.",
      badResponse:  "Agrees with the fabricated Meta/VP experience, fails to load the resume, or produces a summary that validates the false employment history.",
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:        "RES-005",
    name:      "Multi-Turn Career Coaching Workflow",
    agentMode: "resume",
    tags:      ["multi-turn", "context-retention", "reasoning", "completeness"],
    turns: [
      {
        prompt: "Load my resume. I'm trying to transition from a backend engineer role to a technical product manager position.",
        expectTools: ["get_resume"],
      },
      {
        prompt: "Based on my current background, how strong is my PM candidacy on a scale of 1-10, and what are my top 3 transferable strengths?",
        expectedKeywords: ["strength", "transferable", "product", "engineer"],
      },
      {
        prompt: "What specific experiences from my resume should I highlight in a PM interview? Give me a STAR-format story I could tell.",
        expectedKeywords: ["situation", "task", "action", "result"],
      },
      {
        prompt: "Finally, what's a 90-day action plan for me to build PM credibility before my first interview?",
        expectedKeywords: ["30", "60", "90", "plan", "day"],
      },
    ],
    rubric: {
      intent:      "User is conducting a multi-turn career coaching session using their real resume. Each turn builds on the previous. Tests context retention, consistency, and actionable advice quality.",
      goodResponse: "In turn 4, produces a concrete 30/60/90-day plan that references skills from the resume and PM transition goals established in turns 1–3. All advice is personalized, not generic.",
      badResponse:  "Forgets the PM transition goal from turn 1, gives generic 90-day plans not tied to the user's background, or contradicts advice given in previous turns.",
    },
  },
];
