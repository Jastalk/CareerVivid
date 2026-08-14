
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { CAREER_PATHS, Industry } from '../data/careers';
import { ArrowRight, Mic, Loader2, ChevronLeft, Clock, Sparkles, Trash2, BarChart3, Building2, Search, ListChecks, ExternalLink, Swords, X } from 'lucide-react';
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
import '../components/Landing/live/liveLanding.css';

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


const getResumableDraft = (entry: PracticeHistoryEntry): InterviewSessionDraft | null => {
    const draft = entry.activeInterviewDraft;
    const draftQuestions = draft?.questions?.length ? draft.questions : entry.questions;
    if (!draft || !draft.transcript?.length || !draftQuestions?.length) return null;
    if (draft.questionIndex >= draftQuestions.length) return null;
    return { ...draft, questions: draftQuestions };
};

const getResumeQuestionLabel = (draft: InterviewSessionDraft) =>
    `Q${Math.min(draft.questionIndex + 1, draft.questions.length)}/${draft.questions.length}`;

/** The quietest label on the page. Same face and rhythm as the dashboard's. */
const Eyebrow: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
    <p id={id} className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>
        {children}
    </p>
);

interface InterviewStudioProps {
    jobId?: string;
}

const InterviewStudio: React.FC<InterviewStudioProps> = ({ jobId }) => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    /*
     * Fixed, not chosen. The free-text starter that owned these pickers is
     * gone — interviews now begin from a company quest or a career path — but
     * both of those still shape their generated questions with these, so the
     * values stay rather than the controls.
     */
    const interviewMode: InterviewMode = 'Behavioral';
    const interviewDifficulty: InterviewDifficulty = 'Standard';
    const interviewDuration: InterviewDuration = '15 min';
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [authGate, setAuthGate] = useState<Pick<AuthGateModalProps, 'title' | 'message' | 'variant'> | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
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


    const renderContent = () => {
        if (selectedIndustry) {
            return (
                <section className="cvl-panel p-4 sm:p-5">
                    <button
                        onClick={() => setSelectedIndustry(null)}
                        className="cvl-btn-ghost -ml-1.5 mb-3 inline-flex min-h-8 items-center gap-1.5 px-1.5 text-[13px] font-semibold"
                    >
                        <ChevronLeft size={15} aria-hidden="true" /> {t('interview_studio.back_to_industries')}
                    </button>
                    <h2 className="text-[15px] font-semibold tracking-tight">{t('interview_studio.select_role', { industry: selectedIndustry.name })}</h2>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 @[1080px]/interview-page:grid-cols-1">
                        {selectedIndustry.roles.map(role => (
                            <button
                                key={role.name}
                                onClick={() => handleRoleSelect(role.name)}
                                className="cvl-panel-inset cvl-panel-lift flex min-h-[52px] items-center justify-between gap-3 p-3 text-left"
                            >
                                <h3 className="text-[13.5px] font-semibold">{role.name}</h3>
                                <ArrowRight size={15} style={{ color: 'var(--cvl-muted)' }} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </section>
            );
        }

        return (
            <section className="cvl-panel p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                    >
                        <Swords size={15} aria-hidden="true" />
                    </span>
                    <h2 className="text-[15px] font-semibold tracking-tight">{t('interview_studio.select_career')}</h2>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 @[1080px]/interview-page:grid-cols-1">
                    {CAREER_PATHS.map(industry => (
                        <button
                            key={industry.name}
                            onClick={() => setSelectedIndustry(industry)}
                            className="cvl-panel-inset cvl-panel-lift flex min-h-[52px] items-center justify-between gap-3 p-3 text-left"
                        >
                            <h3 className="text-[13.5px] font-semibold">{industry.name}</h3>
                            <ArrowRight size={15} style={{ color: 'var(--cvl-muted)' }} aria-hidden="true" />
                        </button>
                    ))}
                </div>
            </section>
        );
    };

    /*
     * Three bands, three tokens. Red is the only hard signal the palette has, so
     * the hardest band borrows it — nothing here is destructive, it just reads
     * as "expect a fight".
     */
    const getDifficultyBadge = (difficulty: number | null) => {
        if (!difficulty) return null;
        const tone = difficulty >= 8
            ? { background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }
            : difficulty >= 6.5
                ? { background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }
                : { background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' };
        return (
            <span
                className="cvl-mono inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={tone}
            >
                <BarChart3 size={11} aria-hidden="true" />
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
        <section className="cvl-panel @container/guides overflow-hidden" aria-labelledby="company-guides-heading">
            {/* Header */}
            <div className="border-b p-4 sm:p-5" style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}>
                <div className="flex flex-col gap-3 @[720px]/guides:flex-row @[720px]/guides:items-center @[720px]/guides:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                        >
                            <Building2 size={16} aria-hidden="true" />
                        </span>
                        <h2 id="company-guides-heading" className="text-[15px] font-semibold tracking-tight">
                            Company guides
                        </h2>
                    </div>
                    <div
                        className="flex shrink-0 items-stretch overflow-hidden rounded-xl border"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)' }}
                    >
                        {[
                            { value: INTERVIEW_GUIDE_TOTALS.companies, label: 'companies' },
                            { value: INTERVIEW_GUIDE_TOTALS.questQuestions, label: 'questions' },
                            { value: INTERVIEW_GUIDE_TOTALS.stages, label: 'stages' },
                        ].map((stat, index) => (
                            <div
                                key={stat.label}
                                className="flex-1 px-4 py-2 text-center"
                                style={index > 0 ? { borderLeft: '1px solid var(--cvl-line)' } : undefined}
                            >
                                <p className="text-sm font-bold tabular-nums">{stat.value.toLocaleString()}</p>
                                <p className="cvl-mono mt-0.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cvl-muted)' }}>
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search + category filters */}
                <div className="mt-4 flex flex-col gap-2.5">
                    {/* Paper, not paper-2: the header band is already paper-2, and a
                        field the same shade as the thing behind it stops looking typeable. */}
                    <div className="cvl-field flex min-h-[52px] items-center gap-3 px-4" style={{ background: 'var(--cvl-paper)' }}>
                        <Search size={17} strokeWidth={2.25} className="shrink-0" style={{ color: 'var(--cvl-muted)' }} aria-hidden="true" />
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
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 py-3 text-sm font-medium focus:ring-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                            style={{ color: 'var(--cvl-ink)' }}
                        />
                        {guideSearch ? (
                            <button
                                type="button"
                                onClick={() => { setGuideSearch(''); setGuideLimit(12); guideSearchRef.current?.focus(); }}
                                aria-label="Clear search"
                                className="cvl-btn-ghost flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                            >
                                <X size={14} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                        ) : (
                            <kbd
                                className="hidden shrink-0 items-center rounded-md border px-1.5 py-0.5 font-sans text-[11px] font-semibold @[480px]/guides:inline-flex"
                                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-muted)' }}
                            >
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
                                    className={`${isActive ? 'cvl-cta' : 'cvl-btn'} min-h-8 rounded-full px-3 py-1.5 text-xs font-semibold transition`}
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
                        /*
                         * Inset, not panel: these cards sit inside the guides section,
                         * which is already paper. Paper on paper leaves only the 1px
                         * border to say where a card starts.
                         */
                        return (
                            <article
                                key={guide.slug}
                                className="cvl-panel-inset cvl-panel-lift flex flex-col p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <CompanyLogo company={guide.company} slug={guide.slug} size={40} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="truncate text-sm font-semibold">{guide.company}</h3>
                                            {getDifficultyBadge(guide.difficulty)}
                                        </div>
                                        <p className="cvl-mono mt-0.5 truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                            {formatGuideMeta(guide)}
                                        </p>
                                    </div>
                                </div>

                                {topicChips.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {topicChips.map((topic) => (
                                            <span
                                                key={topic}
                                                className="max-w-full truncate rounded-md px-2 py-1 text-[11px] font-medium"
                                                style={{ background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
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
                                        className="cvl-cta inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition"
                                    >
                                        <Swords size={14} aria-hidden="true" />
                                        Start quest
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCompanyGuideInterview(guide)}
                                        disabled={isLoading}
                                        title="Single mock interview (no quest)"
                                        aria-label={`Single mock interview for ${guide.company}`}
                                        className="cvl-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
                                        style={{ color: 'var(--cvl-muted)' }}
                                    >
                                        {isStarting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} aria-hidden="true" />}
                                    </button>
                                    <a
                                        href={`https://www.techinterview.org/companies/${guide.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cvl-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                        style={{ color: 'var(--cvl-muted)' }}
                                        aria-label={`Open ${guide.company} source guide`}
                                        title="View source guide"
                                    >
                                        <ExternalLink size={14} aria-hidden="true" />
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {visibleGuideSummaries.length === 0 && (
                    <div className="rounded-xl border border-dashed py-10 text-center" style={{ borderColor: 'var(--cvl-line)' }}>
                        <ListChecks className="mx-auto" size={22} style={{ color: 'var(--cvl-muted)' }} aria-hidden="true" />
                        <p className="mt-2 text-sm font-semibold">No matching company guides</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--cvl-muted)' }}>Try a company name, interview topic, or system design keyword.</p>
                    </div>
                )}

                {guideMatchTotal > visibleGuideSummaries.length && (
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setGuideLimit((prev) => prev + 12)}
                            className="cvl-btn inline-flex min-h-9 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
                        >
                            Show more companies
                            <span style={{ color: 'var(--cvl-muted)' }}>({guideMatchTotal - visibleGuideSummaries.length} more)</span>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );

    if ((isLoading || isSyncingTransit) && !isInterviewModalOpen) {
        return (
            <div className="cvl flex min-h-screen flex-col items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="mx-auto h-14 w-14 animate-spin" style={{ color: 'var(--cvl-purple)' }} aria-hidden="true" />
                    <h1 className="mt-6 text-2xl font-semibold tracking-tight">
                        {isSyncingTransit ? "Synchronizing Job Details..." : t('interview_studio.preparing')}
                    </h1>
                    <div className="mt-2 h-6">
                        <p key={loadingMessageIndex} className="cvl-mono animate-fade-in text-[12px]" style={{ color: 'var(--cvl-muted)' }}>
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
            <div className="cvl relative min-h-screen pb-16 text-left">
                <div id="start-session" className="@container/interview-page mx-auto max-w-screen-2xl px-4 py-6 text-left sm:px-6 lg:px-8 lg:py-8">
                    <header className="mb-6 max-w-2xl">
                        <Eyebrow>interview studio</Eyebrow>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Know exactly what to expect</h1>
                        <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                            Interview stages, key topics, and realistic practice questions our frontier AI generates from thousands of real interview reviews on{' '}
                            <a
                                href="https://www.techinterview.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold underline underline-offset-2"
                                style={{ color: 'var(--cvl-purple)' }}
                            >
                                techinterview.org
                            </a>.
                        </p>
                    </header>
                    <div className="grid grid-cols-1 items-start gap-5 @[1080px]/interview-page:grid-cols-[minmax(0,1fr)_360px]">
                        <main className="space-y-4">
                            {error && (
                                <p
                                    className="rounded-xl border p-3 text-[13px]"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-danger-soft)', color: 'var(--cvl-danger)' }}
                                >
                                    {error}
                                </p>
                            )}
                            {renderCompanyGuideCards()}
                        </main>
                        <aside className="space-y-4 @[1080px]/interview-page:sticky @[1080px]/interview-page:top-6">
                            <section className="cvl-panel p-4" aria-labelledby="recent-sessions-heading">
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div>
                                        <h2 id="recent-sessions-heading" className="text-[15px] font-semibold tracking-tight">Recent sessions</h2>
                                        <p className="cvl-mono mt-0.5 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>{practiceHistory.length} saved</p>
                                    </div>
                                    <span
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                    >
                                        <Mic size={16} aria-hidden="true" />
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
                                                        className="cvl-panel-inset flex min-h-[124px] flex-col p-3"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <h3 className="truncate text-[13.5px] font-semibold">
                                                                    {entry.job.title}
                                                                </h3>
                                                                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--cvl-muted)' }}>
                                                                    {entry.job.company || 'Custom Practice'}
                                                                </p>
                                                            </div>
                                                            {(practiceCount > 0 || resumableDraft) && (
                                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                                    {practiceCount > 0 && (
                                                                        <span
                                                                            className="cvl-mono rounded-full px-2 py-0.5 text-[11px] font-bold"
                                                                            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                                                        >
                                                                            {practiceCount}
                                                                        </span>
                                                                    )}
                                                                    {resumableDraft && (
                                                                        <span
                                                                            className="cvl-mono rounded-full px-2 py-0.5 text-[11px] font-bold"
                                                                            style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                                                        >
                                                                            {getResumeQuestionLabel(resumableDraft)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex h-5 min-w-0 items-center gap-1.5 text-xs">
                                                            {resumableDraft && (
                                                                <>
                                                                    <span
                                                                        className="shrink-0 rounded-full px-2 py-0.5 font-semibold"
                                                                        style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                                                    >
                                                                        Saved draft
                                                                    </span>
                                                                    <span style={{ color: 'var(--cvl-line)' }}>·</span>
                                                                </>
                                                            )}
                                                            <span className="truncate" style={{ color: 'var(--cvl-muted)' }}>
                                                                Last activity: {formatSessionDate(entry.timestamp)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteClick(entry.id)}
                                                                aria-label={`Delete ${entry.job.title}`}
                                                                className="cvl-btn-ghost inline-flex h-8 w-8 shrink-0 items-center justify-center"
                                                            >
                                                                <Trash2 size={15} aria-hidden="true" />
                                                            </button>
                                                            {resumableDraft && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleResumeSessionDirect(entry)}
                                                                    aria-label="Resume session"
                                                                    className="cvl-cta inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition"
                                                                >
                                                                    <Clock size={14} aria-hidden="true" /> Resume
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePracticeAgainDirect(entry)}
                                                                aria-label={resumableDraft ? 'Start over' : 'Practice Again'}
                                                                className={`${resumableDraft ? 'w-8 justify-center px-0' : 'px-2.5'} cvl-btn inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md text-xs font-semibold`}
                                                            >
                                                                <Sparkles size={14} aria-hidden="true" />
                                                                {!resumableDraft && 'Practice Again'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedJobForReport(entry)}
                                                                disabled={!entry.interviewHistory || entry.interviewHistory.length === 0}
                                                                className="cvl-btn inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                                                                style={{ color: 'var(--cvl-purple)' }}
                                                            >
                                                                <BarChart3 size={14} aria-hidden="true" /> Report
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })
                                        ) : (
                                            <div className="rounded-lg border border-dashed py-8 text-center" style={{ borderColor: 'var(--cvl-line)' }}>
                                                <p className="text-[13px]" style={{ color: 'var(--cvl-muted)' }}>No interview sessions found.</p>
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
            {/*
              * Literal white, not a token: these fallbacks render as siblings of the
              * .cvl wrapper, and every cvl token is declared on .cvl — so the var
              * would resolve to nothing here and the spinner would inherit the app's
              * dark ink on a black scrim. The scrim is a fixed black overlay in both
              * themes, so white is the correct answer regardless.
              */}
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}><Loader2 className="animate-spin" style={{ color: '#ffffff' }} /></div>}>
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

            {/* White for the same reason as the fallback above. */}
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}><Loader2 className="animate-spin" style={{ color: '#ffffff' }} /></div>}>
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
