const BASE_URL = 'https://careervivid.app';
const PROVIDER = {
    '@type': 'Organization',
    name: 'CareerVivid',
    url: `${BASE_URL}/`,
};

type LearningSeoKey = 'catalog' | 'ai-agent-curriculum' | 'coding-interview-patterns' | 'system-design-interview';

export interface LearningSeoPage {
    path: string;
    title: string;
    description: string;
    keywords: string;
    schemaData: Record<string, unknown>;
}

const breadcrumb = (name: string, path: string) => ({
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'CareerVivid', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Learning', item: `${BASE_URL}/learning` },
        { '@type': 'ListItem', position: 3, name, item: `${BASE_URL}${path}` },
    ],
});

const courseSchema = ({
    name,
    path,
    description,
    hours,
    level,
    free,
    topics,
    faqs,
}: {
    name: string;
    path: string;
    description: string;
    hours: number;
    level: string;
    free: boolean;
    topics: string[];
    faqs: Array<{ question: string; answer: string }>;
}) => ({
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Course',
            '@id': `${BASE_URL}${path}#course`,
            name,
            description,
            url: `${BASE_URL}${path}`,
            provider: PROVIDER,
            educationalLevel: level,
            isAccessibleForFree: free,
            teaches: topics,
            hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: 'online',
                courseWorkload: `PT${hours}H`,
            },
            ...(free ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', category: 'Free' } } : {}),
        },
        breadcrumb(name, path),
        {
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
        },
    ],
});

