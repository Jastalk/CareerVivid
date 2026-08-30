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
    /**
     * Real anchors inside a section.
     *
     * A hub page is only a hub if it links onward. /interview-studio sits above
     * 301 company guides, and naming them in a bullet is a keyword list;
     * linking them is what lets a crawler reach the pages that answer
     * "[company] interview questions" and passes this page's authority to them.
     */
    links?: Array<{ href: string; label: string }>;
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
    /*
     * Keyword-first, brand last.
     *
     * The result already prints "CareerVivid" twice above the title — in the
     * site-name line and the URL — so opening the title with it spent the most
     * weighted position on a word nobody searches yet. The first real word was
     * "Courses", the least-prioritised product.
     *
     * The homepage also no longer has to carry everything. /edit/new,
     * /interview-studio and /jobs each own their query now, so this names the
     * category and lets the children take the specifics.
     *
     * "Free" leads because it is the highest-intent modifier in this category
     * and the claim holds: 100 credits a month, all 36 templates, unlimited PDF
     * export, no credit card. Kept under 60 chars so Google does not truncate it.
     */
    {
        path: "/",
        title: "Free Resume Builder, Mock Interviews & Jobs | CareerVivid",
        description: "Build a resume free with 36 templates, practise real interview questions from 301 companies, and browse verified open jobs. No credit card required.",
        heading: "Build job-ready skills and prepare for your next interview",
        summary: "CareerVivid combines interactive learning, company interview practice, resume tailoring, and job-search tools in one workspace.",
        changefreq: "daily",
        priority: "1.0",
        includeInSitemap: true,
        links: [
            { href: "/edit/new", label: "Build a resume free" },
            { href: "/interview-studio", label: "Practice company interviews" },
            { href: "/jobs", label: "Browse open jobs" },
        ],
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
    /*
     * The hub above 301 company guides.
     *
     * Built for "[company] interview questions" — the highest-volume query in
     * this category — which is why every company here is a LINK to its
     * /quest/{slug} page rather than a name in a bullet list. Naming them is a
     * keyword list; linking them is what lets a crawler reach the 301 pages
     * that actually answer the query, and passes this page's authority to them.
     */
    {
        path: "/interview-studio",
        title: "Company Interview Questions & Practice | CareerVivid",
        description: "Real interview questions from candidates who interviewed at 301 companies, including Google, Meta, OpenAI and Amazon — then practise the round and get a scored report.",
        heading: "Practice the interview loop before the real one",
        summary: "Every question here came from someone who actually sat the interview. Pick a company, pick the round you are facing, and practise it with feedback that quotes your own answers back.",
        changefreq: "weekly",
        priority: "0.9",
        includeInSitemap: true,
        sections: [
            {
                heading: "Questions from people who were in the room",
                body: "These are not invented, and they are not scraped from a generic question bank. They were reported by candidates who interviewed at these companies, which is why they read like what a specific team actually asks rather than what an interview is supposed to sound like.",
            },
            {
                heading: "Interview questions by company",
                body: "301 companies have a guide. Each one lists the rounds that company runs, the questions reported at each round, and opens straight into practice.",
                links: [
                    { href: "/quest/google", label: "Google" },
                    { href: "/quest/meta-facebook", label: "Meta" },
                    { href: "/quest/openai", label: "OpenAI" },
                    { href: "/quest/anthropic", label: "Anthropic" },
                    { href: "/quest/amazon", label: "Amazon" },
                    { href: "/quest/apple", label: "Apple" },
                    { href: "/quest/microsoft", label: "Microsoft" },
                    { href: "/quest/netflix", label: "Netflix" },
                    { href: "/quest/stripe", label: "Stripe" },
                    { href: "/quest/nvidia", label: "Nvidia" },
                    { href: "/quest/databricks", label: "Databricks" },
                    { href: "/quest/airbnb", label: "Airbnb" },
                    { href: "/quest/figma", label: "Figma" },
                    { href: "/quest/uber", label: "Uber" },
                    { href: "/quest/coinbase", label: "Coinbase" },
                ],
            },
            {
                heading: "Learn the material the question is testing",
                body: "A question you cannot answer is usually a topic you have not learned, not a phrasing problem. Each round links to the course that covers what it tests, so you can go and learn it rather than re-reading the answer.",
                links: [
                    { href: "/learning/coding-interview-patterns", label: "Coding interview patterns" },
                    { href: "/learning/system-design-interview", label: "System design" },
                    { href: "/learning/ai-agent-curriculum", label: "AI agents" },
                ],
            },
            {
                heading: "Practise the round you are actually facing",
                body: "Interviews are not one event. Each stage is scored on its own, against what that company asks at that stage.",
                bullets: [
                    "Recruiter screen — talking about your background without rambling.",
                    "Coding — a real editor, run against real cases, on the question you were asked.",
                    "System design — a whiteboard with a coach who works the design with you rather than grading at the end.",
                    "Behavioral — answers scored on specificity, not enthusiasm.",
                ],
            },
            {
                heading: "See whether you actually improved",
                body: "Every round ends with a report scoring communication, problem solving, relevant experience and role alignment, with the transcript attached. It quotes what you said and names what a stronger answer adds. Practise the same round again and the next report compares against your last score — 78 to 83, and which dimension the gain came from — so improvement is something you can see rather than something you hope for.",
            },
        ],
        faqs: [
            {
                question: "Where do CareerVivid's interview questions come from?",
                answer: "They were reported by candidates who interviewed at those companies. That is why they are specific to a company and a round, rather than generic questions relabelled per employer.",
            },
            {
                question: "Can I practise interviews for a specific company?",
                answer: "Yes. 301 companies have a guide — including Google, Meta, OpenAI, Anthropic, Amazon, Apple, Microsoft, Netflix and Stripe — and you can open a practice round on any stage of their loop.",
            },
            {
                question: "Are the mock interviews voice or text?",
                answer: "Both. You can type your answers, or run a live voice interview where the interviewer listens and responds in real time. Voice sessions are available on every paid plan.",
            },
            {
                question: "Do I get feedback after a mock interview?",
                answer: "Yes. Each round produces a scored report covering communication, problem solving, relevant experience and role alignment, along with the full transcript and specific notes on what would have made each answer stronger.",
            },
            {
                question: "How do I know I am getting better?",
                answer: "Scores are kept per session, so practising the same round again shows your new score against your previous one and which dimension improved. Progress is measured, not asserted.",
            },
        ],
        links: [
            { href: "/learning", label: "Browse interview courses" },
            { href: "/edit/new", label: "Build a resume for these roles" },
            { href: "/jobs", label: "Find roles to practise for" },
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
        description: "All 12 interactive courses are free, no account needed. Credits cover the AI work: 100 free monthly, Pro $12/month for 1,000, Max $35/month for 4,500. Compare plans and what each action costs.",
        heading: "The courses are free. You pay for the AI.",
        summary: "All 12 interactive courses and 203 lessons open without an account, because lessons run in your browser and cost nothing to serve. Credits pay for the work that calls a model, from one pool you spend on whatever the search needs — resumes one week, mock interviews the next.",
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
                answer: "Yes. The free plan includes 100 credits a month, the full resume builder with all 36 templates, unlimited PDF downloads, the job tracker, and company interview guides. No credit card is required to start.",
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
            { href: "/edit/new", label: "Build a resume free" },
            { href: "/interview-studio", label: "Practice interviews at 301 companies" },
        ],
    },
    /*
     * The highest-priority commercial page on the site — tied with the
     * homepage at 1.0, because "resume builder" is the query with the most
     * volume and the most intent in this category.
     *
     * It used to live at /resume-builder, a marketing page whose only job was
     * to describe the editor and then send you to it. The editor now opens
     * without an account at /edit/new, so the page in front of it was a step
     * that cost a click and answered nothing the editor does not answer by
     * being visible.
     *
     * This copy MOVED rather than being deleted, which is the whole point.
     * Deleting the /resume-builder entry would have retired the site's
     * best-ranking commercial page and left the query with nowhere to land;
     * /resume-builder now 301s here (firebase.json) so the ranking follows the
     * redirect to a URL that serves the same answer.
     *
     * The destination has to stay reachable signed-out for this to be honest,
     * and that precondition is now checked rather than stated: src/App.tsx
     * routes /edit/new above the /edit/ branch and renders it unwrapped, and
     * src/lib/routerIndexGuard.test.ts reads that routing chain and fails if any
     * path in this file is handled by a ProtectedRoute. An indexed page that
     * answers a crawler with marketing copy and a person with a login form is
     * cloaking, and it is the exact bug /job-market was removed for.
     */
    {
        path: "/edit/new",
        title: "Free AI Resume Builder | CareerVivid",
        description: "Build a resume free with 36 professional templates, AI drafting from your experience, ATS-aware scoring, and unlimited PDF downloads. No credit card required.",
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
                answer: "Yes. Building, editing and downloading a resume as PDF is free and unlimited, and all 36 templates are available on the free plan. No credit card is required.",
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
        description: "Browse verified, still-open job listings \u2014 no account needed. Every posting is link-checked before it appears, so you never open a role that was filled weeks ago.",
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
            { href: "/edit/new", label: "Build a resume to unlock match scores" },
            { href: "/interview-studio", label: "Practice for these interviews" },
        ],
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
            { href: "/edit/new", label: "Build a resume" },
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
