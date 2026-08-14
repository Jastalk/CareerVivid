/// <reference types="chrome" />
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Wand2, Mic, ChevronRight, FileText, Loader2, Mail, LayoutDashboard, ExternalLink, Briefcase, Target, MessageSquareText, Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useResumes } from '../../hooks/useResumes';
import { getAppUrl, getResumeBuilderUrl, isCareerVividAppUrl } from '../../utils/extensionUtils';
import { ResumeData } from '../../types';
import { FREE_PLAN_CREDIT_LIMIT, PRO_PLAN_CREDIT_LIMIT, PRO_MAX_PLAN_CREDIT_LIMIT, ENTERPRISE_PLAN_CREDIT_LIMIT } from '../../config/creditCosts';
import { buildJobBoardRoutes, buildResumeSearchQuery } from '../../utils/jobBoardRouter';
import { buildLocalMatchAudit, LocalMatchAuditResult } from '../../utils/localMatchAudit';

// Extracted Sub-Components
import { ExtensionHeader } from '../components/ExtensionHeader';
import type { AutoFillResult } from '../components/AutoFillCard';
import { MatchBreakdownCard } from '../components/MatchBreakdownCard';
import { AIAnswerCard, AIAnswer } from '../components/AIAnswerCard';
import { JobDiscoveryModal } from '../components/JobDiscoveryModal';
import { LocalDeepDiveAudit } from '../components/LocalDeepDiveAudit';

type ScrapedJob = { title: string; company: string; location?: string; description?: string; salary?: string };

type TrackerTransitPayload = {
    source: 'extension_tracker';
    transitId: string;
    createdAt: string;
    expiresAt: number;
    url: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    fallbackDescription: string;
    stage: string;
    resumeId: string;
    resumeTitle: string;
};

type ActiveJobContextPayload = {
    source: 'extension_job_context';
    contextId: string;
    createdAt: string;
    expiresAt: number;
    pageUrl: string;
    pageTitle: string;
    job: ScrapedJob;
    resumeId: string;
    resumeTitle: string;
};

type WorkspaceActionId = 'save_job' | 'tailor_resume' | 'practice_interview' | 'cover_letter';

const ACTIVE_JOB_CONTEXT_STORAGE_KEY = 'activeCareerVividJobContext';

const WORKSPACE_HANDOFF_COPY: Record<WorkspaceActionId, {
    title: string;
    description: string;
    step: string;
    icon: React.ElementType;
    iconClassName: string;
}> = {
    save_job: {
        title: 'Saving to Job Tracker',
        description: 'Logging this role to your pipeline before opening the tracker.',
        step: 'Syncing job record',
        icon: Briefcase,
        iconClassName: 'bg-[#eef0ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]',
    },
    tailor_resume: {
        title: 'Opening resume workspace',
        description: 'Passing the job brief into your active resume for tailoring.',
        step: 'Loading resume context',
        icon: Wand2,
        iconClassName: 'bg-[#fbf2ff] text-[#8f3df0] dark:bg-[#302f49] dark:text-[#b8b3ff]',
    },
    practice_interview: {
        title: 'Preparing interview studio',
        description: 'Building mock interview prep from this job context.',
        step: 'Creating practice context',
        icon: Mic,
        iconClassName: 'bg-[#fff0f7] text-[#d95b92] dark:bg-[#3a2630] dark:text-[#ff9ac4]',
    },
    cover_letter: {
        title: 'Preparing cover letter',
        description: 'Carrying the job context into your application workspace.',
        step: 'Drafting handoff',
        icon: Mail,
        iconClassName: 'bg-[#f3f2ff] text-[#5b5599] dark:bg-[#302f49] dark:text-[#b8b3ff]',
    },
};

