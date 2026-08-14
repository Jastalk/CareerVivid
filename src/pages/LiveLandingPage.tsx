import React from 'react';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import LandingSeo from '../components/Landing/LandingSeo';
import '../components/Landing/live/liveLanding.css';
import DeskHero from '../components/Landing/live/DeskHero';
import { MenuBar, PublicFooter } from '../components/Landing/live/PublicShell';
import DeskWindow from '../components/Landing/live/DeskWindow';
import QuestTape from '../components/Landing/live/QuestTape';
import LiveResume from '../components/Landing/live/LiveResume';
import LiveVoice from '../components/Landing/live/LiveVoice';
import { useHasBeenSeen } from '../components/Landing/live/liveHooks';
import { INTERVIEW_GUIDE_TOTALS } from '../data/interviewGuideSummaries.generated';
import { getCourseCatalogTotals } from '../lib/interactiveCourses';

const COMPANY_COUNT = INTERVIEW_GUIDE_TOTALS.companies;
const STAGE_COUNT = INTERVIEW_GUIDE_TOTALS.stages;
const QUESTION_COUNT = INTERVIEW_GUIDE_TOTALS.questQuestions;
const { courses: COURSE_COUNT, lessons: LESSON_COUNT } = getCourseCatalogTotals();
const groupDigits = (value: number) => value.toLocaleString('en-US');

