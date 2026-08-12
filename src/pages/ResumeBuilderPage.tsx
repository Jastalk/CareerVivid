/**
 * The public resume builder page.
 *
 * There was no page like this. `/newresume` is behind ProtectedRoute, so
 * "resume builder" — the highest-volume commercial query in this category —
 * had nothing on the site to rank for, and a visitor who had not signed up
 * could not see what the builder was before deciding to.
 *
 * The claims here are checked against the product by
 * src/config/seoPricingParity.test.ts and the crawler copy in
 * functions/src/seo/searchIndexPolicy.ts, which this page mirrors. If one
 * changes, change both — a landing page promising something the crawler copy
 * does not is the sort of mismatch that reads as cloaking.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, Sparkles, Gauge, Target, Download, Upload, ArrowRight, Check } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';
import { navigate } from '../utils/navigation';
import { TEMPLATES } from '../templates';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
    {
        icon: Sparkles,
        title: 'Start from your experience, not a blank page',
        body: 'Describe what you have done, or import a resume you already have, and CareerVivid drafts a first version you can edit line by line. Nothing is locked.',
    },
    {
        icon: FileText,
        title: `${TEMPLATES.length} templates, all free`,
        body: 'Every template is on the free plan, each with its own colour options. They are designed as documents rather than web pages, so the PDF reads exactly like the preview.',
    },
    {
        icon: Gauge,
        title: 'Know whether it is good before you send it',
        body: 'A score checks what a recruiter and an applicant tracking system both look for — quantified bullets, a specific summary, no missing sections — and names the weakest line rather than grading you.',
    },
    {
        icon: Target,
        title: 'Tailor it to the job you are applying for',
        body: 'Paste a job description and CareerVivid rewrites the summary and reorders your skills for that role, as a new copy. Your original is never modified.',
    },
    {
        icon: Upload,
        title: 'Bring a resume you already have',
        body: 'Upload a PDF, Word document or plain text file and CareerVivid pulls out your details, roles and skills into something editable.',
    },
    {
        icon: Download,
        title: 'Download as many times as you like',
        body: 'PDF export is unlimited on every plan, including free. No watermark, no per-download charge, no card required.',
    },
];

/**
 * Template groups a reader actually chooses between.
 *
 * Anything not named here falls into "Modern and minimal", so a newly added
 * template appears in the gallery rather than disappearing from it. Filtered
 * against TEMPLATES so a rename cannot leave a card pointing at nothing.
 */
const GROUPS: Array<{ title: string; blurb: string; ids: string[] }> = [
    {
        title: 'Classic and traditional',
        blurb: 'Conventional layouts for fields that expect one — law, academia, finance, medicine.',
        ids: ['Harvard', 'Chicago', 'Classic', 'Serif', 'Academic', 'Executive', 'Corporate', 'Professional'],
    },
    {
        title: 'Creative and visual',
        blurb: 'For work that is itself visual. Use them when the portfolio is the point.',
        ids: ['Creative', 'Artistic', 'Vibrant', 'Infographic', 'Wave', 'Geometric', 'Timeline', 'Sydney', 'Bold', 'Dynamic'],
    },
    {
        title: 'Technical',
        blurb: 'Room for stacks, projects and links without crowding out the results.',
        ids: ['Technical', 'Quantum', 'Vertex', 'Orion', 'Apex', 'Slate', 'Zenith', 'Pinnacle', 'Cascade'],
    },
];

const groupedTemplates = () => {
    const claimed = new Set(GROUPS.flatMap((g) => g.ids));
    const rest = TEMPLATES.filter((t) => !claimed.has(t.id)).map((t) => t.id);
    return [
        ...GROUPS.map((g) => ({ ...g, templates: TEMPLATES.filter((t) => g.ids.includes(t.id)) })),
        {
            title: 'Modern and minimal',
            blurb: 'The safest default. Clean single-column layouts that survive an ATS and a six-second skim equally well.',
            templates: TEMPLATES.filter((t) => rest.includes(t.id)),
        },
    ].filter((g) => g.templates.length > 0);
};

const FAQS = [
    {
        q: 'Is the CareerVivid resume builder free?',
        a: `Yes. Building, editing and downloading a resume as PDF is free and unlimited, and all ${TEMPLATES.length} templates are available on the free plan. No card is required to start.`,
    },
    {
        q: 'Can I download my resume as a PDF?',
        a: 'Yes, as many times as you like on any plan, including free. The PDF is generated from the same document you see in the editor, so it prints exactly as previewed.',
    },
    {
        q: 'Is the resume ATS friendly?',
        a: 'Yes. Templates use real, selectable text rather than images, in a structure applicant tracking systems can parse, and the built-in score flags missing sections and unquantified bullets before you apply.',
    },
    {
        q: 'Can I import a resume I already have?',
        a: 'Yes. Upload a PDF, Word document or plain text file and CareerVivid extracts your details, roles and skills into an editable resume.',
    },
    {
        q: 'Which resume template is best for ATS?',
        a: 'Any single-column template with conventional section headings parses most reliably — Modern, Simple, Classic, Minimalist and Harvard are all safe choices. Every CareerVivid template uses selectable text rather than images, which is the part that matters most.',
    },
    {
        q: 'Can I switch templates after writing my resume?',
        a: 'Yes. Content and design are stored separately, so changing template keeps all of your text and lets you compare designs instantly.',
    },
];

