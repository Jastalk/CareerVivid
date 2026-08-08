/**
 * Hand-written decodes for the landing hero.
 *
 * These are EXAMPLES, written by hand, not model output — the hero labels them
 * as such. Until the public `decodeJobDescription` endpoint ships, the paste
 * field stays disabled rather than returning one of these for a visitor's own
 * job description: showing a fixed result for arbitrary input would read as
 * "we analysed your posting" when nothing of the sort happened.
 *
 * Every `href` below points at a route that exists today. When the live
 * endpoint lands, the model fills the same shape and these stay as the
 * zero-friction entry point.
 */

export interface DecodeSkill {
    name: string;
    why: string;
}

export interface DecodeStage {
    stage: string;
    detail: string;
}

export interface DecodeGapAction {
    skill: string;
    action: string;
    href: string;
    meta: string;
}

export interface JobDecode {
    id: string;
    /** Short label for the role selector. */
    label: string;
    roleTitle: string;
    company: string;
    /** Slug of a real company quest, when we have one. */
    companySlug?: string;
    /** What the posting actually describes, with the boilerplate removed. */
    summary: string;
    mustHave: string[];
    niceToHave: string[];
    skills: DecodeSkill[];
    interviewLoop: DecodeStage[];
    gapPlan: DecodeGapAction[];
}

