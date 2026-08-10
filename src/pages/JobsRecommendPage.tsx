import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    ArrowUpRight,
    BadgeCheck,
    Briefcase,
    Building2,
    CheckCircle2,
    Clock3,
    ExternalLink,
    FileText,
    Gauge,
    Heart,
    LayoutDashboard,
    ListChecks,
    MapPin,
    PlusCircle,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
    XCircle,
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import AddJobModal from '../components/JobTracker/AddJobUrlModal';
import { useJobTracker } from '../hooks/useJobTracker';
import { useApplicationProfile } from '../hooks/useApplicationProfile';
import { useResumes } from '../hooks/useResumes';
import { ApplicationStatus, JobApplicationData, JobLinkValidationStatus, NO_NEXT_ACTION, WorkModel } from '../types';
import { navigate } from '../utils/navigation';
import { getRecommendedScrapedJobs, ScrapedRecommendedJob, validateRecommendedJobOpen } from '../services/scrapedJobsService';
import { isConfirmedBrokenJobLinkError } from '../utils/verifiedJobLink';
import {
    buildRecommendedJobCollections,
    filterVisibleRecommendedJobs,
    getRecommendedJobIdentityKeys,
    hasExternalJobUrl,
    type RecommendationSource,
    type RecommendationTab,
} from '../utils/recommendedJobs';
import { extractRecommendationProfileKeywords } from '../utils/recommendationProfile';
import {
    describeJobRecommendationPreferences,
    deriveJobRecommendationPreferences,
    getJobLocationFit,
    type JobRecommendationPreferences,
} from '../utils/jobRecommendationPreferences';
import {
    assessJobMatch,
    buildJobMatchProfile,
    type ComprehensiveJobMatch,
    type ComprehensiveMatchLabel,
    type JobMatchProfile,
} from '../utils/jobMatchScoring';

type RecommendedJob = {
    id: string;
    title: string;
    company: string;
    location: string;
    workModel: WorkModel;
    salary: string;
    jobType: string;
    seniority: string;
    postedAt: string;
    source: RecommendationSource;
    sourceLabel: string;
    applyUrl: string;
    description: string;
    /** Full cleaned job description — what gets saved to the tracker (the card shows the short `description`). */
    fullDescription?: string;
    matchScore: number;
    matchLabel: ComprehensiveMatchLabel;
    matchReasons: string[];
    missingKeywords: string[];
    matchedKeywords: string[];
    signals: string[];
    matchAssessment?: ComprehensiveJobMatch;
    sourceListingId?: string;
    validationStatus?: ScrapedRecommendedJob['validationStatus'];
    validatedAt?: number | null;
    finalUrl?: string;
    validationReason?: string;
};

type RecommendationPrepFields = Pick<JobApplicationData,
    | 'matchAnalyses'
    | 'nextAction'
    | 'nextActionDueDate'
    | 'notes'
    | 'prep_RoleOverview'
    | 'prep_MyStory'
    | 'prep_InterviewPrep'
    | 'prep_QuestionsForInterviewer'
>;

type ApplyLinkMessage = {
    tone: 'success' | 'error';
    text: string;
};

type ApplyValidationError = {
    message: string;
    shouldHideJob: boolean;
    status?: JobLinkValidationStatus;
};

const scoreTone = (score: number) => {
    if (score >= 85) return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200';
    if (score >= 70) return 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200';
    if (score >= 55) return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200';
    return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200';
};

const sourceLabel = (source: RecommendationSource) => {
    if (source === 'extension') return 'Saved from extension';
    if (source === 'partner') return 'Partner job';
    return 'Scraped job feed';
};

const getApplyValidationError = (error: unknown, source?: RecommendationSource): ApplyValidationError => {
    if (!error || typeof error !== 'object') {
        return {
            message: 'CareerVivid could not re-check this apply link.',
            shouldHideJob: false,
        };
    }

    const candidate = error as {
        code?: string;
        message?: string;
        details?: {
            validationStatus?: ScrapedRecommendedJob['validationStatus'];
            validationReason?: string;
        };
        customData?: {
            validationStatus?: ScrapedRecommendedJob['validationStatus'];
            validationReason?: string;
        };
    };
    const status = candidate.details?.validationStatus || candidate.customData?.validationStatus;
    const isClosed = status === 'expired' || status === 'stale' || status === 'unknown';
    const isTemporarilyBlocked = status === 'blocked';
    const failedPrecondition = candidate.code?.includes('failed-precondition') || candidate.code === 'functions/failed-precondition';
    const missingScrapedJob = source === 'scraped' && (candidate.code === 'functions/not-found' || candidate.code === 'not-found');

    return {
        message: candidate.details?.validationReason
            || candidate.customData?.validationReason
            || candidate.message
            || 'This job link could not be verified.',
        shouldHideJob: isClosed || missingScrapedJob || isConfirmedBrokenJobLinkError(error) || (source === 'scraped' && failedPrecondition && Boolean(status) && !isTemporarilyBlocked),
        status,
    };
};

const compactList = (items: string[], fallback: string): string => {
    const values = items.map((item) => item.trim()).filter(Boolean);
    return values.length ? values.join(', ') : fallback;
};

