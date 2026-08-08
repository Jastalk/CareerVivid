
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { CAREER_PATHS, Industry } from '../data/careers';
import { ArrowRight, Mic, Loader2, ChevronLeft, Clock, SlidersHorizontal, Sparkles, Trash2, BarChart3, Building2, Search, ListChecks, ExternalLink, Swords, X } from 'lucide-react';
import { navigate } from '../utils/navigation';
import { generateInterviewQuestions } from '../services/geminiService';
import { usePracticeHistory } from '../hooks/useJobHistory';
import { InterviewSessionDraft, Job, PracticeHistoryEntry, ResumeData, TranscriptEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useResumes } from '../hooks/useResumes';
import { db } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAICreditCheck } from '../hooks/useAICreditCheck';
import { InterviewHistoryCardSkeleton } from '../components/Dashboard/DashboardSkeletons';
import ConfirmationModal from '../components/ConfirmationModal';
import AppLayout from '../components/Layout/AppLayout';
import AuthGateModal, { AuthGateModalProps } from '../components/AuthGateModal';
import CompanyLogo from '../components/CompanyLogo';
import { INTERVIEW_GUIDE_SUMMARIES, INTERVIEW_GUIDE_TOTALS, InterviewGuideSummary } from '../data/interviewGuideSummaries.generated';
import {
    buildLocalInterviewGuidePrompt,
    filterInterviewGuideSummaries,
    formatGuideTopicChip,
    getGuideQuestionPool,
    getQuestionTargetCount,
    GUIDE_CATEGORIES,
    loadLocalInterviewGuide,
} from '../lib/localInterviewGuides';

// Lazy load modal
const InterviewReportModal = React.lazy(() => import('../components/InterviewReportModal'));
const loadAIInterviewAgentModal = () => import('../components/AIInterviewAgentModal');
const AIInterviewAgentModal = React.lazy(loadAIInterviewAgentModal);
const preloadAIInterviewAgentModal = () => loadAIInterviewAgentModal().catch(() => undefined);

const formatResumeForContext = (resume: ResumeData): string => {
    let context = `Name: ${resume.personalDetails.firstName} ${resume.personalDetails.lastName}\n`;
    context += `Job Title: ${resume.personalDetails.jobTitle}\n\n`;
    context += `SUMMARY:\n${resume.professionalSummary}\n\n`;

    if (resume.employmentHistory.length > 0) {
        context += `EXPERIENCE:\n`;
        resume.employmentHistory.forEach(job => {
            context += `- ${job.jobTitle} at ${job.employer} (${job.startDate} - ${job.endDate})\n`;
            const descriptionText = job.description.replace(/^- /gm, '  - ');
            context += `  ${descriptionText.replace(/\n/g, '\n  ')}\n`;
        });
        context += '\n';
    }

    if (resume.skills.length > 0) {
        context += `SKILLS: ${resume.skills.map(s => s.name).join(', ')}\n\n`;
    }

    if (resume.education.length > 0) {
        context += `EDUCATION:\n`;
        resume.education.forEach(edu => {
            context += `- ${edu.degree} from ${edu.school} (${edu.startDate} - ${edu.endDate})\n`;
        });
    }
    return context;
};

const loadingMessages = [
    "Warming up the AI interviewer...",
    "Reviewing the job description for insights...",
    "Crafting tailored, insightful questions...",
    "Setting up the virtual interview room...",
    "Final checks... Get ready to shine!",
    "Just a moment...",
];

const placeholderPrompts = [
    'A behavioral interview for a product manager role',
    'A technical interview for a front-end developer position',
    'First-round screening call for a marketing associate',
    'Final-round interview for a senior data scientist',
    'Case study interview for a management consultant',
    'A mock interview focused on leadership skills',
    'Systems design interview for a backend engineer role',
];

const normalizeCompanyLookupKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const slugifyQuestCompany = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const GUIDE_SLUG_BY_COMPANY = new Map(
    INTERVIEW_GUIDE_SUMMARIES.map((guide) => [normalizeCompanyLookupKey(guide.company), guide.slug]),
);