const PAGES: Record<LearningSeoKey, LearningSeoPage> = {
    catalog: {
        path: '/learning',
        title: 'Interactive Courses: Coding Interviews, System Design, AI Agents',
        description: 'Learn by doing across 203 interactive lessons: 20 coding interview patterns with step-through algorithm animations, 13 modules of system design, and a 10-module AI agent curriculum. Coding Interview Patterns is free.',
        keywords: 'interactive online courses, coding interview patterns, system design interview course, AI agent course, learn AI agents, algorithm visualization, data structures and algorithms practice, skills building, technical interview preparation',
        schemaData: {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'CollectionPage',
                    '@id': `${BASE_URL}/learning#webpage`,
                    name: 'CareerVivid Interactive Courses',
                    description: 'Interactive CareerVivid courses for AI agent building and coding interview practice.',
                    url: `${BASE_URL}/learning`,
                    provider: PROVIDER,
                },
                {
                    '@type': 'ItemList',
                    name: 'CareerVivid interactive courses',
                    numberOfItems: 3,
                    itemListElement: [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            url: `${BASE_URL}/learning/coding-interview-patterns`,
                            name: 'Coding Interview Patterns',
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            url: `${BASE_URL}/learning/system-design-interview`,
                            name: 'System Design Interview',
                        },
                        {
                            '@type': 'ListItem',
                            position: 3,
                            url: `${BASE_URL}/learning/ai-agent-curriculum`,
                            name: 'AI Agent Builder Curriculum',
                        },
                    ],
                },
            ],
        },
    },
    'ai-agent-curriculum': {
        path: '/learning/ai-agent-curriculum',
        title: 'AI Agent Builder Curriculum: Learn to Build AI Agents',
        description: 'Learn to build AI agents in 10 practical modules: LLM foundations, prompting, RAG, agent architecture, evaluation, security, deployment, and a portfolio project. Module 1 is free.',
        keywords: 'AI agent course, learn to build AI agents, LLM course, prompt engineering, RAG course, agent architecture, AI agent portfolio project',
        schemaData: courseSchema({
            name: 'AI Agent Builder Curriculum',
            path: '/learning/ai-agent-curriculum',
            description: 'A 10-module AI agent learning path from LLM foundations through a shipped portfolio project, with readings, animated playgrounds, quizzes, and code labs.',
            hours: 9,
            level: 'Beginner to Advanced',
            free: false,
            topics: ['LLM fundamentals', 'Prompt engineering', 'Retrieval-augmented generation', 'Agent architecture', 'Evaluation and observability', 'AI agent security', 'Deployment'],
            faqs: [
                { question: 'What does the AI Agent Builder Curriculum cover?', answer: 'The curriculum covers LLM foundations, prompting, RAG, agent architecture, multi-agent systems, evaluation, security, deployment, and a portfolio capstone.' },
                { question: 'Can I start the AI Agent Builder Curriculum for free?', answer: 'Yes. The Foundations module is available to start for free; later modules follow CareerVivid account and plan access rules.' },
            ],
        }),
    },
    'coding-interview-patterns': {
        path: '/learning/coding-interview-patterns',
        title: 'Coding Interview Patterns: 20 Visual Algorithm Lessons',
        description: 'Master 20 coding interview patterns through visual step-through animations, clear recognition signals, and runnable code labs. Practice arrays, graphs, trees, dynamic programming, and advanced algorithms for free.',
        keywords: 'coding interview patterns, data structures and algorithms course, algorithm visualization, coding interview practice, LeetCode patterns, graph algorithms, dynamic programming',
        schemaData: courseSchema({
            name: 'Coding Interview Patterns',
            path: '/learning/coding-interview-patterns',
            description: 'A free visual coding interview course with 20 algorithm patterns, 60 lessons, interactive animations, and runnable JavaScript code labs.',
            hours: 4,
            level: 'Intermediate',
            free: true,
            topics: ['Two pointers', 'Sliding window', 'Binary search', 'Trees and graphs', 'Dynamic programming', 'Union Find', 'Minimum spanning tree', 'Network flow'],
            faqs: [
                { question: 'Which coding interview patterns are included?', answer: 'The course includes array, linked-list, tree, graph, optimization, string matching, range-query, shortest-path, and network-flow patterns, each with an animation and practice lesson.' },
                { question: 'Is Coding Interview Patterns free?', answer: 'Yes. Coding Interview Patterns is currently free to access on CareerVivid.' },
            ],
        }),
    },
    'system-design-interview': {
        path: '/learning/system-design-interview',
        title: 'System Design Interview Course: 13 Modules, 85 Lessons',
        description: 'Prepare for system design interviews across 85 lessons and 13 modules: an answer framework, capacity estimation, caching and rate limiting, data at scale, async processing, multi-region reliability, real-time systems, and a senior capstone.',
        keywords: 'system design interview course, system design interview preparation, distributed systems course, capacity estimation, caching and rate limiting, scalability interview, senior engineer interview prep',
        schemaData: courseSchema({
            name: 'System Design Interview',
            path: '/learning/system-design-interview',
            description: 'Read the principle, watch a real request flow under load, choose between caches, queues, and partitions, draw the architecture, and explain every trade-off — across 13 modules and 85 lessons.',
            hours: 12,
            level: 'Advanced',
            free: false,
            topics: ['Interview framework', 'Capacity estimation', 'APIs and data models', 'Caching and rate limiting', 'Data at scale', 'Async and event processing', 'Reliability and multi-region', 'Real-time systems', 'Feeds, search, and analytics'],
            faqs: [
                { question: 'What does the System Design Interview course cover?', answer: 'The course covers an interview answer framework, capacity estimation, APIs and data models, core building blocks, caching and rate limiting, data at scale, async and event processing, reliability and multi-region design, real-time systems, feeds and search, distributed-system deep dives, a senior capstone, and a classic questions arena.' },
                { question: 'What level is the System Design Interview course?', answer: 'It is an advanced course of roughly 12 hours, aimed at engineers preparing for senior and staff system design rounds. Each module is harder than the last.' },
            ],
        }),
    },
};

export const getLearningSeoPage = (key: LearningSeoKey): LearningSeoPage => PAGES[key];

/**
 * Course id → SEO page. Only ids with their OWN page map to themselves;
 * anything else falls back to the catalog.
 *
 * The fallback used to be 'ai-agent-curriculum', which meant every course
 * without a dedicated entry emitted the AI curriculum's title, description,
 * and — worst of all — its canonical URL. Google reads that as "this page is
 * a duplicate of /learning/ai-agent-curriculum" and drops it from the index.
 * System Design Interview (13 modules, 85 lessons) was invisible because of it.
 * Falling back to the catalog keeps unknown /learning/* URLs consolidating
 * into a page that actually lists them.
 */
export const getLearningSeoKey = (selectedCourseId: string | null): LearningSeoKey => {
    if (selectedCourseId && selectedCourseId in PAGES && selectedCourseId !== 'catalog') {
        return selectedCourseId as LearningSeoKey;
    }
    return 'catalog';
};
