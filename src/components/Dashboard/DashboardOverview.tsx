import React, { useMemo } from 'react';
import {
    ArrowRight,
    Briefcase,
    ChevronRight,
    CheckCircle2,
    FileText,
    Globe,
    MessageSquare,
    Mic,
    Target,
} from 'lucide-react';
import type { JobApplicationData, PracticeHistoryEntry, ResumeData } from '../../types';
import type { PortfolioData } from '../../features/portfolio/types/portfolio';
import { buildCareerProfileGraph } from '../../utils/careerProfileGraph';
import { navigate } from '../../utils/navigation';

interface DashboardOverviewProps {
    resumes: ResumeData[];
    portfolios: PortfolioData[];
    practiceHistory: PracticeHistoryEntry[];
    jobApplications: JobApplicationData[];
    communityPostCount: number;
    onInterviewSelect: (entry: PracticeHistoryEntry) => void;
}

const toMillis = (value: unknown): number => {
    if (typeof (value as { toMillis?: unknown })?.toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
    }
    if (typeof value === 'number') return value;
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value: unknown) => {
    const timestamp = toMillis(value);
    if (!timestamp) return 'No date recorded';
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(timestamp));
};

const getBestScore = (entry: PracticeHistoryEntry): number | null => {
    const scores = (entry.interviewHistory || [])
        .map((analysis) => Number(analysis.overallScore))
        .filter((score) => Number.isFinite(score) && score > 0)
        .map((score) => score <= 10 ? score * 10 : score);

    return scores.length ? Math.round(Math.max(...scores)) : null;
};

const toneForStep = (status: 'ready' | 'building' | 'start') => {
    if (status === 'ready') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
    if (status === 'building') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';
    return 'bg-[var(--cv-surface-muted)] text-[var(--cv-text-muted)] dark:bg-slate-800 dark:text-slate-300';
};

const metricIconTones = [
    'bg-[#fff7e8] text-[#a97935] dark:bg-amber-950/35 dark:text-amber-200',
    'bg-[#eff6ff] text-blue-700 dark:bg-blue-950/35 dark:text-blue-200',
    'bg-[#f3f2ff] text-[#625bd5] dark:bg-[#312d6b]/50 dark:text-[#bbb8ff]',
    'bg-[#eef9f2] text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200',
    'bg-[#fff7e8] text-[#a97935] dark:bg-amber-950/35 dark:text-amber-200',
];

/**
 * The dashboard's compact, data-backed overview. Full workspace collections
 * remain available below this surface so existing item actions are preserved.
 */