const buildRecommendationPrepFields = (job: RecommendedJob): RecommendationPrepFields => {
    const matched = compactList(job.matchedKeywords.slice(0, 6), 'general software delivery');
    const gaps = compactList(job.missingKeywords.slice(0, 6), 'no major gaps listed');
    const proof = compactList(job.matchReasons.slice(0, 3), 'CareerVivid profile and tracker signals match this role');
    const nextAction = job.missingKeywords.length || job.matchScore < 85
        ? `Tailor resume for ${job.missingKeywords.slice(0, 2).join(', ') || job.title}`
        : 'Verify apply link and send tailored application';
    const suggestedResumeAngle = `Position the resume around ${matched}, then address ${gaps}.`;
    const dueTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
        nextAction,
        nextActionDueDate: dueTomorrow,
        notes: [
            'Recommendation packet',
            `Source: ${sourceLabel(job.source)}`,
            `Match score: ${job.matchScore}% (${job.matchLabel})`,
            `Resume angle: ${suggestedResumeAngle}`,
            `Missing keywords: ${gaps}`,
            hasExternalJobUrl(job.applyUrl) ? `Verified apply URL candidate: ${job.applyUrl}` : 'Apply URL needs review before submission.',
        ].join('\n'),
        prep_RoleOverview: [
            `Recommendation role brief for ${job.title} at ${job.company}.`,
            `Location/work model: ${job.location} / ${job.workModel}.`,
            `Seniority/type: ${job.seniority} / ${job.jobType}.`,
            `Compensation: ${job.salary || 'Not listed'}.`,
            `Why it is relevant: ${proof}.`,
            `Short description: ${job.description || 'No description listed.'}`,
        ].join('\n\n'),
        prep_MyStory: [
            `Lead with ${matched}.`,
            `Connect prior project ownership to ${job.company}'s ${job.title} scope.`,
            `Use proof points from the resume that show delivery, collaboration, and production-quality execution.`,
            `Do not claim direct experience with ${gaps} unless it is already supported by the resume.`,
        ].join('\n'),
        prep_InterviewPrep: [
            `Be ready to explain how your background maps to: ${matched}.`,
            `Prepare a short gap plan for: ${gaps}.`,
            `Review the job description for systems, product, and team signals before applying.`,
            'If the apply link fails verification, skip this job instead of searching manually.',
        ].join('\n'),
        prep_QuestionsForInterviewer: [
            `How does ${job.company} define success for this ${job.title} in the first 90 days?`,
            'Which parts of the stack or product surface need the most immediate ownership?',
            'What collaboration patterns exist between product, design, and engineering for this role?',
        ].join('\n'),
        matchAnalyses: {
            recommended: {
                totalKeywords: job.matchedKeywords.length + job.missingKeywords.length,
                matchedKeywords: job.matchedKeywords,
                missingKeywords: job.missingKeywords,
                matchPercentage: job.matchScore,
                summary: `${proof}. ${suggestedResumeAngle}`,
                verdict: job.matchLabel,
                strongMatches: job.matchReasons,
                experienceGaps: job.missingKeywords.map((keyword) => `Address ${keyword} with supported resume evidence or a concrete learning plan.`),
                suggestedResumeAngle,
                recommendedAction: job.matchScore >= 85 && !job.missingKeywords.length ? 'apply_now' : 'tailor_first',
            },
        },
    };
};

const mergeRecommendationPrepFields = (
    existingJob: JobApplicationData,
    recommendationFields: RecommendationPrepFields
): Partial<JobApplicationData> => {
    const patch: Partial<JobApplicationData> = {
        matchAnalyses: {
            ...(existingJob.matchAnalyses || {}),
            ...(recommendationFields.matchAnalyses || {}),
        },
    };

    if (!existingJob.nextAction || existingJob.nextAction === NO_NEXT_ACTION) {
        patch.nextAction = recommendationFields.nextAction;
    }
    if (!existingJob.nextActionDueDate) {
        patch.nextActionDueDate = recommendationFields.nextActionDueDate;
    }
    if (!existingJob.prep_RoleOverview?.trim()) {
        patch.prep_RoleOverview = recommendationFields.prep_RoleOverview;
    }
    if (!existingJob.prep_MyStory?.trim()) {
        patch.prep_MyStory = recommendationFields.prep_MyStory;
    }
    if (!existingJob.prep_InterviewPrep?.trim()) {
        patch.prep_InterviewPrep = recommendationFields.prep_InterviewPrep;
    }
    if (!existingJob.prep_QuestionsForInterviewer?.trim()) {
        patch.prep_QuestionsForInterviewer = recommendationFields.prep_QuestionsForInterviewer;
    }

    const existingNotes = existingJob.notes?.trim() || '';
    if (!existingNotes) {
        patch.notes = recommendationFields.notes;
    } else if (!existingNotes.includes('Recommendation packet')) {
        patch.notes = `${existingNotes}\n\n${recommendationFields.notes}`;
    }

    return patch;
};

/**
 * Some already-ingested listings carry HTML-escaped HTML (tags stored as
 * &lt;div&gt;). Decode entities first, then strip real tags, so summaries
 * read as prose instead of markup soup.
 */
const stripEscapedHtml = (value: string): string => {
    // DOMParser returns text nodes only. React renders that result as text, not HTML.
    const document = new DOMParser().parseFromString(value, 'text/html');
    return document.body.textContent?.replace(/\s+/g, ' ').trim() || '';
};

const summarizeDescription = (value: string | undefined, fallback: string): string => {
    const normalized = stripEscapedHtml(value || fallback)
        .replace(/Job Summary\s*/i, '')
        .replace(/Duties\s*&\s*Responsibilities[\s\S]*/i, '')
        .replace(/[•●▪]/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!normalized) return fallback;

    const firstSentences = normalized
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(' ');
    const summary = firstSentences || normalized;

    if (summary.length <= 260) return summary;

    const clipped = summary.slice(0, 260);
    return `${clipped.slice(0, Math.max(0, clipped.lastIndexOf(' '))).trim()}...`;
};

