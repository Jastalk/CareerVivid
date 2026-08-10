import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, ChevronDown, ClipboardList, Sparkles, Target } from 'lucide-react';
import { ApplicationStatus, JobApplicationData, NO_NEXT_ACTION } from '../../types';

/**
 * Whether the plan is expanded, remembered across visits.
 *
 * It is the right first thing to see when you do not know where to start, and
 * 173px in the way when you already do — which describes the same person on
 * different days. Rather than choosing for everyone, it opens by default and
 * remembers being closed.
 */
const COLLAPSE_KEY = 'cv_job_plan_collapsed';

interface TodayJobSearchPlanProps {
    applications: JobApplicationData[];
    onJobSelect: (job: JobApplicationData) => void;
}

const toTime = (value: any): number => {
    if (!value) return Number.MAX_SAFE_INTEGER;
    if (value.toDate && typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
};

const formatShortDate = (value: any): string => {
    const time = toTime(value);
    if (time === Number.MAX_SAFE_INTEGER) return '';
    return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getLatestMatchScore = (job: JobApplicationData): number | null => {
    const analyses = Object.values(job.matchAnalyses || {});
    if (!analyses.length) return null;
    return Math.round(analyses[0].matchPercentage);
};

const getPrepCompletion = (job: JobApplicationData): number => {
    const fields = [job.prep_RoleOverview, job.prep_MyStory, job.prep_InterviewPrep, job.prep_QuestionsForInterviewer, job.notes];
    return fields.filter(Boolean).length;
};

const hasAction = (job: JobApplicationData): boolean => Boolean(job.nextAction && job.nextAction !== NO_NEXT_ACTION);

const TodayJobSearchPlan: React.FC<TodayJobSearchPlanProps> = ({ applications, onJobSelect }) => {
    const todayPlan = useMemo(() => {
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const terminalStatuses: ApplicationStatus[] = ['Offered', 'Rejected'];
        const activeJobs = applications.filter(job => !terminalStatuses.includes(job.applicationStatus));

        const dueFollowUps = activeJobs
            .filter(job => hasAction(job) && toTime(job.nextActionDueDate) <= endOfToday.getTime())
            .sort((a, b) => toTime(a.nextActionDueDate) - toTime(b.nextActionDueDate));

        const plannedNextActions = activeJobs
            .filter(job => hasAction(job) && toTime(job.nextActionDueDate) > endOfToday.getTime())
            .sort((a, b) => toTime(a.nextActionDueDate) - toTime(b.nextActionDueDate) || toTime(b.updatedAt) - toTime(a.updatedAt));

        const highFitToApply = activeJobs
            .map(job => ({ job, score: getLatestMatchScore(job) }))
            .filter(({ job, score }) => job.applicationStatus === 'To Apply' && (score || 0) >= 75)
            .sort((a, b) => (b.score || 0) - (a.score || 0));

        const missingNextAction = activeJobs
            .filter(job => !hasAction(job))
            .sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));

        const interviewPrep = activeJobs
            .filter(job => job.applicationStatus === 'Interviewing' && getPrepCompletion(job) < 5)
            .sort((a, b) => getPrepCompletion(a) - getPrepCompletion(b));

        return {
            dueFollowUps,
            plannedNextActions,
            highFitToApply,
            missingNextAction,
            interviewPrep,
            items: [
                ...dueFollowUps.slice(0, 2).map(job => ({
                    id: `due-${job.id}`,
                    job,
                    eyebrow: formatShortDate(job.nextActionDueDate) || 'Due now',
                    title: job.nextAction || 'Follow up',
                    detail: `${job.jobTitle} at ${job.companyName}`,
                    tone: 'amber' as const,
                    icon: <CalendarClock size={15} />,
                })),
                ...plannedNextActions.slice(0, 2).map(job => ({
                    id: `next-${job.id}`,
                    job,
                    eyebrow: 'Next',
                    title: job.nextAction || 'Next action',
                    detail: `${job.jobTitle} at ${job.companyName}`,
                    tone: 'amber' as const,
                    icon: <ClipboardList size={15} />,
                })),
                ...highFitToApply.slice(0, 2).map(({ job, score }) => ({
                    id: `fit-${job.id}`,
                    job,
                    eyebrow: `${score}% match`,
                    // You tailor a resume *to* a role, not the role itself.
                    title: 'Good fit — apply or tailor your resume',
                    detail: `${job.jobTitle} at ${job.companyName}`,
                    tone: 'emerald' as const,
                    icon: <Target size={15} />,
                })),
                ...interviewPrep.slice(0, 1).map(job => ({
                    id: `prep-${job.id}`,
                    job,
                    eyebrow: `Prep ${getPrepCompletion(job)}/5`,
                    title: 'Finish interview prep',
                    detail: `${job.jobTitle} at ${job.companyName}`,
                    tone: 'blue' as const,
                    icon: <Sparkles size={15} />,
                })),
                ...missingNextAction.slice(0, 2).map(job => ({
                    id: `action-${job.id}`,
                    job,
                    eyebrow: job.applicationStatus,
                    title: 'Choose the next action',
                    detail: `${job.jobTitle} at ${job.companyName}`,
                    tone: 'slate' as const,
                    icon: <ClipboardList size={15} />,
                })),
            ].slice(0, 5),
        };
    }, [applications]);

    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        setIsCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    }, []);

    const toggleCollapsed = () => {
        setIsCollapsed((collapsed) => {
            const next = !collapsed;
            localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
            return next;
        });
    };

    /** How many candidate actions the 5-card cap left out. */
    const hiddenItemCount = Math.max(
        0,
        todayPlan.dueFollowUps.length
        + todayPlan.plannedNextActions.length
        + todayPlan.highFitToApply.length
        + todayPlan.interviewPrep.length
        + todayPlan.missingNextAction.length
        - todayPlan.items.length,
    );

    return (
        <section className="mt-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4" aria-label="Today job search plan">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <Sparkles size={16} />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-950 dark:text-gray-100">Today&apos;s plan</h2>
                        {/* Was: "Focus on due work, planned next actions, high-fit roles, and jobs
                            missing a clear next step." Four categories in one sentence is a spec,
                            not a subtitle — the list underneath already shows which is which. */}
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            What needs you today.
                        </p>
                    </div>
                </div>
                {/*
                  * The five category counters that stood here summarised the very
                  * cards printed underneath them, and three of the five normally
                  * read `0` — a row of zeroes is noise the eye still has to parse.
                  * The cards are the plan; all that is worth adding is whether any
                  * were left out.
                  */}
                <div className="flex shrink-0 items-center gap-3">
                    {hiddenItemCount > 0 && !isCollapsed && (
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            +{hiddenItemCount} more
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-expanded={!isCollapsed}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                        {isCollapsed ? `Show ${todayPlan.items.length}` : 'Hide'}
                        <ChevronDown size={14} className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>
            </div>

            {isCollapsed ? null : todayPlan.items.length ? (
                <div className="mt-3 grid gap-2 lg:grid-cols-5">
                    {todayPlan.items.map(item => {
                        const toneClass = item.tone === 'amber'
                            ? 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200'
                            : item.tone === 'emerald'
                                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200'
                                : item.tone === 'blue'
                                    ? 'border-blue-200 bg-blue-50/70 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200'
                                    : 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200';
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onJobSelect(item.job)}
                                className={`group min-w-0 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${toneClass}`}
                            >
                                <div className="flex items-center gap-2 text-[11px] font-bold">
                                    {item.icon}
                                    <span className="min-w-0 truncate">{item.eyebrow}</span>
                                    <ArrowRight size={13} className="ml-auto opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-90" />
                                </div>
                                <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug">{item.title}</p>
                                <p className="mt-1 truncate text-xs font-medium opacity-75">{item.detail}</p>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200 sm:flex-row sm:items-center">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <span className="font-semibold">Your active pipeline is clear. Save a role, add a follow-up, or prepare for the next interview.</span>
                </div>
            )}
        </section>
    );
};

export default TodayJobSearchPlan;
