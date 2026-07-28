export type LearningSeoSlug = 'ai-agent-curriculum' | 'coding-interview-patterns' | 'system-design-interview';

export interface LearningSeoPage {
    path: string;
    title: string;
    description: string;
    heading: string;
    introduction: string;
    duration: string;
    level: string;
    access: string;
    topics: string[];
    faqs: Array<{ question: string; answer: string }>;
}

const pages: Record<'catalog' | LearningSeoSlug, LearningSeoPage> = {
    catalog: {
        path: '/learning',
        title: 'Interactive Courses: Coding Interviews, System Design, AI Agents',
        description: 'Learn by doing across 203 interactive lessons: 20 coding interview patterns with step-through algorithm animations, 13 modules of system design, and a 10-module AI agent curriculum. Coding Interview Patterns is free.',
        heading: 'Interactive courses for coding interviews, system design, and AI agents',
        introduction: 'CareerVivid offers hands-on learning paths with readings, animations, quizzes, and runnable code labs. Choose a course and learn by doing.',
        duration: 'Three self-paced online courses, 203 lessons',
        level: 'Beginner through advanced',
        access: 'Courses include free starting access.',
        topics: ['Coding interview preparation', 'System design interviews', 'AI agent building'],
        faqs: [],
    },
    'ai-agent-curriculum': {
        path: '/learning/ai-agent-curriculum',
        title: 'AI Agent Builder Curriculum: Learn to Build AI Agents',
        description: 'Learn to build AI agents in 10 practical modules: LLM foundations, prompting, RAG, agent architecture, evaluation, security, deployment, and a portfolio project. Module 1 is free.',
        heading: 'AI Agent Builder Curriculum',
        introduction: 'Build a practical mental model of AI agents, then apply it through readings, animated playgrounds, quizzes, and code labs from LLM foundations to a portfolio project.',
        duration: '10 modules, 58 lessons, about 9 hours',
        level: 'Beginner to advanced',
        access: 'The Foundations module is free. Later modules follow CareerVivid account and plan access rules.',
        topics: ['LLM foundations', 'Prompt engineering', 'Retrieval-augmented generation', 'Agent architecture', 'Multi-agent systems', 'Evaluation and observability', 'AI agent security', 'Deployment and a portfolio capstone'],
        faqs: [
            { question: 'What does the AI Agent Builder Curriculum cover?', answer: 'The curriculum covers LLM foundations, prompting, RAG, agent architecture, multi-agent systems, evaluation, security, deployment, and a portfolio capstone.' },
            { question: 'Can I start the AI Agent Builder Curriculum for free?', answer: 'Yes. The Foundations module is free to start. Later modules follow CareerVivid account and plan access rules.' },
        ],
    },
    'coding-interview-patterns': {
        path: '/learning/coding-interview-patterns',
        title: 'Coding Interview Patterns: 20 Visual Algorithm Lessons',
        description: 'Master 20 coding interview patterns through visual step-through animations, clear recognition signals, and runnable code labs. Practice arrays, graphs, trees, dynamic programming, and advanced algorithms for free.',
        heading: 'Coding Interview Patterns',
        introduction: 'Learn how to recognize common interview patterns, watch the algorithm state change one step at a time, and implement each pattern in a runnable JavaScript code lab.',
        duration: '20 patterns, 60 lessons, about 4 hours',
        level: 'Intermediate',
        access: 'Coding Interview Patterns is currently free to access.',
        topics: ['Arrays and pointers', 'Sliding windows and binary search', 'Trees and graphs', 'Dynamic programming', 'Divide and conquer and quickselect', 'String matching', 'Union Find and range trees', 'Minimum spanning trees, shortest paths, and network flow'],
        faqs: [
            { question: 'Which coding interview patterns are included?', answer: 'The course includes array, linked-list, tree, graph, optimization, string matching, range-query, shortest-path, and network-flow patterns, each with an animation and practice lesson.' },
            { question: 'Is Coding Interview Patterns free?', answer: 'Yes. Coding Interview Patterns is currently free to access on CareerVivid.' },
        ],
    },
    'system-design-interview': {
        path: '/learning/system-design-interview',
        title: 'System Design Interview Course: 13 Modules, 85 Lessons',
        description: 'Prepare for system design interviews across 85 lessons and 13 modules: an answer framework, capacity estimation, caching and rate limiting, data at scale, async processing, multi-region reliability, real-time systems, and a senior capstone.',
        heading: 'System Design Interview',
        introduction: 'Read the principle, watch a real request flow under load, choose between caches, queues, and partitions, draw the architecture, and explain every trade-off. Each module is harder than the last.',
        duration: '13 modules, 85 lessons, about 12 hours',
        level: 'Advanced',
        access: 'System Design Interview follows CareerVivid account and plan access rules.',
        topics: ['Interview framework', 'Capacity estimation', 'APIs and data models', 'Caching and rate limiting', 'Data at scale', 'Async and event processing', 'Reliability and multi-region', 'Real-time systems', 'Feeds, search, and analytics'],
        faqs: [
            { question: 'What does the System Design Interview course cover?', answer: 'The course covers an interview answer framework, capacity estimation, APIs and data models, core building blocks, caching and rate limiting, data at scale, async and event processing, reliability and multi-region design, real-time systems, feeds and search, distributed-system deep dives, a senior capstone, and a classic questions arena.' },
            { question: 'What level is the System Design Interview course?', answer: 'It is an advanced course of roughly 12 hours, aimed at engineers preparing for senior and staff system design rounds.' },
        ],
    },
};

/** Courses with their own prerendered page. Anything else renders the catalog. */
export const LEARNING_SEO_SLUGS: LearningSeoSlug[] = [
    'ai-agent-curriculum',
    'coding-interview-patterns',
    'system-design-interview',
];

const isKnownSlug = (slug: string): slug is LearningSeoSlug =>
    (LEARNING_SEO_SLUGS as string[]).includes(slug);

/** Courses anyone can open without an account — drives isAccessibleForFree. */
export const isLearningPageFree = (slug?: string): boolean => slug === 'coding-interview-patterns';

/**
 * Never returns null. This used to hand back null for any slug outside a
 * hardcoded pair, and renderSeoContent turned that into a 404 — so
 * /learning/system-design-interview and /learning/ccaf-quest were both
 * unreachable for crawlers even though the routes exist in the SPA.
 * Unknown slugs now fall back to the catalog, which is a real page that links
 * to all of them.
 */
export const getLearningSeoPage = (slug?: string): LearningSeoPage => {
    if (!slug) return pages.catalog;
    return isKnownSlug(slug) ? pages[slug] : pages.catalog;
};