const formatPostedAt = (value: string | number | null | undefined): string => {
    if (!value) return 'Recently';
    if (typeof value === 'string' && !value.includes('T')) return value;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';

    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 14) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const scrapedJobToRecommended = (
    job: ScrapedRecommendedJob,
    matchProfile: JobMatchProfile
): RecommendedJob => {
    const assessment = assessJobMatch({
        title: job.title,
        description: job.description,
        location: job.location,
        workModel: job.workModel,
        salary: job.salary,
        jobType: job.jobType,
        seniority: job.seniority,
        jobFunction: job.jobFunction,
        signals: job.signals,
    }, matchProfile);
    return {
        id: `scraped-${job.id}`,
        title: job.title,
        company: job.company,
        location: job.location,
        workModel: job.workModel,
        salary: job.salary || 'Not listed',
        jobType: job.jobType || 'Full-time',
        seniority: job.seniority || 'Review fit',
        postedAt: formatPostedAt(job.fetchedAt || job.postedAt),
        source: 'scraped',
        sourceLabel: job.sourceLabel || 'Scraped job feed',
        applyUrl: job.finalUrl || job.applyUrl,
        description: summarizeDescription(job.description, 'Verified job listing from a public company career source.'),
        fullDescription: stripEscapedHtml(job.description || '').replace(/\s+/g, ' ').trim(),
        matchScore: assessment.score,
        matchLabel: assessment.label,
        matchReasons: assessment.strengths.length ? assessment.strengths : ['Limited matching evidence is available in the resume and listing.'],
        missingKeywords: assessment.missingSkills.slice(0, 8),
        matchedKeywords: assessment.matchedSkills.slice(0, 10),
        signals: job.signals?.length ? ['Link validated', ...job.signals].slice(0, 4) : [job.workModel, 'Scraped source', 'Link validated'],
        matchAssessment: assessment,
        sourceListingId: job.id,
        validationStatus: job.validationStatus,
        validatedAt: job.validatedAt,
        finalUrl: job.finalUrl,
        validationReason: job.validationReason,
    };
};

/** Full-card shimmer placeholder shown while the verified feed loads. */
const JobCardSkeleton: React.FC = () => (
    <div className="cv-design-card grid animate-pulse gap-4 rounded-3xl p-4 lg:grid-cols-[minmax(0,1fr)_150px]" aria-hidden="true">
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[var(--cv-border-warm)]" />
                <div className="space-y-2">
                    <div className="h-2.5 w-28 rounded-full bg-[var(--cv-border-warm)]" />
                    <div className="h-4 w-64 rounded-full bg-[var(--cv-border-warm)]" />
                    <div className="h-2.5 w-40 rounded-full bg-[var(--cv-border-warm)]" />
                </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
                <div className="h-3 rounded-full bg-[var(--cv-border-warm)]" />
                <div className="h-3 rounded-full bg-[var(--cv-border-warm)]" />
                <div className="h-3 rounded-full bg-[var(--cv-border-warm)]" />
            </div>
            <div className="space-y-2 rounded-2xl bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.03))] p-4">
                <div className="h-3 w-full rounded-full bg-[var(--cv-border-warm)]" />
                <div className="h-3 w-5/6 rounded-full bg-[var(--cv-border-warm)]" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <div className="h-16 rounded-2xl bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.03))]" />
                <div className="h-16 rounded-2xl bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.03))]" />
            </div>
        </div>
        <div className="space-y-3">
            <div className="h-24 rounded-2xl bg-[var(--cv-border-warm)]" />
            <div className="h-10 rounded-xl bg-[var(--cv-border-warm)]" />
            <div className="h-10 rounded-xl bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.05))]" />
        </div>
    </div>
);

const MatchScoreBreakdown: React.FC<{ assessment: ComprehensiveJobMatch }> = ({ assessment }) => (
    <details className="group mt-4 border-t border-[var(--cv-border-subtle)] pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-[var(--cv-text-heading)] marker:content-none">
            <span className="flex items-center gap-2">
                <ListChecks size={15} className="text-[var(--cv-action-primary)]" />
                Score breakdown
            </span>
            <span className="rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2.5 py-1 text-[10px] uppercase text-[var(--cv-action-primary)]">
                {assessment.confidence}
            </span>
        </summary>
        <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {assessment.factors.map((item) => (
                <div key={item.key} className="min-w-0">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-extrabold text-[var(--cv-text-heading)]">
                        <span>{item.label}</span>
                        <span className="tabular-nums text-[var(--cv-action-primary)]">{item.score}/{item.maxScore}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--cv-border-subtle)]">
                        <div
                            className="h-full rounded-full bg-[var(--cv-action-solid)]"
                            style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                        />
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium leading-4 text-[var(--cv-text-muted)]">{item.evidence}</p>
                </div>
            ))}
        </div>
    </details>
);