/** Left copy, right live demo — the shape both feature sections share. */
const FeatureRow: React.FC<{
    id: string;
    eyebrow: string;
    title: string;
    copy: string;
    points: string[];
    href: string;
    cta: string;
    filename: string;
    accent: 'purple' | 'amber' | 'green';
    flip?: boolean;
    render: (playing: boolean) => React.ReactNode;
}> = ({ id, eyebrow, title, copy, points, href, cta, filename, accent, flip, render }) => {
    const [ref, seen] = useHasBeenSeen<HTMLDivElement>();
    return (
        <section ref={ref} id={id} className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className={`grid items-center gap-8 lg:grid-cols-2 ${flip ? '' : ''}`}>
                <div className={flip ? 'lg:order-2' : ''}>
                    <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                        {eyebrow}
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
                    <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>{copy}</p>
                    <ul className="mt-5 space-y-2.5">
                        {points.map((point) => (
                            <li key={point} className="flex items-start gap-2.5 text-[14px]">
                                <Check size={15} className="mt-[3px] shrink-0" style={{ color: 'var(--cvl-green)' }} />
                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                    <a
                        href={href}
                        className="cvl-cta mt-7 inline-flex items-center gap-1.5 rounded-xl px-5 py-3 text-[14px] font-semibold transition hover:opacity-90"
                    >
                        {cta} <ArrowRight size={15} />
                    </a>
                </div>
                <div className={flip ? 'lg:order-1' : ''}>
                    <DeskWindow filename={filename} accent={accent}>
                        {render(seen)}
                    </DeskWindow>
                </div>
            </div>
        </section>
    );
};

// The same figures the studio itself prints, read from the generated summaries
// rather than typed in — so the page cannot drift from the catalogue.
const NUMBERS = [
    { value: groupDigits(COMPANY_COUNT), label: 'companies' },
    { value: groupDigits(QUESTION_COUNT), label: 'practice questions' },
    { value: groupDigits(STAGE_COUNT), label: 'interview stages' },
    { value: groupDigits(LESSON_COUNT), label: 'hands-on lessons' },
];

const PLANS = [
    {
        name: 'free',
        price: '$0',
        note: 'free forever, no card needed',
        blurb: 'see whether it helps.',
        points: ['Every quest page, readable', 'Resume starter flow', 'Job tracker'],
        href: '/signup',
        cta: 'start free',
        featured: false,
    },
    {
        name: 'pro',
        price: 'AI credits',
        note: 'pay for the AI you actually run',
        blurb: 'for an active search.',
        points: ['AI resume tailoring', 'Graded voice + design rounds', 'Chrome capture and autofill'],
        href: '/pricing',
        cta: 'see pro',
        featured: true,
    },
    {
        name: 'teams',
        price: 'Custom',
        note: 'billed per cohort',
        blurb: 'for schools and career centres.',
        points: ['Student dashboards', 'Credit allocation', 'Progress tracking'],
        href: '/contact',
        cta: 'talk to us',
        featured: false,
    },
];

const FAQS = [
    {
        q: 'what actually happens in a quest?',
        a: 'You get a company\'s real loop — recruiter screen, live coding with tests that run, a whiteboard system-design round, and behavioural questions. A voice AI interviews you, and each round ends in a scored report you can reopen later.',
    },
    {
        q: 'is the system design round really graded?',
        a: 'Yes. You draw on a whiteboard, the coach asks about the parts you skipped, and the submitted diagram is scored on coverage, trade-offs, and clarity. Every past report reopens the exact design you submitted for it.',
    },
    {
        q: 'do i need to pay to look around?',
        a: `No. Every quest page and course outline is free to browse without an account. A free account saves progress and XP; AI credits cover the rounds that call a model. The Coding Interview Patterns course and the AI Foundations module are free outright.`,
    },
    {
        q: 'how does the resume editor use the job description?',
        a: 'Paste the posting and the editor rewrites your bullets against it — surfacing the evidence that matches, aligning the wording, and scoring the result before you apply. You keep a separate tailored version per application.',
    },
    {
        q: 'where do the jobs come from?',
        a: 'Straight from 160+ companies\' official career boards — Greenhouse, Lever, and Ashby — refreshed every six hours. Every apply link is checked before it shows up, so expired postings drop out on their own.',
    },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => (
    <details className="group border-b" style={{ borderColor: 'var(--cvl-line)' }}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold">
            {q}
            <ChevronDown size={16} className="shrink-0 transition group-open:rotate-180" style={{ color: 'var(--cvl-faint)' }} />
        </summary>
        <p className="pb-4 text-[14px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>{a}</p>
    </details>
);

const LiveLandingPage: React.FC = () => (
    <div className="cvl min-h-screen">
        <LandingSeo />

        <MenuBar
            anchors={[
                { href: '#quests', label: 'quests' },
                { href: '#resume', label: 'resume' },
                { href: '#studio', label: 'studio' },
                { href: '/pricing', label: 'pricing' },
            ]}
        />

        <main>
            <DeskHero />
            <QuestTape />

            <FeatureRow
                id="resume"
                eyebrow="resume editor"
                title="Your resume, finished — not just written."
                copy="Any model can draft a bullet. The hour goes on formatting, ATS rules, and which file the recruiter actually wants. Paste the posting and the agent rewrites, scores, and exports it — then translates the whole thing when the role is in another country."
                points={[
                    'Your facts and your evidence — better phrasing, nothing invented',
                    'Scored against this posting, not a generic template',
                    'Export as PDF, DOCX, or straight to Google Docs',
                    '103 languages, and your original stays exactly where it was',
                ]}
                href="/newresume"
                cta="Open the resume editor"
                filename="resume-rewrite.mov"
                accent="green"
                render={(playing) => <LiveResume playing={playing} />}
            />

            <FeatureRow
                id="studio"
                eyebrow="interview studio"
                title="Hear the whole loop before you live it."
                copy="The agent reads your resume, runs the round the way that company runs it, and asks the follow-up out loud. You finish knowing what the day will feel like — and exactly what to work on before it arrives."
                points={[
                    'Real voice, not a chat box pretending to be one',
                    `Questions drawn from ${COMPANY_COUNT} verified company guides`,
                    'A report at the end that names what to practise, not just a score',
                ]}
                href="/interview-studio"
                cta="Open the studio"
                filename="voice-round.mov"
                accent="amber"
                flip
                render={(playing) => <LiveVoice playing={playing} />}
            />

            <section className="border-y py-12" style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}>
                <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4">
                    {NUMBERS.map((item) => (
                        <div key={item.label} className="text-center">
                            <p className="text-3xl font-bold tracking-tight sm:text-4xl">{item.value}</p>
                            <p className="mt-1 text-[12px] leading-snug" style={{ color: 'var(--cvl-faint)' }}>{item.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
                        pricing
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">start free, pay for the AI you run.</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {PLANS.map((plan) => (
                        <article
                            key={plan.name}
                            className="cvl-win flex flex-col p-6"
                            style={plan.featured
                                ? { borderColor: 'var(--cvl-purple)', background: 'var(--cvl-purple-soft)' }
                                : undefined}
                        >
                            {plan.featured && (
                                <span
                                    className="cvl-mono mb-3 self-start rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                                    style={{ background: 'var(--cvl-purple)' }}
                                >
                                    popular
                                </span>
                            )}
                            <h3 className="text-xl font-semibold">{plan.name}</h3>
                            <p className="mt-1 text-[13px]" style={{ color: 'var(--cvl-muted)' }}>{plan.blurb}</p>
                            <p className="mt-5 text-3xl font-bold tracking-tight">{plan.price}</p>
                            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--cvl-faint)' }}>{plan.note}</p>
                            <ul className="mt-5 flex-1 space-y-2.5">
                                {plan.points.map((point) => (
                                    <li key={point} className="flex items-start gap-2 text-[13.5px]">
                                        <Check size={14} className="mt-[3px] shrink-0" style={{ color: 'var(--cvl-green)' }} />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={plan.href}
                                className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-[14px] font-semibold transition hover:opacity-90 ${plan.featured ? 'cvl-cta' : ''}`}
                                style={plan.featured
                                    ? { borderColor: 'transparent' }
                                    : { borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-ink)' }}
                            >
                                {plan.cta}
                            </a>
                        </article>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-2xl px-4 pb-20 sm:px-6">
                <h2 className="mb-4 text-2xl font-semibold tracking-tight">frequently asked questions</h2>
                {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </section>

            <section className="px-4 pb-24 text-center">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                    the interview is on thursday.
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[15px]" style={{ color: 'var(--cvl-muted)' }}>
                    Do the round now, while it still costs nothing to get it wrong.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <a
                        href="/signup"
                        className="cvl-cta inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold transition hover:opacity-90"
                    >
                        Start free <ArrowRight size={16} />
                    </a>
                    <a
                        href="/interview-studio"
                        className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-[15px] font-semibold transition hover:opacity-90"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}
                    >
                        Browse the quests
                    </a>
                </div>
            </section>
        </main>

        <PublicFooter />
    </div>
);

export default LiveLandingPage;
