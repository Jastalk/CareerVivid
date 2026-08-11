import React from 'react';
import { ArrowRight, Mic, Swords } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';

/**
 * Dynamic interview showcase — renders REAL company interview guides from
 * the bundled index, so counts and companies stay accurate automatically.
 */

interface GuideIndexEntry {
    company?: string;
    slug?: string;
    stageCount?: number;
    questionCount?: number;
    difficulty?: number | null;
}

const indexModule = import.meta.glob('../../../data/interview-guides/_index.json', { eager: true }) as Record<
    string,
    { default: Record<string, GuideIndexEntry> }
>;
const GUIDE_INDEX: Record<string, GuideIndexEntry> = Object.values(indexModule)[0]?.default ?? {};

const ALL_GUIDES = Object.values(GUIDE_INDEX).filter(
    (entry): entry is Required<Pick<GuideIndexEntry, 'company' | 'slug'>> & GuideIndexEntry =>
        Boolean(entry && typeof entry === 'object' && entry.company && entry.slug),
);

/** Recognizable brands first; anything missing from the index is skipped. */
const FEATURED_COMPANIES = [
    'Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Netflix',
    'OpenAI', 'Anthropic', 'Stripe', 'Figma', 'Airbnb', 'Uber',
    'Databricks', 'Coinbase', 'SpaceX', 'Jane Street',
];

const featuredGuides = FEATURED_COMPANIES
    .map((name) => ALL_GUIDES.find((guide) => guide.company.toLowerCase() === name.toLowerCase()))
    .filter((guide): guide is NonNullable<typeof guide> => Boolean(guide))
    .slice(0, 12);

const InterviewShowcaseSection: React.FC = () => (
    <section className="bg-[#f7f1e7] py-16 dark:bg-[#1f1f1d] sm:py-20" aria-labelledby="interview-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-[#e4d3bc] bg-[#fffaf1] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#a97935]">
                        <Swords size={13} /> Company interview quests
                    </p>
                    <h2 id="interview-heading" className="mt-4 text-3xl font-semibold tracking-tight text-[#211b16] dark:text-[#f4f1e9] sm:text-4xl">
                        Practice the exact loop — {ALL_GUIDES.length} companies.
                    </h2>
                    <p className="mt-2 max-w-2xl text-base font-medium text-[#665a4a] dark:text-[#aaa39a]">
                        Recruiter screen, live coding with real test execution, system design on a whiteboard, behavioral rounds — Vivid interviews you and delivers a comprehensive performance report after every attempt.
                    </p>
                </div>
                <a
                    href="/interview-studio"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#211b16] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8b5a16]/10 transition hover:-translate-y-0.5 hover:bg-[#3a2b20]"
                >
                    <Mic size={16} /> Start a mock interview
                </a>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {featuredGuides.map((guide) => (
                    <a
                        key={guide.slug}
                        href={`/quest/${guide.slug}`}
                        className="group flex items-center justify-between gap-2 rounded-2xl border border-[#e4d3bc] bg-[#fffaf1] px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#bfa782] hover:shadow-lg hover:shadow-[#8b5a16]/10 dark:border-[#37332d] dark:bg-[#262522]"
                    >
                        <div className="flex min-w-0 items-center gap-2.5">
                            <CompanyLogo company={guide.company} slug={guide.slug} size={36} />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#211b16] dark:text-[#f4f1e9]">{guide.company}</p>
                                <p className="mt-0.5 truncate text-[11px] font-semibold text-[#8b6a3f] dark:text-[#caa26c]">
                                    {guide.stageCount ? `${guide.stageCount}-stage loop` : 'Full interview loop'}
                                    {guide.difficulty ? ` · ${guide.difficulty}/10` : ''}
                                </p>
                            </div>
                        </div>
                        <ArrowRight size={15} className="shrink-0 text-[#bfa782] transition group-hover:translate-x-0.5 group-hover:text-[#8b5a16]" />
                    </a>
                ))}
            </div>

            <p className="mt-6 text-center text-sm font-semibold text-[#8b6a3f] dark:text-[#caa26c]">
                …and {Math.max(ALL_GUIDES.length - featuredGuides.length, 0)} more companies, each with its own quest line.
            </p>
        </div>
    </section>
);

export default InterviewShowcaseSection;
