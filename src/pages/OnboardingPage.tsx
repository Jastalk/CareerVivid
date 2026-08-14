import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    ArrowRight,
    Briefcase,
    Building2,
    CheckCircle2,
    ExternalLink,
    FileText,
    Import,
    LayoutDashboard,
    Loader2,
    MapPin,
    Mic,
    PenTool,
    Wand2,
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { useJobTracker } from '../hooks/useJobTracker';
import { usePracticeHistory } from '../hooks/useJobHistory';
import { useResumes } from '../hooks/useResumes';
import { getUserJobHistory } from '../services/jobHistoryService';
import { JobApplicationData, JobPosting } from '../types';
import { navigate } from '../utils/navigation';
import '../components/Landing/live/liveLanding.css';

type StepState = 'complete' | 'active' | 'locked';
type WelcomeJobSource = 'tracker' | 'saved';

type WelcomeJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    sourceUrl: string;
    sourceLabel: WelcomeJobSource;
};

const primaryButtonClass = 'cvl-cta inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold transition';
const secondaryButtonClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition hover:opacity-90';
const secondaryButtonStyle: React.CSSProperties = {
    borderColor: 'var(--cvl-line)',
    background: 'var(--cvl-paper)',
    color: 'var(--cvl-ink)',
};

const eyebrowClass = 'cvl-mono text-[11px] uppercase tracking-[0.18em]';
const eyebrowStyle: React.CSSProperties = { color: 'var(--cvl-faint)' };

const statusCopy: Record<StepState, string> = {
    complete: 'done',
    active: 'start here',
    locked: 'next',
};

/** Each state has one border, one wash, one ink. Nothing else changes. */
const stepTone: Record<StepState, { line: string; wash: string; ink: string }> = {
    complete: { line: 'var(--cvl-green)', wash: 'var(--cvl-green-soft)', ink: 'var(--cvl-green)' },
    active: { line: 'var(--cvl-purple)', wash: 'var(--cvl-purple-soft)', ink: 'var(--cvl-purple)' },
    locked: { line: 'var(--cvl-line)', wash: 'var(--cvl-paper-2)', ink: 'var(--cvl-faint)' },
};

const cleanText = (value: string | undefined, fallback: string) => {
    const trimmed = value?.trim();
    return trimmed || fallback;
};

const normalizeTrackerJob = (job: JobApplicationData): WelcomeJob => ({
    id: job.id,
    title: cleanText(job.jobTitle, 'Saved role'),
    company: cleanText(job.companyName, 'Company not specified'),
    location: cleanText(job.location, 'Location not specified'),
    description: cleanText(job.jobDescription || job.prep_RoleOverview, ''),
    sourceUrl: cleanText(job.jobPostURL || job.applicationURL, ''),
    sourceLabel: 'tracker',
});

const normalizeSavedJob = (job: JobPosting): WelcomeJob => ({
    id: job.id,
    title: cleanText(job.jobTitle, 'Saved role'),
    company: cleanText(job.companyName, 'Company not specified'),
    location: cleanText(job.location, 'Location not specified'),
    description: cleanText(job.description, ''),
    sourceUrl: cleanText(job.externalUrl || job.applyUrl || (job as JobPosting & { url?: string }).url, ''),
    sourceLabel: 'saved',
});

const truncateDescription = (value: string) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return 'No description attached yet. Paste the posting text and tailoring, match review, and interview prep all get sharper.';
    return normalized.length > 210 ? `${normalized.slice(0, 207)}...` : normalized;
};

/** Every panel on this page is a window on the desk. */
const Win: React.FC<{
    filename: string;
    className?: string;
    bodyClassName?: string;
    children: React.ReactNode;
}> = ({ filename, className = '', bodyClassName = 'p-5', children }) => (
    <div className={`cvl-win ${className}`}>
        <div className="cvl-bar">
            <span className="cvl-dot cvl-dot-r" />
            <span className="cvl-dot cvl-dot-y" />
            <span className="cvl-dot cvl-dot-g" />
            <span className="cvl-mono truncate text-[11px]" style={eyebrowStyle}>{filename}</span>
        </div>
        <div className={bodyClassName}>{children}</div>
    </div>
);

const QuickMetric = ({ label, value }: { label: string; value: string | number }) => (
    <div
        className="rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
    >
        <p className={eyebrowClass} style={eyebrowStyle}>{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px]"
        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
    >
        {children}
    </span>
);

