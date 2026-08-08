export const SEARCH_ORIGIN = "https://careervivid.app";

export type SearchPageDefinition = {
    path: string;
    title: string;
    description: string;
    heading: string;
    summary: string;
    changefreq?: "daily" | "hourly" | "weekly" | "monthly";
    priority?: string;
    includeInSitemap?: boolean;
    indexable?: boolean;
    links?: Array<{ href: string; label: string }>;
};

/**
 * Canonical public pages that can return useful HTML without authentication.
 * Localized aliases are intentionally excluded until they have real translated
 * content and self-referencing canonicals.
 */
export const SEARCH_PAGES: SearchPageDefinition[] = [
    {
        path: "/",
        title: "CareerVivid | Courses, Interview Prep & Tailored Resumes",
        description: "Build job-ready skills with interactive courses, prepare for interviews at hundreds of companies, and tailor your resume to each role.",
        heading: "Build job-ready skills and prepare for your next interview",
        summary: "CareerVivid combines interactive learning, company interview practice, resume tailoring, and job-search tools in one workspace.",
        changefreq: "daily",
        priority: "1.0",
        includeInSitemap: true,
    },
    {
        path: "/learning",
        title: "Interactive Career Courses | CareerVivid",
        description: "Learn coding interview patterns, system design, and AI agent development through structured, interactive CareerVivid courses.",
        heading: "Interactive courses for technical career outcomes",
        summary: "Choose a structured path in coding interviews, AI agent development, or system design and continue at your own pace.",
        changefreq: "weekly",
        priority: "0.9",
        includeInSitemap: true,
    },
    {
        path: "/learning/coding-interview-patterns",
        title: "Coding Interview Patterns | CareerVivid",
        description: "Learn reusable coding interview patterns with visual explanations, practice problems, and runnable code labs.",
        heading: "Learn coding interview patterns",
        summary: "Build pattern recognition for common algorithm questions with guided lessons and hands-on practice.",
        changefreq: "weekly",
        priority: "0.9",
        includeInSitemap: true,
    },
    {
        path: "/learning/system-design-interview",
        title: "System Design Interview Course | CareerVivid",
        description: "Prepare for system design interviews with structured lessons on estimation, APIs, data, caching, reliability, and distributed systems.",
        heading: "Prepare for system design interviews",
        summary: "Practice a repeatable design process and learn the tradeoffs behind scalable, reliable systems.",
        changefreq: "weekly",
        priority: "0.9",
        includeInSitemap: true,
    },
    {
        path: "/learning/ai-agent-curriculum",
        title: "AI Agent Builder Curriculum | CareerVivid",
        description: "Build practical AI agents through lessons on LLM foundations, prompting, RAG, orchestration, evaluation, safety, and deployment.",
        heading: "Build practical AI agents",
        summary: "Follow a project-based curriculum from LLM foundations through a portfolio-ready AI agent.",
        changefreq: "weekly",
        priority: "0.9",
        includeInSitemap: true,
    },
    {
        path: "/interview-studio",
        title: "Company Interview Practice | CareerVivid",
        description: "Browse company-specific interview guides and practice coding, system design, behavioral, and recruiter-screen stages.",
        heading: "Practice the interview loop before the real one",
        summary: "Explore company-specific interview guides, then practice the stages that match your target role.",
        changefreq: "weekly",
        priority: "0.9",
        includeInSitemap: true,
        links: [{ href: "/learning", label: "Browse interview courses" }],
    },
    {
        path: "/community",
        title: "CareerVivid Community – Career Articles & Resources",
        description: "Explore career advice, resume tips, portfolio showcases, and professional development articles from the CareerVivid community.",
        heading: "CareerVivid Community",
        summary: "Read practical career articles and resources shared by the CareerVivid community.",
        changefreq: "hourly",
        priority: "0.9",
        includeInSitemap: true,
    },
    {
        path: "/pricing",
        title: "Pricing | CareerVivid",
        description: "Start CareerVivid for free, then upgrade when you need more AI credits for resumes, job tracking, interview prep, and job-search workflows.",
        heading: "Simple pricing for your job search",
        summary: "Start with CareerVivid's free tools and upgrade when you need additional AI credits and premium workflows.",
        changefreq: "weekly",
        priority: "0.8",
        includeInSitemap: true,
    },
    {
        path: "/blog",
        title: "Career Advice and Interview Preparation Blog | CareerVivid",
        description: "Read practical guides for resumes, job searching, technical interviews, portfolios, and career development.",
        heading: "CareerVivid Blog",
        summary: "Practical guidance for stronger applications, interviews, portfolios, and career decisions.",
        changefreq: "daily",
        priority: "0.8",
        includeInSitemap: true,
    },
    {
        path: "/job-market",
        title: "Job Market | CareerVivid",
        description: "Explore job opportunities and use CareerVivid tools to prepare stronger, role-specific applications.",
        heading: "Explore the job market",
        summary: "Find relevant roles and move from discovery to a tailored application in one career workspace.",
        changefreq: "daily",
        priority: "0.7",
        includeInSitemap: true,
    },
    {
        path: "/demo",
        title: "CareerVivid Resume and Interview Demo",
        description: "Try CareerVivid's guided resume and interview preparation demo for your target role.",
        heading: "Try CareerVivid for your target role",
        summary: "Choose a career path to preview resume preparation and role-specific interview practice.",
        changefreq: "monthly",
        priority: "0.7",
        includeInSitemap: true,
        links: [{ href: "/interview-studio", label: "Browse company interview practice" }],
    },
    {
        path: "/contact",
        title: "Contact CareerVivid",
        description: "Contact the CareerVivid team for product support, partnership questions, and account help.",
        heading: "Contact CareerVivid",
        summary: "Get help with CareerVivid or contact the team about partnerships and product questions.",
        changefreq: "monthly",
        priority: "0.6",
        includeInSitemap: true,
    },
    {
        path: "/product",
        title: "CareerVivid Career Workspace",
        description: "Explore CareerVivid's learning, interview preparation, resume tailoring, portfolio, and job-search workflow tools.",
        heading: "A connected workspace for your job search",
        summary: "Move from learning and interview practice to tailored applications without losing context between tools.",
        changefreq: "monthly",
        priority: "0.6",
        includeInSitemap: true,
        links: [
            { href: "/learning", label: "Explore learning paths" },
            { href: "/interview-studio", label: "Practice interviews" },
        ],
    },
    {
        path: "/community/guidelines",
        title: "Community Guidelines | CareerVivid",
        description: "Read the CareerVivid community guidelines for helpful, respectful, and safe participation.",
        heading: "CareerVivid Community Guidelines",
        summary: "Learn the standards that keep CareerVivid community discussions constructive and safe.",
        changefreq: "monthly",
        priority: "0.5",
        includeInSitemap: true,
        links: [{ href: "/community", label: "Visit the community" }],
    },
    {
        path: "/partners",
        title: "Partner with CareerVivid",
        description: "Explore CareerVivid partnership programs for schools, businesses, staffing agencies, hiring teams, and student ambassadors.",
        heading: "Partner with CareerVivid",
        summary: "Choose a partnership path designed for education, recruiting, workforce development, or student communities.",
    },
    {
        path: "/partners/business",
        title: "Business Partners | CareerVivid",
        description: "Help employees and candidates build job-ready skills with CareerVivid business partnership programs.",
        heading: "Career development for businesses",
        summary: "Support structured learning, interview readiness, and stronger career outcomes across your organization.",
    },
    {
        path: "/partners/agency",
        title: "Agency Partner Pilot | CareerVivid",
        description: "Help staffing applicants improve resumes and readiness before recruiter review with CareerVivid's agency partner pilot.",
        heading: "Prepare applicants before recruiter review",
        summary: "Give candidates a guided preparation workspace while keeping sharing and recruiter visibility under their control.",
    },
    {
        path: "/topic/ai-native-developer-portfolios",
        title: "AI-Native Developer Portfolios | CareerVivid",
        description: "Build an interactive developer portfolio that presents your projects, skills, and professional story clearly.",
        heading: "Build an AI-native developer portfolio",
        summary: "Turn your projects and experience into a clear, interactive professional presence.",
    },
    {
        path: "/topic/vibe-coding-platform",
        title: "Vibe Coding Platform | CareerVivid",
        description: "Use CareerVivid's AI-assisted workspace to document projects and build professional career assets.",
        heading: "Turn AI-assisted work into career evidence",
        summary: "Document what you build and present the results through resumes, portfolios, and community posts.",
    },
    {
        path: "/signin",
        title: "Sign in | CareerVivid",
        description: "Sign in to your CareerVivid account.",
        heading: "Sign in to CareerVivid",
        summary: "Access your CareerVivid workspace.",
        indexable: false,
    },
    {
        path: "/signup",
        title: "Create an account | CareerVivid",
        description: "Create a CareerVivid account to save your learning progress and job-search work.",
        heading: "Create your CareerVivid account",
        summary: "Create an account to save progress across CareerVivid.",
        indexable: false,
    },
];

