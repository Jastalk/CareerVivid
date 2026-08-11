import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowRight,
    BadgeCheck,
    Briefcase,
    Building2,
    CheckCircle2,
    Chrome,
    Clipboard,
    Clock3,
    ClipboardCheck,
    Download,
    DollarSign,
    ExternalLink,
    FileCheck2,
    FileSearch,
    FileText,
    Gauge,
    LayoutDashboard,
    Lock,
    Mic,
    PenLine,
    PlayCircle,
    Search,
    ShieldCheck,
    Sparkles,
    Smartphone,
    Upload,
    Users,
    Wand2,
} from 'lucide-react';
import { navigate } from '../../utils/navigation';

const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/dmigeakdfokehlhigkhadglgoabceoag?utm_source=item-share-cb';

const LocalizedCopy = ({ path, fallback }: { path: string; fallback: string }) => {
    const { t } = useTranslation();
    return <>{t(path, { defaultValue: fallback })}</>;
};

const featureTabs = [
    { key: 'job_tracker', label: 'Job Tracker', icon: Briefcase, href: '/job-tracker' },
    { key: 'resume_builder', label: 'AI Resume Builder', icon: FileText, href: '/newresume' },
    { key: 'ats_checker', label: 'ATS Checker', icon: Gauge, href: '/newresume' },
    { key: 'resume_tailor', label: 'Resume Tailor', icon: Wand2, href: '/newresume' },
    { key: 'autofill', label: 'Autofill Applications', icon: Chrome, href: '/extension-welcome' },
    { key: 'resume_match', label: 'Resume Match', icon: Search, href: '/newresume' },
    { key: 'interview_coach', label: 'Interview Coach', icon: Mic, href: '/interview-studio' },
    { key: 'career_pipeline', label: 'Career Pipeline', icon: LayoutDashboard, href: '/job-tracker' },
];

const platformCards = [
    {
        key: 'chrome',
        label: 'Available now',
        title: 'Chrome extension',
        copy: 'Save roles from job sites, keep the original apply link, and connect browser work back to your CareerVivid workspace.',
        icon: Chrome,
        action: 'Get the Chrome extension',
        href: CHROME_EXTENSION_URL,
        tone: 'bg-[#eef9f2] text-[#15803d] border-[#cfe8d5]',
        external: true,
    },
    {
        key: 'ios',
        label: 'Coming soon',
        title: 'iOS app',
        copy: 'Manage resumes, interview prep, and job follow-ups from your iPhone when the mobile app is ready.',
        icon: Smartphone,
        action: 'iOS coming soon',
        href: '/signup',
        tone: 'bg-[#f3f2ff] text-[#625bd5] border-[#dfdcff]',
        external: false,
    },
    {
        key: 'android',
        label: 'Coming soon',
        title: 'Android app',
        copy: 'CareerVivid for Android is planned so job seekers can keep the same workspace on every device.',
        icon: Smartphone,
        action: 'Android coming soon',
        href: '/signup',
        tone: 'bg-[#fff3e4] text-[#a16207] border-[#ead8b3]',
        external: false,
    },
];

const proofCards = [
    {
        key: 'direct_links',
        icon: ExternalLink,
        title: 'Direct apply links stay attached',
        copy: 'Save the original company career page, application URL, source, and next action with the role instead of losing it in browser history.',
    },
    {
        key: 'salary_context',
        icon: DollarSign,
        title: 'Salary and level context ready',
        copy: 'CareerVivid is designed to pair target roles with compensation and leveling context when approved partner data is available.',
    },
    {
        key: 'application_packet',
        icon: BadgeCheck,
        title: 'Application packet, not scattered tools',
        copy: 'Resume match, tailored notes, interview prep, and follow-up history live with the job so users know what to do next.',
    },
];

const fastStartActions = [
    {
        key: 'upload',
        icon: Upload,
        title: 'Upload your resume',
        copy: 'Start from a PDF or DOCX, then turn it into editable resume sections.',
        action: 'Upload resume',
        href: '/newresume',
        tone: 'bg-[#f3f2ff] text-[#625bd5] border-[#dfdcff]',
    },
    {
        key: 'paste',
        icon: Clipboard,
        title: 'Paste resume content',
        copy: 'Drop in existing text and let CareerVivid structure it for tailoring.',
        action: 'Paste resume',
        href: '/newresume',
        tone: 'bg-[#eef9f2] text-[#15803d] border-[#cfe8d5]',
    },
    {
        key: 'chrome',
        icon: Chrome,
        title: 'Save a job from Chrome',
        copy: 'Capture the role, company, apply link, and prep context from the browser.',
        action: 'Install extension',
        href: CHROME_EXTENSION_URL,
        tone: 'bg-[#fff3e4] text-[#a16207] border-[#ead8b3]',
        external: true,
    },
];

const readinessChecks = [
    ['ats_keywords', 'ATS keywords', 86, 'Keyword coverage from the target role', 'bg-[#625bd5]'],
    ['experience_proof', 'Experience proof', 72, 'Specific projects and measurable outcomes', 'bg-[#15803d]'],
    ['interview_readiness', 'Interview readiness', 64, 'Practice prompts tied to the saved job', 'bg-[#d97706]'],
];