const ResumeBuilderPage: React.FC = () => {
    const { currentUser } = useAuth();
    const start = () => navigate(currentUser ? '/newresume' : '/signup');
    const groups = groupedTemplates();

    return (
        <div className="min-h-screen bg-[var(--cv-bg-public)]">
            <Helmet>
                {/* No "| CareerVivid" suffix: the app shell's Helmet sets
                    titleTemplate="%s | CareerVivid" and appends it. */}
                <title>Free AI Resume Builder</title>
                <meta
                    name="description"
                    content={`Build a resume free with ${TEMPLATES.length} professional templates, AI drafting from your experience, ATS-aware scoring, and unlimited PDF downloads. No card required.`}
                />
                <link rel="canonical" href="https://careervivid.app/resume-builder" />
            </Helmet>

            <PublicHeader variant="editorial" />

            <main className="pt-24">
                <section className="mx-auto max-w-4xl px-4 pb-12 pt-10 text-center sm:px-6 lg:px-8">
                    <h1 className="text-4xl font-black leading-tight text-[var(--cv-text-heading)] sm:text-5xl">
                        Build a resume that gets read
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-[var(--cv-text-body)]">
                        Write it yourself or let AI draft from what you have done, then see a score for how
                        well it holds up before you send it anywhere.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={start}
                            className="cv-design-button-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-black"
                        >
                            Build my resume free
                            <ArrowRight className="h-4 w-4" />
                        </button>
                        <a
                            href="#templates"
                            className="rounded-xl border border-[var(--cv-border-warm)] px-6 py-3 text-base font-bold text-[var(--cv-text-body)] transition-colors hover:bg-[var(--cv-surface-warm-muted)]"
                        >
                            See all {TEMPLATES.length} templates
                        </a>
                    </div>
                    <p className="mt-4 text-sm text-[var(--cv-text-muted)]">
                        Free forever plan · No card required · Unlimited PDF downloads
                    </p>
                </section>

                <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, body }) => (
                            <article key={title} className="cv-design-card p-6">
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cv-surface-warm-muted)]">
                                    <Icon className="h-5 w-5 text-[var(--cv-action-primary)]" />
                                </div>
                                <h2 className="mb-2 text-base font-black text-[var(--cv-text-heading)]">{title}</h2>
                                <p className="text-sm leading-relaxed text-[var(--cv-text-body)]">{body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="templates" className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-black text-[var(--cv-text-heading)]">
                        All {TEMPLATES.length} templates, free
                    </h2>
                    <p className="mb-8 mt-2 max-w-2xl text-sm leading-relaxed text-[var(--cv-text-body)]">
                        Each is a full document design with its own typography, spacing and colour options,
                        not a colour swap of one layout. Switching keeps your content, so trying another
                        costs you nothing but a click.
                    </p>
                    {groups.map((group) => (
                        <div key={group.title} className="mb-10">
                            <h3 className="text-base font-black text-[var(--cv-text-heading)]">{group.title}</h3>
                            <p className="mb-4 mt-1 max-w-2xl text-sm leading-relaxed text-[var(--cv-text-body)]">
                                {group.blurb}
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {group.templates.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={start}
                                        className="cv-design-card cv-design-card-hover p-4 text-left"
                                    >
                                        <span className="block text-base font-black text-[var(--cv-text-heading)]">
                                            {template.name}
                                        </span>
                                        <span
                                            className="mt-3 flex items-center gap-1.5"
                                            aria-label={`${template.availableColors.length} colour options`}
                                        >
                                            {template.availableColors.slice(0, 6).map((colour) => (
                                                <span
                                                    key={colour}
                                                    className="h-4 w-4 rounded-full ring-1 ring-black/10"
                                                    style={{ backgroundColor: colour }}
                                                />
                                            ))}
                                        </span>
                                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--cv-text-muted)]">
                                            <Check className="h-3 w-3" />
                                            Free · PDF export
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
                    <h2 className="mb-6 text-2xl font-black text-[var(--cv-text-heading)]">
                        Frequently asked questions
                    </h2>
                    <div className="space-y-5">
                        {FAQS.map(({ q, a }) => (
                            <div key={q} className="cv-design-card p-5">
                                <h3 className="mb-2 text-base font-black text-[var(--cv-text-heading)]">{q}</h3>
                                <p className="text-sm leading-relaxed text-[var(--cv-text-body)]">{a}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={start}
                            className="cv-design-button-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-black"
                        >
                            Start building
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default ResumeBuilderPage;