export const SAMPLE_JOB_DECODES: JobDecode[] = [
    {
        id: 'frontend-new-grad',
        label: 'New-grad Frontend',
        roleTitle: 'Frontend Engineer, New Grad',
        company: 'Stripe',
        companySlug: 'stripe',
        summary:
            'A product engineering role, not a design role. You would own user-facing features end to end — the posting says "collaborate with design" but the day job is building and shipping React interfaces against an existing design system, and being able to defend your rendering and state decisions.',
        mustHave: [
            'JavaScript and TypeScript fundamentals, including async behaviour',
            'React: component composition, state, and effect timing',
            'Data structures and algorithms at interview depth',
            'Reading and modifying a codebase you did not write',
        ],
        niceToHave: [
            'Design-system or component-library experience',
            'Accessibility beyond the basics',
            'Any exposure to payments or financial data',
        ],
        skills: [
            { name: 'Arrays and hash maps', why: 'The first coding round is almost always one of these two shapes.' },
            { name: 'Two pointers and sliding window', why: 'The most common follow-up once the naive answer lands.' },
            { name: 'Trees and graph traversal', why: 'Shows up as UI-tree and dependency questions, not just LeetCode.' },
            { name: 'Rendering and state reasoning', why: '"Why did this re-render?" is the standard frontend deep-dive.' },
        ],
        interviewLoop: [
            { stage: 'Recruiter screen', detail: 'Motivation, a project you can narrate in depth, and compensation range.' },
            { stage: 'Live coding', detail: 'One or two algorithm problems in a shared editor, run against real tests.' },
            { stage: 'Frontend deep-dive', detail: 'Build or debug a component; expect questions on state and re-render behaviour.' },
            { stage: 'Behavioural', detail: 'Ownership and conflict stories, scored on specifics rather than sentiment.' },
        ],
        gapPlan: [
            {
                skill: 'Arrays, hash maps, two pointers, sliding window',
                action: 'Coding Interview Patterns — start at pattern 1',
                href: '/learning/coding-interview-patterns',
                meta: '20 patterns · 60 lessons · free',
            },
            {
                skill: 'Trees and graph traversal',
                action: 'Coding Interview Patterns — the tree and graph chapters',
                href: '/learning/coding-interview-patterns',
                meta: 'Step-through animations · free',
            },
            {
                skill: 'The actual Stripe loop',
                action: 'Run the Stripe interview quest',
                href: '/quest/stripe',
                meta: 'Recruiter → coding → deep-dive → behavioural',
            },
        ],
    },
    {
        id: 'backend-mid',
        label: 'Mid-level Backend',
        roleTitle: 'Software Engineer, Backend / Platform',
        company: 'Airbnb',
        companySlug: 'airbnb',
        summary:
            'A distributed-systems role wearing a generic title. "Build scalable services" means you will be asked to reason about traffic you cannot serve from one box — caching, queues, partitioning, and what breaks under load. Expect the system design round to carry more weight than the coding round.',
        mustHave: [
            'One backend language to real depth, not three shallowly',
            'Database modelling and query behaviour under load',
            'System design: caching, queues, partitioning, replication',
            'Production instincts — monitoring, failure modes, rollbacks',
        ],
        niceToHave: [
            'Kubernetes or comparable orchestration',
            'Event streaming (Kafka or similar)',
            'Multi-region or availability-zone-aware design',
        ],
        skills: [
            { name: 'Capacity estimation', why: 'Every design round opens with "how much traffic?" and most candidates guess.' },
            { name: 'Caching and rate limiting', why: 'The first lever interviewers expect you to reach for, and to justify.' },
            { name: 'Data at scale', why: 'Sharding and replication trade-offs separate mid from senior answers.' },
            { name: 'Async and event processing', why: 'The answer to "what if this write is slow?" — expected, not optional.' },
        ],
        interviewLoop: [
            { stage: 'Recruiter screen', detail: 'Scope of past ownership and the size of systems you have actually touched.' },
            { stage: 'Coding', detail: 'Practical data manipulation over puzzle-style algorithms.' },
            { stage: 'System design', detail: 'Whiteboard a service under stated load; defend every trade-off you take.' },
            { stage: 'Behavioural', detail: 'An incident you owned, and what changed afterwards.' },
        ],
        gapPlan: [
            {
                skill: 'Capacity estimation, caching, rate limiting',
                action: 'System Design Interview — modules 2 and 5',
                href: '/learning/system-design-interview',
                meta: '13 modules · 85 lessons',
            },
            {
                skill: 'Data at scale, async processing',
                action: 'System Design Interview — modules 6 and 7',
                href: '/learning/system-design-interview',
                meta: 'Watch a request flow under load',
            },
            {
                skill: 'The actual Airbnb loop',
                action: 'Run the Airbnb interview quest',
                href: '/quest/airbnb',
                meta: 'Includes a whiteboard design round',
            },
        ],
    },
    {
        id: 'ml-engineer',
        label: 'AI / ML Engineer',
        roleTitle: 'AI Engineer, Applied',
        company: 'OpenAI',
        companySlug: 'openai',
        summary:
            'This is an applied engineering role, not a research one. "Work with LLMs" means shipping and operating systems built on models you did not train — retrieval, tool use, evaluation, and cost. If you are preparing by reading papers, you are preparing for a different job.',
        mustHave: [
            'Strong general software engineering — this is assumed, not tested kindly',
            'Practical LLM work: prompting, context limits, structured output',
            'Retrieval-augmented generation and where it fails',
            'Evaluation — proving a change made the system better',
        ],
        niceToHave: [
            'Agent architectures and tool calling',
            'Inference cost and latency optimisation',
            'Safety, guardrails, and prompt-injection defence',
        ],
        skills: [
            { name: 'Tokens and context windows', why: 'Cost and truncation questions come up in almost every round.' },
            { name: 'Retrieval (RAG)', why: 'The most common system design prompt for this role in 2026.' },
            { name: 'Evaluation and observability', why: 'The strongest signal of applied maturity versus demo-building.' },
            { name: 'Prompt injection and guardrails', why: 'Expected of anyone shipping agents to real users.' },
        ],
        interviewLoop: [
            { stage: 'Recruiter screen', detail: 'What you have actually shipped with models, and who used it.' },
            { stage: 'Coding', detail: 'Standard engineering rigour — the ML content sits in later rounds.' },
            { stage: 'LLM system design', detail: 'Design a retrieval or agent system; expect cost and failure-mode probing.' },
            { stage: 'Applied deep-dive', detail: 'A project you owned, and how you proved it worked.' },
        ],
        gapPlan: [
            {
                skill: 'Tokens, context windows, prompting',
                action: 'AI Agent Builder Curriculum — modules 2 and 3',
                href: '/learning/ai-agent-curriculum',
                meta: 'Foundations module free',
            },
            {
                skill: 'Retrieval and evaluation',
                action: 'AI Agent Builder Curriculum — modules 4 and 7',
                href: '/learning/ai-agent-curriculum',
                meta: 'Flip retrieval off and meet the hallucination',
            },
            {
                skill: 'Guardrails and prompt injection',
                action: 'AI Agent Builder Curriculum — module 8',
                href: '/learning/ai-agent-curriculum',
                meta: 'LLM security',
            },
        ],
    },
];

export const DEFAULT_DECODE_ID = SAMPLE_JOB_DECODES[0].id;