const resumeExamples = [
    {
        key: 'software_engineer',
        title: 'Software engineer resume',
        copy: 'Show full-stack projects, system ownership, measurable impact, and interview-ready stories.',
        tags: ['React', 'Node.js', 'Systems'],
    },
    {
        key: 'new_grad',
        title: 'New grad resume',
        copy: 'Turn coursework, internships, hackathons, and campus work into credible proof.',
        tags: ['Projects', 'Internships', 'Skills'],
    },
    {
        key: 'career_changer',
        title: 'Career changer resume',
        copy: 'Connect transferable strengths to the target role without hiding the transition.',
        tags: ['Story', 'Proof', 'Fit'],
    },
    {
        key: 'frontend_developer',
        title: 'Frontend developer resume',
        copy: 'Highlight UI quality, accessibility, performance, and product collaboration.',
        tags: ['UX', 'A11y', 'Performance'],
    },
];

const pricingPreviewPlans = [
    {
        key: 'free',
        name: 'Free',
        price: '$0',
        copy: 'Start organizing jobs, resumes, and prep without a credit card.',
        points: ['Basic workspace', 'Resume starter flow', 'Job tracker'],
        action: 'Start free',
        href: '/signup',
        featured: false,
    },
    {
        key: 'pro',
        name: 'Pro',
        price: 'AI credits',
        copy: 'For active applicants who want deeper tailoring, practice, and Chrome-connected workflows.',
        points: ['AI resume tailoring', 'Interview prep', 'Chrome workflow'],
        action: 'See Pro',
        href: '/pricing',
        featured: true,
    },
    {
        key: 'teams',
        name: 'Teams',
        price: 'Custom',
        copy: 'For schools, career centers, and cohorts supporting many job seekers.',
        points: ['Student dashboards', 'Credit allocation', 'Progress tracking'],
        action: 'Talk to us',
        href: '/contact',
        featured: false,
    },
];

const userStories = [
    {
        key: 'maya',
        role: 'Career switcher',
        name: 'Maya, product analyst',
        avatar: 'M',
        avatarSrc: '/avatars/persona-maya.jpg',
        avatarTone: 'bg-[#f3f2ff] text-[#625bd5] border-[#e8e6ff]',
        quote: 'I need to know which applications deserve a tailored resume today, not just collect another list of jobs.',
        outcome: 'Prioritized job cards with match gaps and next steps.',
    },
    {
        key: 'alex',
        role: 'New grad',
        name: 'Alex, new CS grad',
        avatar: 'A',
        avatarSrc: '/avatars/persona-alex.jpg',
        avatarTone: 'bg-[#f7fff8] text-[#15803d] border-[#d9eadb]',
        quote: 'I want a place where every role has notes, prep questions, and the original apply link before I forget why I saved it.',
        outcome: 'Application context saved from the browser into one workspace.',
    },
    {
        key: 'jordan',
        role: 'Busy applicant',
        name: 'Jordan, full-stack engineer',
        avatar: 'J',
        avatarSrc: '/avatars/persona-jordan.jpg',
        avatarTone: 'bg-[#fff7e8] text-[#a16207] border-[#ead8b3]',
        quote: 'I need a repeatable routine: find the job, tailor the resume, apply directly, then follow up.',
        outcome: 'Tracker, resume tailoring, and interview prep connected.',
    },
];

const workflowSteps = [
    {
        key: 'capture',
        number: '1',
        title: 'Find or capture the role',
        copy: 'Save a job from the web, keep the direct application URL, and add company, location, deadline, notes, and status.',
    },
    {
        key: 'fit',
        number: '2',
        title: 'Understand the fit',
        copy: 'Compare your resume against the role, review missing proof, and decide whether the job is worth tailoring.',
    },
    {
        key: 'tailor',
        number: '3',
        title: 'Tailor and apply',
        copy: 'Create role-specific resume improvements, keep the application page attached, and move the job through the pipeline.',
    },
    {
        key: 'prepare',
        number: '4',
        title: 'Prepare for the next conversation',
        copy: 'Generate interview prep, notes, and follow-up reminders from the exact role context you saved.',
    },
];

const trustNotes = [
    {
        key: 'plain_claims',
        icon: ShieldCheck,
        title: 'Plain claims',
        copy: 'CareerVivid keeps trust tied to visible product workflows instead of exaggerated AI promises.',
    },
    {
        key: 'private_workspace',
        icon: Lock,
        title: 'Private workspace',
        copy: 'Saved jobs, resumes, prep notes, and application context stay inside the user account and product workflow.',
    },
    {
        key: 'repeated_use',
        icon: Users,
        title: 'Built for repeated use',
        copy: 'The app is designed for the daily rhythm of searching, applying, following up, and improving materials.',
    },
];

