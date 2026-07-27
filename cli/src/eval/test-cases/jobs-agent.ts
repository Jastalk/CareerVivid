/**
 * jobs-agent.ts — Test cases for `cv agent --jobs`.
 *
 * Tests local CSV tracker (list/add/update), job search with resume context,
 * multi-turn application prep, and the new v2 attention matrix tools.
 *
 * Suite: "jobs" (12 test cases — JOBS-001 through JOBS-012)
 *
 * IMPORTANT — Write isolation:
 *   Tests with tag "write-op" use a temp backup of jobs.csv so write operations
 *   don't corrupt real pipeline data. Read-only tests have forbidTools guards.
 */

import type { TestCase } from "../types.js";

export const JOBS_AGENT_TESTS: TestCase[] = [

  // ── EXISTING 6 tests ──────────────────────────────────────────────────────

  {
    id:        "JOBS-001",
    name:      "Show Local Job Pipeline",
    agentMode: "jobs",
    tags:      ["single-turn", "tool-use", "intent"],
    turns: [
      {
        prompt:           "Check my local tracker and show me all the companies I'm currently tracking — grouped by tier and status.",
        expectTools:      ["tracker_list_jobs"],
        forbidTools:      ["tracker_update_job", "tracker_add_job"],
        expectedKeywords: ["tier", "status", "company"],
      },
    ],
    rubric: {
      intent:       "User wants to see all companies they're tracking in jobs.csv.",
      goodResponse: "Calls tracker_list_jobs with no filters and presents a clear, well-formatted summary grouped by tier and status, showing attention scores, excitement, effort and pipeline summary counts.",
      badResponse:  "Calls a different tool, returns unstructured data, or fabricates company data.",
    },
  },

  {
    id:        "JOBS-002",
    name:      "Add New Company to Tracker",
    agentMode: "jobs",
    tags:      ["multi-turn", "tool-use", "write-op"],
    turns: [
      {
        prompt:           "I want to add Linear to my job tracker. It's a Tier 1 target for a Senior Software Engineer role. Their careers page is at https://linear.app/careers. They use Ashby ATS.",
        expectTools:      ["tracker_add_job"],
        expectedKeywords: ["linear", "added", "tier", "LIN"],
      },
      {
        prompt:           "Good. What ID was assigned to the Linear entry?",
        expectedKeywords: ["LIN"],
      },
    ],
    rubric: {
      intent:       "User wants to add a new Tier 1 company and recall the auto-generated ID.",
      goodResponse: "Calls tracker_add_job with all provided details, reports auto-generated ID (LIN-001), and recalls it in turn 2.",
      badResponse:  "Fails to call tool, misses ATS/tier, or can't recall ID in turn 2.",
    },
  },

  {
    id:        "JOBS-003",
    name:      "Status Update Workflow",
    agentMode: "jobs",
    tags:      ["multi-turn", "tool-use", "context-retention", "write-op"],
    turns: [
      {
        prompt:           "Show me all jobs I haven't applied to yet.",
        expectTools:      ["tracker_list_jobs"],
        forbidTools:      ["tracker_update_job"],
        expectedKeywords: ["to apply", "status"],
      },
      {
        prompt:           "Pick the first Tier 1 company in the list and mark it as Applied. Set today as the application date.",
        expectTools:      ["tracker_update_job"],
        expectedKeywords: ["applied", "updated", "date"],
      },
      {
        prompt:           "Set a follow-up reminder for that same company in 5 days from today.",
        expectTools:      ["tracker_update_job"],
        expectedKeywords: ["follow", "updated"],
      },
    ],
    rubric: {
      intent:       "Pipeline management: move a job to Applied and set follow-up date.",
      goodResponse: "Lists unapplied jobs, marks the first Tier 1 company Applied with today's date, then sets follow-up_date correctly as 5 days from today.",
      badResponse:  "Updates wrong company, forgets which was referenced, or miscalculates follow-up date.",
    },
  },

  {
    id:        "JOBS-004",
    name:      "Job Search with Resume Context",
    agentMode: "jobs",
    tags:      ["multi-turn", "tool-use", "reasoning"],
    turns: [
      {
        prompt:      "Search for Senior Backend Engineer jobs for me. Load my resume first.",
        expectTools: ["get_resume"],
      },
      {
        prompt:           "Now search for jobs based on my background. Focus on remote roles at high-growth startups.",
        expectTools:      ["search_jobs"],
        expectedKeywords: ["remote", "startup", "engineer", "match"],
      },
    ],
    rubric: {
      intent:       "Job search scored against resume, filtered for remote startups.",
      goodResponse: "Loads resume in turn 1, searches in turn 2 with parameters derived from resume, presents results in clean table with match scores.",
      badResponse:  "Searches without loading resume, presents messy results, or fabricates job listings.",
    },
  },

  {
    id:        "JOBS-005",
    name:      "Multi-Step Application Prep",
    agentMode: "jobs",
    tags:      ["multi-turn", "reasoning", "context-retention", "completeness"],
    turns: [
      {
        prompt:      "I have an interview tomorrow at Supabase for a Developer Advocate role. Load my resume and help me prep.",
        expectTools: ["get_resume"],
      },
      {
        prompt:           "What are the top 3 things from my background I should highlight for this role?",
        expectedKeywords: ["supabase", "advocate", "background"],
      },
      {
        prompt:           "Give me 3 likely behavioral interview questions they'll ask and how I should answer each based on my resume.",
        expectedKeywords: ["question", "answer", "experience"],
      },
    ],
    rubric: {
      intent:       "Personalized interview prep using the user's real resume for a DevRel role.",
      goodResponse: "Generates 3 behavioral questions specific to DevRel at Supabase, provides answers grounded in actual resume content from turn 1.",
      badResponse:  "Gives generic questions not specific to DevRel/advocacy or ignores the Supabase context.",
    },
  },

  {
    id:        "JOBS-006",
    name:      "Context Retention — Cross-Turn Reference",
    agentMode: "jobs",
    tags:      ["multi-turn", "context-retention"],
    turns: [
      {
        prompt: "My top priority right now is landing a role at a database or developer tools company. I'm particularly excited about Neon, PlanetScale, and Turso.",
      },
      {
        prompt:      "For each of those 3 companies, pull up what I have in my local tracker if anything, and tell me the current status.",
        expectTools: ["tracker_list_jobs"],
      },
      {
        prompt:           "Of those I'm not tracking yet, which one should I add first and why?",
        forbidTools:      ["tracker_add_job"],
        expectedKeywords: ["recommend", "add", "because", "first"],
      },
      {
        prompt:           "OK, go ahead and add that company to my tracker as a Tier 1 target.",
        expectTools:      ["tracker_add_job"],
        expectedKeywords: ["added", "tier"],
      },
    ],
    rubric: {
      intent:       "Cross-turn memory: preference → lookup → recommend → execute. Tests coherence across 4 turns.",
      goodResponse: "In turn 4, adds the exact company recommended in turn 3, as Tier 1. Agent remembers all 3 companies from turn 1.",
      badResponse:  "Adds wrong company, forgets which was recommended, or adds all three.",
    },
  },

  // ── NEW v2 tests (attention matrix + new tools) ───────────────────────────

  {
    id:        "JOBS-007",
    name:      "Priority Pipeline Ranking (tracker_rank_priority)",
    agentMode: "jobs",
    tags:      ["single-turn", "tool-use", "attention-matrix"],
    turns: [
      {
        prompt:           "Run a priority ranking of my tracker data and tell me what to work on today. I want to see the quick apply opportunities at the top.",
        expectTools:      ["tracker_rank_priority"],
        forbidTools:      ["tracker_update_job", "tracker_add_job"],
        expectedKeywords: ["priority", "effort", "apply"],
      },
    ],
    rubric: {
      intent:       "User wants an attention-weighted ranked view of their pipeline to decide what to do next.",
      goodResponse: "Calls tracker_rank_priority, presents the ranked list with priority scores, highlights Low-effort quick-apply opportunities separately, and makes a concrete recommendation.",
      badResponse:  "Uses tracker_list_jobs without sorting, doesn't call tracker_rank_priority, or fails to highlight quick-apply opportunities.",
    },
  },

  {
    id:        "JOBS-008",
    name:      "Pipeline Analytics Dashboard (tracker_dashboard)",
    agentMode: "jobs",
    tags:      ["single-turn", "tool-use", "analytics"],
    turns: [
      {
        prompt:           "Pull up my pipeline stats. I want the full analytics dashboard — apply rate, average attention scores, how many are stale, and a recommendation.",
        expectTools:      ["tracker_dashboard"],
        forbidTools:      ["tracker_update_job", "tracker_add_job"],
        expectedKeywords: ["apply rate", "attention", "stale", "recommend"],
      },
    ],
    rubric: {
      intent:       "User wants a comprehensive analytics view of their job search pipeline health.",
      goodResponse: "Calls tracker_dashboard, surfaces at minimum: apply rate %, avg attention/excitement/fit scores, stale count, ATS breakdown, and a smart recommendation. Formats results clearly.",
      badResponse:  "Uses tracker_list_jobs and manually counts, doesn't mention stale jobs or averages, or provides no recommendation.",
    },
  },

  {
    id:        "JOBS-009",
    name:      "Stale Job Detection (tracker_find_stale)",
    agentMode: "jobs",
    tags:      ["single-turn", "tool-use", "attention-matrix"],
    turns: [
      {
        prompt:           "Scan my tracker for anything going stale — companies I've been neglecting. Flag them and give me a specific action for each one.",
        expectTools:      ["tracker_find_stale"],
        forbidTools:      ["tracker_update_job", "tracker_add_job"],
        expectedKeywords: ["stale", "action", "apply", "follow"],
      },
    ],
    rubric: {
      intent:       "User wants to surface neglected jobs with per-company action recommendations.",
      goodResponse: "Calls tracker_find_stale, presents stale companies with per-company actions (Apply Now / Follow Up / Deprioritize), and summarizes total counts. Offers next step.",
      badResponse:  "Lists all jobs without filtering for staleness, doesn't provide action recommendations, or guesses stale jobs without calling the tool.",
    },
  },

  {
    id:        "JOBS-010",
    name:      "Attention Score Update Workflow",
    agentMode: "jobs",
    tags:      ["multi-turn", "tool-use", "attention-matrix", "write-op"],
    turns: [
      {
        prompt:      "Show me my Tier 1 companies sorted by attention score.",
        expectTools: ["tracker_list_jobs"],
        forbidTools: ["tracker_update_job"],
      },
      {
        prompt:           "I'm feeling super energized about Cursor right now. Set my attention score for CUR-001 to 10 and excitement to 10.",
        expectTools:      ["tracker_update_job"],
        expectedKeywords: ["updated", "attention", "excitement", "CUR-001"],
      },
      {
        prompt:           "Now re-rank my pipeline and tell me what the new top 3 are.",
        expectTools:      ["tracker_rank_priority"],
        expectedKeywords: ["Cursor", "priority"],
      },
    ],
    rubric: {
      intent:       "User updates attention/excitement scores and immediately sees the effect on priority ranking.",
      goodResponse: "Lists Tier 1 companies, updates CUR-001 attention=10 and excitement=10, then calls tracker_rank_priority and shows Cursor at or near the top of the ranking.",
      badResponse:  "Fails to update scores, updates wrong company, or doesn't re-rank after update.",
    },
  },

  {
    id:        "JOBS-011",
    name:      "Quick Apply Decision Flow",
    agentMode: "jobs",
    tags:      ["multi-turn", "tool-use", "reasoning", "write-op"],
    turns: [
      {
        prompt:           "I have 30 minutes right now. Find me the highest-priority Low-effort job I can apply to immediately.",
        expectTools:      ["tracker_rank_priority"],
        forbidTools:      ["tracker_update_job", "tracker_add_job"],
        expectedKeywords: ["low", "effort", "apply"],
      },
      {
        prompt:           "Great. Mark that one as Applied right now and set a follow-up for 7 days from today.",
        expectTools:      ["tracker_update_job"],
        expectedKeywords: ["applied", "follow"],
      },
      {
        prompt:           "What's my apply rate now? And what are my next 3 priorities?",
        expectTools:      ["tracker_dashboard"],
        expectedKeywords: ["apply", "rate", "priority"],
      },
    ],
    rubric: {
      intent:       "Time-constrained apply decision → execution → impact check. Validates end-to-end apply workflow.",
      goodResponse: "Identifies highest-priority Low-effort job from tracker_rank_priority. Marks it Applied with follow-up in turn 2. Shows updated apply rate and refreshed priority list in turn 3.",
      badResponse:  "Picks a medium/high-effort job, fails to set follow-up, or gives stale metrics without re-calling the tool.",
    },
  },

  {
    id:        "JOBS-012",
    name:      "Search → Add → Score Workflow",
    agentMode: "jobs",
    tags:      ["multi-turn", "tool-use", "reasoning", "write-op"],
    turns: [
      {
        prompt:      "Search for Forward Deployed Engineer roles. Load my resume first.",
        expectTools: ["get_resume"],
      },
      {
        prompt:           "Search now with focus on AI/agent companies.",
        expectTools:      ["search_jobs"],
        expectedKeywords: ["match", "engineer", "remote"],
      },
      {
        prompt:           "The top result looks interesting. Add it to my local tracker as a Tier 2 target with attention_score 8 and excitement 8.",
        expectTools:      ["tracker_add_job"],
        expectedKeywords: ["added", "tier", "attention"],
      },
      {
        prompt:           "How does this new company rank in my pipeline? Show me where it fits in my priority score.",
        expectTools:      ["tracker_rank_priority"],
        expectedKeywords: ["priority", "score"],
      },
    ],
    rubric: {
      intent:       "Full end-to-end workflow: search → discover → add to tracker → see priority ranking. Tests all major tools in sequence.",
      goodResponse: "Uses resume context to search, adds the top result with specified scores, then shows tracker_rank_priority where the new entry appears in the ranked list.",
      badResponse:  "Adds a different company than the top search result, omits attention/excitement scores, or doesn't call tracker_rank_priority to show placement.",
    },
  },
];
