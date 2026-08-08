// AUTO-GENERATED from data/courses/*.json by scripts/sync-shared.mjs — DO NOT EDIT.
// Regenerate with: npm run sync:shared

export interface CourseSummary {
    id: string;
    title: string;
    track: string;
    difficulty: string;
    estimatedMinutes: number;
    tagline: string;
    lessons: number;
}

export const COURSE_CATALOG: CourseSummary[] = [
    {
        "id": "ai-foundations-map",
        "title": "01. AI foundations map",
        "track": "ai-agent",
        "difficulty": "Beginner",
        "estimatedMinutes": 60,
        "tagline": "Watch an LLM think, sort the AI stack yourself, and build a clean mental model.",
        "lessons": 10
    },
    {
        "id": "coding-interview-patterns",
        "title": "Coding Interview Patterns",
        "track": "coding-patterns",
        "difficulty": "Intermediate",
        "estimatedMinutes": 240,
        "tagline": "Every algorithm gets its own animation — see the pattern move, then code it yourself.",
        "lessons": 60
    },
    {
        "id": "llm-basics-sampling",
        "title": "02. LLM basics",
        "track": "ai-agent",
        "difficulty": "Beginner",
        "estimatedMinutes": 55,
        "tagline": "Tokens, context windows, and sampling — see them, break them, then reason about cost.",
        "lessons": 8
    },
    {
        "id": "system-design-interview",
        "title": "System Design Interview",
        "track": "system-design",
        "difficulty": "Advanced",
        "estimatedMinutes": 900,
        "tagline": "Learn to design scalable systems — from first sketch to a diagram you can defend.",
        "lessons": 85
    },
    {
        "id": "prompt-engineering-lab",
        "title": "03. Prompt engineering",
        "track": "ai-agent",
        "difficulty": "Beginner",
        "estimatedMinutes": 55,
        "tagline": "Assemble prompts block by block, train a model with examples, and ship structured output.",
        "lessons": 8
    },
    {
        "id": "rag-retrieval-lab",
        "title": "04. RAG retrieval",
        "track": "ai-agent",
        "difficulty": "Intermediate",
        "estimatedMinutes": 55,
        "tagline": "Watch a question flow through embed → search → answer, then flip retrieval off and meet the hallucination.",
        "lessons": 5
    },
    {
        "id": "agent-architecture-loop",
        "title": "05. Agent architecture",
        "track": "ai-agent",
        "difficulty": "Intermediate",
        "estimatedMinutes": 55,
        "tagline": "Be the agent's brain for a day: route tools, watch iterations burn, and trip the loop guard.",
        "lessons": 5
    },
    {
        "id": "multi-agent-supervisor",
        "title": "06. Multi-agent systems",
        "track": "ai-agent",
        "difficulty": "Intermediate",
        "estimatedMinutes": 50,
        "tagline": "Play supervisor: route subtasks to specialist agents and ship a feature as a team.",
        "lessons": 5
    },
    {
        "id": "eval-observability-lab",
        "title": "07. Evaluation and observability",
        "track": "ai-agent",
        "difficulty": "Intermediate",
        "estimatedMinutes": 50,
        "tagline": "Grade real model outputs against a rubric — and learn why a right answer can still fail.",
        "lessons": 4
    },
    {
        "id": "llm-security-guardrails",
        "title": "08. LLM security",
        "track": "ai-agent",
        "difficulty": "Intermediate",
        "estimatedMinutes": 50,
        "tagline": "Man the permission gate: spot injections, block exfiltration, and don't nuke the legit users.",
        "lessons": 5
    },
    {
        "id": "ai-deployment-controls",
        "title": "09. Deployment controls",
        "track": "ai-agent",
        "difficulty": "Intermediate",
        "estimatedMinutes": 50,
        "tagline": "Take the pager: resolve three production incidents with cache, queue, and rate limit.",
        "lessons": 5
    },
    {
        "id": "portfolio-ai-projects",
        "title": "10. Portfolio projects",
        "track": "ai-agent",
        "difficulty": "Advanced",
        "estimatedMinutes": 60,
        "tagline": "Turn nine courses of skills into a project a recruiter can poke at.",
        "lessons": 3
    }
];