const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    resumes,
    portfolios,
    practiceHistory,
    jobApplications,
    communityPostCount,
    onInterviewSelect,
}) => {
    const profile = useMemo(() => buildCareerProfileGraph({
        resumes,
        portfolios,
        practiceHistory,
        jobApplications,
    }), [jobApplications, portfolios, practiceHistory, resumes]);

    const activeJobCount = jobApplications.filter((job) => job.applicationStatus !== 'Rejected').length;
    const recentInterviews = useMemo(
        () => [...practiceHistory].sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp)).slice(0, 3),
        [practiceHistory],
    );
    const metrics = [
        { label: 'Resumes', value: resumes.length, icon: FileText, path: '/newresume' },
        { label: 'Active jobs', value: activeJobCount, icon: Briefcase, path: '/job-tracker' },
        { label: 'Interviews', value: practiceHistory.length, icon: Mic, path: '/interview-studio' },
        { label: 'Portfolio sites', value: portfolios.length, icon: Globe, path: '/portfolio' },
        { label: 'Community posts', value: communityPostCount, icon: MessageSquare, path: '/community' },
    ];
    const { roleGoal, nextBestStep } = profile;
    const todayStep = roleGoal.nextStep || nextBestStep;

    return (
        <section className="space-y-6" aria-label="Job search overview">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:gap-6">
                <article className="rounded-2xl border border-[var(--cv-border-accent)] bg-[var(--cv-purple-25)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:bg-[#17152d] sm:p-6">
                    <div className="flex h-full flex-col items-start sm:flex-row sm:gap-5">
                        <span className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--cv-purple-50)] text-[var(--cv-action-primary)] ring-1 ring-[var(--cv-border-accent)] dark:bg-[#312d6b]/50 dark:text-[#bbb8ff] sm:mb-0">
                            <Target size={26} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="cv-design-eyebrow text-[10px]">Today's next step</p>
                            <h2 className="mt-2 font-heading text-xl font-extrabold leading-tight tracking-tight text-[var(--cv-text-heading-product)] dark:text-white sm:text-2xl">
                                {todayStep.label}
                            </h2>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--cv-text-body-product)]">
                                {todayStep.detail}
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate(todayStep.actionPath)}
                                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--cv-action-primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--cv-action-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]"
                            >
                                {todayStep.actionLabel}
                                <ArrowRight size={16} aria-hidden="true" />
                            </button>
                            <p className="mt-3 text-xs font-semibold text-[var(--cv-text-muted)]">
                                {roleGoal.title}
                            </p>
                        </div>
                    </div>
                </article>

                <article className="rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:bg-slate-900/70 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="cv-design-eyebrow text-[10px]">Target role readiness</p>
                            <h2 className="mt-2 line-clamp-2 break-words font-heading text-lg font-extrabold leading-snug text-[var(--cv-text-heading-product)] dark:text-white xl:truncate">{roleGoal.title}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/job-tracker')}
                            className="shrink-0 rounded-lg border border-[var(--cv-border-product)] px-3 py-2 text-xs font-bold text-[var(--cv-text-heading-product)] transition hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)] dark:text-white"
                        >
                            View role
                        </button>
                    </div>
                    <div className="mt-6 flex items-end gap-2">
                        <span className="font-heading text-4xl font-extrabold leading-none text-[var(--cv-action-primary)]">{roleGoal.readinessScore}%</span>
                        <span className="pb-0.5 text-sm font-semibold text-[var(--cv-text-muted)]">{roleGoal.readinessLabel}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cv-neutral-100)] dark:bg-slate-800">
                        <div className="h-full rounded-full bg-[var(--cv-action-primary)] transition-[width] duration-500" style={{ width: `${roleGoal.readinessScore}%` }} />
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(roleGoal.nextStep.actionPath)}
                        className="mt-5 flex w-full items-center gap-3 border-t border-[var(--cv-border-subtle)] pt-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff7e8] text-[#a97935] dark:bg-amber-950/35 dark:text-amber-200"><CheckCircle2 size={17} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">{roleGoal.nextStep.label}</span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--cv-text-muted)]">{roleGoal.nextStep.detail}</span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-[var(--cv-text-muted)]" aria-hidden="true" />
                    </button>
                </article>
            </div>

            <section aria-labelledby="dashboard-metrics-heading">
                <h2 id="dashboard-metrics-heading" className="cv-design-eyebrow mb-3 text-[10px] text-[var(--cv-text-muted)]">Your job search at a glance</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
                    {metrics.map(({ label, value, icon: Icon, path }, index) => (
                        <button
                            type="button"
                            key={label}
                            onClick={() => navigate(path)}
                            className="group min-h-[128px] rounded-xl border border-[var(--cv-border-product)] bg-[var(--cv-surface)] p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:-translate-y-0.5 hover:border-[var(--cv-border-accent)] hover:bg-[var(--cv-purple-25)] hover:shadow-[0_8px_24px_rgba(98,91,213,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)] dark:bg-slate-900/70 dark:hover:bg-[#17152d]"
                        >
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${metricIconTones[index]}`}><Icon size={17} aria-hidden="true" /></span>
                            <span className="mt-3 block text-xs font-semibold text-[var(--cv-text-body-product)]">{label}</span>
                            <span className="mt-1 block font-heading text-3xl font-extrabold leading-none text-[var(--cv-text-heading-product)] dark:text-white">{value}</span>
                        </button>
                    ))}
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2 xl:gap-6">
                <section className="rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:bg-slate-900/70" aria-labelledby="setup-map-heading">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="setup-map-heading" className="cv-design-eyebrow text-[10px]">Setup map</h2>
                        <button type="button" onClick={() => navigate('/job-tracker')} className="text-xs font-bold text-[var(--cv-action-primary)] hover:text-[var(--cv-action-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]">View all</button>
                    </div>
                    <ol className="mt-3 divide-y divide-[var(--cv-border-subtle)]">
                        {roleGoal.steps.slice(0, 3).map((step, index) => (
                            <li key={step.id}>
                                <button type="button" onClick={() => navigate(step.actionPath)} className="flex w-full items-center gap-3 py-3 text-left first:pt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]">
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${toneForStep(step.status)}`}>{index + 1}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">{step.label}</span>
                                        <span className="mt-0.5 block truncate text-xs text-[var(--cv-text-muted)]">{step.detail}</span>
                                    </span>
                                    <ChevronRight size={17} className="shrink-0 text-[var(--cv-text-muted)]" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] dark:bg-slate-900/70" aria-labelledby="recent-interviews-heading">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="recent-interviews-heading" className="cv-design-eyebrow text-[10px]">Recent interview sessions</h2>
                        <button type="button" onClick={() => navigate('/interview-studio')} className="text-xs font-bold text-[var(--cv-action-primary)] hover:text-[var(--cv-action-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]">View all</button>
                    </div>
                    {recentInterviews.length ? (
                        <ul className="mt-3 divide-y divide-[var(--cv-border-subtle)]">
                            {recentInterviews.map((entry) => {
                                const score = getBestScore(entry);
                                return (
                                    <li key={entry.id}>
                                        <button type="button" onClick={() => entry.interviewHistory?.length ? onInterviewSelect(entry) : navigate('/interview-studio')} className="flex w-full items-center gap-3 py-3 text-left first:pt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cv-purple-50)] text-[var(--cv-action-primary)] dark:bg-[#312d6b]/50 dark:text-[#bbb8ff]"><Mic size={17} aria-hidden="true" /></span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">{entry.job?.title || 'Interview practice'}</span>
                                                <span className="mt-0.5 block truncate text-xs text-[var(--cv-text-muted)]">{entry.job?.company ? `${entry.job.company} · ` : ''}{formatDate(entry.timestamp)}</span>
                                            </span>
                                            {score !== null && <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200">{score}%</span>}
                                            <ChevronRight size={17} className="shrink-0 text-[var(--cv-text-muted)]" aria-hidden="true" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-[var(--cv-border-product)] bg-[var(--cv-surface-muted)] p-4 dark:bg-slate-800/50">
                            <p className="text-sm font-bold text-[var(--cv-text-heading-product)] dark:text-white">No interview sessions yet</p>
                            <button type="button" onClick={() => navigate('/interview-studio')} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--cv-action-primary)] hover:text-[var(--cv-action-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)]">Start practice <ArrowRight size={13} /></button>
                        </div>
                    )}
                </section>
            </div>
        </section>
    );
};

export default DashboardOverview;