const WorkspaceHandoffCard: React.FC<{ action: WorkspaceActionId | null; jobTitle?: string | null }> = ({ action, jobTitle }) => {
    const config = WORKSPACE_HANDOFF_COPY[action || 'tailor_resume'];
    const Icon = config.icon;

    return (
        <section
            aria-live="polite"
            className="overflow-hidden rounded-[22px] border border-[#d9d7fb] bg-white p-3.5 shadow-[0_16px_34px_rgba(98,91,213,0.10)] transition-all duration-500 dark:border-[#4d4a73] dark:bg-[#262522] dark:shadow-none"
        >
            <div className="flex items-start gap-3">
                <span className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${config.iconClassName}`}>
                    <Icon size={16} />
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#4a4392] shadow-sm dark:bg-[#1f1f1d] dark:text-[#b8b3ff]">
                        <Loader2 size={10} className="animate-spin" />
                    </span>
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-[#f4f1e9]">{config.title}</p>
                        <span className="rounded-full border border-[#d9d7fb] bg-[#f3f2ff] px-2 py-1 text-[9px] font-semibold text-[#4a4392] dark:border-[#4d4a73] dark:bg-[#302f49] dark:text-[#b8b3ff]">
                            Working
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-[#aaa39a]">
                        {config.description}
                    </p>
                    {jobTitle && (
                        <p className="mt-1 truncate text-[10px] font-semibold text-slate-400 dark:text-[#8e887f]">
                            {jobTitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-full bg-[#f1f4f8] p-0.5 dark:bg-[#1f1f1d]">
                <div className="h-1.5 w-3/4 animate-pulse rounded-full bg-[#8d88e6]" />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
                {['Capture', config.step, 'Open'].map((label, index) => (
                    <div
                        key={label}
                        className={`rounded-2xl px-2 py-2 text-center text-[9px] font-semibold ${
                            index === 1
                                ? 'bg-[#f3f2ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]'
                                : 'bg-[#f8f8fb] text-slate-400 dark:bg-[#1f1f1d] dark:text-[#8e887f]'
                        }`}
                    >
                        {label}
                    </div>
                ))}
            </div>
        </section>
    );
};

const stringifyResumeValue = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(stringifyResumeValue).filter(Boolean).join('\n');
    if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(stringifyResumeValue).filter(Boolean).join(' ');
    return '';
};

const buildResumeTextFromResume = (resume: ResumeData | null): string => {
    if (!resume) return '';

    const personalDetails = resume.personalDetails || ({} as ResumeData['personalDetails']);
    const skills = (resume.skills || [])
        .map(skill => typeof skill === 'string' ? skill : [skill.name, skill.level].filter(Boolean).join(' - '))
        .filter(Boolean)
        .join(', ');
    const employment = (resume.employmentHistory || [])
        .map(job => [
            [job.jobTitle, job.employer].filter(Boolean).join(' at '),
            [job.city, job.startDate, job.endDate].filter(Boolean).join(' | '),
            stringifyResumeValue(job.description),
        ].filter(Boolean).join('\n'))
        .filter(Boolean)
        .join('\n\n');
    const education = (resume.education || [])
        .map(edu => [
            [edu.degree, edu.school].filter(Boolean).join(' - '),
            [edu.city, edu.startDate, edu.endDate].filter(Boolean).join(' | '),
            stringifyResumeValue(edu.description),
        ].filter(Boolean).join('\n'))
        .filter(Boolean)
        .join('\n\n');
    const websites = (resume.websites || [])
        .map(site => [site.label, site.url].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('\n');

    return [
        resume.title,
        personalDetails.jobTitle,
        stringifyResumeValue(resume.professionalSummary),
        skills && `Skills: ${skills}`,
        employment && `Experience:\n${employment}`,
        education && `Education:\n${education}`,
        websites && `Links:\n${websites}`,
    ].filter(Boolean).join('\n\n').trim();
};

const buildResumeTextFromProfile = (profile: any): string => {
    if (!profile) return '';

    const skills = Array.isArray(profile.skills) ? profile.skills.map(stringifyResumeValue).filter(Boolean).join(', ') : '';
    const workExperience = Array.isArray(profile.workExperience)
        ? profile.workExperience.map((job: any) => [
            [job.title, job.company].filter(Boolean).join(' at '),
            [job.location, job.startDate, job.endDate].filter(Boolean).join(' | '),
            stringifyResumeValue(job.description),
        ].filter(Boolean).join('\n')).filter(Boolean).join('\n\n')
        : '';
    const education = Array.isArray(profile.education)
        ? profile.education.map((edu: any) => [
            [edu.degree, edu.fieldOfStudy, edu.school].filter(Boolean).join(' - '),
            [edu.graduationDate, edu.gpa].filter(Boolean).join(' | '),
        ].filter(Boolean).join('\n')).filter(Boolean).join('\n\n')
        : '';

    return [
        [profile.firstName, profile.lastName].filter(Boolean).join(' '),
        stringifyResumeValue(profile.summary),
        skills && `Skills: ${skills}`,
        workExperience && `Experience:\n${workExperience}`,
        education && `Education:\n${education}`,
    ].filter(Boolean).join('\n\n').trim();
};

const JOB_SITE_PATTERNS = [
    'linkedin.com/jobs',
    'indeed.com',
    'greenhouse.io',
    'jobs.lever.co',
    'myworkdayjobs.com',
    'ashbyhq.com',
    'smartrecruiters.com',
    'workable.com',
    'bamboohr.com',
    'csod.com/ux/ats/careersite',
    'cornerstoneondemand.com'
];

const CUSTOM_JOB_PATHS = [
    '/jobs/',
    '/careers/',
    '/careers-at/',
    '/apply/',
    '/positions/',
    '/job/',
    '/position/',
    '/requisition/'
];

const isLikelyJobSiteUrl = (url: string) => {
    const lowercaseUrl = url.toLowerCase();
    const isKnownJobSite = JOB_SITE_PATTERNS.some(pattern => lowercaseUrl.includes(pattern));
    const isCustomJobPage = CUSTOM_JOB_PATHS.some(path => lowercaseUrl.includes(path)) ||
        lowercaseUrl.includes('careers.') ||
        lowercaseUrl.includes('jobs.');

    return isKnownJobSite || isCustomJobPage;
};

const getDisplayHost = (url?: string | null): string => {
    if (!url) return 'Current page';

    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol === 'chrome:') return 'chrome';
        return parsedUrl.hostname.replace(/^www\./, '');
    } catch {
        return url.replace(/^https?:\/\//, '').split('/')[0] || 'Current page';
    }
};

const VALID_JOB_DESCRIPTION_MIN_LENGTH = 80;

const hasUsableJobDescription = (job?: ScrapedJob | null): boolean => {
    return Boolean(
        job?.title?.trim() &&
        job?.description?.trim() &&
        job.description.trim().length >= VALID_JOB_DESCRIPTION_MIN_LENGTH
    );
};

const isFreshActiveJobContext = (value: unknown): value is ActiveJobContextPayload => {
    const payload = value as ActiveJobContextPayload | null | undefined;
    return Boolean(
        payload?.source === 'extension_job_context' &&
        payload.expiresAt &&
        payload.expiresAt > Date.now() &&
        payload.pageUrl &&
        payload.job?.title?.trim()
    );
};

const buildFallbackJobFromTab = (tab?: { url: string; title: string } | null): ScrapedJob | null => {
    if (!tab?.url || isCareerVividAppUrl(tab.url)) return null;

    const host = getDisplayHost(tab.url);
    const rawTitle = (tab.title || '').replace(/\s+-\s+Google Chrome$/i, '').trim();
    const atMatch = rawTitle.match(/\s@\s([^|–—-]+)(?:\s*[|–—-].*)?$/);
    const company = atMatch?.[1]?.trim() || host;
    const title = rawTitle
        .replace(/\s@\s[^|–—-]+(?:\s*[|–—-].*)?$/i, '')
        .replace(/\s+\|\s+LinkedIn.*$/i, '')
        .replace(/\s+Jobs\s+\|\s+LinkedIn.*$/i, '')
        .trim();

    return {
        title: title || 'Saved job',
        company,
        location: '',
        description: '',
        url: tab.url,
    };
};

const makeStorageKey = (namespace: string, parts: Array<string | null | undefined>) => {
    const input = parts.filter(Boolean).join('|');
    let hash = 0x811c9dc5;

    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }

    return `${namespace}_${(hash >>> 0).toString(36)}`;
};

const getProfileCreditLimit = (profile: any): number => {
    if (!profile) return FREE_PLAN_CREDIT_LIMIT;

    let limit = FREE_PLAN_CREDIT_LIMIT;
    const plan = profile.plan || 'free';

    if (plan === 'pro' || plan === 'premium' || plan === 'pro_monthly' || plan === 'pro_sprint') {
        limit = PRO_PLAN_CREDIT_LIMIT;
    } else if (plan === 'max' || plan === 'pro_max') {
        limit = PRO_MAX_PLAN_CREDIT_LIMIT;
    } else if (plan === 'enterprise') {
        limit = (profile.seats || 1) * ENTERPRISE_PLAN_CREDIT_LIMIT;
    }

    return limit + (profile.promotions?.tokenCredits || 0);
};

const getProfileAIUsage = (profile: any): { count: number; limit: number } | null => {
    if (!profile) return null;

    return {
        count: Number(profile.aiUsage?.count || 0),
        limit: getProfileCreditLimit(profile),
    };
};

const ExtensionHome: React.FC = () => {
    const { userProfile: contextUserProfile, currentUser, logOut, aiUsage: contextAIUsage, loading: authLoading } = useAuth();
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
    const [isAuthResolved, setIsAuthResolved] = useState(false);
    const [localProfile, setLocalProfile] = useState<any>(null);
    const [restUserProfile, setRestUserProfile] = useState<any>(null);
    const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);
    const [hasDetectedJob, setHasDetectedJob] = useState(false);
    const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
    const [isJobContextRefreshing, setIsJobContextRefreshing] = useState(false);
    const [isLocalAuditLoading, setIsLocalAuditLoading] = useState(false);
    const [localAudit, setLocalAudit] = useState<LocalMatchAuditResult | null>(null);

    const userProfile = contextUserProfile || restUserProfile;
    const effectiveAIUsage = contextAIUsage || getProfileAIUsage(userProfile);
    const isOutOfCredits = effectiveAIUsage ? effectiveAIUsage.count >= effectiveAIUsage.limit : false;

    useEffect(() => {
        if (authLoading) return; // wait for Firebase auth to settle
        if (currentUser?.uid) {
            setResolvedUserId(currentUser.uid);
            setIsAuthResolved(true);
        } else {
            chrome.storage.local.get(['devModeAuth', 'autofillProfile', 'uid'], (res) => {
                if (res.devModeAuth) {
                    setResolvedUserId(null);
                } else if (res.uid) {
                    setResolvedUserId(res.uid);
                } else if (res.autofillProfile?.uid) {
                    setResolvedUserId(res.autofillProfile.uid);
                } else {
                    setResolvedUserId(null);
                }
                setIsAuthResolved(true);
            });
        }
    }, [currentUser, authLoading]);

    useEffect(() => {
        if (!resolvedUserId || currentUser) {
            setRestUserProfile(null);
            return;
        }

        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ type: 'FETCH_USER_PROFILE', userId: resolvedUserId }, (res) => {
                const _ = chrome.runtime.lastError;
                if (res?.success && res.profile) {
                    setRestUserProfile(res.profile);
                } else {
                    if (import.meta.env.DEV) {
                        if (res?.error === 'invalid_auth_token') {
                            console.debug('Invalid extension auth token; waiting for real CareerVivid sign-in');
                        } else {
                            console.debug('Could not fetch user profile via REST:', res?.error);
                        }
                    }
                }
            });
        }
    }, [resolvedUserId, currentUser]);

    useEffect(() => {
        const loadLocalState = () => {
            chrome.storage.local.get(['devModeAuth', 'autofillProfile', 'selectedResumeId', 'photoURL'], (res) => {
                if (res.devModeAuth) {
                    setLocalProfile(null);
                    setHasProfile(false);
                    setSelectedResumeId(null);
                    setLocalPhotoURL(null);
                    return;
                }

                setLocalProfile(res.autofillProfile || null);
                setHasProfile(!!res.autofillProfile);
                setSelectedResumeId((res.selectedResumeId as string | undefined) || null);
                setLocalPhotoURL(res.photoURL || null);
            });
        };

        loadLocalState();

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local') {
                if (changes.devModeAuth || changes.autofillProfile || changes.selectedResumeId || changes.photoURL) {
                    loadLocalState();
                }
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => chrome.storage.onChanged.removeListener(handleStorageChange);
        }
    }, []);

    const { resumes, isLoading: isLoadingResumes } = useResumes(resolvedUserId);
    const [currentTab, setCurrentTab] = useState<{ url: string; title: string } | null>(null);
    const [isJobSite, setIsJobSite] = useState(false);
    const [isApplicationPage, setIsApplicationPage] = useState(false);
    const [atsPlatform, setAtsPlatform] = useState<string | null>(null);
    const [scrapedJob, setScrapedJob] = useState<ScrapedJob | null>(null);
    const [activeJobContext, setActiveJobContext] = useState<ActiveJobContextPayload | null>(null);
    const [fillResult, setFillResult] = useState<AutoFillResult | null>(null);
    const [isFilling, setIsFilling] = useState(false);
    const [hasProfile, setHasProfile] = useState(false);
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
    const activeResume = resumes.find(resume => resume.id === selectedResumeId) || resumes[0] || null;
    const activeResumeTitle = activeResume?.title || null;
    const jobBoardQueryResult = useMemo(
        () => buildResumeSearchQuery(activeResume, localProfile || userProfile),
        [activeResume, localProfile, userProfile]
    );
    const jobBoardRoutes = useMemo(
        () => buildJobBoardRoutes(jobBoardQueryResult.query),
        [jobBoardQueryResult.query]
    );
    const resumeTextForAnalysis = useMemo(() => {
        return buildResumeTextFromResume(activeResume) || buildResumeTextFromProfile(localProfile);
    }, [activeResume, localProfile]);

    // AI Smart Fill state
    const [aiAnswers, setAiAnswers] = useState<AIAnswer[]>([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [fillAllConfirm, setFillAllConfirm] = useState(false);
    const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);

    // Mark as Applied state
    const [markedApplied, setMarkedApplied] = useState(false);

    // Phase 2: prefetch cache state
    const [prefetchReady, setPrefetchReady] = useState(false);
    const [prefetchCacheKey, setPrefetchCacheKey] = useState<string | null>(null);

    // Cover Letter state
    const [coverLetter, setCoverLetter] = useState<string>('');
    const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
    const [clError, setClError] = useState<string | null>(null);
    const [coverLetterReady, setCoverLetterReady] = useState(false);
    const [showCoverLetterPanel, setShowCoverLetterPanel] = useState(false);
    const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
    const [isPreparingTransit, setIsPreparingTransit] = useState(false);
    const [handoffAction, setHandoffAction] = useState<WorkspaceActionId | null>(null);
    const contextRequestIdRef = useRef(0);
    const lastTabUrlRef = useRef<string | null>(null);
    const activeJobContextRef = useRef<ActiveJobContextPayload | null>(null);
    const handoffTimerRef = useRef<number | null>(null);
    const canUseStoredContextForTab = Boolean(
        activeJobContext &&
        currentTab?.url &&
        (isCareerVividAppUrl(currentTab.url) || activeJobContext.pageUrl === currentTab.url)
    );
    const activeJobFromContext = canUseStoredContextForTab ? activeJobContext?.job || null : null;
    const actionableJob = scrapedJob || activeJobFromContext;
    const hasActionableJob = hasDetectedJob || hasUsableJobDescription(actionableJob);
    const actionJobSourceUrl = scrapedJob
        ? currentTab?.url || ''
        : canUseStoredContextForTab
            ? activeJobContext?.pageUrl || ''
            : currentTab?.url || '';

    const resetJobDependentState = useCallback(() => {
        setScrapedJob(null);
        setHasDetectedJob(false);
        setIsJobContextRefreshing(false);
        setIsLocalAuditLoading(false);
        setLocalAudit(null);
        setFillResult(null);
        setIsFilling(false);
        setAiAnswers([]);
        setAiError(null);
        setShowAiPanel(false);
        setFillAllConfirm(false);
        setSubmittedJobId(null);
        setMarkedApplied(false);
        setPrefetchReady(false);
        setPrefetchCacheKey(null);
        setCoverLetter('');
        setIsGeneratingCoverLetter(false);
        setClError(null);
        setCoverLetterReady(false);
        setShowCoverLetterPanel(false);
        setCopiedCoverLetter(false);
    }, []);

    const clearHandoffTimer = useCallback(() => {
        if (handoffTimerRef.current) {
            window.clearTimeout(handoffTimerRef.current);
            handoffTimerRef.current = null;
        }
    }, []);

    const beginHandoffTransition = useCallback((action: WorkspaceActionId) => {
        clearHandoffTimer();
        setHandoffAction(action);
        handoffTimerRef.current = window.setTimeout(() => {
            setHandoffAction(null);
            handoffTimerRef.current = null;
        }, 8500);
    }, [clearHandoffTimer]);

    const finishHandoffTransition = useCallback((delay = 1600) => {
        clearHandoffTimer();
        handoffTimerRef.current = window.setTimeout(() => {
            setHandoffAction(null);
            handoffTimerRef.current = null;
        }, delay);
    }, [clearHandoffTimer]);

    useEffect(() => {
        return () => clearHandoffTimer();
    }, [clearHandoffTimer]);

    useEffect(() => {
        activeJobContextRef.current = activeJobContext;
    }, [activeJobContext]);

    const loadActiveJobContext = useCallback((): Promise<ActiveJobContextPayload | null> => {
        return new Promise(resolve => {
            if (typeof chrome === 'undefined' || !chrome.storage?.local) {
                resolve(null);
                return;
            }

            chrome.storage.local.get([ACTIVE_JOB_CONTEXT_STORAGE_KEY], (stored: any) => {
                const payload = stored?.[ACTIVE_JOB_CONTEXT_STORAGE_KEY];
                if (isFreshActiveJobContext(payload)) {
                    resolve(payload);
                    return;
                }

                if (payload) {
                    chrome.storage.local.remove([ACTIVE_JOB_CONTEXT_STORAGE_KEY], () => resolve(null));
                    return;
                }

                resolve(null);
            });
        });
    }, []);

    const clearActiveJobContext = useCallback(() => {
        activeJobContextRef.current = null;
        setActiveJobContext(null);
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.remove([ACTIVE_JOB_CONTEXT_STORAGE_KEY], () => {
                const _ = chrome.runtime?.lastError;
            });
        }
    }, []);

    const refreshActiveTabContext = useCallback(() => {
        if (typeof chrome === 'undefined' || !chrome.tabs) return;

        const requestId = contextRequestIdRef.current + 1;
        contextRequestIdRef.current = requestId;
        const isCurrentRequest = () => contextRequestIdRef.current === requestId;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!isCurrentRequest()) return;

            const tab = tabs[0];
            const url = tab?.url || '';
            const title = tab?.title || '';

            if (!url) {
                lastTabUrlRef.current = null;
                setCurrentTab(null);
                setIsJobSite(false);
                setIsApplicationPage(false);
                setAtsPlatform(null);
                setHasDetectedJob(false);
                setIsJobContextRefreshing(false);
                resetJobDependentState();
                return;
            }

            const urlChanged = lastTabUrlRef.current !== url;
            if (urlChanged) {
                lastTabUrlRef.current = url;
                resetJobDependentState();
            }

            setCurrentTab({ url, title });

            if (isCareerVividAppUrl(url)) {
                setIsJobSite(false);
                setIsApplicationPage(false);
                setAtsPlatform(null);
                setIsJobContextRefreshing(true);
                loadActiveJobContext().then((payload) => {
                    if (!isCurrentRequest()) return;
                    setIsJobContextRefreshing(false);

                    if (payload) {
                        setActiveJobContext(payload);
                        setScrapedJob(payload.job);
                        setHasDetectedJob(hasUsableJobDescription(payload.job));
                        setIsJobSite(true);
                        return;
                    }

                    const existingPayload = activeJobContextRef.current;
                    if (isFreshActiveJobContext(existingPayload)) {
                        setScrapedJob(existingPayload.job);
                        setHasDetectedJob(hasUsableJobDescription(existingPayload.job));
                        setIsJobSite(true);
                        return;
                    }

                    setScrapedJob(null);
                    setHasDetectedJob(false);
                });
                return;
            }

            setIsJobSite(isLikelyJobSiteUrl(url));

            const cacheKey = makeStorageKey('prefetch', [url]);
            const clCacheKey = makeStorageKey('coverletter', [url]);
            setPrefetchCacheKey(cacheKey);
            chrome.storage.local.get([cacheKey, clCacheKey], (cached: any) => {
                if (!isCurrentRequest()) return;

                const hitAnswers = cached[cacheKey];
                const hitCL = cached[clCacheKey];
                const TTL = 30 * 60 * 1000;

                if (hitAnswers && (Date.now() - hitAnswers.cachedAt) < TTL && hitAnswers.answers?.length) {
                    setPrefetchReady(true);
                    setAiAnswers(hitAnswers.answers);
                }

                if (hitCL && (Date.now() - hitCL.cachedAt) < TTL && hitCL.content) {
                    setCoverLetter(hitCL.content);
                    setCoverLetterReady(true);
                }
            });

            if (!tab?.id) return;

            setIsJobContextRefreshing(true);
            const verifyJobContextWithRetry = (attempt = 0) => {
                chrome.tabs.sendMessage(tab.id!, { type: 'VERIFY_JOB_CONTEXT' }, (response) => {
                    const _ = chrome.runtime.lastError;
                    if (!isCurrentRequest()) return;

                    const hasUsableResponse = response?.hasDetectedJob === true || hasUsableJobDescription(response?.job);
                    const shouldRetry = !hasUsableResponse && attempt < 2 && isLikelyJobSiteUrl(url);

                    if (shouldRetry) {
                        window.setTimeout(() => {
                            if (isCurrentRequest()) {
                                verifyJobContextWithRetry(attempt + 1);
                            }
                        }, attempt === 0 ? 650 : 1250);
                        return;
                    }

                    setIsJobContextRefreshing(false);

                    if (response?.job) {
                        clearActiveJobContext();
                        setScrapedJob(response.job);
                        setHasDetectedJob(response.hasDetectedJob === true || hasUsableJobDescription(response.job));
                        setIsJobSite(response.hasDetectedJob === true || response.hasJobMetadata === true || isLikelyJobSiteUrl(url));
                        return;
                    }

                    setScrapedJob(null);
                    setHasDetectedJob(false);
                    setLocalAudit(null);
                });
            };
            verifyJobContextWithRetry();

            chrome.tabs.sendMessage(tab.id, { type: 'GET_ATS_CONTEXT' }, (response) => {
                const _ = chrome.runtime.lastError;
                if (!isCurrentRequest()) return;

                if (response?.context) {
                    setIsApplicationPage(response.context.isApplicationPage);
                    setAtsPlatform(response.context.platform);
                    if (response.context.isApplicationPage || response.context.platform) {
                        setIsJobSite(true);
                    }
                    return;
                }

                setIsApplicationPage(false);
                setAtsPlatform(null);
            });
        });
    }, [clearActiveJobContext, loadActiveJobContext, resetJobDependentState]);

    useEffect(() => {
        if (!hasActionableJob || !actionableJob?.description || !resumeTextForAnalysis.trim()) {
            setLocalAudit(null);
            setIsLocalAuditLoading(false);
            return;
        }

        setIsLocalAuditLoading(true);
        const timer = window.setTimeout(() => {
            setLocalAudit(buildLocalMatchAudit(resumeTextForAnalysis, actionableJob.description || ''));
            setIsLocalAuditLoading(false);
        }, 140);

        return () => window.clearTimeout(timer);
    }, [hasActionableJob, actionableJob?.description, resumeTextForAnalysis]);

    useEffect(() => {
        if (hasActionableJob && isDiscoveryModalOpen) {
            setIsDiscoveryModalOpen(false);
        }
    }, [hasActionableJob, isDiscoveryModalOpen]);

    useEffect(() => {
        if (
            handoffAction &&
            currentTab?.url &&
            isCareerVividAppUrl(currentTab.url) &&
            hasActionableJob &&
            !isJobContextRefreshing
        ) {
            finishHandoffTransition(1400);
        }
    }, [currentTab?.url, finishHandoffTransition, handoffAction, hasActionableJob, isJobContextRefreshing]);

    // Listen for FILL_COMPLETE from content script
    useEffect(() => {
        const handleMessage = (message: any) => {
            if (message.type === 'AUTH_STATE_CHANGED') {
                // Reload the side panel so auth state, gates, and data are all fresh
                window.location.reload();
                return;
            }
            if (message.type === 'FILL_COMPLETE') {
                setFillResult(message.result);
                setIsFilling(false);
                if (!submittedJobId && scrapedJob) {
                    setSubmittedJobId(window.location.href);
                }
            }
            if (message.type === 'JOB_CONTEXT_LOADING') {
                setIsJobContextRefreshing(true);
            }
            if (message.type === 'JOB_CONTEXT_CHANGED') {
                const applyJobContext = (url: string, title: string) => {
                    if (url && lastTabUrlRef.current !== url) {
                        lastTabUrlRef.current = url;
                        resetJobDependentState();
                    }
                    if (url) {
                        setCurrentTab({ url, title });
                        setPrefetchCacheKey(makeStorageKey('prefetch', [url]));
                    }
                    if (message.job) {
                        clearActiveJobContext();
                    }
                    setScrapedJob(message.job || null);
                    setHasDetectedJob(message.hasDetectedJob === true || hasUsableJobDescription(message.job));
                    setIsJobContextRefreshing(false);
                    setIsApplicationPage(!!message.context?.isApplicationPage);
                    setAtsPlatform(message.context?.platform || null);
                    setIsJobSite(!!message.job || !!message.context?.isApplicationPage || !!message.context?.platform || isLikelyJobSiteUrl(url));
                };

                if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        const activeUrl = tabs[0]?.url || '';
                        if (message.url && activeUrl && message.url !== activeUrl) return;
                        applyJobContext(activeUrl || message.url || '', tabs[0]?.title || message.title || '');
                    });
                } else {
                    applyJobContext(message.url || '', message.title || '');
                }
            }
        };
        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, [submittedJobId, scrapedJob, clearActiveJobContext, resetJobDependentState]);

    // On mount: get tab info, ATS context, cached profile, prefetch cache
    useEffect(() => {
        refreshActiveTabContext();

        chrome.storage.local.get(['autofillProfile', 'selectedResumeId'], (result) => {
            setHasProfile(!!result.autofillProfile);
            setSelectedResumeId((result.selectedResumeId as string | undefined) || null);
        });
    }, [refreshActiveTabContext]);

    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.tabs) return;

        const handleActivated = () => {
            refreshActiveTabContext();
        };

        const handleUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (changeInfo.status === 'complete' || changeInfo.url) {
                refreshActiveTabContext();
            }
        };

        chrome.tabs.onActivated.addListener(handleActivated);
        chrome.tabs.onUpdated.addListener(handleUpdated);

        return () => {
            chrome.tabs.onActivated.removeListener(handleActivated);
            chrome.tabs.onUpdated.removeListener(handleUpdated);
        };
    }, [refreshActiveTabContext]);

    // Auto-sync profile when resumes are loaded
    useEffect(() => {
        if (!resolvedUserId || !resumes.length || hasProfile) return;
        const defaultResume = resumes[0];
        if (defaultResume?.id) {
            chrome.runtime.sendMessage({
                type: 'SYNC_PROFILE',
                userId: resolvedUserId,
                resumeId: defaultResume.id,
            }, (res) => {
                const _ = chrome.runtime.lastError;
                if (res?.success) {
                    setHasProfile(true);
                    setSelectedResumeId(defaultResume.id!);
                }
            });
        }
    }, [resolvedUserId, resumes, hasProfile]);

    const handleSmartFill = useCallback(() => {
        if (!currentTab) return;

        if (prefetchReady && aiAnswers.length > 0) {
            setShowAiPanel(true);
            setFillAllConfirm(false);
            return;
        }

        if (isOutOfCredits) {
            setAiError("You have reached your monthly AI credit limit. Please upgrade to CareerVivid Pro to get unlimited answers.");
            return;
        }

        setIsGeneratingAI(true);
        setAiError(null);
        setShowAiPanel(false);
        setAiAnswers([]);
        setFillAllConfirm(false);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) {
                setAiError('No active tab found.');
                setIsGeneratingAI(false);
                return;
            }

            chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_FORM_QUESTIONS' }, (response) => {
                const _ = chrome.runtime.lastError;
                const questions = response?.questions || [];

                if (questions.length === 0) {
                    setAiError(null);
                    setIsGeneratingAI(false);
                    return;
                }

                chrome.runtime.sendMessage({
                    type: 'GENERATE_AI_ANSWERS',
                    questions,
                    companyName: scrapedJob?.company || document.title,
                    jobTitle: scrapedJob?.title || 'Unknown Role',
                    jobDescription: scrapedJob?.description || '',
                }, (res) => {
                    const _ = chrome.runtime.lastError;
                    setIsGeneratingAI(false);
                    if (res?.success && res.answers) {
                        setAiAnswers(res.answers);
                        setShowAiPanel(true);
                        if (prefetchCacheKey) {
                            chrome.storage.local.set({
                                [prefetchCacheKey]: {
                                    answers: res.answers,
                                    aiCount: res.aiCount || 0,
                                    companyName: scrapedJob?.company || '',
                                    jobTitle: scrapedJob?.title || '',
                                    pageUrl: currentTab.url,
                                    cachedAt: Date.now(),
                                },
                            });
                            setPrefetchReady(true);
                        }
                    } else {
                        setAiError(res?.error || 'Failed to generate AI answers. Please try again.');
                    }
                });
            });
        });
    }, [currentTab, scrapedJob, prefetchReady, aiAnswers, prefetchCacheKey, isOutOfCredits]);

    const handleInjectAnswer = useCallback((answer: AIAnswer) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) return;
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'INJECT_ANSWER',
                label: answer.label,
                value: answer.answer,
            }, () => {
                const _ = chrome.runtime.lastError;
            });
            setAiAnswers(prev => prev.map(a =>
                a.label === answer.label ? { ...a, injected: true } : a
            ));
        });
    }, []);

    const handleFillAll = useCallback(() => {
        if (!fillAllConfirm) {
            setFillAllConfirm(true);
            return;
        }
        const toInject = aiAnswers.filter(a => a.answer && a.source !== 'skipped');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]?.id) return;
            toInject.forEach(answer => {
                chrome.tabs.sendMessage(tabs[0]!.id!, {
                    type: 'INJECT_ANSWER',
                    label: answer.label,
                    value: answer.answer,
                }, () => {
                    const _ = chrome.runtime.lastError;
                });
            });
            setAiAnswers(prev => prev.map(a =>
                toInject.some(t => t.label === a.label) ? { ...a, injected: true } : a
            ));
            setFillAllConfirm(false);
        });
    }, [aiAnswers, fillAllConfirm]);

    const handleAutofill = useCallback(() => {
        if (!hasProfile) {
            if (resolvedUserId && resumes[0]?.id) {
                setIsFilling(true);
                chrome.runtime.sendMessage({
                    type: 'SYNC_PROFILE',
                    userId: resolvedUserId,
                    resumeId: resumes[0].id!,
                }, (res) => {
                    const _ = chrome.runtime.lastError;
                    if (res?.success) {
                        setHasProfile(true);
                        chrome.runtime.sendMessage({ type: 'AUTOFILL_APPLICATION' }, () => {
                            const _ = chrome.runtime.lastError;
                        });
                    } else {
                        setIsFilling(false);
                    }
                });
            }
            return;
        }
        setIsFilling(true);
        setFillResult(null);
        chrome.runtime.sendMessage({ type: 'AUTOFILL_APPLICATION' }, (res) => {
            const _ = chrome.runtime.lastError;
            if (res?.error) {
                setIsFilling(false);
            }
        });
    }, [hasProfile, resolvedUserId, resumes]);

    const openDiscoveryModal = useCallback(() => {
        setIsDiscoveryModalOpen(true);
    }, []);

    const handleMarkApplied = useCallback(() => {
        if (!hasActionableJob) {
            openDiscoveryModal();
            return;
        }
        if (markedApplied) return;
        setMarkedApplied(true);
        chrome.runtime.sendMessage({
            type: 'UPDATE_JOB_STATUS',
            url: actionJobSourceUrl || currentTab?.url || '',
            title: actionableJob?.title || '',
            company: actionableJob?.company || '',
            status: 'Applied',
            stage: 'applied',
        }, () => { const _ = chrome.runtime.lastError; });
    }, [hasActionableJob, markedApplied, actionJobSourceUrl, currentTab, actionableJob, openDiscoveryModal]);

    const getSelectedResumeContext = () => {
        const activeResume = resumes.find(resume => resume.id === selectedResumeId) || resumes[0];
        return {
            resumeId: activeResume?.id || selectedResumeId || '',
            resumeTitle: activeResume?.title || '',
        };
    };

    const persistActiveJobContext = (job: ScrapedJob, pageUrl: string, pageTitle?: string): Promise<ActiveJobContextPayload> => {
        const resumeContext = getSelectedResumeContext();
        const payload: ActiveJobContextPayload = {
            source: 'extension_job_context',
            contextId: `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + 1000 * 60 * 60 * 24,
            pageUrl,
            pageTitle: pageTitle || job.title || getDisplayHost(pageUrl),
            job: {
                title: job.title || 'Saved job',
                company: job.company || getDisplayHost(pageUrl),
                location: job.location || '',
                description: job.description || '',
                salary: job.salary || '',
            },
            resumeId: resumeContext.resumeId,
            resumeTitle: resumeContext.resumeTitle,
        };

        return new Promise(resolve => {
            chrome.storage.local.set({ [ACTIVE_JOB_CONTEXT_STORAGE_KEY]: payload }, () => {
                activeJobContextRef.current = payload;
                setActiveJobContext(payload);
                resolve(payload);
            });
        });
    };

    const buildTrackerTransitPayload = (job: ScrapedJob, url: string, stage?: string): TrackerTransitPayload => {
        const resumeContext = getSelectedResumeContext();

        return {
            source: 'extension_tracker',
            transitId: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            createdAt: new Date().toISOString(),
            expiresAt: Date.now() + 1000 * 60 * 60 * 24,
            url,
            title: job.title || 'Saved job',
            company: job.company || getDisplayHost(url),
            location: job.location || '',
            salary: job.salary || '',
            fallbackDescription: job.description || '',
            stage: stage || 'wishlist',
            resumeId: resumeContext.resumeId,
            resumeTitle: resumeContext.resumeTitle,
        };
    };

    const buildTrackerTransitPathFromPayload = (payload: TrackerTransitPayload) => {
        const params = new URLSearchParams({
            source: payload.source,
            localTransitId: payload.transitId,
            url: payload.url,
            stage: payload.stage,
        });

        if (payload.title) params.set('title', payload.title);
        if (payload.company) params.set('company', payload.company);
        if (payload.location) params.set('location', payload.location);
        if (payload.salary) params.set('salary', payload.salary);
        if (payload.resumeId) params.set('resumeId', payload.resumeId);
        if (payload.resumeTitle) params.set('resumeTitle', payload.resumeTitle);
        if (payload.fallbackDescription && payload.fallbackDescription.length <= 1500) {
            params.set('fallbackDescription', payload.fallbackDescription);
        }

        return `/job-tracker?${params.toString()}`;
    };

    const persistTrackerTransitPayload = (payload: TrackerTransitPayload): Promise<void> => {
        return new Promise(resolve => {
            chrome.storage.local.get(['trackedJobs'], (stored: any) => {
                const trackedJobs = Array.isArray(stored.trackedJobs) ? stored.trackedJobs : [];
                const localEntry = {
                    title: payload.title,
                    company: payload.company,
                    location: payload.location,
                    salary: payload.salary,
                    description: payload.fallbackDescription,
                    url: payload.url,
                    stage: payload.stage,
                    status: 'saved',
                    source: 'extension_tracker',
                    transitId: payload.transitId,
                    savedAt: payload.createdAt,
                };
                const dedupedJobs = trackedJobs.filter((job: any) => {
                    if (payload.url && job?.url === payload.url) return false;
                    return !(job?.title === payload.title && job?.company === payload.company);
                });

                chrome.storage.local.set({
                    pendingTrackerTransitPayload: payload,
                    trackedJobs: [localEntry, ...dedupedJobs].slice(0, 100),
                }, () => resolve());
            });
        });
    };

    const handleAction = async (action: string, stage?: string) => {
        const saveFallbackJob = buildFallbackJobFromTab(currentTab);
        const jobForAction = actionableJob || saveFallbackJob;
        const sourceUrlForAction = actionJobSourceUrl || currentTab?.url || activeJobContext?.pageUrl || '';
        const sourceTitleForAction = activeJobContext?.pageTitle || currentTab?.title || jobForAction?.title || '';
        const canSaveFromCurrentPage = action === 'save_job' && Boolean(
            sourceUrlForAction &&
            jobForAction &&
            (actionableJob || isCareerVividAppUrl(currentTab?.url || '') || (saveFallbackJob && (isJobSite || isApplicationPage || isLikelyJobSiteUrl(currentTab?.url || ''))))
        );
        const jobBoundActions = new Set<WorkspaceActionId>(['tailor_resume', 'practice_interview', 'cover_letter']);
        const workspaceAction = action as WorkspaceActionId;
        if (jobBoundActions.has(workspaceAction) && !hasActionableJob) {
            openDiscoveryModal();
            return;
        }

        if (action === 'save_job' && !canSaveFromCurrentPage) {
            openDiscoveryModal();
            return;
        }

        if ((action === 'save_job' || jobBoundActions.has(workspaceAction)) && jobForAction && sourceUrlForAction) {
            beginHandoffTransition(workspaceAction);
        }

        if ((action === 'save_job' || jobBoundActions.has(workspaceAction)) && jobForAction && sourceUrlForAction) {
            await persistActiveJobContext(jobForAction, sourceUrlForAction, sourceTitleForAction);
        }

        if (action === 'save_job' && sourceUrlForAction) {
            const jobForTracker = jobForAction;
            if (!jobForTracker) {
                openDiscoveryModal();
                return;
            }
            const trackerTransitPayload = buildTrackerTransitPayload(jobForTracker, sourceUrlForAction, stage);
            await persistTrackerTransitPayload(trackerTransitPayload);

            if (!resolvedUserId) {
                window.open(getAppUrl(buildTrackerTransitPathFromPayload(trackerTransitPayload)), '_blank');
                finishHandoffTransition(1600);
                return;
            }
            try {
                setIsPreparingTransit(true);
                const tokenRes = await new Promise<{ firebaseIdToken?: string }>(resolve => {
                    chrome.storage.local.get(['firebaseIdToken'], resolve);
                });
                const token = tokenRes.firebaseIdToken;

                if (!token || token === 'mock-dev-id-token') {
                    window.open(getAppUrl(buildTrackerTransitPathFromPayload(trackerTransitPayload)), '_blank');
                    return;
                }

                const resumeContext = getSelectedResumeContext();
                const res = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'CREATE_TRANSIT_DOC',
                        userId: resolvedUserId,
                        job: {
                            title: jobForTracker.title || '',
                            company: jobForTracker.company || '',
                            location: jobForTracker.location || '',
                            description: jobForTracker.description || '',
                            url: sourceUrlForAction,
                            salary: jobForTracker.salary || '',
                            stage: stage || 'wishlist',
                            resumeId: resumeContext.resumeId,
                            resumeTitle: resumeContext.resumeTitle,
                            localTransitId: trackerTransitPayload.transitId,
                        }
                    }, (response) => {
                        const _ = chrome.runtime.lastError;
                        resolve(response);
                    });
                });

                if (!res?.success || !res?.scrapeId) {
                    throw new Error(res?.error || 'Failed to create transit doc');
                }

                window.open(getAppUrl(`/job-tracker?source=extension_tracker&scrapeId=${res.scrapeId}&localTransitId=${trackerTransitPayload.transitId}`), '_blank');
            } catch (error: any) {
                if (import.meta.env.DEV) {
                    console.debug('Error creating transit doc:', error);
                }
                window.open(getAppUrl(buildTrackerTransitPathFromPayload(trackerTransitPayload)), '_blank');
            } finally {
                setIsPreparingTransit(false);
                finishHandoffTransition(1600);
            }
        } else if (action === 'tailor_resume' && jobForAction) {
            if (!resolvedUserId) {
                setHandoffAction(null);
                alert('Please sign in to CareerVivid before tailoring your resume.');
                window.open(getAppUrl('/login'), '_blank');
                return;
            }
            try {
                setIsPreparingTransit(true);
                const tokenRes = await new Promise<{ firebaseIdToken?: string }>(resolve => {
                    chrome.storage.local.get(['firebaseIdToken'], resolve);
                });
                const token = tokenRes.firebaseIdToken;

                if (!token || token === 'mock-dev-id-token') {
                    alert('Please sign in to CareerVivid before tailoring your resume.');
                    window.open(getAppUrl('/signin'), '_blank');
                    setIsPreparingTransit(false);
                    return;
                }

                const resumeContext = getSelectedResumeContext();
                const res = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'CREATE_TRANSIT_DOC',
                        userId: resolvedUserId,
                        job: {
                            title: jobForAction.title || '',
                            company: jobForAction.company || '',
                            description: jobForAction.description || '',
                            url: sourceUrlForAction,
                            resumeId: resumeContext.resumeId,
                            resumeTitle: resumeContext.resumeTitle,
                        }
                    }, (response) => {
                        const _ = chrome.runtime.lastError;
                        resolve(response);
                    });
                });

                if (!res?.success || !res?.scrapeId) {
                    throw new Error(res?.error || 'Failed to create transit doc');
                }

                const targetResumeId = selectedResumeId || resumes[0]?.id;
                if (targetResumeId) {
                    window.open(getAppUrl(`/edit/${targetResumeId}?source=extension_tailor&scrapeId=${res.scrapeId}`), '_blank');
                } else {
                    window.open(getAppUrl(`/newresume?source=extension_tailor&scrapeId=${res.scrapeId}`), '_blank');
                }
            } catch (error: any) {
                const targetResumeId = selectedResumeId || resumes[0]?.id;
                chrome.storage.local.set({ pending_tailor_jd: jobForAction.description || '' }, () => {
                    if (targetResumeId) {
                        window.open(getAppUrl(`/edit/${targetResumeId}?source=extension_tailor&jobTitle=${encodeURIComponent(jobForAction.title)}&fallbackDescription=${encodeURIComponent(jobForAction.description || '')}`), '_blank');
                    } else {
                        window.open(getAppUrl(`/newresume?source=extension_tailor&jobTitle=${encodeURIComponent(jobForAction.title)}&fallbackDescription=${encodeURIComponent(jobForAction.description || '')}`), '_blank');
                    }
                });
            } finally {
                setIsPreparingTransit(false);
                finishHandoffTransition(1600);
            }
        } else if (action === 'practice_interview' && jobForAction) {
            if (!resolvedUserId) {
                setHandoffAction(null);
                alert('Please sign in to CareerVivid before practicing interviews.');
                window.open(getAppUrl('/login'), '_blank');
                return;
            }
            try {
                setIsPreparingTransit(true);
                const tokenRes = await new Promise<{ firebaseIdToken?: string }>(resolve => {
                    chrome.storage.local.get(['firebaseIdToken'], resolve);
                });
                const token = tokenRes.firebaseIdToken;

                if (!token || token === 'mock-dev-id-token') {
                    alert('Please sign in to CareerVivid before practicing interviews.');
                    window.open(getAppUrl('/signin'), '_blank');
                    setIsPreparingTransit(false);
                    return;
                }

                const resumeContext = getSelectedResumeContext();
                const res = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'CREATE_TRANSIT_DOC',
                        userId: resolvedUserId,
                        job: {
                            title: jobForAction.title || '',
                            company: jobForAction.company || '',
                            description: jobForAction.description || '',
                            url: sourceUrlForAction,
                            resumeId: resumeContext.resumeId,
                            resumeTitle: resumeContext.resumeTitle,
                        }
                    }, (response) => {
                        const _ = chrome.runtime.lastError;
                        resolve(response);
                    });
                });

                if (!res?.success || !res?.scrapeId) {
                    throw new Error(res?.error || 'Failed to create transit doc');
                }

                const targetResumeId = selectedResumeId || resumes[0]?.id;
                if (targetResumeId) {
                    window.open(getAppUrl(`/interview-studio?source=extension_practice&scrapeId=${res.scrapeId}&resumeId=${targetResumeId}`), '_blank');
                } else {
                    window.open(getAppUrl(`/interview-studio?source=extension_practice&scrapeId=${res.scrapeId}`), '_blank');
                }
            } catch (error: any) {
                const targetResumeId = selectedResumeId || resumes[0]?.id;
                const cleanTitle = jobForAction.title ? encodeURIComponent(jobForAction.title.replace(/\(.*\)/, '').trim()) : 'General';
                if (targetResumeId) {
                    window.open(getAppUrl(`/interview-studio/new?role=${cleanTitle}&resumeId=${targetResumeId}`), '_blank');
                } else {
                    window.open(getAppUrl(`/interview-studio/new?role=${cleanTitle}`), '_blank');
                }
            } finally {
                setIsPreparingTransit(false);
                finishHandoffTransition(1600);
            }
        } else if (action === 'cover_letter' && jobForAction) {
            if (!resolvedUserId) {
                setHandoffAction(null);
                alert('Please sign in to CareerVivid before generating a cover letter.');
                window.open(getAppUrl('/login'), '_blank');
                return;
            }
            try {
                setIsPreparingTransit(true);
                const tokenRes = await new Promise<{ firebaseIdToken?: string }>(resolve => {
                    chrome.storage.local.get(['firebaseIdToken'], resolve);
                });
                const token = tokenRes.firebaseIdToken;

                const fallbackResumeId = selectedResumeId || resumes[0]?.id;
                if (!token || token === 'mock-dev-id-token') {
                    if (fallbackResumeId) {
                        window.open(getAppUrl(`/edit/${fallbackResumeId}?coverLetter=1`), '_blank');
                    } else {
                        window.open(getAppUrl('/dashboard'), '_blank');
                    }
                    setIsPreparingTransit(false);
                    return;
                }

                const resumeContext = getSelectedResumeContext();
                const res = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'CREATE_TRANSIT_DOC',
                        userId: resolvedUserId,
                        job: {
                            title: jobForAction.title || '',
                            company: jobForAction.company || '',
                            description: jobForAction.description || '',
                            url: sourceUrlForAction,
                            stage: 'applying',
                            resumeId: resumeContext.resumeId,
                            resumeTitle: resumeContext.resumeTitle,
                        }
                    }, (response) => {
                        const _ = chrome.runtime.lastError;
                        resolve(response);
                    });
                });

                if (!res?.success || !res?.scrapeId) {
                    throw new Error(res?.error || 'Failed to create transit doc');
                }

                const targetResumeId = selectedResumeId || resumes[0]?.id;
                if (targetResumeId) {
                    window.open(getAppUrl(`/edit/${targetResumeId}?source=extension_cl&scrapeId=${res.scrapeId}`), '_blank');
                } else {
                    window.open(getAppUrl(`/newresume?source=extension_cl&scrapeId=${res.scrapeId}`), '_blank');
                }
            } catch {
                const fallbackId = selectedResumeId || resumes[0]?.id;
                if (fallbackId) {
                    window.open(getAppUrl(`/edit/${fallbackId}?coverLetter=1`), '_blank');
                } else {
                    window.open(getAppUrl('/dashboard'), '_blank');
                }
            } finally {
                setIsPreparingTransit(false);
                finishHandoffTransition(1600);
            }
        } else if (action === 'new_resume') {
            window.open(getResumeBuilderUrl(), '_blank');
        }
    };

    const hasNoResumes = !isLoadingResumes && resumes.length === 0;
    const isGuest = isAuthResolved && !resolvedUserId;
    const needsResume = isAuthResolved && !!resolvedUserId && !isLoadingResumes && resumes.length === 0;
    const activeHost = getDisplayHost(canUseStoredContextForTab ? activeJobContext?.pageUrl : currentTab?.url);
    const shouldShowJobWorkspace = hasActionableJob && Boolean(actionableJob);
    const isHandoffActive = Boolean(handoffAction || isPreparingTransit);
    const isActionBusy = (action: WorkspaceActionId) => handoffAction === action;
    const emptyStateLabel = isJobContextRefreshing
        ? 'Scanning job page'
        : isJobSite
            ? 'No job detected'
            : 'Unsupported page';
    const emptyStateTitle = isJobSite
        ? 'Reading this job page'
        : 'Open a job page to unlock actions';
    const emptyStateDescription = isJobContextRefreshing
        ? 'CareerVivid is checking the active job detail pane.'
        : 'Save, tailor, cover letters, and mock interviews need a live job description.';
    const getActionCardClass = (action: WorkspaceActionId, hoverBorderClass: string) => {
        const active = isActionBusy(action);
        return [
            'group flex min-h-[148px] flex-col items-start p-2.5 rounded-[22px] border shadow-[0_12px_26px_rgba(15,23,42,0.05)] transition-all duration-300 disabled:cursor-wait disabled:opacity-75 dark:shadow-none',
            active
                ? 'border-[#a7a2f0] bg-[#fbfbff] shadow-[0_16px_30px_rgba(98,91,213,0.13)] dark:border-[#6862a7] dark:bg-[#302f49]/55'
                : `border-[#dce2ec] bg-white hover:shadow-[0_16px_30px_rgba(15,23,42,0.07)] ${hoverBorderClass} dark:border-[#3a3834] dark:bg-[#262522] dark:hover:bg-[#302e2a]`,
        ].join(' ');
    };

    // ── Gate: Loading ──────────────────────────────────────────────────────────
    if (!isAuthResolved || authLoading) {
        return (
            <div className="min-h-[540px] h-screen w-full bg-[#f8f8fb] flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4a4392] flex items-center justify-center shadow-[0_10px_20px_rgba(98,91,213,0.16)]">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <p className="text-xs font-semibold text-gray-400">Loading CareerVivid...</p>
            </div>
        );
    }

    // ── Gate: Sign In ──────────────────────────────────────────────────────────
    if (isGuest) {
        return (
            <div className="min-h-[540px] h-screen w-full bg-[#f8f8fb] flex flex-col font-sans text-gray-900 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    {/* Logo mark */}
                    <div className="w-14 h-14 rounded-2xl bg-[#4a4392] flex items-center justify-center shadow-[0_14px_28px_rgba(98,91,213,0.18)] mb-5">
                        <Wand2 className="w-7 h-7 text-white" />
                    </div>

                    <h1 className="text-xl font-semibold text-gray-950 leading-tight dark:text-[#f4f1e9]">
                        Sign in to unlock<br />your job search tools
                    </h1>
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed max-w-[230px] dark:text-[#aaa39a]">
                        Track jobs, match your resume to roles, and prepare tailored application materials.
                    </p>

                    {/* Value props */}
                    <div className="mt-5 w-full max-w-[260px] space-y-2 text-left">
                        {[
                            { icon: Briefcase, text: 'Save roles into your job tracker' },
                            { icon: Target, text: 'AI resume match score and keyword analysis' },
                            { icon: MessageSquareText, text: 'Support for application questions' },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-2.5 bg-white rounded-2xl px-3 py-2.5 border border-[#ececf4] shadow-sm dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
                                <span className="h-6 w-6 rounded-xl bg-[#eef0ff] text-[#4a4392] flex items-center justify-center flex-shrink-0 dark:bg-[#302f49] dark:text-[#b8b3ff]">
                                    <Icon size={12} />
                                </span>
                                <span className="text-[11px] font-semibold text-gray-700 dark:text-[#f4f1e9]">{text}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div className="mt-6 w-full max-w-[260px] space-y-2.5">
                        <button
                            onClick={() => window.open(getAppUrl('/login'), '_blank')}
                            className="w-full py-3 rounded-2xl bg-[#4a4392] hover:bg-[#5851c8] text-white font-semibold text-sm shadow-[0_12px_24px_rgba(98,91,213,0.18)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Sign in to CareerVivid
                        </button>
                        <button
                            onClick={() => window.open(getAppUrl('/signup'), '_blank')}
                            className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#f8f8fb] text-gray-700 font-semibold text-sm border border-[#ececf4] shadow-sm transition-all hover:border-[#d9d7fb] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#f4f1e9] dark:shadow-none dark:hover:border-[#4d4a73] dark:hover:bg-[#302e2a]"
                        >
                            Create free account
                        </button>
                    </div>
                </div>

                <footer className="px-6 pb-5 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-[#aaa39a]">Free forever · No credit card required</p>
                </footer>
            </div>
        );
    }

    // ── Gate: No Resumes ───────────────────────────────────────────────────────
    if (needsResume) {
        return (
            <div className="min-h-[540px] h-screen w-full bg-[#f8f8fb] flex flex-col font-sans text-gray-900 dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-[#4a4392] flex items-center justify-center shadow-[0_14px_28px_rgba(98,91,213,0.18)] mb-5">
                        <FileText className="w-7 h-7 text-white" />
                    </div>

                    <h1 className="text-xl font-semibold text-gray-950 leading-tight dark:text-[#f4f1e9]">
                        Create your first resume
                    </h1>
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed max-w-[230px] dark:text-[#aaa39a]">
                        CareerVivid needs a base resume to power AI matching and tailored materials.
                    </p>

                    {/* Steps */}
                    <div className="mt-5 w-full max-w-[260px] space-y-2 text-left">
                        {[
                            '1. Build or import your base resume',
                            '2. Return here to match your next job',
                            '3. Get AI match scores and smart answers',
                        ].map((step) => (
                            <div key={step} className="flex items-center gap-2.5 bg-white rounded-2xl px-3 py-2.5 border border-[#ececf4] shadow-sm dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
                                <span className="text-[11px] font-semibold text-gray-700 dark:text-[#f4f1e9]">{step}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTAs */}
                    <div className="mt-6 w-full max-w-[260px] space-y-2.5">
                        <button
                            onClick={() => window.open(getResumeBuilderUrl(), '_blank')}
                            className="w-full py-3 rounded-2xl bg-[#4a4392] hover:bg-[#5851c8] text-white font-semibold text-sm shadow-[0_12px_24px_rgba(98,91,213,0.18)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Build my resume
                        </button>
                        <button
                            onClick={() => window.open(getAppUrl('/dashboard'), '_blank')}
                            className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#f8f8fb] text-gray-700 font-semibold text-sm border border-[#ececf4] shadow-sm transition-all hover:border-[#d9d7fb] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#f4f1e9] dark:shadow-none dark:hover:border-[#4d4a73] dark:hover:bg-[#302e2a]"
                        >
                            Open dashboard
                        </button>
                    </div>
                </div>

                <footer className="px-6 pb-5 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-[#aaa39a]">Signed in as {currentUser?.email || 'your account'}</p>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-[540px] h-screen w-full bg-[#f8f8fb] flex flex-col font-sans text-gray-900 relative overflow-hidden dark:bg-[#1f1f1d] dark:text-[#f4f1e9]">
            {/* Modular Header */}
            <ExtensionHeader
                userProfile={userProfile}
                currentUser={currentUser}
                localPhotoURL={localPhotoURL}
                localProfile={localProfile}
            />

            <main className="flex-1 px-3.5 py-3 space-y-3 overflow-y-auto">

                {/* ── AI Credit Error Banner ── */}
                {aiError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 flex items-start gap-2.5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                        <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center dark:bg-amber-900/60">
                            <span className="text-amber-600 text-[11px] font-semibold dark:text-amber-300">!</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-800 leading-snug dark:text-amber-200">{aiError}</p>
                            <button
                                onClick={() => window.open('https://careervivid.app/subscription', '_blank')}
                                className="mt-1.5 text-[10px] font-semibold text-[#4a4392] hover:text-[#4f4a9f] transition-colors underline underline-offset-2 dark:text-[#b8b3ff] dark:hover:text-[#d8d5ff]"
                            >
                                Upgrade to CareerVivid Pro →
                            </button>
                        </div>
                        <button
                            onClick={() => setAiError(null)}
                            className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors mt-0.5 dark:text-amber-400 dark:hover:text-amber-200"
                            aria-label="Dismiss"
                        >
                            <span className="text-sm leading-none">×</span>
                        </button>
                    </div>
                )}

                {!shouldShowJobWorkspace && (
                    <div className="flex items-center gap-3 rounded-full border border-[#dce2ec] bg-white px-3.5 py-3 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#f4f1e9]">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#94a3b8]" />
                        <Search size={18} className="flex-shrink-0 text-[#43546d] dark:text-[#c9c3ba]" />
                        <span className="min-w-0 flex-1 truncate text-base font-semibold text-[#43546d] dark:text-[#f4f1e9]">
                            {emptyStateLabel}
                        </span>
                        <span className="max-w-[132px] truncate text-sm font-semibold text-[#6b7280] dark:text-[#aaa39a]">
                            {activeHost}
                        </span>
                    </div>
                )}

                {isHandoffActive && shouldShowJobWorkspace && (
                    <WorkspaceHandoffCard
                        action={handoffAction}
                        jobTitle={actionableJob?.title}
                    />
                )}

                {shouldShowJobWorkspace ? (
                    <>
                        <MatchBreakdownCard
                            isJobSite={isJobSite}
                            scrapedJob={actionableJob}
                        />
                        <LocalDeepDiveAudit
                            audit={localAudit}
                            isLoading={!isHandoffActive && (isJobContextRefreshing || isLocalAuditLoading)}
                        />
                    </>
                ) : (
                    <section className="rounded-[24px] border border-[#dce2ec] bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:border-[#3a3834] dark:bg-[#262522] dark:shadow-none">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#dce2ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#43546d] dark:border-[#3a3834] dark:bg-[#302e2a] dark:text-[#c9c3ba]">
                            <Search size={13} />
                            {emptyStateLabel}
                        </span>
                        <h2 className="mt-4 text-[22px] font-semibold leading-tight text-slate-950 dark:text-[#f4f1e9]">
                            {emptyStateTitle}
                        </h2>
                        <p className="mt-3 text-base leading-relaxed text-[#64748b] dark:text-[#aaa39a]">
                            {emptyStateDescription}
                        </p>
                        <button
                            onClick={openDiscoveryModal}
                            className="mt-6 flex w-full items-center justify-center gap-3 rounded-[18px] bg-[#050817] px-4 py-4 text-lg font-semibold text-white shadow-[0_16px_28px_rgba(5,8,23,0.14)] transition-all hover:bg-black active:scale-[0.99] dark:bg-[#f4f1e9] dark:text-[#1f1f1d] dark:shadow-none"
                        >
                            <Search size={20} />
                            Find a job page
                        </button>
                    </section>
                )}

                {/* ── Mark as Applied ── */}
                {isApplicationPage && hasActionableJob && (
                    <button
                        onClick={handleMarkApplied}
                        disabled={markedApplied}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold border transition-all duration-300 ${
                            markedApplied
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm hover:shadow-emerald-100 dark:border-[#3a3834] dark:bg-[#262522] dark:text-[#f4f1e9] dark:shadow-none dark:hover:border-emerald-900/70 dark:hover:bg-emerald-950/25 dark:hover:text-emerald-300'
                        }`}
                    >
                        {markedApplied ? (
                            <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Applied - tracked
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Mark as applied
                            </>
                        )}
                    </button>
                )}

                {/* ── Core Workspace Actions ── */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleAction('save_job')}
                        disabled={isPreparingTransit}
                        aria-busy={isActionBusy('save_job')}
                        className={getActionCardClass('save_job', 'hover:border-[#c8c7f4] dark:hover:border-[#4d4a73]')}
                    >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#4a4392] transition-transform group-hover:scale-105 dark:bg-[#302f49] dark:text-[#b8b3ff]">
                            {isActionBusy('save_job') ? <Loader2 size={17} className="animate-spin" /> : <Briefcase size={17} />}
                        </div>
                        <span className="text-left text-[12px] font-semibold leading-tight text-gray-900 dark:text-[#f4f1e9]">Save to Job Tracker</span>
                        <span className="mt-1 text-left text-[10px] leading-snug text-gray-500 dark:text-[#aaa39a]">
                            Instantly log this role to your central pipeline to monitor application updates, deadlines, and follow-ups.
                        </span>
                    </button>

                    <button
                        onClick={() => handleAction('tailor_resume')}
                        disabled={isPreparingTransit}
                        aria-busy={isActionBusy('tailor_resume')}
                        className={getActionCardClass('tailor_resume', 'hover:border-[#d9d7fb] dark:hover:border-[#4d4a73]')}
                    >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fbf2ff] text-[#8f3df0] transition-transform group-hover:scale-105 dark:bg-[#302f49] dark:text-[#b8b3ff]">
                            {isActionBusy('tailor_resume') ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
                        </div>
                        <span className="text-left text-[12px] font-semibold leading-tight text-gray-900 dark:text-[#f4f1e9]">Tailor resume</span>
                        <span className="mt-1 text-left text-[10px] leading-snug text-gray-500 dark:text-[#aaa39a]">
                            {hasActionableJob ? 'Adapt this resume around the strongest role keywords.' : 'Open a job page first.'}
                        </span>
                    </button>

                    <button
                        onClick={() => handleAction('practice_interview')}
                        disabled={isPreparingTransit}
                        aria-busy={isActionBusy('practice_interview')}
                        className={getActionCardClass('practice_interview', 'hover:border-[#f4d6e7] dark:hover:border-[#5a3b4a]')}
                    >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#d95b92] transition-transform group-hover:scale-105 dark:bg-[#3a2630] dark:text-[#ff9ac4]">
                            {isActionBusy('practice_interview') ? <Loader2 size={17} className="animate-spin" /> : <Mic size={17} />}
                        </div>
                        <span className="text-left text-[12px] font-semibold leading-tight text-gray-900 dark:text-[#f4f1e9]">Practice</span>
                        <span className="mt-1 text-left text-[10px] leading-snug text-gray-500 dark:text-[#aaa39a]">
                            Build a focused mock interview from this job context.
                        </span>
                    </button>
                </div>

                {/* ── Recent Resumes ── */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-[#aaa39a]">Resumes</h3>
                        <button onClick={() => window.open(getResumeBuilderUrl(), '_blank')}
                            className="text-[10px] text-[#4a4392] font-semibold hover:underline flex items-center gap-0.5 dark:text-[#b8b3ff]">
                            View all <ChevronRight size={10} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {resumes.slice(0, 2).map((resume) => (
                            <div
                                key={resume.id}
                                onClick={() => window.open(`https://careervivid.app/edit/${resume.id}`, '_blank')}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer shadow-sm group dark:shadow-none ${
                                    selectedResumeId === resume.id
                                        ? 'border-[#c8c7f4] bg-[#f5f4ff] shadow-[0_8px_18px_rgba(98,91,213,0.10)] dark:border-[#4d4a73] dark:bg-[#302f49]'
                                        : 'border-[#ececf4] bg-white hover:border-[#d9d7fb] dark:border-[#3a3834] dark:bg-[#262522] dark:hover:border-[#4d4a73]'
                                }`}
                            >
                                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${selectedResumeId === resume.id ? 'bg-[#e9e8ff] text-[#4a4392] dark:bg-[#3b3760] dark:text-[#b8b3ff]' : 'bg-[#f4f5f8] text-gray-400 group-hover:text-[#4a4392] dark:bg-[#302e2a] dark:text-[#aaa39a] dark:group-hover:text-[#b8b3ff]'}`}>
                                    <FileText size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate dark:text-[#f4f1e9]">{resume.title || 'Untitled'}</div>
                                    {selectedResumeId === resume.id && (
                                        <div className="text-[10px] text-[#4a4392] font-semibold dark:text-[#b8b3ff]">Used for autofill</div>
                                    )}
                                </div>
                                <ExternalLink size={12} className="text-gray-300 group-hover:text-[#8d88e6] flex-shrink-0 dark:text-[#6d675f] dark:group-hover:text-[#b8b3ff]" />
                            </div>
                        ))}
                        {resumes.length === 0 && (
                            <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 dark:border-[#3a3834] dark:bg-[#262522]">
                                <p className="text-[10px] text-gray-400 dark:text-[#aaa39a]">No resumes yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Smart Fill Review Panel */}
                {showAiPanel && aiAnswers.length > 0 && (
                    <div className="border-t border-[#ececf4] bg-white pt-3 space-y-2 dark:border-[#3a3834] dark:bg-[#1f1f1d]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-800 dark:text-[#f4f1e9]">
                                    {aiAnswers.filter(a => a.source === 'ai_generated').length} AI answers ready
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-[#aaa39a]">Review answers, then fill.</p>
                            </div>
                            <button
                                onClick={handleFillAll}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                                    fillAllConfirm
                                        ? 'bg-amber-500 text-white animate-pulse'
                                        : 'bg-[#f3f2ff] text-[#4a4392] hover:bg-[#ecebff] dark:bg-[#302f49] dark:text-[#b8b3ff] dark:hover:bg-[#3b3760]'
                                }`}
                            >
                                {fillAllConfirm ? 'Confirm fill all?' : 'Fill all'}
                            </button>
                        </div>
                        <div className="space-y-1 pb-3 max-h-72 overflow-y-auto">
                            {aiAnswers.map((a, i) => (
                                <AIAnswerCard
                                    key={i}
                                    answer={a}
                                    onInject={() => handleInjectAnswer(a)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer — Quick Actions */}
            <footer className="px-3.5 pt-3 pb-4 bg-white/95 backdrop-blur sticky bottom-0 z-10 dark:bg-[#1f1f1d]/95">
                <div className="grid grid-cols-4 gap-1.5 rounded-[28px] bg-[#f1f4f8] px-2.5 py-3 dark:bg-[#262522]">
                    {[
                        { label: 'New resume',   icon: FileText,        color: 'bg-[#eef0ff] text-[#4a4392] dark:bg-[#302f49] dark:text-[#b8b3ff]', action: () => handleAction('new_resume') },
                        { label: 'Cover letter', icon: Mail,            color: 'bg-[#f3f2ff] text-[#5b5599] dark:bg-[#302f49] dark:text-[#b8b3ff]', action: () => handleAction('cover_letter') },
                        { label: 'Interview',    icon: Mic,             color: 'bg-[#fff0f7] text-[#d95b92] dark:bg-[#3a2630] dark:text-[#ff9ac4]', action: () => handleAction('practice_interview') },
                        { label: 'Dashboard',    icon: LayoutDashboard, color: 'bg-[#f4f5f8] text-slate-600 dark:bg-[#302e2a] dark:text-[#c9c3ba]', action: () => window.open('https://careervivid.app/dashboard', '_blank') },
                    ].map(({ label, icon: Icon, color, action }) => (
                        <button
                            key={label}
                            onClick={action}
                            className="group flex flex-col items-center gap-1.5 py-1.5 rounded-2xl hover:bg-white/80 transition-colors dark:hover:bg-[#302e2a]"
                        >
                            <div className={`h-9 w-9 rounded-2xl flex items-center justify-center ${color} group-hover:scale-105 transition-transform`}>
                                <Icon size={15} />
                            </div>
                            <span className="text-[10px] font-semibold text-[#64748b] leading-none dark:text-[#aaa39a]">{label}</span>
                        </button>
                    ))}
                </div>
            </footer>

            <JobDiscoveryModal
                open={isDiscoveryModalOpen}
                onClose={() => setIsDiscoveryModalOpen(false)}
                routes={jobBoardRoutes}
                queryResult={jobBoardQueryResult}
                activeResumeTitle={activeResumeTitle}
            />
        </div>
    );
};

export default ExtensionHome;
