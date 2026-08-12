export const SEARCH_ORIGIN = "https://careervivid.app";

/**
 * A section of real page content, served to crawlers.
 *
 * `heading` + `summary` alone produced a 50-word page. Measured against
 * Googlebot, /pricing returned 58 words containing no prices, no plan names and
 * no features, and its only link pointed back at itself — indexed, and with
 * nothing to rank for. A page that will not answer the query it is targeting
 * does not rank however correct its meta tags are.
 *
 * `body` is plain sentences, `bullets` are the scannable specifics (plan names,
 * company names, template names). Both are escaped at render.
 */
export type SearchPageSection = {
    heading: string;
    body?: string;
    bullets?: string[];
};

/**
 * A question this page should be the answer to.
 *
 * Rendered as visible text AND as FAQPage structured data, because the two do
 * different jobs: the text is what ranks, the schema is what can win the
 * rich result. Google requires the answer be visible on the page for the
 * markup to be eligible, so these are never schema-only.
 */
export type SearchPageFaq = {
    question: string;
    answer: string;
};

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
    sections?: SearchPageSection[];
    faqs?: SearchPageFaq[];
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
        sections: [
            {
                heading: "Practice the round you are actually facing",
                body: "Interviews are not one event. Each stage is scored on its own, against what that company asks at that stage.",
                bullets: [
                    "Recruiter screen — talking about your background without rambling.",
                    "Coding — a real editor, run against real cases, on the question you were asked.",
                    "System design — a whiteboard with a coach who works the design with you rather than grading at the end.",
                    "Behavioral — answers scored on specificity, not enthusiasm.",
                ],
            },
            {
                heading: "Guides for 301 companies",
                body: "Every guide is built from questions those companies actually ask, including Amazon, Google, Meta, Stripe, Netflix, Airbnb, Databricks and Datadog. Pick a company, pick a stage, and practise that exact loop.",
            },
            {
                heading: "You get a scored report, not a vibe",
                body: "Every round ends with a report scoring communication, problem solving, experience and role alignment, with the transcript attached. It quotes what you actually said and names what a stronger answer adds — and the next round compares against your last score, so you can see whether you improved.",
            },
        ],
        faqs: [
            {
                question: "Can I practise interviews for a specific company?",
                answer: "Yes. CareerVivid has interview guides for 301 companies, each built from the questions that company asks, and you can open a practice round on any stage of their loop.",
            },
            {
                question: "Are the mock interviews voice or text?",
                answer: "Both. You can type your answers, or run a live voice interview where the interviewer listens and responds in real time. Voice sessions are available on every paid plan.",
            },
            {
                question: "Do I get feedback after a mock interview?",
                answer: "Yes. Each round produces a scored report covering communication, problem solving, relevant experience and role alignment, along with the full transcript and specific notes on what would have made each answer stronger.",
            },
        ],
        links: [
            { href: "/learning", label: "Browse interview courses" },
            { href: "/resume-builder", label: "Build a resume for these roles" },
        ],
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
        description: "CareerVivid is free to start with 100 monthly credits. Pro is $12/month for 1,000 credits, Max is $35/month for 4,500. Compare plans, credits, and what each action costs.",
        heading: "Simple pricing for your job search",
        summary: "Every plan draws on one pool of monthly credits, so you can spend them on whatever your search actually needs — resumes one week, mock interviews the next.",
        changefreq: "weekly",
        priority: "0.8",
        includeInSitemap: true,
        sections: [
            {
                heading: "Plans and monthly credits",
                body: "Credits reset every month and are shared across every tool. Annual billing is charged yearly and works out cheaper per month.",
                bullets: [
                    "Free — $0/month, 100 credits. Resume builder, 36 templates, PDF export, job tracker, and company interview guides.",
                    "Pro — $12/month, or $10/month billed annually. 1,000 credits and voice interview sessions up to 45 minutes.",
                    "Max — $35/month, or $31/month billed annually. 4,500 credits and voice sessions up to 90 minutes.",
                    "Enterprise — $12 per seat/month, minimum 2 seats. 1,500 credits per seat, pooled across the team.",
                ],
            },
            {
                heading: "What a credit buys",
                body: "Actions are priced by what they cost to run, so a quick edit never costs the same as a full scored interview. Live voice interviews bill at 5 credits per minute in 15-second blocks, so a 20-second answer is not charged as a full minute.",
            },
            {
                heading: "What you get without paying",
                body: "The free plan is a working product, not a trial. You can build and download a complete resume, pick from all 36 templates, track applications, and read interview guides for 301 companies without entering a card.",
            },
        ],
        faqs: [
            {
                question: "Is CareerVivid free?",
                answer: "Yes. The free plan includes 100 credits a month, the full resume builder with all 36 templates, unlimited PDF downloads, the job tracker, and company interview guides. No card is required to start.",
            },
            {
                question: "How much does CareerVivid cost?",
                answer: "Pro is $12 per month, or $10 per month billed annually, and includes 1,000 credits. Max is $35 per month, or $31 per month billed annually, and includes 4,500 credits. Enterprise is $12 per seat per month with a two-seat minimum.",
            },
            {
                question: "What happens if I run out of credits?",
                answer: "Free tools keep working — building, editing, and downloading resumes never costs credits. Only AI actions such as generating a resume, tailoring to a job description, or running a scored mock interview draw from your balance, and it resets at the start of each month.",
            },
            {
                question: "Can I cancel anytime?",
                answer: "Yes. Subscriptions are monthly or annual and can be cancelled at any time; you keep access for the rest of the period you have paid for.",
            },
        ],
        links: [
            { href: "/resume-builder", label: "Build a resume free" },
            { href: "/interview-studio", label: "Practice interviews at 301 companies" },
        ],
    },
    {
        path: "/resume-builder",
        title: "Free AI Resume Builder | CareerVivid",
        description: "Build a resume free with 36 professional templates, AI drafting from your experience, ATS-aware scoring, and unlimited PDF downloads. No card required.",
        heading: "Build a resume that gets read",
        summary: "Write it yourself or let AI draft from what you have done, then see a score for how well it holds up before you send it anywhere.",
        changefreq: "weekly",
        priority: "1.0",
        includeInSitemap: true,
        sections: [
            {
                heading: "Start from your experience, not a blank page",
                body: "Describe what you have done, or import an existing resume as a PDF, and CareerVivid drafts a first version you can edit line by line. Nothing is locked — every heading, bullet and date stays editable.",
            },
            {
                heading: "36 templates, all free",
                body: "Every template is available on the free plan, each with its own colour options. They are designed as documents rather than web pages, so the PDF you download reads the same as the preview.",
                bullets: [
                    "Classic and traditional — Harvard, Chicago, Classic, Serif, Academic, Executive.",
                    "Modern and minimal — Modern, Minimalist, Swiss, Simple, Monochrome, Crisp, Compact.",
                    "Creative and visual — Creative, Artistic, Vibrant, Infographic, Wave, Geometric, Timeline.",
                    "Technical — Technical, Quantum, Vertex, Orion, Apex, Slate, Zenith.",
                ],
            },
            {
                heading: "Know whether it is good before you send it",
                body: "A resume score checks the things a recruiter and an applicant tracking system both look for: whether your bullets carry numbers, whether your summary says anything specific, whether required sections are filled in. It names the weakest line rather than giving you a grade.",
            },
            {
                heading: "How to choose a template",
                body: "For most roles a clear single-column layout beats a striking one — it survives an applicant tracking system and a six-second skim equally well. Reach for the visual templates when the work itself is visual, and for Harvard, Chicago or Academic when the field expects a conventional document. Changing your mind is free: content and design are stored separately, so switching template keeps every word in place.",
            },
            {
                heading: "Tailor it to the job you are applying for",
                body: "Paste a job description and CareerVivid rewrites the summary and reorders your skills for that role, as a new copy. Your original resume is never modified, so you can keep one per application.",
            },
        ],
        faqs: [
            {
                question: "Is the CareerVivid resume builder free?",
                answer: "Yes. Building, editing and downloading a resume as PDF is free and unlimited, and all 36 templates are available on the free plan. No card is required.",
            },
            {
                question: "Can I download my resume as a PDF?",
                answer: "Yes, as many times as you like on any plan, including free. The PDF is generated from the same document you see in the editor, so it prints exactly as previewed.",
            },
            {
                question: "Is the resume ATS friendly?",
                answer: "Yes. Templates use real, selectable text rather than images, in a structure applicant tracking systems can parse, and the built-in score flags missing sections and unquantified bullets before you apply.",
            },
            {
                question: "Can I import a resume I already have?",
                answer: "Yes. Upload a PDF, Word document or plain text file and CareerVivid extracts your details, roles and skills into an editable resume.",
            },
            {
                question: "Which resume template is best for ATS?",
                answer: "Any single-column template with conventional section headings parses most reliably — Modern, Simple, Classic, Minimalist and Harvard are all safe choices. Every CareerVivid template uses selectable text rather than images, which is the part that matters most.",
            },
            {
                question: "Can I switch templates after writing my resume?",
                answer: "Yes. Content and design are stored separately, so changing template keeps all of your text and lets you compare designs instantly.",
            },
        ],
        links: [
            { href: "/jobs", label: "Find jobs to apply to" },
            { href: "/pricing", label: "Compare plans" },
        ],
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
    /*
     * The public job list.
     *
     * This replaces the old /job-market entry, which sat in the sitemap and
     * carried Google's "Explore the job market" sitelink — while /job-market is
     * a ProtectedRoute, so every searcher who clicked it hit a login wall. An
     * indexed page nobody signed out can read is worse than no page: it spends
     * the click and returns nothing.
     *
     * /job-market still exists as the signed-in job search. It is simply no
     * longer advertised to search engines.
     */
    {
        path: "/jobs",
        title: "Explore the Job Market | CareerVivid",
        description: "Browse verified, still-open job listings. Every posting is link-checked before it appears, so you never open a role that was filled weeks ago.",
        heading: "Open jobs, checked before you click",
        summary: "Every listing here was fetched from a company's own careers page and re-checked before being shown, so the roles you open are still open.",
        changefreq: "daily",
        priority: "0.9",
        includeInSitemap: true,
        sections: [
            {
                heading: "Why these listings are different",
                body: "Job boards go stale quietly. A posting stays up long after the role is filled, and you find out only after writing the cover letter. Every listing on this page is validated on a schedule, and anything that stops resolving is removed rather than left to waste your time.",
            },
            {
                heading: "See how well you match",
                body: "Sign in and add a resume to see a match score on each role, showing which of its requirements your experience already covers and which it does not. Browsing the listings needs no account.",
            },
            {
                heading: "From a listing to an application",
                body: "Finding the role is the easy half. Once something here looks right, the rest of the workspace is already pointed at it.",
                bullets: [
                    "Tailor your resume to the posting, as a new copy — the original is never touched.",
                    "Practise that company's actual interview loop before you hear back.",
                    "Save it to the tracker, which tells you when a follow-up is overdue.",
                ],
            },
            {
                heading: "Where these jobs come from",
                body: "Listings are collected from employers' own applicant tracking systems rather than resold from an aggregator, so you apply on the company's site and your application goes where it should.",
            },
        ],
        faqs: [
            {
                question: "Do I need an account to browse jobs?",
                answer: "No. Anyone can browse every listing and open the original posting. An account is only needed to see your personal match score, which requires a resume to compare against.",
            },
            {
                question: "How do I get a match score on a job?",
                answer: "Create a free CareerVivid account and build or upload a resume. Match scores are then shown on every listing, based on how well your experience covers each role's requirements.",
            },
            {
                question: "Are these jobs still open?",
                answer: "Every listing is fetched from the employer's own careers page and re-checked on a schedule. Listings that no longer resolve are removed, so what you see should still be accepting applications.",
            },
        ],
        links: [
            { href: "/resume-builder", label: "Build a resume to unlock match scores" },
            { href: "/interview-studio", label: "Practice for these interviews" },
        ],
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
        title: "CareerVivid Workspace | Resumes, Interviews, Jobs",
        description: "Explore CareerVivid's learning, interview preparation, resume tailoring, portfolio, and job-search workflow tools.",
        heading: "A connected workspace for your job search",
        summary: "Move from learning and interview practice to tailored applications without losing context between tools.",
        changefreq: "monthly",
        priority: "0.6",
        includeInSitemap: true,
        sections: [
            {
                heading: "What CareerVivid does",
                body: "CareerVivid is a workspace for job seekers: build and tailor a resume, practise the interview, track every application, and learn the material the interview is testing — without copying context between four different tools.",
                bullets: [
                    "Resume builder with 36 templates, AI drafting, and ATS-aware scoring.",
                    "Mock interviews, by voice or text, for 301 companies, with scored reports.",
                    "A job feed of verified, still-open listings you can apply to.",
                    "An application tracker that tells you which follow-ups are overdue.",
                    "Interactive courses in coding interview patterns, system design and AI agents.",
                    "A Chrome extension that fills applications from your saved profile.",
                ],
            },
            {
                heading: "Why one workspace instead of five tools",
                body: "The reason your resume, your interview practice and your applications belong together is that each one should inform the next. A scored interview round tells you what your resume is missing. A job you saved tells the resume what to lead with. Split across separate products, none of that carries over.",
            },
        ],
        faqs: [
            {
                question: "What is CareerVivid?",
                answer: "CareerVivid is a workspace that combines an AI resume builder, mock interviews with scored feedback for 301 companies, a verified job feed, an application tracker, and interactive technical courses in one place.",
            },
            {
                question: "Is CareerVivid just a resume builder?",
                answer: "No. The resume builder is one part. CareerVivid also runs voice and text mock interviews with scored reports, tracks your applications and follow-ups, surfaces verified open jobs, and teaches coding interview patterns and system design.",
            },
            {
                question: "Do I need the Chrome extension to use CareerVivid?",
                answer: "No. Everything works on the web at careervivid.app. The extension is optional and fills job applications from the profile you have already built.",
            },
        ],
        links: [
            { href: "/resume-builder", label: "Build a resume" },
            { href: "/interview-studio", label: "Practice interviews" },
            { href: "/jobs", label: "Browse open jobs" },
            { href: "/learning", label: "Explore learning paths" },
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