const faqs = [
    {
        key: 'resume_builder',
        question: 'Is CareerVivid just a resume builder?',
        answer: 'No. The resume builder is one part of the workspace. CareerVivid also includes a job tracker, resume matching, interview prep, application notes, and Chrome extension workflows.',
    },
    {
        key: 'resume_check',
        question: 'Can CareerVivid check my resume against a job description?',
        answer: 'Yes. CareerVivid is designed around job context: save or paste a role, compare your resume with that role, then improve keywords, proof, and interview stories from the same workspace.',
    },
    {
        key: 'direct_applications',
        question: 'Can CareerVivid help with direct applications?',
        answer: 'Yes. The workflow is built around saving the original job source and application link so users can apply directly and keep context attached to the role.',
    },
    {
        key: 'chrome_extension',
        question: 'Does CareerVivid have a Chrome extension?',
        answer: 'Yes. The Chrome extension helps save job postings, keep apply links attached, and connect browser application work back to CareerVivid.',
    },
    {
        key: 'mobile_apps',
        question: 'Are iOS and Android apps available?',
        answer: 'The web app and Chrome extension are available now. CareerVivid iOS and Android apps are planned and marked as coming soon.',
    },
    {
        key: 'api_key',
        question: 'Do I need my own AI API key?',
        answer: 'No for the hosted app. CareerVivid uses managed Gemini-powered features through the app. Developers who self-host can configure their own Firebase and Gemini setup.',
    },
];

const PaperSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <section className={`relative overflow-hidden border-t border-[#e6dac8] bg-[#f7f1e7] text-[#211b16] ${className}`}>
        <div className="pointer-events-none absolute inset-0 opacity-55 cv-warm-grid" />
        <div className="relative">{children}</div>
    </section>
);

export const FastStartSection = () => (
    <PaperSection className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[24px] border border-[#e4d3bc] bg-[#fffaf1]/90 p-4 shadow-2xl shadow-[#8b5a16]/10 sm:p-6 lg:p-7">
                <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                    <div>
                        <p className="cv-warm-eyebrow">
                            <LocalizedCopy path="landing.public.fast_start.eyebrow" fallback="Start from what you already have" />
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#211b16] sm:text-4xl">
                            <LocalizedCopy
                                path="landing.public.fast_start.title"
                                fallback="Upload, paste, or capture a role. CareerVivid turns it into a job-search workspace."
                            />
                        </h2>
                        <p className="mt-4 text-base font-medium leading-7 text-[#665a4a]">
                            <LocalizedCopy
                                path="landing.public.fast_start.copy"
                                fallback="The fastest path is concrete: start with your existing resume or save the job first, then tailor everything from that context."
                            />
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {fastStartActions.map(({ key, icon: Icon, title, copy, action, href, tone, external }) => (
                            <article key={title} className="rounded-2xl border border-[#e4d3bc] bg-white/82 p-4 shadow-sm">
                                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${tone}`}>
                                    <Icon size={22} />
                                </div>
                                <h3 className="text-lg font-semibold leading-tight text-[#211b16]">
                                    <LocalizedCopy path={`landing.public.fast_start.actions.${key}.title`} fallback={title} />
                                </h3>
                                <p className="mt-2 min-h-[72px] text-sm font-medium leading-6 text-[#665a4a]">
                                    <LocalizedCopy path={`landing.public.fast_start.actions.${key}.copy`} fallback={copy} />
                                </p>
                                {external ? (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#211b16] px-4 py-3 text-sm font-semibold text-white"
                                    >
                                        <LocalizedCopy path={`landing.public.fast_start.actions.${key}.action`} fallback={action} /> <ExternalLink size={15} />
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => navigate(href)}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d8c6ad] bg-[#fffaf1] px-4 py-3 text-sm font-semibold text-[#211b16]"
                                    >
                                        <LocalizedCopy path={`landing.public.fast_start.actions.${key}.action`} fallback={action} /> <ArrowRight size={15} />
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </PaperSection>
);

export const ProductIndex = () => (
    <section className="border-y border-gray-200 bg-white/90 py-4 dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featureTabs.map(({ key, label, icon: Icon, href }) => (
                <button
                    key={label}
                    onClick={() => navigate(href)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                >
                    <Icon size={16} className="text-[#625bd5] dark:text-[#a9a5ff]" />
                    <LocalizedCopy path={`landing.public.product_index.${key}`} fallback={label} />
                </button>
            ))}
        </div>
    </section>
);

export const PlatformAvailabilitySection = () => (
    <PaperSection className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                <div>
                    <p className="cv-warm-eyebrow">
                        <LocalizedCopy path="landing.public.platform.eyebrow" fallback="Apps and extension" />
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                        <LocalizedCopy path="landing.public.platform.title" fallback="Use CareerVivid where you apply." />
                    </h2>
                </div>
                <p className="text-base font-medium leading-7 text-[#665a4a]">
                    <LocalizedCopy
                        path="landing.public.platform.copy"
                        fallback="Start with the Chrome extension today. iOS and Android apps are coming soon so the same job-search workspace can follow you from desktop to mobile."
                    />
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {platformCards.map(({ key, label, title, copy, icon: Icon, action, href, tone, external }) => (
                    <article key={title} className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${tone}`}>
                                <Icon size={23} />
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
                                <LocalizedCopy path={`landing.public.platform.cards.${key}.label`} fallback={label} />
                            </span>
                        </div>
                        <h3 className="mt-6 text-xl font-semibold text-[#211b16]">
                            <LocalizedCopy path={`landing.public.platform.cards.${key}.title`} fallback={title} />
                        </h3>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#665a4a]">
                            <LocalizedCopy path={`landing.public.platform.cards.${key}.copy`} fallback={copy} />
                        </p>
                        {external ? (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#211b16] px-4 py-3 text-sm font-semibold text-white shadow-sm"
                            >
                                <LocalizedCopy path={`landing.public.platform.cards.${key}.action`} fallback={action} /> <ExternalLink size={15} />
                            </a>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigate(href)}
                                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#d8c6ad] bg-[#fffaf1] px-4 py-3 text-sm font-semibold text-[#211b16]"
                            >
                                <Clock3 size={15} />
                                <LocalizedCopy path={`landing.public.platform.cards.${key}.action`} fallback={action} />
                            </button>
                        )}
                    </article>
                ))}
            </div>
        </div>
    </PaperSection>
);