const normalizePath = (path: string) => {
    const withoutQuery = path.split("?")[0].split("#")[0] || "/";
    return withoutQuery !== "/" && withoutQuery.endsWith("/")
        ? withoutQuery.slice(0, -1)
        : withoutQuery;
};

export const getSearchPage = (path: string): SearchPageDefinition | undefined =>
    SEARCH_PAGES.find((page) => page.path === normalizePath(path));

export const SITEMAP_STATIC_ROUTES = SEARCH_PAGES
    .filter((page) => page.includeInSitemap && page.indexable !== false)
    .map((page) => ({
        loc: `${SEARCH_ORIGIN}${page.path === "/" ? "" : page.path}`,
        changefreq: page.changefreq || "monthly",
        priority: page.priority || "0.5",
    }));

export type CommunitySearchHit = {
    objectID?: string;
    type?: string;
    status?: string;
};

/** Only public articles have a stable, server-rendered search landing page. */
export const communityHitToSitemapUrl = (hit: CommunitySearchHit): string | null => {
    const id = typeof hit.objectID === "string" ? hit.objectID.trim() : "";
    const type = hit.type || "article";
    if (!id || type !== "article") return null;
    if (hit.status && hit.status !== "published") return null;
    return `${SEARCH_ORIGIN}/community/post/${encodeURIComponent(id)}`;
};
