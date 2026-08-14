import React, { useMemo } from 'react';
import {
    ArrowRight,
    Briefcase,
    CheckCircle2,
    CircleDashed,
    FileText,
    FolderOpen,
    History,
    ListChecks,
    Mic,
    Network,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    type LucideIcon,
} from 'lucide-react';
import type { JobApplicationData, PracticeHistoryEntry, ResumeData } from '../../types';
import type { PortfolioData } from '../../features/portfolio/types/portfolio';
import {
    buildCareerProfileGraph,
    type CareerProfileGoalStep,
    type CareerProfileGraphNode,
    type CareerProfileGraphNodeId,
    type CareerProfileGraphTone,
    type PracticeInsights,
} from '../../utils/careerProfileGraph';
import { findQuestSlugForCompany } from '../../lib/localInterviewGuides';
import { navigate } from '../../utils/navigation';

interface CareerProfileGraphCardProps {
    resumes: ResumeData[];
    portfolios: PortfolioData[];
    practiceHistory: PracticeHistoryEntry[];
    jobApplications: JobApplicationData[];
}

const nodeIcons: Record<CareerProfileGraphNodeId, LucideIcon> = {
    resume: FileText,
    skills: Sparkles,
    goals: Target,
    targetRoles: Briefcase,
    proof: FolderOpen,
    interview: Mic,
    jobHistory: History,
};

const toneStyles: Record<CareerProfileGraphTone, {
    chip: string;
    icon: string;
    bar: string;
    border: string;
}> = {
    blue: {
        chip: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900/50',
        icon: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
        bar: 'bg-blue-500',
        border: 'hover:border-blue-200 dark:hover:border-blue-900/70',
    },
    emerald: {
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900/50',
        icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
        bar: 'bg-emerald-500',
        border: 'hover:border-emerald-200 dark:hover:border-emerald-900/70',
    },
    amber: {
        chip: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50',
        icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
        bar: 'bg-amber-500',
        border: 'hover:border-amber-200 dark:hover:border-amber-900/70',
    },
    violet: {
        chip: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-200 dark:border-violet-900/50',
        icon: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200',
        bar: 'bg-violet-500',
        border: 'hover:border-violet-200 dark:hover:border-violet-900/70',
    },
    pink: {
        chip: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-200 dark:border-pink-900/50',
        icon: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-200',
        bar: 'bg-pink-500',
        border: 'hover:border-pink-200 dark:hover:border-pink-900/70',
    },
    slate: {
        chip: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/70 dark:text-slate-200 dark:border-slate-800',
        icon: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
        bar: 'bg-slate-500',
        border: 'hover:border-slate-300 dark:hover:border-slate-700',
    },
    indigo: {
        chip: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-200 dark:border-indigo-900/50',
        icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200',
        bar: 'bg-indigo-500',
        border: 'hover:border-indigo-200 dark:hover:border-indigo-900/70',
    },
};