const OnboardingStep = ({
    step,
    title,
    description,
    state,
}: {
    step: string;
    title: string;
    description: string;
    state: StepState;
}) => {
    const tone = stepTone[state];
    const isComplete = state === 'complete';

    return (
        <div
            className="rounded-xl border px-4 py-3 transition"
            style={{ borderColor: tone.line, background: tone.wash }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="cvl-mono mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[13px] font-semibold"
                    style={{ borderColor: tone.line, background: 'var(--cvl-paper)', color: tone.ink }}
                >
                    {isComplete ? <CheckCircle2 size={17} /> : step}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14.5px] font-semibold">{title}</h3>
                        <span
                            className="cvl-mono rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]"
                            style={{ background: 'var(--cvl-paper)', color: tone.ink }}
                        >
                            {statusCopy[state]}
                        </span>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-6" style={{ color: 'var(--cvl-muted)' }}>{description}</p>
                </div>
            </div>
        </div>
    );
};

const PathCard = ({
    icon,
    filename,
    eyebrow,
    title,
    description,
    checklist,
    cta,
    secondaryCta,
    onPrimary,
    onSecondary,
}: {
    icon: React.ReactNode;
    filename: string;
    eyebrow: string;
    title: string;
    description: string;
    checklist: string[];
    cta: string;
    secondaryCta?: string;
    onPrimary: () => void;
    onSecondary?: () => void;
}) => (
    <Win filename={filename} className="cvl-win-lift flex h-full flex-col" bodyClassName="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className={eyebrowClass} style={eyebrowStyle}>{eyebrow}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
            </div>
            <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-purple)' }}
            >
                {icon}
            </div>
        </div>
        <p className="mt-3 text-[14px] leading-6" style={{ color: 'var(--cvl-muted)' }}>{description}</p>
        <div className="mt-5 space-y-2.5">
            {checklist.map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-[13.5px]">
                    <CheckCircle2 size={15} className="mt-[3px] shrink-0" style={{ color: 'var(--cvl-green)' }} />
                    <span>{item}</span>
                </div>
            ))}
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-6">
            <button type="button" onClick={onPrimary} className={primaryButtonClass}>
                {cta}
                <ArrowRight size={16} />
            </button>
            {secondaryCta && onSecondary && (
                <button type="button" onClick={onSecondary} className={secondaryButtonClass} style={secondaryButtonStyle}>
                    {secondaryCta}
                </button>
            )}
        </div>
    </Win>
);