const trackerJobToRecommended = (job: JobApplicationData, matchProfile: JobMatchProfile): RecommendedJob => {
    const workModel = job.workModel || (job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-site');
    const assessment = assessJobMatch({
        title: job.jobTitle || 'Saved job',
        description: job.jobDescription || job.notes || '',
        location: job.location || 'Location not listed',
        workModel: job.workModel || '',
        salary: job.salaryRange || 'Not listed',
        jobType: 'Not listed',
        seniority: job.interviewStage || '',
        signals: [],
    }, matchProfile);

    return {
        id: `tracker-${job.id}`,
        title: job.jobTitle || 'Saved job',
        company: job.companyName || 'Unknown company',
        location: job.location || 'Location not listed',
        workModel,
        salary: job.salaryRange || 'Not listed',
        jobType: 'Tracked',
        seniority: job.interviewStage || 'Review fit',
        postedAt: 'Saved',
        source: 'extension',
        sourceLabel: 'CareerVivid tracker',
        applyUrl: job.applicationURL || job.jobPostURL || '/job-tracker',
        description: summarizeDescription(job.jobDescription || job.notes, 'Saved from your CareerVivid workspace.'),
        matchScore: assessment.score,
        matchLabel: assessment.label,
        matchReasons: assessment.strengths.length ? assessment.strengths : ['Limited matching evidence is available in the resume and listing.'],
        missingKeywords: assessment.missingSkills.slice(0, 8),
        matchedKeywords: assessment.matchedSkills.slice(0, 10),
        signals: [job.applicationStatus || 'Tracked', workModel, job.priority ? `${job.priority} priority` : 'Application workspace ready'],
        matchAssessment: assessment,
        validationStatus: job.externalLinkValidationStatus,
        validationReason: job.externalLinkValidationReason,
        validatedAt: job.externalLinkValidatedAt,
    };
};

const JobsRecommendPage: React.FC = () => {
    const { jobApplications, addJobApplication, updateJobApplication } = useJobTracker();
    const { resumes, isLoading: isLoadingResumes } = useResumes();
    const { profile: applicationProfile } = useApplicationProfile();
    const profileDataReady = !isLoadingResumes;
    const [activeTab, setActiveTab] = useState<RecommendationTab>('recommended');
    const [searchQuery, setSearchQuery] = useState('');
    const [savingJobId, setSavingJobId] = useState<string | null>(null);
    const [savedSeedJobIds, setSavedSeedJobIds] = useState<Set<string>>(new Set());
    const [savedJobTrackerIds, setSavedJobTrackerIds] = useState<Record<string, string>>({});
    const [tailoringJobId, setTailoringJobId] = useState<string | null>(null);
    const [openingJobId, setOpeningJobId] = useState<string | null>(null);
    const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(new Set());
    const [applyLinkMessage, setApplyLinkMessage] = useState<ApplyLinkMessage | null>(null);
    const [scrapedJobs, setScrapedJobs] = useState<ScrapedRecommendedJob[]>([]);
    const [isLoadingScrapedJobs, setIsLoadingScrapedJobs] = useState(true);
    const [scrapedJobsError, setScrapedJobsError] = useState('');
    const [isTargetJobModalOpen, setIsTargetJobModalOpen] = useState(false);
    const lastSuccessfulJobsRef = useRef<ScrapedRecommendedJob[]>([]);
    const [retryCounter, setRetryCounter] = useState(0);

    const targetResume = useMemo(
        () => resumes.find((resume) => resume.isDefault) || resumes[0] || null,
        [resumes]
    );
    const profileKeywords = useMemo(
        () => extractRecommendationProfileKeywords({ resumes: targetResume ? [targetResume] : [] }),
        [targetResume]
    );
    const locationPreferences = useMemo(
        () => deriveJobRecommendationPreferences(targetResume, applicationProfile),
        [applicationProfile, targetResume]
    );
    const locationPreferenceRequestKey = useMemo(
        () => JSON.stringify(locationPreferences),
        [locationPreferences]
    );
    const matchProfile = useMemo(
        () => buildJobMatchProfile(targetResume, applicationProfile, locationPreferences),
        [applicationProfile, locationPreferences, targetResume]
    );
    const profileAssetCount = targetResume ? 1 : 0;
    const profileKeywordRequestKey = useMemo(
        () => profileKeywords.slice(0, 40).join('|'),
        [profileKeywords]
    );

    const trackerJobs = useMemo(
        () => jobApplications.map((job) => trackerJobToRecommended(job, matchProfile)),
        [jobApplications, matchProfile]
    );
    const scrapedRecommendedJobs = useMemo(
        () => scrapedJobs.map((job) => scrapedJobToRecommended(job, matchProfile)),
        [matchProfile, scrapedJobs]
    );
    const jobCollections = useMemo(
        () => buildRecommendedJobCollections({
            scrapedJobs: scrapedRecommendedJobs,
            trackerJobs,
            hiddenJobIds,
            isAppliedTrackerJob: (job) => {
                const trackerId = job.id.replace('tracker-', '');
                return jobApplications.some((application) => (
                    application.id === trackerId && application.applicationStatus === 'Applied'
                ));
            },
        }),
        [hiddenJobIds, jobApplications, scrapedRecommendedJobs, trackerJobs]
    );

    const {
        recommendedFeedJobs,
        trackerDisplayJobs,
        appliedTrackerJobs,
    } = jobCollections;

    const savedSeedPendingCount = useMemo(
        () => recommendedFeedJobs.filter(
            (job) => savedSeedJobIds.has(job.id)
        ).length,
        [recommendedFeedJobs, savedSeedJobIds]
    );
    const targetCompanies = useMemo(() => {
        const companies = jobApplications
            .filter((job) => job.jobDescription?.trim())
            .map((job) => job.companyName?.trim())
            .filter((company): company is string => Boolean(company));
        return Array.from(new Set(companies)).slice(0, 6);
    }, [jobApplications]);
    const targetJobCount = useMemo(
        () => jobApplications.filter((job) => job.jobDescription?.trim()).length,
        [jobApplications]
    );

    const retryLoadJobs = useCallback(() => setRetryCounter((c) => c + 1), []);

    useEffect(() => {
        // Don't fetch until the target resume has loaded from Firestore —
        // otherwise we send an empty-keywords request that returns
        // a poorly ranked (or empty) feed, then re‐fetch moments later when
        // the selected resume arrives.
        if (!profileDataReady) return;

        let isMounted = true;

        const loadScrapedJobs = async () => {
            setIsLoadingScrapedJobs(true);
            setScrapedJobsError('');
            try {
                const jobs = await getRecommendedScrapedJobs(120, profileKeywords, locationPreferences);
                if (isMounted) {
                    setScrapedJobs(jobs);
                    lastSuccessfulJobsRef.current = jobs;
                }
            } catch (error) {
                console.error('[JobsRecommendPage] Unable to load scraped jobs:', error);
                if (isMounted) {
                    // Fall back to cached data so the page doesn't go blank
                    if (lastSuccessfulJobsRef.current.length) {
                        setScrapedJobs(lastSuccessfulJobsRef.current);
                    }
                    setScrapedJobsError('The verified job feed is temporarily unavailable. Showing cached results.');
                }
            } finally {
                if (isMounted) setIsLoadingScrapedJobs(false);
            }
        };

        loadScrapedJobs();

        return () => {
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationPreferenceRequestKey, locationPreferences, profileDataReady, profileKeywordRequestKey, profileKeywords, retryCounter]);

    const visibleJobs = useMemo(
        () => filterVisibleRecommendedJobs({
            activeTab,
            searchQuery,
            savedSeedJobIds,
            collections: jobCollections,
        }),
        [activeTab, jobCollections, savedSeedJobIds, searchQuery]
    );

    const getTrackedJob = (job: RecommendedJob): JobApplicationData | null => {
        if (job.source === 'extension' && job.id.startsWith('tracker-')) {
            const trackerId = job.id.replace(/^tracker-/, '');
            return jobApplications.find((application) => application.id === trackerId) || null;
        }

        if (savedJobTrackerIds[job.id]) {
            return jobApplications.find((application) => application.id === savedJobTrackerIds[job.id]) || null;
        }

        const identityKeys = getRecommendedJobIdentityKeys(job);
        return jobApplications.find((application) => {
            const applicationKeys = getRecommendedJobIdentityKeys({
                title: application.jobTitle || '',
                company: application.companyName || '',
                applyUrl: application.applicationURL || application.jobPostURL || '',
            });
            return applicationKeys.some((key) => identityKeys.includes(key));
        }) || null;
    };

    const updateValidatedScrapedJob = (sourceListingId: string, validation: Awaited<ReturnType<typeof validateRecommendedJobOpen>>) => {
        setScrapedJobs((currentJobs) => currentJobs.map((scrapedJob) => (
            scrapedJob.id === sourceListingId
                ? {
                    ...scrapedJob,
                    finalUrl: validation.finalUrl,
                    validationStatus: validation.validationStatus,
                    validationReason: validation.validationReason,
                    validatedAt: validation.validatedAt,
                }
                : scrapedJob
        )));
    };

    const verifyJobBeforePipeline = async (job: RecommendedJob): Promise<RecommendedJob | null> => {
        if (job.source !== 'scraped' || !job.sourceListingId || !hasExternalJobUrl(job.applyUrl)) {
            return job;
        }

        try {
            const validation = await validateRecommendedJobOpen(job.sourceListingId);
            updateValidatedScrapedJob(job.sourceListingId, validation);
            return {
                ...job,
                applyUrl: validation.finalUrl,
                finalUrl: validation.finalUrl,
                validationStatus: validation.validationStatus,
                validationReason: validation.validationReason,
                validatedAt: validation.validatedAt,
                signals: ['Checked now', ...job.signals.filter((signal) => signal !== 'Checked now')].slice(0, 4),
            };
        } catch (error) {
            const validationError = getApplyValidationError(error, job.source);
            if (validationError.shouldHideJob) {
                setHiddenJobIds((current) => new Set(current).add(job.id));
                setApplyLinkMessage({
                    tone: 'error',
                    text: `Removed ${job.company}'s stale listing. ${validationError.message}`,
                });
            } else {
                setApplyLinkMessage({
                    tone: 'error',
                    text: `${job.company}'s apply link could not be verified yet, so CareerVivid did not save it.`,
                });
            }
            window.setTimeout(() => setApplyLinkMessage(null), 7000);
            return null;
        }
    };

    const saveSeedJob = async (job: RecommendedJob): Promise<string | null> => {
        const cachedTrackerId = savedJobTrackerIds[job.id];
        const trackedJob = getTrackedJob(job);
        if (trackedJob) {
            const recommendationFields = buildRecommendationPrepFields(job);
            const patch = mergeRecommendationPrepFields(trackedJob, recommendationFields);
            if (Object.keys(patch).length) {
                await updateJobApplication(trackedJob.id, patch);
            }
            setSavedSeedJobIds((current) => new Set(current).add(job.id));
            setSavedJobTrackerIds((current) => ({ ...current, [job.id]: trackedJob.id }));
            return trackedJob.id;
        }
        if (cachedTrackerId) {
            setSavedSeedJobIds((current) => new Set(current).add(job.id));
            return cachedTrackerId;
        }

        setSavingJobId(job.id);
        try {
            const verifiedJob = await verifyJobBeforePipeline(job);
            if (!verifiedJob) return null;
            const recommendationFields = buildRecommendationPrepFields(verifiedJob);

            const newJobId = await addJobApplication({
                jobTitle: verifiedJob.title,
                companyName: verifiedJob.company,
                location: verifiedJob.location,
                jobPostURL: verifiedJob.applyUrl,
                applicationURL: verifiedJob.applyUrl,
                // Save the FULL cleaned description — the card summary is too
                // short for resume tailoring and prep to work from.
                jobDescription: verifiedJob.fullDescription || verifiedJob.description,
                applicationStatus: 'To Apply' as ApplicationStatus,
                workModel: verifiedJob.workModel,
                salaryRange: verifiedJob.salary,
                priority: verifiedJob.matchScore >= 85 ? 'High' : 'Medium',
                ...recommendationFields,
            });
            setSavedSeedJobIds((current) => new Set(current).add(job.id));
            if (newJobId) {
                setSavedJobTrackerIds((current) => ({ ...current, [job.id]: newJobId }));
            }
            return newJobId || null;
        } finally {
            setSavingJobId(null);
        }
    };

    const saveAndOpenTailorJob = async (job: RecommendedJob) => {
        setTailoringJobId(job.id);
        setApplyLinkMessage(null);

        try {
            const trackerId = await saveSeedJob(job);
            if (trackerId) {
                navigate(`/job-tracker?job=${encodeURIComponent(trackerId)}&action=tailor&q=${encodeURIComponent(job.company)}`);
                return;
            }
        } catch (error) {
            console.error('[JobsRecommendPage] Unable to open tailoring flow:', error);
            setApplyLinkMessage({
                tone: 'error',
                text: `Could not prepare ${job.company} for resume tailoring. Try saving the job first.`,
            });
        } finally {
            setTailoringJobId(null);
        }
    };

    const openApplyLink = async (job: RecommendedJob) => {
        if (!hasExternalJobUrl(job.applyUrl)) {
            navigate('/job-tracker');
            return;
        }

        setOpeningJobId(job.id);
        setApplyLinkMessage(null);

        try {
            const applyUrl = job.finalUrl || job.applyUrl;
            window.open(applyUrl, '_blank', 'noopener,noreferrer');

            setApplyLinkMessage({
                tone: 'success',
                text: `Opened ${job.company}'s apply page.`,
            });
        } catch (error) {
            console.error('[JobsRecommendPage] Unable to open apply link:', error);
            setApplyLinkMessage({
                tone: 'error',
                text: `Could not open ${job.company}'s apply page. Open the job tracker to review the saved URL.`,
            });
        } finally {
            setOpeningJobId(null);
            window.setTimeout(() => setApplyLinkMessage(null), 6000);
        }
    };

    const handleTargetJobAdded = async (jobData: Omit<JobApplicationData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
        const jobTitle = jobData.jobTitle?.trim() || 'Target role';
        const companyName = jobData.companyName?.trim() || 'Target company';
        const descriptionSummary = summarizeDescription(
            jobData.jobDescription,
            'Pasted target job description saved in CareerVivid.'
        );

        setIsTargetJobModalOpen(false);
        setApplyLinkMessage(null);

        try {
            await addJobApplication({
                ...jobData,
                jobTitle,
                companyName,
                applicationStatus: jobData.applicationStatus || 'To Apply',
                priority: jobData.priority || 'High',
                nextAction: jobData.nextAction && jobData.nextAction !== NO_NEXT_ACTION
                    ? jobData.nextAction
                    : `Tailor resume for ${companyName}`,
                notes: jobData.notes?.trim()
                    ? jobData.notes
                    : [
                        'Target job',
                        'Added manually from a pasted job description.',
                        `Target company: ${companyName}`,
                        `Target role: ${jobTitle}`,
                    ].join('\n'),
                prep_RoleOverview: jobData.prep_RoleOverview?.trim()
                    ? jobData.prep_RoleOverview
                    : [
                        `${jobTitle} at ${companyName}.`,
                        jobData.location ? `Location: ${jobData.location}.` : '',
                        descriptionSummary,
                    ].filter(Boolean).join('\n\n'),
            });
            setActiveTab('saved');
            setApplyLinkMessage({
                tone: 'success',
                text: `Saved ${companyName}'s ${jobTitle} as a target job.`,
            });
        } catch (error) {
            console.error('[JobsRecommendPage] Unable to save target job:', error);
            setApplyLinkMessage({
                tone: 'error',
                text: `Could not save ${companyName}'s target job. Try again from the job tracker.`,
            });
        } finally {
            window.setTimeout(() => setApplyLinkMessage(null), 7000);
        }
    };

    const topScore = visibleJobs.length
        ? Math.max(...visibleJobs.map((job) => job.matchScore))
        : recommendedFeedJobs.length
            ? Math.max(...recommendedFeedJobs.map((job) => job.matchScore))
            : 0;
    const emptyStateCopy = activeTab === 'recommended'
        ? {
            title: 'No apply-ready jobs available',
            description: 'Recommended only shows listings whose external application page has been validated. Expired, broken, or generic careers links are removed before they reach the feed.',
        }
        : activeTab === 'saved'
            ? {
                title: 'No saved jobs in this tab',
                description: 'Save a recommended role or use the extension to add a job to your CareerVivid tracker.',
            }
            : {
                title: 'No applied jobs yet',
                description: 'Jobs you mark as Applied in the tracker will appear here.',
            };

    return (
        <AppLayout>
            <Helmet>
                <title>Recommended Jobs</title>
                <meta
                    name="description"
                    content="CareerVivid recommended jobs matched to the resume selected for your applications."
                />
            </Helmet>

            <div className="cv-design-page cv-design-grid min-h-screen">
                <header className="cv-design-header">
                    <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="cv-design-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-3 py-1 text-xs">
                                    <Sparkles size={14} />
                                    {recommendedFeedJobs.length ? 'Apply-ready recommendations' : 'Recommended jobs'}
                                </div>
                                <h1 className="cv-design-title text-2xl sm:text-3xl">
                                    Jobs matched to your target resume
                                </h1>
                                <p className="cv-design-body mt-2 max-w-3xl text-sm">
                                    Scores compare role, required skills, experience, education, location, work preferences, and compensation using your Application Profile and selected resume.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTargetJobModalOpen(true)}
                                        className="cv-design-button-primary rounded-xl px-3.5 py-2 text-sm font-black"
                                    >
                                        <PlusCircle size={16} />
                                        Set target job
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/job-tracker')}
                                        className="cv-design-button-secondary rounded-xl px-3.5 py-2 text-sm"
                                    >
                                        <LayoutDashboard size={16} />
                                        Open tracker
                                    </button>
                                </div>
                                <p className="mt-4 text-xs font-bold text-[var(--cv-text-muted)]">
                                    Prioritizing: {describeJobRecommendationPreferences(locationPreferences)}
                                </p>
                                {!isLoadingScrapedJobs && scrapedJobsError && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-200">
                                            {scrapedJobsError}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={retryLoadJobs}
                                            className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
                                <div className="cv-design-card rounded-2xl p-3">
                                    <div className="cv-design-eyebrow">Top match</div>
                                    <div className="mt-1 flex items-end gap-1 text-2xl font-black text-[var(--cv-text-heading)]">{topScore}<span className="pb-1 text-xs text-[var(--cv-text-muted)]">%</span></div>
                                </div>
                                <div className="cv-design-card rounded-2xl p-3">
                                    <div className="cv-design-eyebrow">Target resume</div>
                                    <div className="mt-1 text-2xl font-black text-[var(--cv-text-heading)]">{profileAssetCount}</div>
                                </div>
                                <button
                                    onClick={() => navigate('/job-tracker')}
                                    className="cv-design-button-secondary rounded-2xl p-3 text-left"
                                >
                                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--cv-action-primary)]">Pipeline</div>
                                    <div className="mt-1 flex items-center gap-1 text-sm font-black text-[var(--cv-action-primary)]">
                                        Open <ArrowUpRight size={14} />
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {/* "External" tab removed: every recommended job is external by definition, so the tab only duplicated Saved. */}
                                {[
                                    ['recommended', 'Recommended', recommendedFeedJobs.length],
                                    ['saved', 'Saved', trackerDisplayJobs.length + savedSeedPendingCount],
                                    ['applied', 'Applied', appliedTrackerJobs.length],
                                ].map(([id, label, count]) => (
                                    <button
                                        key={id}
                                        onClick={() => setActiveTab(id as typeof activeTab)}
                                        className={`rounded-full border px-4 py-2 text-xs font-extrabold transition ${activeTab === id
                                            ? 'border-[var(--cv-action-primary)] bg-[var(--cv-action-solid)] text-white'
                                            : 'border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)] hover:text-[var(--cv-action-primary)]'
                                            }`}
                                    >
                                        {label} <span className="ml-1 opacity-70">{count}</span>
                                    </button>
                                ))}
                            </div>

                            <label className="relative block w-full lg:max-w-sm">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search roles, companies, skills..."
                                    className="cv-design-input h-11 w-full rounded-2xl pl-10 pr-4 text-sm font-semibold transition placeholder:text-stone-400"
                                />
                            </label>
                        </div>
                    </div>
                </header>

                <main className="mx-auto grid max-w-[1480px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
                    <section className="space-y-4">
                        {applyLinkMessage && (
                            <div
                                role="status"
                                className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 shadow-sm ${
                                    applyLinkMessage.tone === 'error'
                                        ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
                                }`}
                            >
                                {applyLinkMessage.text}
                            </div>
                        )}

                        {isLoadingScrapedJobs && visibleJobs.length === 0 && (
                            <>
                                <div className="flex items-center gap-2 px-1 text-sm font-bold text-[var(--cv-text-muted)]" role="status">
                                    <span className="h-2 w-2 animate-ping rounded-full bg-[var(--cv-action-solid)]" />
                                    Matching verified jobs to your profile…
                                </div>
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                            </>
                        )}

                        {!isLoadingScrapedJobs && visibleJobs.length === 0 && (
                            <div className="cv-design-card rounded-3xl p-8 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200">
                                    <ShieldCheck size={24} />
                                </div>
                                <h2 className="cv-design-title mt-4 text-xl">{emptyStateCopy.title}</h2>
                                <p className="cv-design-body mx-auto mt-2 max-w-xl text-sm">
                                    {emptyStateCopy.description}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsTargetJobModalOpen(true)}
                                    className="cv-design-button-primary mt-5 rounded-xl px-4 py-2 text-sm font-black"
                                >
                                    <PlusCircle size={16} />
                                    Paste target job
                                </button>
                            </div>
                        )}
                        {visibleJobs.map((job) => {
                            const isSaved = job.source === 'extension' || savedSeedJobIds.has(job.id);
                            const hasExternalApplyUrl = hasExternalJobUrl(job.applyUrl);
                            return (
                                <article
                                    key={job.id}
                                    className="cv-design-card cv-design-card-hover grid gap-4 rounded-3xl p-4 lg:grid-cols-[minmax(0,1fr)_150px]"
                                >
                                    <div className="min-w-0">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{job.postedAt}</span>
                                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{job.sourceLabel}</span>
                                            {job.signals.slice(0, 2).map((signal) => (
                                                <span key={signal} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{signal}</span>
                                            ))}
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-lg font-black text-[var(--cv-text-heading)]">
                                                {job.company.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-lg font-black tracking-tight text-[var(--cv-text-heading)]">{job.title}</h2>
                                                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[var(--cv-text-body)]">
                                                    <Building2 size={15} /> {job.company}
                                                    <span className="hidden text-stone-300 sm:inline">/</span>
                                                    <span>{job.seniority}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-2 text-xs font-bold text-stone-600 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="flex items-center gap-2"><MapPin size={15} /> {job.location}</div>
                                            <div className="flex items-center gap-2"><Briefcase size={15} /> {job.workModel}</div>
                                            <div className="flex items-center gap-2"><Clock3 size={15} /> {job.jobType}</div>
                                            <div className="flex items-center gap-2"><BadgeCheck size={15} /> {job.salary}</div>
                                        </div>

                                        <div className="mt-4 max-w-4xl rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] px-3 py-2.5">
                                            <div className="cv-design-eyebrow mb-1">Summary</div>
                                            <p className="text-sm font-medium leading-6 text-[var(--cv-text-body)]">{job.description}</p>
                                        </div>

                                        <div className="mt-4 grid gap-4 border-y border-[var(--cv-border-subtle)] py-3 xl:grid-cols-2">
                                            <section>
                                                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">
                                                    <CheckCircle2 size={14} /> Match reasons
                                                </div>
                                                <div className="space-y-1.5">
                                                    {job.matchReasons.map((reason) => (
                                                        <p key={reason} className="text-[11px] font-semibold leading-4 text-[var(--cv-text-body)]">{reason}</p>
                                                    ))}
                                                </div>
                                            </section>

                                            <section>
                                                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-rose-700 dark:text-rose-200">
                                                    <XCircle size={14} /> Gaps to review
                                                </div>
                                                <div className="space-y-1.5">
                                                    {(job.matchAssessment?.gaps.length
                                                        ? job.matchAssessment.gaps
                                                        : job.missingKeywords.length
                                                            ? [`Missing detected skills: ${job.missingKeywords.join(', ')}.`]
                                                            : ['No material gap was detected from the available evidence.']
                                                    ).map((gap) => (
                                                        <p key={gap} className="text-[11px] font-semibold leading-4 text-[var(--cv-text-body)]">{gap}</p>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>

                                        {job.matchAssessment && <MatchScoreBreakdown assessment={job.matchAssessment} />}
                                    </div>

                                    <aside className="cv-design-card flex flex-col gap-3 rounded-2xl p-3">
                                        <div className={`rounded-2xl border p-3 text-center ${scoreTone(job.matchScore)}`}>
                                            <Gauge className="mx-auto mb-2 h-5 w-5" />
                                            <div className="text-3xl font-black leading-none">{job.matchScore}<span className="text-sm">%</span></div>
                                            <div className="mt-1 text-[11px] font-black uppercase tracking-[0.12em]">{job.matchLabel}</div>
                                        </div>

                                        <button
                                            onClick={() => { void saveSeedJob(job); }}
                                            disabled={isSaved || savingJobId === job.id || tailoringJobId === job.id}
                                            className="cv-design-button-primary min-h-[40px] rounded-xl px-3 py-2 text-xs font-black disabled:cursor-default"
                                        >
                                            <Heart size={15} />
                                            {isSaved ? 'Saved' : savingJobId === job.id ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { void saveAndOpenTailorJob(job); }}
                                            disabled={savingJobId === job.id || tailoringJobId === job.id}
                                            className="cv-design-button-secondary min-h-[40px] rounded-xl px-3 py-2 text-xs font-black disabled:cursor-default disabled:opacity-55"
                                        >
                                            <FileText size={15} />
                                            {tailoringJobId === job.id ? 'Opening...' : 'Tailor resume'}
                                        </button>
                                        {hasExternalApplyUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => { void openApplyLink(job); }}
                                                disabled={openingJobId === job.id}
                                                className="cv-design-button-secondary min-h-[40px] rounded-xl px-3 py-2 text-xs font-black"
                                            >
                                                {openingJobId === job.id ? 'Opening...' : job.source === 'scraped' ? 'Apply now' : 'Open apply page'} <ExternalLink size={15} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => navigate('/job-tracker')}
                                                className="cv-design-button-secondary min-h-[40px] rounded-xl px-3 py-2 text-xs font-black"
                                            >
                                                Open tracker <ExternalLink size={15} />
                                            </button>
                                        )}
                                    </aside>
                                </article>
                            );
                        })}
                    </section>

                    <aside className="space-y-4">
                        <section className="cv-design-card rounded-3xl p-4">
                            <div className="flex items-center gap-2 text-sm font-black text-[var(--cv-text-heading)]">
                                <Target size={18} className="text-[var(--cv-action-primary)]" />
                                Target companies
                            </div>
                            <p className="cv-design-body mt-2 text-sm">
                                Paste a real job description for the company you want. CareerVivid saves it as the target role for tailoring and practice.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsTargetJobModalOpen(true)}
                                className="cv-design-button-primary mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black"
                            >
                                <FileText size={16} />
                                Paste job description
                            </button>
                            <div className="mt-4 space-y-2">
                                {targetCompanies.length ? targetCompanies.map((company) => (
                                    <div key={company} className="flex items-center justify-between rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] px-3 py-2 text-xs font-bold text-[var(--cv-text-body)]">
                                        <span className="truncate">{company}</span>
                                        <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                                    </div>
                                )) : (
                                    <div className="rounded-2xl border border-dashed border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] px-3 py-3 text-xs font-bold leading-5 text-[var(--cv-text-muted)]">
                                        Add your first target company by pasting a job description.
                                    </div>
                                )}
                                <div className="rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] px-3 py-2 text-xs font-bold text-[var(--cv-text-body)]">
                                    {targetJobCount} target {targetJobCount === 1 ? 'job' : 'jobs'} with descriptions
                                </div>
                            </div>
                        </section>

                        <section className="cv-design-card rounded-3xl p-4">
                            <div className="flex items-center gap-2 text-sm font-black text-[var(--cv-text-heading)]">
                                <ShieldCheck size={18} className="text-emerald-500" />
                                Feed policy
                            </div>
                            <p className="cv-design-body mt-3 text-sm">
                                Recommended uses authenticated ATS and company-career ingestion. A job is visible only after its external apply page is validated; expired or broken links are removed.
                            </p>
                            <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-xs font-bold leading-5 text-slate-200">
                                Backend source: scheduled ATS ingestion with direct apply-link validation before a job becomes visible.
                            </div>
                        </section>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="cv-design-button-secondary w-full rounded-2xl px-4 py-3 text-sm font-black"
                        >
                            <LayoutDashboard size={16} />
                            Dashboard
                        </button>
                    </aside>
                </main>
            </div>

            {isTargetJobModalOpen && (
                <AddJobModal
                    onClose={() => setIsTargetJobModalOpen(false)}
                    onJobAdded={(jobData) => {
                        void handleTargetJobAdded(jobData);
                    }}
                />
            )}
        </AppLayout>
    );
};

export default JobsRecommendPage;