const SignalChip: React.FC<{ label: string; className: string }> = ({ label, className }) => (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold leading-none ${className}`}>
        <CheckCircle2 size={10} className="shrink-0" />
        <span className="truncate">{label}</span>
    </span>
);

const EmptyChip: React.FC<{ label: string }> = ({ label }) => (
    <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-bold leading-none text-stone-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        <CircleDashed size={10} />
        {label}
    </span>
);

const getReadinessState = (node: CareerProfileGraphNode) => {
    if (node.progress >= 75) {
        return {
            label: 'Ready',
            chip: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
            dot: 'bg-emerald-500',
        };
    }

    if (node.progress > 0) {
        return {
            label: 'In progress',
            chip: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
            dot: 'bg-amber-500',
        };
    }

    return {
        label: 'Start',
        chip: 'border-stone-200 bg-stone-50 text-stone-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300',
        dot: 'bg-stone-400 dark:bg-slate-500',
    };
};

/**
 * Dashboard hierarchy: Resume and Mock Interviews are the two core loops
 * (users level up by drilling company mock interviews and sharpening the
 * resume), Job Tracker is the third pillar, everything else is secondary.
 */
const HERO_NODE_IDS: CareerProfileGraphNodeId[] = ['resume', 'interview'];
const TRACKER_NODE_ID: CareerProfileGraphNodeId = 'jobHistory';

const heroDisplay: Partial<Record<CareerProfileGraphNodeId, { title: string; subtitle: string }>> = {
    resume: { title: 'Resume', subtitle: 'Your base for every match and application.' },
    interview: { title: 'Mock Interviews', subtitle: 'Practice real company loops — coding, system design, behavioral — and raise your score.' },
    jobHistory: { title: 'Job Tracker', subtitle: 'Every saved role, application, and next step in one pipeline.' },
};

/** Large card for the two core areas: Resume and Mock Interviews. */
const HeroTile: React.FC<{
    node: CareerProfileGraphNode;
    isNext: boolean;
    /** Practice trend/weak-dimension insights (interview card only). */
    insights?: PracticeInsights;
    /** Override destination (e.g. deep link into the target company quest). */
    pathOverride?: string;
    actionLabelOverride?: string;
}> = ({ node, isNext, insights, pathOverride, actionLabelOverride }) => {
    const Icon = nodeIcons[node.id];
    const styles = toneStyles[node.tone];
    const state = getReadinessState(node);
    const display = heroDisplay[node.id];

    return (
        <button
            type="button"
            onClick={() => navigate(pathOverride ?? node.actionPath)}
            className={`group flex min-h-[200px] flex-col rounded-2xl border bg-white/95 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/60 dark:hover:bg-slate-950 ${isNext ? 'border-amber-300 ring-2 ring-amber-100 dark:border-amber-700 dark:ring-amber-900/30' : 'border-stone-200/80 dark:border-slate-800/80'} ${styles.border}`}
            aria-label={`${display?.title ?? node.label}: ${state.label}. ${node.actionLabel}`}
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
                    <Icon size={22} />
                </span>
                <div className="flex items-center gap-2">
                    {isNext && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                            Next
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${state.chip}`}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${state.dot}`} />
                        {state.label}
                    </span>
                </div>
            </div>

            <div className="mt-4 min-w-0 flex-1">
                <h3 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">{display?.title ?? node.label}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{display?.subtitle ?? node.detail}</p>
                <p className="mt-2 truncate text-xs font-bold text-slate-500 dark:text-slate-400">{node.value} · {node.detail}</p>

                {/* Skill-growth signals: score trend + weakest dimension */}
                {insights && insights.sessionsAnalyzed > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {insights.trend && (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black leading-none ${insights.trend.delta >= 0
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                                : 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                                {insights.trend.delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                {insights.trend.delta >= 0 ? '+' : ''}{insights.trend.delta} vs last 5
                            </span>
                        )}
                        {insights.weakestDimension && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-black leading-none text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                                <Target size={11} />
                                Weakest: {insights.weakestDimension.label} {insights.weakestDimension.score}%
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-900">
                    <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${node.progress}%` }} />
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 transition group-hover:gap-2.5 dark:text-primary-300">
                    {actionLabelOverride ?? node.actionLabel}
                    <ArrowRight size={15} />
                </span>
            </div>
        </button>
    );
};

