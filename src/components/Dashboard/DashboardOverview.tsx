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
    PenTool,
    Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JobApplicationData, PracticeHistoryEntry, ResumeData, WhiteboardData } from '../../types';
import type { PortfolioData } from '../../features/portfolio/types/portfolio';
import { buildCareerProfileGraph } from '../../utils/careerProfileGraph';
import { navigate } from '../../utils/navigation';
import { formatRelativeTime } from '../../utils/relativeTime';
import '../Landing/live/liveLanding.css';

interface DashboardOverviewProps {
    resumes: ResumeData[];
    portfolios: PortfolioData[];
    practiceHistory: PracticeHistoryEntry[];
    jobApplications: JobApplicationData[];
    communityPostCount: number;
    onInterviewSelect: (entry: PracticeHistoryEntry) => void;
    /** Already loaded by the dashboard; the design quest reads its boards from here. */
    whiteboards?: WhiteboardData[];
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

type Accent = 'purple' | 'green' | 'amber';

const accentTokens: Record<Accent, { ink: string; soft: string }> = {
    purple: { ink: 'var(--cvl-purple)', soft: 'var(--cvl-purple-soft)' },
    green: { ink: 'var(--cvl-green)', soft: 'var(--cvl-green-soft)' },
    amber: { ink: 'var(--cvl-amber)', soft: 'var(--cvl-amber-soft)' },
};

const stepTone = (status: 'ready' | 'building' | 'start') => {
    if (status === 'ready') return { background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' };
    if (status === 'building') return { background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' };
    return { background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' };
};

const Eyebrow: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
    <p id={id} className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
        {children}
    </p>
);

/** The window chrome, with the filename that names what is inside it. */
const WindowBar: React.FC<{ filename: string; accent?: Accent }> = ({ filename, accent }) => (
    <div
        className="cvl-bar"
        style={accent
            ? { backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${accentTokens[accent].ink} 20%, transparent), transparent 65%)` }
            : undefined}
    >
        <span className="cvl-dot cvl-dot-r" />
        <span className="cvl-dot cvl-dot-y" />
        <span className="cvl-dot cvl-dot-g" />
        <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>{filename}</span>
    </div>
);

interface PrimaryWindow {
    id: string;
    filename: string;
    eyebrow: string;
    icon: LucideIcon;
    accent: Accent;
    title: string;
    blurb: string;
    /** The user's own state, when they have any. Null is the invitation. */
    state: { label: string; meta: string; badge?: string } | null;
    actionLabel: string;
    actionPath: string;
}

/**
 * One of the three things the site sells, showing this user's real state and
 * offering exactly one way forward.
 */
const PrimaryCard: React.FC<{ card: PrimaryWindow }> = ({ card }) => {
    const { ink, soft } = accentTokens[card.accent];
    const Icon = card.icon;
    return (
        <article className="cvl-win cvl-win-lift flex flex-col" aria-labelledby={`${card.id}-title`}>
            <WindowBar filename={card.filename} accent={card.accent} />
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2.5">
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: soft, color: ink }}
                    >
                        <Icon size={16} aria-hidden="true" />
                    </span>
                    <Eyebrow>{card.eyebrow}</Eyebrow>
                </div>

                <h2 id={`${card.id}-title`} className="mt-3 text-[19px] font-semibold leading-snug tracking-tight">
                    {card.title}
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                    {card.blurb}
                </p>

                <div className="mt-4 flex-1">
                    {card.state ? (
                        <div
                            className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
                            style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-semibold">{card.state.label}</span>
                                <span className="cvl-mono mt-0.5 block truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                    {card.state.meta}
                                </span>
                            </span>
                            {card.state.badge && (
                                <span
                                    className="cvl-mono shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
                                    style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                                >
                                    {card.state.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div
                            className="rounded-xl border border-dashed px-3.5 py-3"
                            style={{ borderColor: 'var(--cvl-line)' }}
                        >
                            <span className="cvl-mono text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                nothing here yet — takes about ten minutes
                            </span>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => navigate(card.actionPath)}
                    className="cvl-cta mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold transition"
                >
                    {card.actionLabel}
                    <ArrowRight size={15} aria-hidden="true" />
                </button>
            </div>
        </article>
    );
};

/**
 * The signed-in front door. It leads with the same three things the public page
 * sells — a design quest, the resume editor, a voice round — each showing this
 * user's real state. Numbers, next steps and the workspace collections are all
 * still here, below, where they belong once you know what to do today.
 */
const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    resumes,
    portfolios,
    practiceHistory,
    jobApplications,
    communityPostCount,
    onInterviewSelect,
    whiteboards = [],
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

    // --- the three primary windows, all read from data already on the page ---

    /** A quest whose whiteboard round was started and not finished. */
    const latestDesignQuest = useMemo(() => {
        const started = practiceHistory
            .map((entry) => {
                const drafts = Object.values(entry.activeSystemDesignDrafts || {});
                if (!drafts.length) return null;
                const touched = Math.max(
                    ...drafts.map((draft) => Number(draft?.updatedAt) || 0),
                    toMillis(entry.timestamp),
                );
                return { entry, touched };
            })
            .filter((item): item is { entry: PracticeHistoryEntry; touched: number } => item !== null);

        return started.sort((a, b) => b.touched - a.touched)[0] || null;
    }, [practiceHistory]);

    const latestWhiteboard = useMemo(
        () => [...whiteboards].sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))[0] || null,
        [whiteboards],
    );

    const latestResume = useMemo(
        () => [...resumes].sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))[0] || null,
        [resumes],
    );

    const latestSession = recentInterviews[0] || null;
    const latestSessionScore = latestSession ? getBestScore(latestSession) : null;

    const questCard: PrimaryWindow = (() => {
        const base = { id: 'quest', filename: 'quest-log', eyebrow: 'system design', icon: PenTool, accent: 'purple' as const };
        const boardIsNewer = latestWhiteboard
            && (!latestDesignQuest || toMillis(latestWhiteboard.updatedAt) > latestDesignQuest.touched);

        if (latestDesignQuest && !boardIsNewer) {
            const { entry, touched } = latestDesignQuest;
            return {
                ...base,
                title: 'continue a quest',
                blurb: 'Your board is where you left it. Submit the design and the Career Agent names what is missing.',
                state: {
                    label: entry.job?.title || 'System design round',
                    meta: `${entry.job?.company ? `${entry.job.company} · ` : ''}${formatDate(touched || entry.timestamp)}`,
                },
                actionLabel: 'Continue the quest',
                actionPath: '/interview-studio',
            };
        }

        if (latestWhiteboard) {
            return {
                ...base,
                title: 'continue a quest',
                blurb: 'Your board is where you left it. Submit the design and the Career Agent names what is missing.',
                state: {
                    label: latestWhiteboard.title || 'Untitled whiteboard',
                    meta: `edited ${formatRelativeTime(latestWhiteboard.updatedAt)}`,
                },
                actionLabel: 'Open the board',
                actionPath: `/whiteboard/${latestWhiteboard.id}`,
            };
        }

        return {
            ...base,
            title: 'draw it, get told what is wrong',
            blurb: 'Sketch the system on a whiteboard. The Career Agent asks about the parts you skipped, then scores coverage, trade-offs, and clarity.',
            state: null,
            actionLabel: 'Start a quest',
            actionPath: '/interview-studio',
        };
    })();

    const resumeCard: PrimaryWindow = latestResume
        ? {
            id: 'resume',
            filename: 'resume',
            eyebrow: 'resume editor',
            icon: FileText,
            accent: 'green',
            title: 'your resume',
            blurb: 'Paste the posting you are chasing and the editor rewrites your bullets against it, then scores the result.',
            state: {
                label: latestResume.title || 'Untitled resume',
                meta: `${latestResume.personalDetails?.jobTitle ? `${latestResume.personalDetails.jobTitle} · ` : ''}edited ${formatRelativeTime(latestResume.updatedAt) || 'recently'}`,
            },
            actionLabel: 'Open the editor',
            actionPath: `/edit/${latestResume.id}`,
        }
        : {
            id: 'resume',
            filename: 'resume',
            eyebrow: 'resume editor',
            icon: FileText,
            accent: 'green',
            title: 'rewritten against the job you want',
            blurb: 'Paste the posting. Weak bullets get replaced with the version that carries evidence, and the match score moves while you watch.',
            state: null,
            actionLabel: 'Build your resume',
            actionPath: '/newresume',
        };

    const interviewCard: PrimaryWindow = latestSession
        ? {
            id: 'interview',
            filename: 'mock-round.wav',
            eyebrow: 'interview studio',
            icon: Mic,
            accent: 'amber',
            title: 'your last round',
            blurb: 'Another round takes about ten minutes and ends in a scored report you can reopen.',
            state: {
                label: latestSession.job?.title || 'Interview practice',
                meta: `${latestSession.job?.company ? `${latestSession.job.company} · ` : ''}${formatDate(latestSession.timestamp)}`,
                badge: latestSessionScore !== null ? `${latestSessionScore}%` : undefined,
            },
            actionLabel: 'Practice again',
            actionPath: '/interview-studio',
        }
        : {
            id: 'interview',
            filename: 'mock-round.wav',
            eyebrow: 'interview studio',
            icon: Mic,
            accent: 'amber',
            title: 'talk it through, it talks back',
            blurb: 'A live voice interviewer asks the follow-up you were hoping to avoid, then scores the answer on clarity, depth, and signal.',
            state: null,
            actionLabel: 'Start a round',
            actionPath: '/interview-studio',
        };

    const primaryCards = [questCard, resumeCard, interviewCard];

    // --- everything below is the old overview, kept and demoted ---

    const metrics = [
        { label: 'Resumes', value: resumes.length, icon: FileText, path: '/newresume', accent: 'green' as Accent },
        { label: 'Active jobs', value: activeJobCount, icon: Briefcase, path: '/job-tracker', accent: 'amber' as Accent },
        { label: 'Interviews', value: practiceHistory.length, icon: Mic, path: '/interview-studio', accent: 'purple' as Accent },
        { label: 'Portfolio sites', value: portfolios.length, icon: Globe, path: '/portfolio', accent: 'green' as Accent },
        { label: 'Community posts', value: communityPostCount, icon: MessageSquare, path: '/community', accent: 'amber' as Accent },
    ];
    const { roleGoal, nextBestStep } = profile;
    const todayStep = roleGoal.nextStep || nextBestStep;

    return (
        <div className="space-y-10">
            <section aria-labelledby="primary-work-heading">
                <Eyebrow id="primary-work-heading">start here</Eyebrow>
                <div className="mt-3 grid gap-4 lg:grid-cols-3 lg:gap-5">
                    {primaryCards.map((card) => <PrimaryCard key={card.id} card={card} />)}
                </div>
            </section>

            <section className="space-y-4" aria-label="Your job search">
                <Eyebrow>where you are</Eyebrow>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:gap-5">
                    <article className="cvl-win flex flex-col">
                        <WindowBar filename="next-step" />
                        <div className="flex flex-1 flex-col p-5">
                            <div className="flex h-full flex-col items-start sm:flex-row sm:gap-5">
                                <span
                                    className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:mb-0"
                                    style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                >
                                    <Target size={22} aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <Eyebrow>Today's next step</Eyebrow>
                                    <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight">
                                        {todayStep.label}
                                    </h2>
                                    <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                        {todayStep.detail}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate(todayStep.actionPath)}
                                        className="cvl-cta mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition"
                                    >
                                        {todayStep.actionLabel}
                                        <ArrowRight size={15} aria-hidden="true" />
                                    </button>
                                    <p className="cvl-mono mt-3 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                        {roleGoal.title}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="cvl-win flex flex-col">
                        <WindowBar filename="readiness" />
                        <div className="flex flex-1 flex-col p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <Eyebrow>Target role readiness</Eyebrow>
                                    <h2 className="mt-2 line-clamp-2 break-words text-[17px] font-semibold leading-snug xl:truncate">
                                        {roleGoal.title}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/job-tracker')}
                                    className="shrink-0 rounded-lg border px-3 py-2 text-[12px] font-semibold transition hover:opacity-80"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-ink)' }}
                                >
                                    View role
                                </button>
                            </div>
                            <div className="mt-6 flex items-end gap-2">
                                <span className="text-4xl font-bold leading-none tracking-tight" style={{ color: 'var(--cvl-purple)' }}>
                                    {roleGoal.readinessScore}%
                                </span>
                                <span className="pb-0.5 text-[13px] font-semibold" style={{ color: 'var(--cvl-muted)' }}>
                                    {roleGoal.readinessLabel}
                                </span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--cvl-chrome)' }}>
                                <div
                                    className="h-full rounded-full transition-[width] duration-500"
                                    style={{ width: `${roleGoal.readinessScore}%`, background: 'var(--cvl-purple)' }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(roleGoal.nextStep.actionPath)}
                                className="mt-5 flex w-full items-center gap-3 border-t pt-4 text-left"
                                style={{ borderColor: 'var(--cvl-line)' }}
                            >
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                    style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                >
                                    <CheckCircle2 size={17} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13.5px] font-semibold">{roleGoal.nextStep.label}</span>
                                    <span className="mt-0.5 block truncate text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                                        {roleGoal.nextStep.detail}
                                    </span>
                                </span>
                                <ChevronRight size={18} className="shrink-0" style={{ color: 'var(--cvl-faint)' }} aria-hidden="true" />
                            </button>
                        </div>
                    </article>
                </div>

                <section className="cvl-win" aria-labelledby="dashboard-metrics-heading">
                    <WindowBar filename="numbers" />
                    <div className="p-5">
                        {/* The page subtitle already says "your job search at a glance" — repeating
                            it as the section heading told the reader nothing new. */}
                        <h2 id="dashboard-metrics-heading" className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                            Your numbers
                        </h2>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                            {metrics.map(({ label, value, icon: Icon, path, accent }) => (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={() => navigate(path)}
                                    className="rounded-xl border p-4 text-left transition hover:-translate-y-0.5"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                                >
                                    <span
                                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                                        style={{ background: accentTokens[accent].soft, color: accentTokens[accent].ink }}
                                    >
                                        <Icon size={16} aria-hidden="true" />
                                    </span>
                                    <span className="mt-3 block text-[12px] font-semibold" style={{ color: 'var(--cvl-muted)' }}>{label}</span>
                                    <span className="mt-1 block text-3xl font-bold leading-none tracking-tight">{value}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
                    <section className="cvl-win" aria-labelledby="setup-map-heading">
                        <WindowBar filename="next-steps" />
                        <div className="p-5">
                            <div className="flex items-center justify-between gap-4">
                                {/* "Setup map" named the mechanism; this names what the reader gets. */}
                                <h2 id="setup-map-heading" className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                                    Your next steps
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => navigate('/job-tracker')}
                                    className="text-[12px] font-semibold transition hover:opacity-80"
                                    style={{ color: 'var(--cvl-purple)' }}
                                >
                                    All jobs
                                </button>
                            </div>
                            <ol className="mt-2">
                                {roleGoal.steps.slice(0, 3).map((step, index) => (
                                    <li key={step.id} className="border-t first:border-t-0" style={{ borderColor: 'var(--cvl-line)' }}>
                                        <button
                                            type="button"
                                            onClick={() => navigate(step.actionPath)}
                                            className="flex w-full items-center gap-3 py-3 text-left"
                                        >
                                            <span
                                                className="cvl-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                                                style={stepTone(step.status)}
                                            >
                                                {index + 1}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[13.5px] font-semibold">{step.label}</span>
                                                <span className="mt-0.5 block truncate text-[12px]" style={{ color: 'var(--cvl-muted)' }}>{step.detail}</span>
                                            </span>
                                            <ChevronRight size={17} className="shrink-0" style={{ color: 'var(--cvl-faint)' }} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    <section className="cvl-win" aria-labelledby="recent-interviews-heading">
                        <WindowBar filename="sessions" />
                        <div className="p-5">
                            <div className="flex items-center justify-between gap-4">
                                <h2 id="recent-interviews-heading" className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                                    Recent interview sessions
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => navigate('/interview-studio')}
                                    className="text-[12px] font-semibold transition hover:opacity-80"
                                    style={{ color: 'var(--cvl-purple)' }}
                                >
                                    All sessions
                                </button>
                            </div>
                            {recentInterviews.length ? (
                                <ul className="mt-2">
                                    {recentInterviews.map((entry) => {
                                        const score = getBestScore(entry);
                                        return (
                                            <li key={entry.id} className="border-t first:border-t-0" style={{ borderColor: 'var(--cvl-line)' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => entry.interviewHistory?.length ? onInterviewSelect(entry) : navigate('/interview-studio')}
                                                    className="flex w-full items-center gap-3 py-3 text-left"
                                                >
                                                    <span
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                                    >
                                                        <Mic size={17} aria-hidden="true" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13.5px] font-semibold">{entry.job?.title || 'Interview practice'}</span>
                                                        <span className="mt-0.5 block truncate text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
                                                            {entry.job?.company ? `${entry.job.company} · ` : ''}{formatDate(entry.timestamp)}
                                                        </span>
                                                    </span>
                                                    {score !== null && (
                                                        <span
                                                            className="cvl-mono rounded-md px-2 py-1 text-[11px] font-bold"
                                                            style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                                                        >
                                                            {score}%
                                                        </span>
                                                    )}
                                                    <ChevronRight size={17} className="shrink-0" style={{ color: 'var(--cvl-faint)' }} aria-hidden="true" />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div
                                    className="mt-4 rounded-xl border border-dashed p-4"
                                    style={{ borderColor: 'var(--cvl-line)' }}
                                >
                                    <p className="text-[13.5px] font-semibold">No interview sessions yet</p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/interview-studio')}
                                        className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold transition hover:opacity-80"
                                        style={{ color: 'var(--cvl-purple)' }}
                                    >
                                        Start practice <ArrowRight size={13} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
};

export default DashboardOverview;