const OnboardingPage: React.FC = () => {
    const { currentUser, userProfile } = useAuth();
    const { resumes, isLoading: isLoadingResumes } = useResumes();
    const { jobApplications, isLoading: isLoadingJobs } = useJobTracker();
    const { practiceHistory, isLoading: isLoadingPractice } = usePracticeHistory();
    const [savedJobs, setSavedJobs] = useState<JobPosting[]>([]);
    const [isLoadingSavedJobs, setIsLoadingSavedJobs] = useState(false);

    const primaryResume = resumes[0];
    const hasResume = resumes.length > 0;
    const hasJob = jobApplications.length > 0;
    const hasPractice = practiceHistory.length > 0;
    const firstName = userProfile?.displayName?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'there';
    const routeParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const storedFocusedJobId = typeof window !== 'undefined' ? window.sessionStorage.getItem('cv_last_welcome_job_id') : '';
    const focusedJobId = routeParams.get('jobId') || routeParams.get('job') || storedFocusedJobId || '';

    const resumeTarget = primaryResume?.id ? `/edit/${primaryResume.id}` : '/newresume?scrollTo=create-section';
    const tailorTarget = primaryResume?.id ? `/edit/${primaryResume.id}?source=onboarding_tailor` : '/newresume?scrollTo=create-section';
    const firstTailorTarget = hasResume && hasJob ? tailorTarget : hasResume ? '/jobs/recommend' : '/newresume?scrollTo=create-section';
    const isLoadingWorkspace = isLoadingResumes || isLoadingJobs || isLoadingPractice;
    const isLoadingJobContext = isLoadingJobs || isLoadingSavedJobs;

    useEffect(() => {
        let isMounted = true;

        const loadSavedJobs = async () => {
            if (!currentUser?.uid) {
                setSavedJobs([]);
                setIsLoadingSavedJobs(false);
                return;
            }

            setIsLoadingSavedJobs(true);
            try {
                const history = await getUserJobHistory(currentUser.uid);
                if (isMounted) setSavedJobs(history);
            } catch (error) {
                if (import.meta.env.DEV) {
                    console.debug('Error loading onboarding saved job history:', error);
                }
                if (isMounted) setSavedJobs([]);
            } finally {
                if (isMounted) setIsLoadingSavedJobs(false);
            }
        };

        loadSavedJobs();
        return () => {
            isMounted = false;
        };
    }, [currentUser?.uid]);

    const featuredJob = useMemo(() => {
        const focusedTrackerJob = focusedJobId ? jobApplications.find(job => job.id === focusedJobId) : undefined;
        if (focusedTrackerJob) return normalizeTrackerJob(focusedTrackerJob);

        const trackerJob = jobApplications[0];
        if (trackerJob) return normalizeTrackerJob(trackerJob);

        const savedJob = savedJobs[0];
        if (savedJob) return normalizeSavedJob(savedJob);

        return null;
    }, [focusedJobId, jobApplications, savedJobs]);

    const storeTailorTransit = () => {
        if (!featuredJob) return;
        sessionStorage.setItem('transit_resume_tailor', JSON.stringify({ scrapeId: '', fallbackDescription: '' }));
        sessionStorage.setItem('transit_resume_tailor_data', JSON.stringify({ description: featuredJob.description }));
        sessionStorage.setItem('jobTitleForOptimization', featuredJob.title);
        sessionStorage.setItem('jobCompanyForOptimization', featuredJob.company);
    };

    const openTailoredResume = () => {
        if (!featuredJob || !primaryResume) {
            navigate('/newresume?scrollTo=create-section');
            return;
        }

        storeTailorTransit();
        navigate(`/edit/${primaryResume.id}?source=onboarding_tailor`);
    };

    const openSourceJob = () => {
        if (featuredJob?.sourceUrl) {
            window.open(featuredJob.sourceUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const steps = useMemo(() => (
        [
            {
                step: '1',
                title: 'Build or import your resume',
                description: 'Drop in a PDF or start one in the editor. Everything else on the site reads from it.',
                state: hasResume ? 'complete' : 'active',
            },
            {
                step: '2',
                title: 'Run one graded round',
                description: 'Draw a system on the whiteboard, or say an answer out loud. Either one ends in a scored report.',
                state: !hasResume ? 'locked' : hasPractice ? 'complete' : 'active',
            },
            {
                step: '3',
                title: 'Attach the role you are chasing',
                description: 'Save one job from Chrome or the tracker, so the rounds have a real posting to aim at.',
                state: !hasResume ? 'locked' : hasJob ? 'complete' : 'active',
            },
            {
                step: '4',
                title: 'Tailor the resume to it',
                description: 'The editor rewrites your bullets against that posting and scores the result before you apply.',
                state: hasResume && hasJob ? 'complete' : 'locked',
            },
        ] as Array<{ step: string; title: string; description: string; state: StepState }>
    ), [hasJob, hasPractice, hasResume]);

    const completedCount = steps.filter((item) => item.state === 'complete').length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    return (
        <AppLayout>
            <Helmet>
                <title>Quick Start Onboarding | CareerVivid</title>
                <meta name="robots" content="noindex,nofollow" />
            </Helmet>
            <div className="cvl min-h-screen px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-screen-2xl">
                    <header
                        className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between"
                        style={{ borderColor: 'var(--cvl-line)' }}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="hidden h-12 w-12 items-center justify-center rounded-xl border sm:flex"
                                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}
                            >
                                <Logo className="h-8 w-8" />
                            </div>
                            <div>
                                <p className={eyebrowClass} style={eyebrowStyle}>first ten minutes</p>
                                <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                                    The first four moves.
                                </h1>
                                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                    Hi {firstName}. Get your resume in, run one graded round, attach the role you are
                                    chasing, then tailor the resume to it. The rest of the workspace follows from those.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={() => navigate('/dashboard')} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                <LayoutDashboard size={16} />
                                Dashboard
                            </button>
                            <button type="button" onClick={() => navigate('/newresume?scrollTo=create-section')} className={primaryButtonClass}>
                                <Import size={16} />
                                Import resume
                            </button>
                        </div>
                    </header>

                    <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.55fr)]">
                        <Win filename="workspace-readiness.log">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className={eyebrowClass} style={eyebrowStyle}>where you are</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                                        {isLoadingWorkspace ? 'Checking your workspace...' : `${completedCount} of ${steps.length} steps done`}
                                    </h2>
                                    <p className="mt-2 text-[14px] leading-6" style={{ color: 'var(--cvl-muted)' }}>
                                        Short on purpose: a resume, one graded round, one real job. The rest is optional until you want it.
                                    </p>
                                </div>
                                <div className="w-full max-w-xs">
                                    <div className="cvl-mono flex items-center justify-between text-[11px]" style={{ color: 'var(--cvl-faint)' }}>
                                        <span>readiness</span>
                                        <span className="tabular-nums">{progressPercent}%</span>
                                    </div>
                                    <div
                                        className="mt-2 h-3 overflow-hidden rounded-full border"
                                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                                    >
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{ width: `${progressPercent}%`, background: 'var(--cvl-purple)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-4">
                                <QuickMetric label="resumes" value={isLoadingResumes ? '...' : resumes.length} />
                                <QuickMetric label="saved roles" value={isLoadingJobs ? '...' : jobApplications.length} />
                                <QuickMetric label="rounds run" value={isLoadingPractice ? '...' : practiceHistory.length} />
                                <QuickMetric label="next up" value={hasResume ? (hasPractice ? 'review' : 'practice') : 'resume'} />
                            </div>
                        </Win>

                        <Win filename="next-steps.md">
                            <p className={eyebrowClass} style={eyebrowStyle}>your steps</p>
                            <div className="mt-4 space-y-3">
                                {steps.map((item) => (
                                    <OnboardingStep key={item.step} {...item} />
                                ))}
                            </div>
                        </Win>
                    </section>

                    <section className="mt-6 grid gap-4 lg:grid-cols-3">
                        <PathCard
                            filename="base-resume.md"
                            eyebrow="step one"
                            icon={<FileText size={21} />}
                            title="Get the resume in."
                            description="One base resume every tailored version starts from. Import the PDF you already have, or write it here."
                            checklist={[
                                'Import PDF, text, or markdown',
                                'Check profile, experience, skills, links',
                                'Reopen it whenever a role needs tailoring',
                            ]}
                            cta={hasResume ? 'Open resume editor' : 'Create base resume'}
                            secondaryCta="View dashboard"
                            onPrimary={() => navigate(resumeTarget)}
                            onSecondary={() => navigate('/dashboard')}
                        />
                        <PathCard
                            filename="system-design.quest"
                            eyebrow="step two"
                            icon={<PenTool size={21} />}
                            title="Draw the system."
                            description="A whiteboard round from a real company loop. You design it, the coach probes what you left out, and the diagram gets scored."
                            checklist={[
                                'Whiteboard the design, no multiple choice',
                                'Follow-ups on the parts you skipped',
                                'Scored on coverage, trade-offs, and clarity',
                            ]}
                            cta="Start a quest"
                            secondaryCta={hasJob ? 'Open job tracker' : 'Find a target job'}
                            onPrimary={() => navigate('/interview-studio')}
                            onSecondary={() => navigate(hasJob ? '/job-tracker' : '/jobs/recommend')}
                        />
                        <PathCard
                            filename="voice-round.mov"
                            eyebrow="step three"
                            icon={<Mic size={21} />}
                            title="Talk it through."
                            description="A live voice interviewer asks the follow-up you were hoping to avoid, then scores the answer on clarity, depth, and signal."
                            checklist={[
                                'Behavioural, technical, mixed, or screening',
                                'Your resume and saved role as context',
                                'A transcript and a scored report after',
                            ]}
                            cta="Start a voice round"
                            onPrimary={() => navigate('/interview-studio')}
                        />
                    </section>

                    <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.64fr)_minmax(360px,0.46fr)]">
                        <Win filename="first-packet.md">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className={eyebrowClass} style={eyebrowStyle}>after the first three</p>
                                    <h2 className="mt-2 text-xl font-semibold tracking-tight">One job, all the way through.</h2>
                                </div>
                                <button type="button" onClick={() => navigate(firstTailorTarget)} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                    <Wand2 size={16} />
                                    Resume tailoring
                                </button>
                            </div>
                            <div className="mt-5 grid gap-3 md:grid-cols-3">
                                {[
                                    {
                                        icon: <Briefcase size={18} />,
                                        title: 'Attach',
                                        copy: 'Save one role from Chrome or add it by hand, so the description travels with it.',
                                        action: 'Save or find a job',
                                        path: hasJob ? '/job-tracker' : '/jobs/recommend',
                                    },
                                    {
                                        icon: <Wand2 size={18} />,
                                        title: 'Tailor',
                                        copy: 'The editor rewrites the summary, the strongest bullets, and the skills against that posting.',
                                        action: hasResume && hasJob ? 'Open tailor flow' : 'Attach a target job',
                                        path: firstTailorTarget,
                                    },
                                    {
                                        icon: <Mic size={18} />,
                                        title: 'Rehearse',
                                        copy: 'Run the round again with the posting attached, and answer it the way you would on the day.',
                                        action: 'Practice now',
                                        path: '/interview-studio',
                                    },
                                ].map((item) => (
                                    <button
                                        key={item.title}
                                        type="button"
                                        onClick={() => navigate(item.path)}
                                        className="group rounded-xl border p-4 text-left transition hover:-translate-y-0.5"
                                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                                    >
                                        <div
                                            className="flex h-10 w-10 items-center justify-center rounded-xl border"
                                            style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-purple)' }}
                                        >
                                            {item.icon}
                                        </div>
                                        <h3 className="mt-4 text-[15px] font-semibold">{item.title}</h3>
                                        <p className="mt-2 min-h-[60px] text-[13.5px] leading-6" style={{ color: 'var(--cvl-muted)' }}>{item.copy}</p>
                                        <span
                                            className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold"
                                            style={{ color: 'var(--cvl-purple)' }}
                                        >
                                            {item.action}
                                            <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </Win>

                        <Win filename="job-packet.json">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className={eyebrowClass} style={eyebrowStyle}>attached role</p>
                                    <h2 className="mt-2 text-[18px] font-semibold leading-snug tracking-tight">
                                        {featuredJob ? featuredJob.title : 'Nothing attached yet.'}
                                    </h2>
                                </div>
                                {isLoadingJobContext && (
                                    <Chip>
                                        <Loader2 size={13} className="animate-spin" />
                                        checking
                                    </Chip>
                                )}
                            </div>

                            {featuredJob ? (
                                <>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Chip>
                                            <Building2 size={13} />
                                            {featuredJob.company}
                                        </Chip>
                                        <Chip>
                                            <MapPin size={13} />
                                            {featuredJob.location}
                                        </Chip>
                                        <span
                                            className="inline-flex items-center rounded-full border px-3 py-1 text-[12px]"
                                            style={{
                                                borderColor: 'var(--cvl-purple)',
                                                background: 'var(--cvl-purple-soft)',
                                                color: 'var(--cvl-purple)',
                                            }}
                                        >
                                            {featuredJob.sourceLabel === 'tracker' ? 'from job tracker' : 'from saved jobs'}
                                        </span>
                                    </div>
                                    <p
                                        className="mt-4 rounded-xl border p-4 text-[13.5px] leading-6"
                                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                    >
                                        {truncateDescription(featuredJob.description)}
                                    </p>
                                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                        <button type="button" onClick={() => navigate(featuredJob.sourceLabel === 'tracker' ? `/job-tracker?job=${featuredJob.id}` : '/job-tracker')} className={primaryButtonClass}>
                                            <Briefcase size={16} />
                                            Open packet
                                        </button>
                                        <button type="button" onClick={openTailoredResume} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                            <Wand2 size={16} />
                                            Tailor resume
                                        </button>
                                        <button type="button" onClick={() => navigate('/interview-studio')} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                            <Mic size={16} />
                                            Practice
                                        </button>
                                        {featuredJob.sourceUrl ? (
                                            <button type="button" onClick={openSourceJob} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                                Source job
                                                <ExternalLink size={15} />
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => navigate('/jobs/recommend')} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                                Find roles
                                                <ArrowRight size={15} />
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div
                                    className="mt-4 rounded-xl border p-4"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                                >
                                    <p className="text-[13.5px] leading-6" style={{ color: 'var(--cvl-muted)' }}>
                                        Save a role from the Chrome extension, paste a job URL, or pick a recommended one.
                                        The packet shows up here as soon as one is attached.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button type="button" onClick={() => navigate('/job-tracker')} className={primaryButtonClass}>
                                            <Briefcase size={16} />
                                            Add job
                                        </button>
                                        <button type="button" onClick={() => navigate('/jobs/recommend')} className={secondaryButtonClass} style={secondaryButtonStyle}>
                                            Find roles
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Win>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
};

export default OnboardingPage;