/** Aggregates the latest report's "practice next" bullets onto the dashboard. */
const PracticeNextCard: React.FC<{ insights: PracticeInsights; practicePath: string }> = ({ insights, practicePath }) => (
    <div className="rounded-2xl border border-indigo-100 bg-white/85 p-4 dark:border-indigo-900/40 dark:bg-slate-950/55">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">
            <ListChecks size={13} /> Practice next
        </p>
        {insights.practiceNext.length > 0 ? (
            <ul className="space-y-1.5">
                {insights.practiceNext.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        <CircleDashed size={12} className="mt-1 shrink-0 text-indigo-500 dark:text-indigo-300" />
                        <span className="line-clamp-2">{item}</span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Finish one mock interview and your reviewer's specific improvement points will show up here after every session.
            </p>
        )}
        <button
            type="button"
            onClick={() => navigate(practicePath)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 transition hover:gap-2.5 dark:text-primary-300"
        >
            {insights.practiceNext.length ? 'Drill these in a new session' : 'Start your first session'}
            <ArrowRight size={13} />
        </button>
    </div>
);


/** Wide horizontal card for the Job Tracker — pillar #3. */
const TrackerTile: React.FC<{ node: CareerProfileGraphNode; isNext: boolean }> = ({ node, isNext }) => {
    const Icon = nodeIcons[node.id];
    const styles = toneStyles[node.tone];
    const state = getReadinessState(node);
    const display = heroDisplay[node.id];

    return (
        <button
            type="button"
            onClick={() => navigate(node.actionPath)}
            className={`group flex w-full items-center gap-4 rounded-2xl border bg-white/95 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/60 dark:hover:bg-slate-950 ${isNext ? 'border-amber-300 ring-2 ring-amber-100 dark:border-amber-700 dark:ring-amber-900/30' : 'border-stone-200/80 dark:border-slate-800/80'} ${styles.border}`}
            aria-label={`${display?.title ?? node.label}: ${state.label}. ${node.actionLabel}`}
        >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
                <Icon size={20} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">{display?.title ?? node.label}</h3>
                    {isNext && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                            Next
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${state.chip}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${state.dot}`} />
                        {state.label}
                    </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{node.value} · {node.detail}</p>
                <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-stone-100 dark:bg-slate-900">
                    <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${node.progress}%` }} />
                </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-primary-700 transition group-hover:gap-2.5 dark:text-primary-300">
                {node.actionLabel}
                <ArrowRight size={15} />
            </span>
        </button>
    );
};

/** Compact tile for the secondary areas (Skills, Goal progress, etc.). */
const CompactTile: React.FC<{ node: CareerProfileGraphNode; isNext: boolean }> = ({ node, isNext }) => {
    const Icon = nodeIcons[node.id];
    const styles = toneStyles[node.tone];
    const state = getReadinessState(node);

    return (
        <button
            type="button"
            onClick={() => navigate(node.actionPath)}
            className={`group flex items-center gap-2.5 rounded-xl border bg-white/80 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-white dark:bg-slate-950/45 dark:hover:bg-slate-950 ${isNext ? 'border-amber-300 ring-1 ring-amber-100 dark:border-amber-700 dark:ring-amber-900/30' : 'border-stone-200/70 dark:border-slate-800/70'} ${styles.border}`}
            aria-label={`${node.label}: ${state.label}. ${node.actionLabel}`}
        >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-xs font-extrabold text-slate-950 dark:text-white">{node.label}</h3>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${state.dot}`} title={state.label} />
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-900">
                    <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${node.progress}%` }} />
                </div>
            </div>
        </button>
    );
};

const goalStepStyles: Record<CareerProfileGoalStep['status'], {
    icon: string;
    chip: string;
    bar: string;
    label: string;
}> = {
    ready: {
        icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
        chip: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
        bar: 'bg-emerald-500',
        label: 'Ready',
    },
    building: {
        icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
        chip: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
        bar: 'bg-amber-500',
        label: 'Building',
    },
    start: {
        icon: 'bg-stone-100 text-stone-600 dark:bg-slate-900 dark:text-slate-300',
        chip: 'border-stone-200 bg-stone-50 text-stone-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300',
        bar: 'bg-stone-400 dark:bg-slate-500',
        label: 'Start',
    },
};

const GoalStepRow: React.FC<{ step: CareerProfileGoalStep }> = ({ step }) => {
    const styles = goalStepStyles[step.status];
    const Icon = step.status === 'ready' ? CheckCircle2 : CircleDashed;

    return (
        <button
            type="button"
            onClick={() => navigate(step.actionPath)}
            className="group w-full rounded-xl border border-stone-200/80 bg-white/80 p-3 text-left transition hover:border-stone-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/50 dark:hover:border-slate-700"
        >
            <div className="flex items-start gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
                    <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">{step.label}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{step.detail}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${styles.chip}`}>
                            {step.score}%
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-900">
                        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${step.score}%` }} />
                    </div>
                </div>
            </div>
        </button>
    );
};

const CareerProfileGraphCard: React.FC<CareerProfileGraphCardProps> = ({
    resumes,
    portfolios,
    practiceHistory,
    jobApplications,
}) => {
    const graph = useMemo(() => buildCareerProfileGraph({
        resumes,
        portfolios,
        practiceHistory,
        jobApplications,
    }), [jobApplications, portfolios, practiceHistory, resumes]);
    const readyCount = graph.nodes.filter((node) => node.progress >= 75).length;
    const buildingCount = graph.nodes.filter((node) => node.progress > 0 && node.progress < 75).length;
    const startCount = graph.nodes.filter((node) => node.progress === 0).length;

    // Deep-link Mock Interviews straight into the target company's quest
    // (the company interview loop) whenever a guide exists for it.
    const questSlug = useMemo(
        () => findQuestSlugForCompany(graph.roleGoal.company),
        [graph.roleGoal.company],
    );
    const practicePath = questSlug ? `/quest/${questSlug}` : '/interview-studio';
    const practiceLabel = questSlug ? `Practice the ${graph.roleGoal.company} loop` : undefined;

    return (
        <section className="mb-8" aria-labelledby="career-profile-graph-title">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                        <Network size={13} />
                        Setup map
                    </div>
                    <h2 id="career-profile-graph-title" className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                        Your job-search setup map
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        See which parts of CareerVivid are ready and what to set up next.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                        Profile settings
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(graph.nextBestStep.actionPath)}
                        className="inline-flex max-w-full items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-primary-700"
                    >
                        <span className="truncate">Next: {graph.nextBestStep.actionLabel}</span>
                        <ArrowRight size={15} />
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/35 sm:p-5">
                <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
                    <div className="grid gap-3">
                        <div className="rounded-2xl border border-stone-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/55">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div
                                        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full p-1"
                                        style={{ background: `conic-gradient(#4a4392 ${graph.completionScore * 3.6}deg, #e7e5e4 0deg)` }}
                                        aria-label={`CareerVivid setup ${graph.completionScore}% ready`}
                                    >
                                        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center dark:bg-slate-950">
                                            <span className="text-2xl font-black text-slate-950 dark:text-white">{graph.completionScore}%</span>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Ready</span>
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">
                                            Connected items
                                        </p>
                                        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                                            {graph.signalCount}
                                        </p>
                                        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                                            Strongest area: <span className="font-bold text-slate-800 dark:text-slate-100">{graph.strongestSignal}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 lg:w-[280px]">
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                                        <p className="text-lg font-black leading-none text-emerald-700 dark:text-emerald-200">{readyCount}</p>
                                        <p className="mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-200">Ready</p>
                                    </div>
                                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/25">
                                        <p className="text-lg font-black leading-none text-amber-700 dark:text-amber-200">{buildingCount}</p>
                                        <p className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-200">Building</p>
                                    </div>
                                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/80">
                                        <p className="text-lg font-black leading-none text-stone-700 dark:text-slate-200">{startCount}</p>
                                        <p className="mt-1 text-[10px] font-bold text-stone-600 dark:text-slate-300">Start</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Core loop: Resume + Mock Interviews (hero), Job Tracker (pillar #3) */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            {HERO_NODE_IDS.map((id) => {
                                const node = graph.nodes.find((n) => n.id === id);
                                if (!node) return null;
                                const isInterview = id === 'interview';
                                return (
                                    <HeroTile
                                        key={id}
                                        node={node}
                                        isNext={id === graph.nextBestStep.id}
                                        insights={isInterview ? graph.practiceInsights : undefined}
                                        pathOverride={isInterview ? practicePath : undefined}
                                        actionLabelOverride={isInterview ? practiceLabel : undefined}
                                    />
                                );
                            })}
                        </div>

                        {/* Improvement loop: what to drill next, from the latest report */}
                        <PracticeNextCard insights={graph.practiceInsights} practicePath={practicePath} />
                        {(() => {
                            const tracker = graph.nodes.find((n) => n.id === TRACKER_NODE_ID);
                            return tracker
                                ? <TrackerTile node={tracker} isNext={tracker.id === graph.nextBestStep.id} />
                                : null;
                        })()}

                        {/* Everything else, compact */}
                        <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">
                                More setup
                            </p>
                            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                                {graph.nodes
                                    .filter((node) => !HERO_NODE_IDS.includes(node.id) && node.id !== TRACKER_NODE_ID)
                                    .map((node) => (
                                        <CompactTile key={node.id} node={node} isNext={node.id === graph.nextBestStep.id} />
                                    ))}
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 dark:border-emerald-900/40 dark:bg-slate-950/55">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">Skills CareerVivid can match</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {graph.topSkills.length > 0
                                        ? graph.topSkills.slice(0, 6).map((skill) => <SignalChip key={skill} label={skill} className={toneStyles.emerald.chip} />)
                                        : <EmptyChip label="Add skills" />}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-violet-100 bg-white/85 p-4 dark:border-violet-900/40 dark:bg-slate-950/55">
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-slate-400">Roles CareerVivid can target</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {graph.targetRoles.length > 0
                                        ? graph.targetRoles.slice(0, 4).map((role) => <SignalChip key={role} label={role} className={toneStyles.violet.chip} />)
                                        : <EmptyChip label="Find roles" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                                    Target goal
                                </p>
                                <h3 className="mt-1 text-base font-extrabold text-slate-950 dark:text-white">
                                    {graph.roleGoal.title}
                                </h3>
                                <p className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
                                    {graph.roleGoal.subtitle}
                                </p>
                            </div>
                            <div
                                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full p-1"
                                style={{ background: `conic-gradient(#d99b3d ${graph.roleGoal.readinessScore * 3.6}deg, #ede6da 0deg)` }}
                                aria-label={`${graph.roleGoal.title} goal ${graph.roleGoal.readinessScore}% ready`}
                            >
                                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center dark:bg-slate-950">
                                    <span className="text-xl font-black text-slate-950 dark:text-white">{graph.roleGoal.readinessScore}%</span>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{graph.roleGoal.readinessLabel}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2">
                            {graph.roleGoal.steps.map((step) => (
                                <GoalStepRow key={step.id} step={step} />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate(graph.roleGoal.nextStep.actionPath)}
                            className="mt-4 inline-flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-stone-50 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-950"
                        >
                            {graph.roleGoal.nextStep.actionLabel}
                            <ArrowRight size={15} />
                        </button>
                    </aside>
                </div>
            </div>
        </section>
    );
};

export default CareerProfileGraphCard;
