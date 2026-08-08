import React from 'react';
import { ArrowRight, Briefcase, GraduationCap, Mic, ShieldCheck, Sparkles, Swords } from 'lucide-react';
import { INTERVIEW_GUIDE_TOTALS } from '../../data/interviewGuideSummaries.generated';

/**
 * The core landing narrative: Learn → Practice → Get hired.
 * Three pillars, each mapped to a real product surface with real numbers,
 * rendered in the warm editorial palette used by the hero.
 */

const PILLARS = [
    {
        step: '01',
        icon: GraduationCap,
        title: 'Learn by doing',
        tagline: 'Interactive AI courses — not tutorials',
        description:
            'Ten courses from LLM foundations to a shipped portfolio project. Watch a model predict tokens, overflow a context window, defend against prompt injection — every concept is a playground you touch, not a video you watch.',
        stats: ['10 courses', '60+ hands-on lessons', '11 interactive playgrounds'],
        href: '/learning',
        cta: 'Browse courses',
    },
    {
        step: '02',
        icon: Swords,
        title: 'Know exactly what to expect',
        tagline: `The real interview loop for ${INTERVIEW_GUIDE_TOTALS.companies} companies — run by a voice AI`,
        description:
            'Choose a company and step through its actual interview process — recruiter screen, live coding with real test execution, system design on a whiteboard, and behavioral rounds. A voice AI interviews and scores each attempt, so nothing catches you off guard.',
        stats: [`${INTERVIEW_GUIDE_TOTALS.companies} company guides`, 'Voice AI interviewer', 'Coding + whiteboard rounds'],
        href: '/interview-studio',
        cta: 'Start a mock interview',
    },
    {
        step: '03',
        icon: Briefcase,
        title: 'Land the job',
        tagline: 'A feed of verified, apply-ready roles',
        description:
            'Live jobs pulled straight from company career boards, every apply link validated before you see it. Save a role and your resume tailoring, prep notes, and application tracking are already wired up.',
        stats: ['160+ companies live', 'Links validated every 6h', 'One-click into your tracker'],
        href: '/jobs/recommend',
        cta: 'See live jobs',
    },
];

const LearnPracticeHiredSection: React.FC = () => (
    <section className="bg-[#f7f1e7] py-16 dark:bg-[#1f1f1d] sm:py-20" aria-labelledby="journey-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#fffaf1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#a97935]">
                    <Sparkles size={13} /> The whole journey
                </p>
                <h2 id="journey-heading" className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-[#211b16] dark:text-[#f4f1e9] sm:text-4xl">
                    Most tools help you apply.
                    <br className="hidden sm:block" /> CareerVivid makes you the candidate they call back.
                </h2>
                <p className="mt-4 text-base font-medium leading-7 text-[#665a4a] dark:text-[#aaa39a]">
                    Skills first, interview reps second, applications last — the order that actually gets people hired.
                </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
                {PILLARS.map(({ step, icon: Icon, title, tagline, description, stats, href, cta }) => (
                    <a
                        key={step}
                        href={href}
                        className="group flex flex-col rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] p-6 shadow-sm shadow-[#8b5a16]/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#8b5a16]/10 dark:border-[#37332d] dark:bg-[#262522]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#211b16] text-[#f4e8d4] shadow-md dark:bg-[#f4f1e9] dark:text-[rgb(33,27,22)]">
                                <Icon size={22} />
                            </span>
                            <span className="text-4xl font-black tracking-tight text-[#e4d3bc] dark:text-[#37332d]">{step}</span>
                        </div>
                        <h3 className="mt-5 text-xl font-bold text-[#211b16] dark:text-[#f4f1e9]">{title}</h3>
                        <p className="mt-1 text-sm font-semibold text-[#a97935]">{tagline}</p>
                        <p className="mt-3 flex-1 text-sm font-medium leading-6 text-[#665a4a] dark:text-[#aaa39a]">{description}</p>
                        <ul className="mt-4 space-y-1.5">
                            {stats.map((stat) => (
                                <li key={stat} className="flex items-center gap-2 text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">
                                    <ShieldCheck size={15} className="shrink-0 text-[#137245]" />
                                    {stat}
                                </li>
                            ))}
                        </ul>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#8b5a16] transition group-hover:gap-3 dark:text-[#caa26c]">
                            {cta} <ArrowRight size={16} />
                        </span>
                    </a>
                ))}
            </div>

            <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/80 px-5 py-4 text-center dark:border-[#37332d] dark:bg-[#262522]">
                <Mic size={18} className="hidden shrink-0 text-[#a97935] sm:block" />
                <p className="text-sm font-semibold leading-6 text-[#665a4a] dark:text-[#aaa39a]">
                    Everything earns XP — lessons, interview stages, cleared quests — so you can see yourself becoming the stronger candidate.
                </p>
            </div>
        </div>
    </section>
);

export default LearnPracticeHiredSection;