const extractQuestSlugFromUrl = (url?: string) => {
    if (!url) return null;

    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const companiesIndex = parts.lastIndexOf('companies');
        const slug = companiesIndex >= 0 ? parts[companiesIndex + 1] : parts.at(-1);
        if (!slug) return null;
        return decodeURIComponent(slug).trim().toLowerCase();
    } catch {
        const match = url.match(/(?:^|\/)companies\/([^/?#]+)/i);
        return match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : null;
    }
};

const resolveQuestPathFromHistoryEntry = (entry: PracticeHistoryEntry) => {
    const title = entry.job?.title || '';
    const questTitleMatch = title.match(/^\s*(.+?)\s+quest\s+[—-]\s+/i);
    if (!questTitleMatch) return null;

    const urlSlug = extractQuestSlugFromUrl(entry.job?.url);
    if (urlSlug) return `/quest/${urlSlug}`;

    const company = questTitleMatch[1]?.trim() || entry.job?.company || '';
    const mappedSlug = GUIDE_SLUG_BY_COMPANY.get(normalizeCompanyLookupKey(company));
    const fallbackSlug = slugifyQuestCompany(company);
    const slug = mappedSlug || fallbackSlug;

    return slug ? `/quest/${slug}` : null;
};

type InterviewMode = 'Behavioral' | 'Technical' | 'Mixed' | 'Screening';
type InterviewDifficulty = 'Entry' | 'Standard' | 'Senior';
type InterviewDuration = '5 min' | '15 min' | '30 min';

const interviewModes: InterviewMode[] = ['Behavioral', 'Technical', 'Mixed', 'Screening'];
const interviewDifficulties: InterviewDifficulty[] = ['Entry', 'Standard', 'Senior'];
const interviewDurations: InterviewDuration[] = ['5 min', '15 min', '30 min'];

const getResumableDraft = (entry: PracticeHistoryEntry): InterviewSessionDraft | null => {
    const draft = entry.activeInterviewDraft;
    const draftQuestions = draft?.questions?.length ? draft.questions : entry.questions;
    if (!draft || !draft.transcript?.length || !draftQuestions?.length) return null;
    if (draft.questionIndex >= draftQuestions.length) return null;
    return { ...draft, questions: draftQuestions };
};

const getResumeQuestionLabel = (draft: InterviewSessionDraft) =>
    `Q${Math.min(draft.questionIndex + 1, draft.questions.length)}/${draft.questions.length}`;

interface InterviewStudioProps {
    jobId?: string;
}

const InterviewStudio: React.FC<InterviewStudioProps> = ({ jobId }) => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [interviewMode, setInterviewMode] = useState<InterviewMode>('Behavioral');
    const [interviewDifficulty, setInterviewDifficulty] = useState<InterviewDifficulty>('Standard');
    const [interviewDuration, setInterviewDuration] = useState<InterviewDuration>('15 min');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [authGate, setAuthGate] = useState<Pick<AuthGateModalProps, 'title' | 'message' | 'variant'> | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
    const [placeholder, setPlaceholder] = useState('');
    const [guideSearch, setGuideSearch] = useState('');
    const [guideCategory, setGuideCategory] = useState('all');
    const [guideLimit, setGuideLimit] = useState(12);
    const [selectedGuideSlug, setSelectedGuideSlug] = useState<string | null>(null);
    const guideSearchRef = useRef<HTMLInputElement>(null);

    // "/" focuses the company guide search unless the user is already typing somewhere
    useEffect(() => {
        const handleSlashShortcut = (event: KeyboardEvent) => {
            if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            event.preventDefault();
            guideSearchRef.current?.focus();
        };
        window.addEventListener('keydown', handleSlashShortcut);
        return () => window.removeEventListener('keydown', handleSlashShortcut);
    }, []);

    const { practiceHistory, addJob, isLoading: isLoadingHistory, deletePracticeHistory, saveInterviewDraft } = usePracticeHistory();
    const { resumes } = useResumes();
    const [isSyncingTransit, setIsSyncingTransit] = useState(false);

    // AI Credit Check Hook
    const { checkCredit, CreditLimitModal } = useAICreditCheck();

    const [interviewState, setInterviewState] = useState<{
        jobId: string;
        prompt: string;
        questions: string[];
        isFirstTime: boolean;
        resumeContext: string;
        jobTitle: string;
        jobCompany: string;
        initialTranscript?: TranscriptEntry[];
        resumeFromQuestionIndex?: number;
    } | null>(null);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [handledDeepLinkJobId, setHandledDeepLinkJobId] = useState<string | null>(null);

    // Modal States
    const [selectedJobForReport, setSelectedJobForReport] = useState<PracticeHistoryEntry | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Delete',
        onConfirm: async () => { },
    });

    useEffect(() => {
        let interval: number;
        if (isLoading && !isInterviewModalOpen) {
            setLoadingMessageIndex(0); // Reset on start
            interval = window.setInterval(() => {
                setLoadingMessageIndex(prevIndex => {
                    if (prevIndex >= loadingMessages.length - 1) {
                        return prevIndex; // Stay on the last message
                    }
                    return prevIndex + 1;
                });
            }, 2000); // 2 seconds per message
        }
        return () => clearInterval(interval);
    }, [isLoading, isInterviewModalOpen]);

    // Typing effect for the placeholder
    useEffect(() => {
        let isMounted = true;
        let promptIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let timeoutId: number;

        const typingSpeed = 100;
        const deletingSpeed = 50;
        const pauseDurations = [2000, 4000, 8000];
        let pauseIndex = 0;

        const type = () => {
            if (!isMounted) return;

            const currentPrompt = placeholderPrompts[promptIndex];

            if (isDeleting) {
                setPlaceholder(currentPrompt.substring(0, charIndex - 1));
                charIndex--;
            } else {
                setPlaceholder(currentPrompt.substring(0, charIndex + 1));
                charIndex++;
            }

            if (!isDeleting && charIndex === currentPrompt.length) {
                isDeleting = true;
                const pause = pauseDurations[pauseIndex % pauseDurations.length];
                pauseIndex = (pauseIndex + 1) % pauseDurations.length;
                timeoutId = window.setTimeout(type, pause);
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                promptIndex = (promptIndex + 1) % placeholderPrompts.length;
                timeoutId = window.setTimeout(type, 500);
            } else {
                timeoutId = window.setTimeout(type, isDeleting ? deletingSpeed : typingSpeed);
            }
        };

        timeoutId = window.setTimeout(type, 1500);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        const syncTransitPractice = async () => {
            const params = new URLSearchParams(window.location.search);
            const source = params.get('source');
            const scrapeId = params.get('scrapeId');
            const resumeId = params.get('resumeId');

            if (source === 'extension_practice' && scrapeId) {
                if (!currentUser) return; // Wait until auth state is resolved

                setIsSyncingTransit(true);
                try {
                    const docRef = doc(db, 'users', currentUser.uid, 'temporaryScrapes', scrapeId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const jobData = {
                            title: data.title || 'Unknown Role',
                            company: data.company || 'Custom Practice',
                            location: '',
                            description: data.description || '',
                            url: data.url || ''
                        };

                        // Delete transit document immediately for privacy
                        await deleteDoc(docRef);

                        // Cleanse URL
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);

                        // Start interview immediately
                        await handleStartInterview(jobData.description, jobData, resumeId || undefined);
                    }
                } catch (error) {
                    console.error('Error syncing transit job:', error);
                } finally {
                    setIsSyncingTransit(false);
                }
            }
        };

        syncTransitPractice();
    }, [currentUser, resumes]);


    const buildQuestionGenerationPrompt = (basePrompt: string) => {
        return [
            'Interview setup:',
            `- Mode: ${interviewMode}`,
            `- Difficulty: ${interviewDifficulty}`,
            `- Target duration: ${interviewDuration}`,
            '',
            'Job or practice context:',
            basePrompt.trim(),
            '',
            'Generate interview questions that match the setup, seniority, and target duration.',
        ].join('\n');
    };

    const handleStartInterview = async (generationPrompt: string, jobData?: Omit<Job, 'id'>, resumeId?: string) => {
        if (!generationPrompt.trim()) return;
        if (!currentUser) {
            setAuthGate({
                title: 'Sign in to start a live interview',
                message: 'Voice interviews are scored and saved to your history — create a free account to run one.',
            });
            return;
        }

        // CHECK CREDIT BEFORE STARTING
        if (!checkCredit()) return;

        setIsLoading(true);
        setError('');
        void preloadAIInterviewAgentModal();
        try {
            // Generate interview questions
            const questions = await generateInterviewQuestions(currentUser.uid, buildQuestionGenerationPrompt(generationPrompt));
            const job: Omit<Job, 'id'> = jobData || {
                title: generationPrompt,
                company: 'Custom Practice',
                location: '',
                description: generationPrompt,
                url: ''
            };

            // Add job to practice history
            const newJobId = await addJob(job, questions);

            /*
            // Get authentication token for microservice (us-west1 region)
            const functions = getFunctions(undefined, 'us-west1');
            const getToken = httpsCallable(functions, 'getInterviewAuthToken');
            const result = await getToken();
            const { token } = result.data as { token: string };

            // Construct redirect URL to Interview Microservice
            const baseUrl = 'https://careervivid-371634100960.us-west1.run.app';
            const targetUrl = `${baseUrl}/interview-studio/${newJobId}?token=${token}`;

            // Redirect to external microservice
            window.location.href = targetUrl;
            */

            const activeResume = (resumeId && resumes.find(r => r.id === resumeId)) || resumes.find(r => r.isDefault) || resumes[0];
            const resumeContext = activeResume ? formatResumeForContext(activeResume) : '';

            setInterviewState({
                jobId: newJobId,
                prompt: job.description || job.title,
                questions,
                isFirstTime: true,
                resumeContext,
                jobTitle: job.title,
                jobCompany: job.company || 'Custom Practice',
            });
            setIsInterviewModalOpen(true);
            setIsLoading(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsLoading(false);
        }
    };

    // Starts a clean attempt and clears any saved draft for this role.
    const handlePracticeAgainDirect = (jobEntry: PracticeHistoryEntry) => {
        const questPath = resolveQuestPathFromHistoryEntry(jobEntry);
        if (questPath) {
            navigate(questPath);
            return;
        }

        const jobData = {
            title: jobEntry.job.title,
            company: jobEntry.job.company || 'Custom Practice',
            location: jobEntry.job.location,
            description: jobEntry.job.description || jobEntry.job.title,
            url: jobEntry.job.url,
        };
        handleStartInterview(jobData.description, jobData);
    };

    const handleResumeSessionDirect = (jobEntry: PracticeHistoryEntry) => {
        const draft = getResumableDraft(jobEntry);
        if (!draft) {
            handlePracticeAgainDirect(jobEntry);
            return;
        }

        const activeResume = resumes.find(r => r.isDefault) || resumes[0];
        const resumeContext = activeResume ? formatResumeForContext(activeResume) : '';

        void preloadAIInterviewAgentModal();
        setInterviewState({
            jobId: jobEntry.id,
            prompt: jobEntry.job.description || jobEntry.job.title,
            questions: draft.questions,
            isFirstTime: false,
            resumeContext,
            jobTitle: jobEntry.job.title,
            jobCompany: jobEntry.job.company || 'Custom Practice',
            initialTranscript: draft.transcript,
            resumeFromQuestionIndex: draft.questionIndex,
        });
        setIsInterviewModalOpen(true);
    };

    // Handle "Practice Again" from Dashboard (other pages via sessionStorage)
    useEffect(() => {
        const practiceJobData = sessionStorage.getItem('practiceJob');
        if (practiceJobData) {
            sessionStorage.removeItem('practiceJob');
            try {
                const jobEntry: PracticeHistoryEntry = JSON.parse(practiceJobData);
                if (getResumableDraft(jobEntry)) {
                    handleResumeSessionDirect(jobEntry);
                    return;
                }
                const jobData = {
                    title: jobEntry.job.title,
                    company: jobEntry.job.company || 'Custom Practice',
                    location: jobEntry.job.location,
                    description: jobEntry.job.description || jobEntry.job.title,
                    url: jobEntry.job.url,
                };
                handleStartInterview(jobData.description, jobData);
            } catch (e) {
                console.error("Failed to parse practice job data", e);
            }
        }
    }, []);

    const decodedJobId = jobId ? decodeURIComponent(jobId) : undefined;

    // Handle deep links from scheduled practice emails.
    useEffect(() => {
        if (!decodedJobId || handledDeepLinkJobId === decodedJobId || isInterviewModalOpen || isLoadingHistory) {
            return;
        }

        const foundJob = practiceHistory.find(h => h.id === decodedJobId);
        if (!foundJob) {
            setError("This scheduled practice session was not found for the signed-in account. Confirm you are using the same CareerVivid account that received the email.");
            setHandledDeepLinkJobId(decodedJobId);
            return;
        }

        const startSavedInterview = async () => {
            setIsLoading(true);
            setError('');
            try {
                void preloadAIInterviewAgentModal();
                /*
                const functions = getFunctions(undefined, 'us-west1');
                const getToken = httpsCallable(functions, 'getInterviewAuthToken');
                const result = await getToken();
                const { token } = result.data as { token: string };

                const baseUrl = 'https://careervivid-371634100960.us-west1.run.app';
                const targetUrl = `${baseUrl}/interview-studio/${decodedJobId}?token=${token}`;
                window.location.href = targetUrl;
                */

                const activeResume = resumes.find(r => r.isDefault) || resumes[0];
                const resumeContext = activeResume ? formatResumeForContext(activeResume) : '';
                const draft = getResumableDraft(foundJob);

                setInterviewState({
                    jobId: foundJob.id,
                    prompt: foundJob.job.description || foundJob.job.title,
                    questions: draft?.questions || foundJob.questions || [],
                    isFirstTime: false,
                    resumeContext,
                    jobTitle: foundJob.job.title,
                    jobCompany: foundJob.job.company || 'Custom Practice',
                    initialTranscript: draft?.transcript,
                    resumeFromQuestionIndex: draft?.questionIndex,
                });
                setHandledDeepLinkJobId(decodedJobId);
                setIsInterviewModalOpen(true);
                setIsLoading(false);
            } catch (e) {
                setError("Failed to start scheduled interview. Please try again.");
                setHandledDeepLinkJobId(decodedJobId);
                setIsLoading(false);
            }
        };

        startSavedInterview();
    }, [decodedJobId, handledDeepLinkJobId, isInterviewModalOpen, isLoadingHistory, practiceHistory, resumes]);

    const handlePromptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleStartInterview(prompt);
    };

    const { guides: visibleGuideSummaries, total: guideMatchTotal } = filterInterviewGuideSummaries({
        query: guideSearch,
        categoryId: guideCategory,
        limit: guideLimit,
    });

    const handleCompanyGuideInterview = async (guideSummary: InterviewGuideSummary) => {
        if (!currentUser) {
            setError('Please sign in to start a company interview.');
            return;
        }

        if (!checkCredit()) return;

        setSelectedGuideSlug(guideSummary.slug);
        setIsLoading(true);
        setError('');
        void preloadAIInterviewAgentModal();

        try {
            const guide = await loadLocalInterviewGuide(guideSummary.slug);
            if (!guide) throw new Error(`Interview guide not found for ${guideSummary.company}.`);

            const guidePrompt = buildLocalInterviewGuidePrompt(guide, {
                mode: interviewMode,
                difficulty: interviewDifficulty,
                duration: interviewDuration,
            });
            const questionTarget = getQuestionTargetCount(interviewDuration);
            const guideQuestions = getGuideQuestionPool(guide, interviewMode).slice(0, questionTarget);
            const questions = guideQuestions.length >= Math.min(3, questionTarget)
                ? guideQuestions
                : await generateInterviewQuestions(currentUser.uid, buildQuestionGenerationPrompt(guidePrompt));

            const job = {
                title: `${guide.company} ${interviewMode} Interview`,
                company: guide.company,
                location: '',
                description: guidePrompt,
                url: guide.url,
            };

            const newJobId = await addJob(job, questions);
            const activeResume = resumes.find(r => r.isDefault) || resumes[0];
            const resumeContext = activeResume ? formatResumeForContext(activeResume) : '';

            setInterviewState({
                jobId: newJobId,
                prompt: guidePrompt,
                questions,
                isFirstTime: true,
                resumeContext,
                jobTitle: job.title,
                jobCompany: guide.company,
            });
            setIsInterviewModalOpen(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to start the company interview.');
        } finally {
            setIsLoading(false);
            setSelectedGuideSlug(null);
        }
    };

    const handleRoleSelect = (roleName: string) => {
        const industryName = selectedIndustry?.name || 'General';
        const fullPrompt = `A mock interview for the role of '${roleName}' in the '${industryName}' industry.`;
        const jobData = {
            title: roleName,
            company: 'CareerVivid',
            location: '',
            description: fullPrompt,
            url: ''
        };
        handleStartInterview(fullPrompt, jobData);
    };

    const handleDeleteClick = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Session',
            message: 'Are you sure you want to delete this interview session? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                await deletePracticeHistory(id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const formatSessionDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    };

    const renderSegmentedControl = <T extends string,>(
        label: string,
        options: T[],
        value: T,
        onChange: (option: T) => void,
        icon: React.ReactNode
    ) => (
        <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--cv-text-body)]">
                {icon}
                <span>{label}</span>
            </div>
            <div className={`grid ${options.length === 4 ? 'grid-cols-2' : 'grid-cols-3'} gap-1 rounded-xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] p-1`}>
                {options.map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        className={`min-h-[34px] rounded-lg px-2 text-xs font-semibold leading-tight transition-colors ${value === option
                            ? 'border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)] shadow-sm'
                            : 'border border-transparent text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)] hover:bg-[var(--cv-surface-warm-card-strong)] hover:text-[var(--cv-action-primary)]'
                            }`}
                        aria-pressed={value === option}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );


    const renderContent = () => {
        if (selectedIndustry) {
            return (
                <section className="cv-design-card p-4 sm:p-5">
                    <button onClick={() => setSelectedIndustry(null)} className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--cv-text-muted)] hover:text-[var(--cv-text-heading)]">
                        <ChevronLeft size={16} /> {t('interview_studio.back_to_industries')}
                    </button>
                    <h2 className="cv-design-title mb-4 text-base">{t('interview_studio.select_role', { industry: selectedIndustry.name })}</h2>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 @[1080px]/interview-page:grid-cols-1">
                        {selectedIndustry.roles.map(role => (
                            <button
                                key={role.name}
                                onClick={() => handleRoleSelect(role.name)}
                                className="cv-design-card-hover group flex min-h-[54px] items-center justify-between gap-3 rounded-lg border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] p-3 text-left transition-all hover:-translate-y-0.5"
                            >
                                <h3 className="text-sm font-semibold text-[var(--cv-text-heading)]">{role.name}</h3>
                                <ArrowRight size={16} className="text-[var(--cv-text-muted)] transition-colors group-hover:text-[var(--cv-action-primary)]" />
                            </button>
                        ))}
                    </div>
                </section>
            );
        }

        return (
            <section className="cv-design-card p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                    <span className="cv-design-icon-well flex h-8 w-8 items-center justify-center rounded-lg">
                        <Swords size={15} />
                    </span>
                    <h2 className="cv-design-title text-base">{t('interview_studio.select_career')}</h2>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 @[1080px]/interview-page:grid-cols-1">
                    {CAREER_PATHS.map(industry => (
                        <button
                            key={industry.name}
                            onClick={() => setSelectedIndustry(industry)}
                            className="cv-design-card-hover group flex min-h-[54px] items-center justify-between gap-3 rounded-lg border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] p-3 text-left transition-all hover:-translate-y-0.5"
                        >
                            <h3 className="text-sm font-semibold text-[var(--cv-text-heading)]">{industry.name}</h3>
                            <ArrowRight size={16} className="text-[var(--cv-text-muted)] transition-colors group-hover:text-[var(--cv-action-primary)]" />
                        </button>
                    ))}
                </div>
            </section>
        );
    };

    const GUIDE_AVATAR_TONES = [
        'bg-[#f3f2ff] text-[#625bd5] ring-[#dfdcff]',
        'bg-[#eef0ff] text-[#7069dc] ring-[#dfe2ff]',
        'bg-[#f7f1ff] text-[#7c5fd6] ring-[#eadfff]',
        'bg-[#f5f7ff] text-[#5c62d6] ring-[#e0e5ff]',
    ];

    const getGuideAvatarTone = (company: string) => {
        let hash = 0;
        for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) | 0;
        return GUIDE_AVATAR_TONES[Math.abs(hash) % GUIDE_AVATAR_TONES.length];
    };

    const getDifficultyBadge = (difficulty: number | null) => {
        if (!difficulty) return null;
        const tone = difficulty >= 8
            ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900'
            : difficulty >= 6.5
                ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900';
        return (
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>
                <BarChart3 size={11} />
                {difficulty}/10
            </span>
        );
    };

    const formatGuideMeta = (guide: InterviewGuideSummary) => {
        const parts: string[] = [];
        if (guide.questionCount > 0) parts.push(`${guide.questionCount} questions`);
        if (guide.stageCount > 0) parts.push(`${guide.stageCount} stages`);
        if (guide.tipCount > 0) parts.push(`${guide.tipCount} tips`);
        return parts.length ? parts.join(' · ') : 'Company guide overview';
    };

    const renderCompanyGuideCards = () => (
        <section className="cv-design-card @container/guides overflow-hidden">
            {/* Header */}
            <div className="border-b border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] p-4 sm:p-5">
                <div className="flex flex-col gap-3 @[720px]/guides:flex-row @[720px]/guides:items-center @[720px]/guides:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="cv-design-icon-well flex h-8 w-8 items-center justify-center rounded-lg">
                                <Building2 size={16} />
                            </span>
                            <h2 className="cv-design-title text-lg">
                                Know exactly what to expect
                            </h2>
                        </div>
                        <p className="cv-design-body mt-1.5 text-sm">
                            Interview stages, key topics, and realistic practice questions our frontier AI generates from thousands of real interview reviews on{' '}
                            <a href="https://www.techinterview.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">techinterview.org</a>.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center divide-x divide-[var(--cv-border-subtle)] rounded-xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] shadow-sm backdrop-blur">
                        {[
                            { value: INTERVIEW_GUIDE_TOTALS.companies, label: 'companies' },
                            { value: INTERVIEW_GUIDE_TOTALS.questQuestions, label: 'questions' },
                            { value: INTERVIEW_GUIDE_TOTALS.stages, label: 'stages' },
                        ].map((stat) => (
                            <div key={stat.label} className="px-4 py-2 text-center first:pl-4 last:pr-4">
                                <p className="text-sm font-bold tabular-nums text-[var(--cv-text-heading)]">{stat.value.toLocaleString()}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--cv-text-muted)]">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search + category filters */}
                <div className="mt-4 flex flex-col gap-2.5">
                    <div className="group/search flex min-h-[52px] items-center gap-3 rounded-2xl border border-[var(--cv-input-border)] bg-[var(--cv-input-bg)] px-4 transition-all duration-200 hover:border-[var(--cv-action-border)] focus-within:border-[var(--cv-action-border)] focus-within:bg-[var(--cv-surface-warm-card-strong)] focus-within:shadow-[0_1px_2px_rgba(55,38,18,0.05),0_4px_14px_rgba(55,38,18,0.08)]">
                        <Search size={17} strokeWidth={2.25} className="shrink-0 text-[var(--cv-text-muted)] transition-colors group-focus-within/search:text-[var(--cv-action-primary)]" />
                        <input
                            ref={guideSearchRef}
                            type="search"
                            value={guideSearch}
                            onChange={(event) => { setGuideSearch(event.target.value); setGuideLimit(12); }}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setGuideSearch('');
                                    setGuideLimit(12);
                                    event.currentTarget.blur();
                                }
                            }}
                            placeholder="Search Google, Stripe, OpenAI, system design..."
                            aria-label="Search company interview guides"
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 py-3 text-sm font-medium text-[var(--cv-text-heading)] outline-none ring-0 placeholder:text-[var(--cv-text-muted)] focus:border-0 focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                        />
                        {guideSearch ? (
                            <button
                                type="button"
                                onClick={() => { setGuideSearch(''); setGuideLimit(12); guideSearchRef.current?.focus(); }}
                                aria-label="Clear search"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-surface-warm-muted)] hover:text-[var(--cv-text-heading)]"
                            >
                                <X size={14} strokeWidth={2.5} />
                            </button>
                        ) : (
                            <kbd className="hidden shrink-0 items-center rounded-md border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[var(--cv-text-muted)] shadow-[0_1px_0_rgba(55,38,18,0.06)] @[480px]/guides:inline-flex">
                                /
                            </kbd>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {GUIDE_CATEGORIES.map((category) => {
                            const isActive = guideCategory === category.id;
                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => { setGuideCategory(category.id); setGuideLimit(12); }}
                                    aria-pressed={isActive}
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${isActive
                                        ? 'bg-[var(--cv-action-primary)] text-white shadow-sm'
                                        : 'border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]'
                                        }`}
                                >
                                    {category.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 @[640px]/guides:grid-cols-2 @[1000px]/guides:grid-cols-3">
                    {visibleGuideSummaries.map((guide) => {
                        const isStarting = selectedGuideSlug === guide.slug && isLoading;
                        const topicChips = guide.topics.slice(0, 2).map((topic) => formatGuideTopicChip(topic));
                        return (
                            <article
                                key={guide.slug}
                                className="cv-design-card cv-design-card-hover group flex flex-col p-4 transition-all hover:-translate-y-0.5"
                            >
                                <div className="flex items-center gap-3">
                                    <CompanyLogo company={guide.company} slug={guide.slug} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="truncate text-sm font-bold text-[var(--cv-text-heading)]">{guide.company}</h3>
                                            {getDifficultyBadge(guide.difficulty)}
                                        </div>
                                        <p className="mt-0.5 truncate text-xs font-medium text-[var(--cv-text-muted)]">
                                            {formatGuideMeta(guide)}
                                        </p>
                                    </div>
                                </div>

                                {topicChips.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {topicChips.map((topic) => (
                                            <span
                                                key={topic}
                                                className="max-w-full truncate rounded-md bg-[var(--cv-surface-warm-muted)] px-2 py-1 text-[11px] font-medium text-[var(--cv-text-body)] group-hover:bg-[var(--cv-action-soft-bg)] group-hover:text-[var(--cv-action-primary)]"
                                            >
                                                {topic}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-auto flex items-center gap-2 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/quest/${guide.slug}`)}
                                        className="cv-design-button-primary inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs"
                                    >
                                        <Swords size={14} />
                                        Start quest
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCompanyGuideInterview(guide)}
                                        disabled={isLoading}
                                        title="Single mock interview (no quest)"
                                        aria-label={`Single mock interview for ${guide.company}`}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-text-muted)] transition-colors hover:border-[var(--cv-action-border)] hover:text-[var(--cv-action-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isStarting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    </button>
                                    <a
                                        href={`https://www.techinterview.org/companies/${guide.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-text-muted)] transition-colors hover:border-[var(--cv-action-border)] hover:text-[var(--cv-text-heading)]"
                                        aria-label={`Open ${guide.company} source guide`}
                                        title="View source guide"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {visibleGuideSummaries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] py-10 text-center">
                        <ListChecks className="mx-auto text-[var(--cv-text-muted)]" size={22} />
                        <p className="mt-2 text-sm font-semibold text-[var(--cv-text-heading)]">No matching company guides</p>
                        <p className="mt-1 text-xs text-[var(--cv-text-muted)]">Try a company name, interview topic, or system design keyword.</p>
                    </div>
                )}

                {guideMatchTotal > visibleGuideSummaries.length && (
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setGuideLimit((prev) => prev + 12)}
                            className="cv-design-button-secondary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs"
                        >
                            Show more companies
                            <span className="text-[var(--cv-text-muted)]">({guideMatchTotal - visibleGuideSummaries.length} more)</span>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );

    if ((isLoading || isSyncingTransit) && !isInterviewModalOpen) {
        return (
            <div className="cv-design-page cv-design-grid flex min-h-screen flex-col items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="mx-auto h-16 w-16 animate-spin text-[var(--cv-action-primary)]" />
                    <h1 className="cv-design-title mt-6 text-2xl">
                        {isSyncingTransit ? "Synchronizing Job Details..." : t('interview_studio.preparing')}
                    </h1>
                    <div className="h-6 mt-2">
                        <p key={loadingMessageIndex} className="cv-design-body animate-fade-in">
                            {isSyncingTransit ? "Preparing your AI mock interview room..." : t(`interview_studio.loading_${loadingMessageIndex + 1}`)}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <AppLayout>
            {authGate && <AuthGateModal {...authGate} onClose={() => setAuthGate(null)} />}
            <CreditLimitModal />
            <div className="cv-design-page cv-design-grid relative min-h-screen pb-16 text-left">
                <div id="start-session" className="@container/interview-page mx-auto max-w-screen-2xl px-4 py-6 text-left sm:px-6 lg:px-8 lg:py-8">
                    <div className="grid grid-cols-1 items-start gap-5 @[1080px]/interview-page:grid-cols-[minmax(0,1fr)_360px]">
                        <main className="space-y-4">
                            <section className="@container/setup cv-design-card p-4 sm:p-5 @[720px]/setup:p-6">
                                <div className="flex flex-col gap-5">
                                    <div>
                                        <div className="cv-design-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2.5 py-1 text-xs">
                                            <Mic size={14} />
                                            <span>Interview workspace</span>
                                        </div>
                                        <h1 className="cv-design-title text-2xl @[560px]/setup:text-3xl">{t('interview_studio.title')}</h1>
                                        <p className="cv-design-body mt-1.5 max-w-2xl text-sm">{t('interview_studio.subtitle')}</p>
                                    </div>

                                    <form onSubmit={handlePromptSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="interview-prompt" className="mb-2 block text-xs font-semibold text-[var(--cv-text-body)]">
                                                {t('interview_studio.start_title')}
                                            </label>
                                            <div className="flex flex-col gap-3 @[560px]/setup:flex-row">
                                                <input
                                                    id="interview-prompt"
                                                    type="text"
                                                    value={prompt}
                                                    onChange={(e) => setPrompt(e.target.value)}
                                                    placeholder={placeholder}
                                                    className="cv-design-input min-h-[52px] w-full flex-grow rounded-2xl px-4 text-sm font-medium transition-shadow placeholder:text-[var(--cv-text-muted)]"
                                                />
                                                <button
                                                    type="submit"
                                                    className="cv-design-button-secondary min-h-[52px] flex-shrink-0 rounded-2xl px-5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                                                    disabled={!prompt.trim() || isLoading}
                                                >
                                                    {t('interview_studio.start_btn')} <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 @[560px]/setup:grid-cols-3 gap-4">
                                            {renderSegmentedControl('Mode', interviewModes, interviewMode, (option) => setInterviewMode(option), <Sparkles size={16} className="text-[var(--cv-action-primary)]" />)}
                                            {renderSegmentedControl('Difficulty', interviewDifficulties, interviewDifficulty, (option) => setInterviewDifficulty(option), <SlidersHorizontal size={16} className="text-[var(--cv-action-primary)]" />)}
                                            {renderSegmentedControl('Duration', interviewDurations, interviewDuration, (option) => setInterviewDuration(option), <Clock size={16} className="text-[var(--cv-action-primary)]" />)}
                                        </div>
                                    </form>
                                </div>
                            </section>
                            {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-lg">{error}</p>}
                            {renderCompanyGuideCards()}
                        </main>
                        <aside className="space-y-4 @[1080px]/interview-page:sticky @[1080px]/interview-page:top-6">
                            <section className="cv-design-card p-4">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="cv-design-title text-base">Recent sessions</h2>
                                        <p className="cv-design-body mt-0.5 text-xs">{practiceHistory.length} saved</p>
                                    </div>
                                    <span className="cv-design-icon-well flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                                        <Mic size={16} />
                                    </span>
                                </div>

                                <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-y-auto pr-1">
                                    {isLoadingHistory
                                        ? Array.from({ length: 3 }).map((_, i) => <InterviewHistoryCardSkeleton key={i} />)
                                        : practiceHistory.length > 0 ? (
                                            practiceHistory.slice(0, 8).map(entry => {
                                                const practiceCount = entry.interviewHistory?.length || 0;
                                                const resumableDraft = getResumableDraft(entry);
                                                return (
                                                    <article
                                                        key={entry.id}
                                                        className="cv-design-card cv-design-card-hover flex min-h-[124px] flex-col rounded-lg p-3 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <h3 className="truncate text-sm font-bold text-[var(--cv-text-heading)]">
                                                                    {entry.job.title}
                                                                </h3>
                                                                <p className="mt-0.5 truncate text-xs text-[var(--cv-text-muted)]">
                                                                    {entry.job.company || 'Custom Practice'}
                                                                </p>
                                                            </div>
                                                            {(practiceCount > 0 || resumableDraft) && (
                                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                                    {practiceCount > 0 && (
                                                                        <span className="rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--cv-action-primary)]">
                                                                            {practiceCount}
                                                                        </span>
                                                                    )}
                                                                    {resumableDraft && (
                                                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                                                                            {getResumeQuestionLabel(resumableDraft)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex h-5 min-w-0 items-center gap-1.5 text-xs">
                                                            {resumableDraft && (
                                                                <>
                                                                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/25 dark:text-amber-200 dark:ring-amber-900/50">
                                                                        Saved draft
                                                                    </span>
                                                                    <span className="text-[var(--cv-border-subtle)]">·</span>
                                                                </>
                                                            )}
                                                            <span className="truncate text-[var(--cv-text-muted)]">
                                                                Last activity: {formatSessionDate(entry.timestamp)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteClick(entry.id)}
                                                                aria-label={`Delete ${entry.job.title}`}
                                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--cv-text-muted)] hover:bg-[var(--cv-danger-soft)] hover:text-[var(--cv-danger-text)]"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                            {resumableDraft && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResumeSessionDirect(entry)}
                                                                    aria-label="Resume session"
                                                                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-amber-100 px-2.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60 dark:hover:bg-amber-950/70"
                                                                >
                                                                    <Clock size={14} /> Resume
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePracticeAgainDirect(entry)}
                                                                aria-label={resumableDraft ? 'Start over' : 'Practice Again'}
                                                                className={`${resumableDraft ? 'w-8 justify-center px-0' : 'px-2.5'} inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[var(--cv-surface-warm-card-strong)] text-xs font-semibold text-[var(--cv-text-body)] shadow-sm ring-1 ring-[var(--cv-border-subtle)] hover:bg-[var(--cv-surface-warm-muted)]`}
                                                            >
                                                                <Sparkles size={14} />
                                                                {!resumableDraft && 'Practice Again'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedJobForReport(entry)}
                                                                disabled={!entry.interviewHistory || entry.interviewHistory.length === 0}
                                                                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2.5 text-xs font-semibold text-[var(--cv-action-primary)] hover:bg-[var(--cv-action-soft-bg-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <BarChart3 size={14} /> Report
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] py-8 text-center">
                                                <p className="text-sm text-[var(--cv-text-muted)]">No interview sessions found.</p>
                                            </div>
                                        )
                                    }
                                </div>
                            </section>
                            {renderContent()}
                        </aside>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white" /></div>}>
                {selectedJobForReport && <InterviewReportModal jobHistoryEntry={selectedJobForReport} onClose={() => setSelectedJobForReport(null)} />}
            </Suspense>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white" /></div>}>
                {isInterviewModalOpen && interviewState && (
                    <AIInterviewAgentModal
                        jobId={interviewState.jobId}
                        interviewPrompt={interviewState.prompt}
                        questions={interviewState.questions}
                        isFirstTime={interviewState.isFirstTime}
                        resumeContext={interviewState.resumeContext}
                        jobTitle={interviewState.jobTitle}
                        jobCompany={interviewState.jobCompany}
                        initialTranscript={interviewState.initialTranscript}
                        resumeFromQuestionIndex={interviewState.resumeFromQuestionIndex}
                        onDraftChange={(draft) => saveInterviewDraft(interviewState.jobId, draft)}
                        onClose={() => {
                            setIsInterviewModalOpen(false);
                            setInterviewState(null);
                        }}
                    />
                )}
            </Suspense>
        </AppLayout>
    );
};

export default InterviewStudio;