export const DemoVideoSection = () => (
    <PaperSection className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
            <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#fffaf1]/90 px-3 py-2 text-xs font-bold text-[#8a6027] shadow-sm">
                    <PlayCircle size={15} className="text-[#625bd5]" />
                    <LocalizedCopy path="landing.public.demo.eyebrow" fallback="Product walkthrough" />
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#211b16] sm:text-4xl">
                    <LocalizedCopy path="landing.public.demo.title" fallback="See the Chrome-to-workspace flow in action." />
                </h2>
                <p className="mt-4 text-base font-medium leading-7 text-[#665a4a]">
                    <LocalizedCopy
                        path="landing.public.demo.copy"
                        fallback="Watch how CareerVivid keeps a saved job, resume tailoring, and interview prep connected in one application workspace."
                    />
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                        ['capture', 'Capture', 'Save the role from Chrome.'],
                        ['tailor', 'Tailor', 'Load the job into your resume.'],
                        ['practice', 'Practice', 'Prepare from the same context.'],
                    ].map(([key, label, copy]) => (
                        <div key={label} className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-4 shadow-sm">
                            <p className="text-sm font-semibold text-[#211b16]">
                                <LocalizedCopy path={`landing.public.demo.steps.${key}.label`} fallback={label} />
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-[#665a4a]">
                                <LocalizedCopy path={`landing.public.demo.steps.${key}.copy`} fallback={copy} />
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-[22px] border border-[#e4d3bc] bg-[#fffaf1]/90 p-2 shadow-2xl shadow-[#8b5a16]/10 sm:p-3">
                <div className="overflow-hidden rounded-2xl border border-[#eadbc5] bg-[#211b16]">
                    <div className="flex items-center justify-between border-b border-white/10 bg-[#2b241d] px-3 py-2 sm:px-4">
                        <div className="flex items-center gap-2" aria-hidden="true">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold text-[#f4f1e9]">
                            <LocalizedCopy path="landing.public.demo.window_label" fallback="CareerVivid demo" />
                        </span>
                    </div>
                    <div className="relative aspect-video w-full bg-[#211b16]">
                        <iframe
                            className="absolute inset-0 h-full w-full"
                            src="https://www.youtube.com/embed/8LhKxfBjvfg?si=KNGiuzfLSUk-OPqC"
                            title="CareerVivid Chrome extension and job-search workspace demo"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>
        </div>
    </PaperSection>
);

export const ResumeReadinessSection = () => (
    <PaperSection className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
            <div className="rounded-[24px] border border-[#e4d3bc] bg-[#fffaf1]/90 p-5 shadow-2xl shadow-[#8b5a16]/10 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eadbc5] pb-5">
                    <div>
                        <p className="cv-warm-eyebrow">
                            <LocalizedCopy path="landing.public.readiness.eyebrow" fallback="Resume readiness" />
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#211b16] sm:text-4xl">
                            <LocalizedCopy path="landing.public.readiness.title" fallback="Show users what improves before they apply." />
                        </h2>
                    </div>
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-[#f0e5d5] border-t-[#625bd5] bg-white text-center shadow-sm">
                        <div>
                            <p className="text-3xl font-bold text-[#211b16]">75</p>
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#665a4a]">
                                <LocalizedCopy path="landing.public.readiness.score" fallback="score" />
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 space-y-4">
                    {readinessChecks.map(([key, label, value, copy, tone]) => (
                        <div key={label as string} className="rounded-2xl border border-[#eadbc5] bg-white/82 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-base font-semibold text-[#211b16]">
                                        <LocalizedCopy path={`landing.public.readiness.checks.${key}.label`} fallback={label as string} />
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-[#665a4a]">
                                        <LocalizedCopy path={`landing.public.readiness.checks.${key}.copy`} fallback={copy as string} />
                                    </p>
                                </div>
                                <span className="rounded-full bg-[#f3f2ff] px-3 py-1 text-sm font-bold text-[#625bd5]">{value as number}%</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-[#eee5d7]">
                                <div className={`h-full rounded-full ${tone as string}`} style={{ width: `${value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#fffaf1]/90 px-3 py-2 text-xs font-bold text-[#8a6027] shadow-sm">
                    <Gauge size={15} className="text-[#625bd5]" />
                    <LocalizedCopy path="landing.public.readiness.side_eyebrow" fallback="ATS checker + interview prep" />
                </div>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                    <LocalizedCopy path="landing.public.readiness.side_title" fallback="A resume score is useful only when it creates the next action." />
                </h2>
                <p className="mt-5 text-lg font-medium leading-8 text-[#665a4a]">
                    <LocalizedCopy
                        path="landing.public.readiness.side_copy"
                        fallback="CareerVivid should not stop at a score. It should show missing keywords, proof gaps, and the interview prompts that help the user explain their strongest work."
                    />
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                        ['scan', FileSearch, 'Scan the role', 'Extract the skills, evidence, and language the job description rewards.'],
                        ['rewrite', PenLine, 'Rewrite with proof', 'Turn weak bullets into specific, measurable experience.'],
                        ['practice', Mic, 'Practice the story', 'Use the same role context to rehearse interview answers.'],
                    ].map(([key, Icon, title, copy]) => {
                        const LucideIcon = Icon as typeof FileSearch;
                        return (
                            <article key={title as string} className="grid gap-4 rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-5 shadow-sm sm:grid-cols-[48px_1fr]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2dfc2] text-[#8b5a16]">
                                    <LucideIcon size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#211b16]">
                                        <LocalizedCopy path={`landing.public.readiness.actions.${key}.title`} fallback={title as string} />
                                    </h3>
                                    <p className="mt-2 text-sm font-medium leading-6 text-[#665a4a]">
                                        <LocalizedCopy path={`landing.public.readiness.actions.${key}.copy`} fallback={copy as string} />
                                    </p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </div>
    </PaperSection>
);

export const ResumeExamplesSection = () => (
    <PaperSection className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                <div>
                    <p className="cv-warm-eyebrow">
                        <LocalizedCopy path="landing.public.resume_examples.eyebrow" fallback="Resume examples and templates" />
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                        <LocalizedCopy path="landing.public.resume_examples.title" fallback="Give every job seeker a starting point that matches their story." />
                    </h2>
                </div>
                <p className="text-base font-medium leading-7 text-[#665a4a]">
                    <LocalizedCopy
                        path="landing.public.resume_examples.copy"
                        fallback="A strong resume tool should make the first draft feel less blank. CareerVivid pairs templates with job tracking, tailoring, and interview prep so each example leads to action."
                    />
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
                <div className="rounded-[24px] border border-[#e4d3bc] bg-[#211b16] p-5 text-[#fffaf1] shadow-2xl shadow-[#8b5a16]/15">
                    <div className="rounded-2xl border border-white/10 bg-[#fffaf1] p-5 text-[#211b16] shadow-sm">
                        <div className="flex items-start justify-between gap-4 border-b border-[#eadbc5] pb-4">
                            <div>
                                <h3 className="text-2xl font-semibold">Jiawen Zhu</h3>
                                <p className="mt-1 text-sm font-bold text-[#665a4a]">
                                    <LocalizedCopy path="landing.public.resume_examples.preview_role" fallback="Frontend Engineer" />
                                </p>
                            </div>
                            <span className="rounded-full bg-[#f3f2ff] px-3 py-1 text-xs font-bold text-[#625bd5]">
                                <LocalizedCopy path="landing.public.resume_examples.ats_ready" fallback="ATS ready" />
                            </span>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
                            <div className="space-y-4">
                                {['profile', 'experience', 'projects'].map((section, index) => (
                                    <div key={section}>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a97935]">
                                            <LocalizedCopy path={`landing.public.resume_examples.preview_sections.${section}`} fallback={section} />
                                        </p>
                                        <div className="mt-2 space-y-2">
                                            <div className="h-2 rounded-full bg-[#d8c6ad]" style={{ width: `${index === 0 ? 92 : index === 1 ? 78 : 84}%` }} />
                                            <div className="h-2 rounded-full bg-[#eadbc5]" style={{ width: `${index === 0 ? 74 : index === 1 ? 88 : 68}%` }} />
                                            <div className="h-2 rounded-full bg-[#eadbc5]" style={{ width: `${index === 0 ? 58 : index === 1 ? 72 : 78}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                {['contact', 'skills', 'education'].map((section) => (
                                    <div key={section}>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a97935]">
                                            <LocalizedCopy path={`landing.public.resume_examples.preview_sections.${section}`} fallback={section} />
                                        </p>
                                        <div className="mt-2 h-2 rounded-full bg-[#d8c6ad]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {[
                            ['clean_format', FileCheck2, 'Clean format'],
                            ['keyword_match', Search, 'Keyword match'],
                            ['export_ready', Download, 'Export ready'],
                        ].map(([key, Icon, label]) => {
                            const LucideIcon = Icon as typeof FileCheck2;
                            return (
                                <div key={label as string} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-3 text-sm font-semibold">
                                    <LucideIcon size={17} className="text-[#d3a15e]" />
                                    <LocalizedCopy path={`landing.public.resume_examples.preview_badges.${key}`} fallback={label as string} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {resumeExamples.map(({ key, title, copy, tags }) => (
                        <article key={title} className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-5 shadow-sm">
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3f2ff] text-[#625bd5]">
                                <FileText size={21} />
                            </div>
                            <h3 className="text-xl font-semibold text-[#211b16]">
                                <LocalizedCopy path={`landing.public.resume_examples.cards.${key}.title`} fallback={title} />
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-6 text-[#665a4a]">
                                <LocalizedCopy path={`landing.public.resume_examples.cards.${key}.copy`} fallback={copy} />
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                    <span key={tag} className="rounded-full border border-[#eadbc5] bg-white/78 px-3 py-1 text-xs font-bold text-[#665a4a]">
                                        <LocalizedCopy path={`landing.public.resume_examples.cards.${key}.tags.${index}`} fallback={tag} />
                                    </span>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    </PaperSection>
);

export const ProofSection = () => (
    <PaperSection className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                <div>
                    <p className="cv-warm-eyebrow">
                        <LocalizedCopy path="landing.public.proof.eyebrow" fallback="Why it feels trustworthy" />
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                        <LocalizedCopy path="landing.public.proof.title" fallback="A job-search workflow users can verify." />
                    </h2>
                    <p className="mt-5 text-lg font-medium leading-8 text-[#665a4a]">
                        <LocalizedCopy
                            path="landing.public.proof.copy"
                            fallback="CareerVivid keeps direct job links, resume fit, prep notes, and a clear next step visible for every application."
                        />
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {proofCards.map(({ key, icon: Icon, title, copy }) => (
                        <article key={title} className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-5 shadow-sm">
                            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2dfc2] text-[#8b5a16]">
                                <Icon size={21} />
                            </div>
                            <h3 className="text-lg font-semibold text-[#211b16]">
                                <LocalizedCopy path={`landing.public.proof.cards.${key}.title`} fallback={title} />
                            </h3>
                            <p className="mt-3 text-sm font-medium leading-6 text-[#665a4a]">
                                <LocalizedCopy path={`landing.public.proof.cards.${key}.copy`} fallback={copy} />
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    </PaperSection>
);

export const UserStoriesSection = () => (
    <PaperSection className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-3xl">
                    <p className="cv-warm-eyebrow">
                        <LocalizedCopy path="landing.public.user_stories.eyebrow" fallback="User stories" />
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                        <LocalizedCopy path="landing.public.user_stories.title" fallback="Designed around the moments job seekers repeat." />
                    </h2>
                    <p className="mt-4 text-base font-medium leading-7 text-[#665a4a]">
                        <LocalizedCopy
                            path="landing.public.user_stories.copy"
                            fallback="These example story cards show the target user problems CareerVivid is built to solve while public customer reviews are still being collected."
                        />
                    </p>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 px-4 py-3 shadow-sm">
                    <div className="flex -space-x-3" aria-hidden="true">
                        {userStories.map(({ role, avatar, avatarSrc, avatarTone }) => (
                            <span
                                key={role}
                                className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[#fffaf1] text-sm font-semibold shadow-sm ${avatarTone}`}
                            >
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                    avatar
                                )}
                            </span>
                        ))}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[#211b16]">
                            <LocalizedCopy path="landing.public.user_stories.summary_title" fallback="Example job-seeker stories" />
                        </p>
                        <p className="text-xs font-semibold text-[#665a4a]">
                            <LocalizedCopy path="landing.public.user_stories.summary_copy" fallback="Illustrative personas, not fake reviews." />
                        </p>
                    </div>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                {userStories.map(({ key, role, name, avatar, avatarSrc, avatarTone, quote, outcome }) => (
                    <article key={role} className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold shadow-sm ${avatarTone}`}
                                >
                                    {avatarSrc ? (
                                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                                    ) : (
                                        avatar
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">
                                        <LocalizedCopy path="landing.public.user_stories.story_label" fallback="Example story" />
                                    </p>
                                    <p className="text-sm font-semibold text-[#211b16]">
                                        <LocalizedCopy path={`landing.public.user_stories.cards.${key}.name`} fallback={name} />
                                    </p>
                                </div>
                            </div>
                            <CheckCircle2 size={20} className="shrink-0 text-[#15803d]" aria-hidden="true" />
                        </div>
                        <p className="mt-5 text-lg font-semibold leading-8 text-[#211b16]">
                            “<LocalizedCopy path={`landing.public.user_stories.cards.${key}.quote`} fallback={quote} />”
                        </p>
                        <div className="mt-6 rounded-lg border border-[#eadbc5] bg-[#f9efe0]/80 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a97935]">
                                <LocalizedCopy path={`landing.public.user_stories.cards.${key}.role`} fallback={role} />
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-[#665a4a]">
                                <LocalizedCopy path={`landing.public.user_stories.cards.${key}.outcome`} fallback={outcome} />
                            </p>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    </PaperSection>
);

export const WorkflowSection = () => (
    <PaperSection className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 grid gap-4 border-b border-[#e2d4c2] pb-10 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                    <p className="cv-warm-eyebrow">
                        <LocalizedCopy path="landing.public.workflow.eyebrow" fallback="Application routine" />
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                        <LocalizedCopy path="landing.public.workflow.title" fallback="From hidden job link to prepared application." />
                    </h2>
                </div>
                <button
                    onClick={() => navigate('/job-tracker')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8c6ad] bg-[#fffaf1] px-5 py-3 text-sm font-semibold text-[#211b16] shadow-sm"
                >
                    <LocalizedCopy path="landing.public.workflow.action" fallback="Open job tracker" /> <ArrowRight size={16} />
                </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {workflowSteps.map(({ key, number, title, copy }) => (
                    <article key={title} className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-6 shadow-sm">
                        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#211b16] font-mono text-sm font-semibold text-white">
                            {number}
                        </div>
                        <h3 className="text-xl font-semibold text-[#211b16]">
                            <LocalizedCopy path={`landing.public.workflow.steps.${key}.title`} fallback={title} />
                        </h3>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#665a4a]">
                            <LocalizedCopy path={`landing.public.workflow.steps.${key}.copy`} fallback={copy} />
                        </p>
                    </article>
                ))}
            </div>
        </div>
    </PaperSection>
);

export const TeamsAndTrustSection = () => (
    <PaperSection className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-8">
            <div>
                <p className="cv-warm-eyebrow">
                    <LocalizedCopy path="landing.public.teams_trust.eyebrow" fallback="Trust comes from clarity" />
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                    <LocalizedCopy path="landing.public.teams_trust.title" fallback="One workspace. Clear context for every application." />
                </h2>
                <p className="mt-5 text-lg font-medium leading-8 text-[#665a4a]">
                    <LocalizedCopy path="landing.public.teams_trust.copy" fallback="CareerVivid should feel like a reliable workbench, not a loud promise machine." />
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button onClick={() => navigate('/signup')} className="inline-flex items-center justify-center gap-3 rounded-lg bg-[#211b16] px-6 py-4 font-semibold text-white shadow-lg shadow-[#6b4b1f]/15">
                        <LocalizedCopy path="landing.public.teams_trust.primary_action" fallback="Start for free" /> <ArrowRight size={18} />
                    </button>
                    <button onClick={() => navigate('/contact')} className="inline-flex items-center justify-center gap-3 rounded-lg border border-[#d8c6ad] bg-[#fffaf1] px-6 py-4 font-semibold text-[#211b16]">
                        <LocalizedCopy path="landing.public.teams_trust.secondary_action" fallback="Talk to us" />
                    </button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                {trustNotes.map(({ key, icon: Icon, title, copy }) => (
                    <article key={title} className="rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-6 shadow-sm">
                        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2dfc2] text-[#8b5a16]">
                            <Icon size={21} />
                        </div>
                        <h3 className="text-lg font-semibold text-[#211b16]">
                            <LocalizedCopy path={`landing.public.teams_trust.notes.${key}.title`} fallback={title} />
                        </h3>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#665a4a]">
                            <LocalizedCopy path={`landing.public.teams_trust.notes.${key}.copy`} fallback={copy} />
                        </p>
                    </article>
                ))}
            </div>
        </div>
        <div className="relative mx-auto mt-10 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {[
                ['career_center', Building2, 'Career center dashboard', 'Invite students, allocate credits, and monitor progress when CareerVivid is used by a cohort.'],
                ['application_context', ClipboardCheck, 'Application context', 'Store role, company, location, links, dates, notes, and preparation in one place.'],
                ['gemini_assistance', Sparkles, 'Gemini-powered assistance', 'Generate focused prep and resume suggestions from the user saved context.'],
            ].map(([key, Icon, title, copy]) => {
                const LucideIcon = Icon as typeof Building2;
                return (
                    <article key={title as string} className="grid gap-4 rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-5 sm:grid-cols-[44px_1fr]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2dfc2] text-[#8b5a16]">
                            <LucideIcon size={21} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[#211b16]">
                                <LocalizedCopy path={`landing.public.teams_trust.feature_cards.${key}.title`} fallback={title as string} />
                            </h3>
                            <p className="mt-2 text-sm font-medium leading-6 text-[#665a4a]">
                                <LocalizedCopy path={`landing.public.teams_trust.feature_cards.${key}.copy`} fallback={copy as string} />
                            </p>
                        </div>
                    </article>
                );
            })}
        </div>
    </PaperSection>
);

export const PricingPreviewSection = () => (
    <PaperSection className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
                <p className="cv-warm-eyebrow">
                    <LocalizedCopy path="landing.public.pricing.eyebrow" fallback="Simple pricing" />
                </p>
                <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                    <LocalizedCopy path="landing.public.pricing.title" fallback="Start free, then choose the AI help that matches your search." />
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-[#665a4a]">
                    <LocalizedCopy
                        path="landing.public.pricing.copy"
                        fallback="Keep the entry point clear, then compare current plan details on the pricing page when advanced AI credits become useful."
                    />
                </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                {pricingPreviewPlans.map(({ key, name, price, copy, points, action, href, featured }) => (
                    <article
                        key={name}
                        className={`rounded-[22px] border p-6 shadow-sm ${
                            // The featured card needs its own dark background.
                            // Its sibling uses bg-[#fffaf1], which index.css
                            // auto-darkens; #f3f2ff is not on that list, so this
                            // card stayed light in dark mode while its
                            // text-[#211b16] children were lightened by the same
                            // sweep — pale text on a pale card, contrast 1.02:1.
                            featured
                                ? 'border-[#625bd5] bg-[#f3f2ff]/90 dark:bg-[#2b2740]/90 shadow-[#625bd5]/10'
                                : 'border-[#e4d3bc] bg-[#fffaf1]/90 shadow-[#8b5a16]/5'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-semibold text-[#211b16]">
                                    <LocalizedCopy path={`landing.public.pricing.plans.${key}.name`} fallback={name} />
                                </h3>
                                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#211b16] sm:text-4xl">
                                    <LocalizedCopy path={`landing.public.pricing.plans.${key}.price`} fallback={price} />
                                </p>
                            </div>
                            {featured && (
                                <span className="rounded-full bg-[#625bd5] px-3 py-1 text-xs font-bold text-white">
                                    <LocalizedCopy path="landing.public.pricing.popular" fallback="Popular" />
                                </span>
                            )}
                        </div>
                        <p className="mt-4 min-h-[56px] text-sm font-medium leading-6 text-[#665a4a]">
                            <LocalizedCopy path={`landing.public.pricing.plans.${key}.copy`} fallback={copy} />
                        </p>
                        <ul className="mt-6 space-y-3">
                            {points.map((point, index) => (
                                <li key={point} className="flex items-start gap-3 text-sm font-semibold text-[#211b16]">
                                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#15803d]" />
                                    <LocalizedCopy path={`landing.public.pricing.plans.${key}.points.${index}`} fallback={point} />
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => navigate(href)}
                            className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-semibold ${
                                featured
                                    ? 'bg-[#625bd5] text-white shadow-lg shadow-[#625bd5]/20'
                                    : 'border border-[#d8c6ad] bg-[#fffaf1] text-[#211b16]'
                            }`}
                        >
                            <LocalizedCopy path={`landing.public.pricing.plans.${key}.action`} fallback={action} /> <ArrowRight size={16} />
                        </button>
                    </article>
                ))}
            </div>
        </div>
    </PaperSection>
);

export const FAQSection = () => (
    <PaperSection className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <p className="cv-warm-eyebrow">
                    <LocalizedCopy path="landing.public.faq.eyebrow" fallback="FAQ" />
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#211b16] sm:text-5xl">
                    <LocalizedCopy path="landing.public.faq.title" fallback="Questions before you start" />
                </h2>
            </div>
            <div className="mt-10 space-y-4">
                {faqs.map(({ key, question, answer }) => (
                    <details key={question} className="group rounded-xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-6">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-[#211b16] [&::-webkit-details-marker]:hidden">
                            <LocalizedCopy path={`landing.public.faq.items.${key}.question`} fallback={question} />
                            <ArrowRight size={18} className="shrink-0 transition group-open:rotate-90" />
                        </summary>
                        <p className="mt-4 text-base font-medium leading-7 text-[#665a4a]">
                            <LocalizedCopy path={`landing.public.faq.items.${key}.answer`} fallback={answer} />
                        </p>
                    </details>
                ))}
            </div>
        </div>
    </PaperSection>
);

export const FinalCTA = () => (
    <section className="cv-final-cta cv-surface-inverted bg-[#211b16] py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-[#d3a15e]">
                <LocalizedCopy path="landing.public.final_cta.eyebrow" fallback="Ready when your next application is" />
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
                <LocalizedCopy path="landing.public.final_cta.title" fallback="Create one workspace for the whole search." />
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-8 text-[#e7d4b9]">
                <LocalizedCopy path="landing.public.final_cta.copy" fallback="Build the resume, save the role, prepare the interview, and keep the next action visible." />
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={() => navigate('/signup')} className="inline-flex items-center justify-center gap-3 rounded-lg bg-[#fffaf1] px-6 py-4 font-semibold text-[#211b16]">
                    <LocalizedCopy path="landing.public.final_cta.primary_action" fallback="Sign up free" /> <ArrowRight size={18} />
                </button>
                <button onClick={() => navigate('/contact')} className="inline-flex items-center justify-center gap-3 rounded-lg border border-[#fffaf1]/20 px-6 py-4 font-semibold text-[#fffaf1]">
                    <LocalizedCopy path="landing.public.final_cta.secondary_action" fallback="Contact support" />
                </button>
            </div>
        </div>
    </section>
);
