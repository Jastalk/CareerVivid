
import React, { useState, useEffect, useMemo } from 'react';
import { useResumes } from '../hooks/useResumes';
import { generateResumeFromPrompt, parseResume } from '../services/geminiService';
import { CAREER_PATHS, Industry } from '../data/careers';
import { ArrowRight, Zap, Loader2, ChevronLeft, LayoutDashboard, UploadCloud, FileText, Plus } from 'lucide-react';
import { navigate } from '../utils/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import Logo from '../components/Logo';
import ResumeImport from '../components/ResumeImport';
import ResumeCard from '../components/Dashboard/ResumeCard';
import { ResumeCardSkeleton } from '../components/Dashboard/DashboardSkeletons';
import ShareResumeModal from '../components/ShareResumeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import NewResumeModal from '../components/Resume/NewResumeModal';
import { ResumeData } from '../types';
import AppLayout from '../components/Layout/AppLayout';
import { db } from '../firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

const loadingMessages = [
    "Analyzing your prompt...",
    "Accessing professional knowledge base...",
    "Drafting key achievements...",
    "Selecting impactful skills...",
    "Polishing the final layout...",
    "Almost there!",
];

const placeholderPrompts = [
    'A senior product manager resume for a fintech startup',
    'A recent computer science graduate resume with internship experience',
    'A registered nurse resume specializing in emergency room care',
    'A data scientist resume with a focus on machine learning models',
    'A UX/UI designer portfolio resume for a mobile app',
    'A marketing manager resume with social media campaign experience',
    'A cybersecurity analyst resume with certifications',
    'A project manager resume using Agile methodologies',
];

const GenerationHub: React.FC = () => {
    const { currentUser, userProfile } = useAuth();
    const { navPosition } = useNavigation();
    const { resumes, addAIGeneratedResume, updateResume, deleteResume, duplicateResume, isLoading: isLoadingResumes } = useResumes();
    const [prompt, setPrompt] = useState('');
    const [isFileImport, setIsFileImport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [placeholder, setPlaceholder] = useState('');
    const [activeTailoringJob, setActiveTailoringJob] = useState<{ title: string; company: string } | null>(null);
    const [isSyncingTransit, setIsSyncingTransit] = useState(false);

    /* The creation flow is a dialog now, not a second half of the page. */
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Modal States
    const [shareModalResume, setShareModalResume] = useState<ResumeData | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Delete',
        onConfirm: async () => { },
    });

    useEffect(() => {
        const syncTransitJob = async () => {
            const params = new URLSearchParams(window.location.search);
            const source = params.get('source');
            const scrapeId = params.get('scrapeId');

            if (source === 'extension_tailor') {
                if (scrapeId) {
                    if (!currentUser) return; // Wait until auth state is resolved

                    setIsSyncingTransit(true);
                    try {
                        const docRef = doc(db, 'users', currentUser.uid, 'temporaryScrapes', scrapeId);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            sessionStorage.setItem('jobDescriptionForOptimization', data.description || '');
                            sessionStorage.setItem('jobTitleForOptimization', data.title || '');
                            sessionStorage.setItem('jobCompanyForOptimization', data.company || '');
                            
                            setPrompt(`Tailor my resume for a ${data.title} role at ${data.company}`);
                            setActiveTailoringJob({
                                title: data.title || '',
                                company: data.company || '',
                            });

                            // Delete transit document immediately for privacy
                            await deleteDoc(docRef);
                        }
                    } catch (error) {
                        console.error('Error syncing transit job:', error);
                    } finally {
                        setIsSyncingTransit(false);
                        // Cleanse URL
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);
                    }
                } else {
                    const fallbackDescription = params.get('fallbackDescription');
                    const jobTitle = params.get('jobTitle') || '';
                    if (fallbackDescription) {
                        sessionStorage.setItem('jobDescriptionForOptimization', fallbackDescription);
                        sessionStorage.setItem('jobTitleForOptimization', jobTitle);
                        sessionStorage.setItem('jobCompanyForOptimization', '');
                        
                        setPrompt(`Tailor my resume for a ${jobTitle} role`);
                        setActiveTailoringJob({
                            title: jobTitle || 'Specified Job',
                            company: '',
                        });

                        // Cleanse URL
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);
                    }
                }
            }
        };

        syncTransitJob();
    }, [currentUser]);

    useEffect(() => {
        let interval: number;
        if (isLoading) {
            setLoadingMessageIndex(0); // Reset on start
            interval = window.setInterval(() => {
                setLoadingMessageIndex(prevIndex => {
                    if (prevIndex >= loadingMessages.length - 1) {
                        return prevIndex; // Stay on the last message
                    }
                    return prevIndex + 1;
                });
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

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
                // Deleting
                setPlaceholder(currentPrompt.substring(0, charIndex - 1));
                charIndex--;
            } else {
                // Typing
                setPlaceholder(currentPrompt.substring(0, charIndex + 1));
                charIndex++;
            }

            if (!isDeleting && charIndex === currentPrompt.length) {
                // Finished typing, start pause before deleting
                isDeleting = true;
                const pause = pauseDurations[pauseIndex % pauseDurations.length];
                pauseIndex = (pauseIndex + 1) % pauseDurations.length;
                timeoutId = window.setTimeout(type, pause);
            } else if (isDeleting && charIndex === 0) {
                // Finished deleting, move to next prompt
                isDeleting = false;
                promptIndex = (promptIndex + 1) % placeholderPrompts.length;
                timeoutId = window.setTimeout(type, 500); // Brief pause before typing next
            } else {
                // Continue typing/deleting
                timeoutId = window.setTimeout(type, isDeleting ? deletingSpeed : typingSpeed);
            }
        };

        // Start the effect after an initial delay
        timeoutId = window.setTimeout(type, 1500);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    // Dual-Path Generation handler
    /**
     * What we already know about the person, best source first.
     *
     * Their most recently edited resume beats their account: it is what they
     * curated by hand, and it carries a phone and city that the account record
     * has never had. Falling back to the display name is split on the first
     * space — imperfect for compound surnames, but a first name they recognise
     * beats "John".
     */
    const knownIdentity = useMemo(() => {
        // updatedAt is an ISO string here, not a Firestore Timestamp.
        const latest = [...resumes].sort(
            (a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''),
        )[0]?.personalDetails;

        const [displayFirst, ...displayRest] = (userProfile?.displayName ?? '').trim().split(/\s+/);
        const clean = (value: unknown): string | undefined => {
            const text = typeof value === 'string' ? value.trim() : '';
            // Sample data is worse than nothing: it looks real enough to ship.
            if (!text || /^(john|jane) doe$/i.test(text) || /example\.com$/i.test(text)) return undefined;
            return text;
        };

        return {
            firstName: clean(latest?.firstName) ?? clean(displayFirst),
            lastName: clean(latest?.lastName) ?? clean(displayRest.join(' ')),
            email: clean(latest?.email) ?? clean(userProfile?.email) ?? clean(currentUser?.email),
            phone: clean(latest?.phone),
            city: clean(latest?.city),
            country: clean(latest?.country),
        };
    }, [resumes, userProfile, currentUser]);

    const handleGenerate = async (payload: { type: 'prompt', value: string } | { type: 'template', templateId: string }) => {
        if (!currentUser) return;

        // Skip logic if empty prompt
        if (payload.type === 'prompt' && !payload.value.trim()) return;

        if (resumes.length === 0) {
            sessionStorage.setItem('isFirstResume', 'true');
        } else {
            sessionStorage.removeItem('isFirstResume');
        }

        setIsLoading(true);
        setError('');
        try {
            let resumeData;

            if (payload.type === 'template') {
                // PATH A: STATIC TEMPLATE BYPASSING AI
                const { getSystemTemplate } = await import('../services/templateService');
                const { interpolateTemplate } = await import('../utils/templateInterpolator');

                let templateString = '';
                try {
                    templateString = await getSystemTemplate(payload.templateId);
                } catch (e) {
                    console.warn("Template not found in DB, falling back to basic...", e);
                    // Minimal fallback if DB isn't seeded yet
                    templateString = JSON.stringify({
                        personalDetails: { jobTitle: "Professional", firstName: "{{USER_NAME}}", email: "{{USER_EMAIL}}" },
                        professionalSummary: "{{USER_SUMMARY}}",
                        employmentHistory: [], education: [], skills: [], languages: [], websites: []
                    });
                }

                // Inject user profile data
                const hydratedString = interpolateTemplate(templateString, userProfile || currentUser);
                resumeData = JSON.parse(hydratedString);

            } else {
                // PATH B: AI GENERATION
                if (isFileImport) {
                    resumeData = await parseResume(currentUser.uid, payload.value, 'English');
                } else {
                    resumeData = await generateResumeFromPrompt(currentUser.uid, payload.value, knownIdentity);
                }
            }

            if (!resumeData || typeof resumeData !== 'object' || !resumeData.personalDetails) {
                console.error("Invalid data structure:", resumeData);
                throw new Error("Failed to generate a valid resume structure.");
            }

            const title = `${resumeData.personalDetails.jobTitle || 'New'} Resume`;
            addAIGeneratedResume(resumeData, title);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsLoading(false);
        }
    };

    const handlePromptSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        handleGenerate({ type: 'prompt', value: prompt });
    };

    const handleFileProcessed = (text: string) => {
        setIsFileImport(true);
        handleGenerate({ type: 'prompt', value: text });
    };

    const handleTextChange = (text: string) => {
        setPrompt(text);
        if (isFileImport) setIsFileImport(false);
    };

    /**
     * Picking a role writes a resume with AI, not from a stored template.
     *
     * The template path fills a fixed JSON skeleton with the user's profile
     * fields, so every "Software Engineer" came out identical apart from the
     * name — and for any role without a seeded template it fell through to a
     * near-empty stub. Sending the role through the same model the prompt box
     * uses means the summary, the bullets and the skills are actually written
     * for that job.
     *
     * It costs credits, which is why the modal confirms before spending them.
     */
    const handleRoleSelect = (roleName: string) => {
        const brief = activeTailoringJob
            ? `Write a resume for a ${roleName} role, aimed at the ${activeTailoringJob.title} position at ${activeTailoringJob.company}.`
            : `Write a resume for a ${roleName} role.`;

        setIsCreateOpen(false);
        // `isFileImport` would otherwise route this through the file parser if
        // the user had dropped a file earlier in the same session.
        setIsFileImport(false);
        handleGenerate({ type: 'prompt', value: brief });
    };

    const handleDeleteClick = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Resume',
            message: 'Are you sure you want to delete this resume? This action cannot be undone.',
            confirmText: 'Delete',
            onConfirm: async () => {
                await deleteResume(id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };


    if (isLoading || isSyncingTransit) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-6">
                        {isSyncingTransit ? "Synchronizing Job Details..." : "Generating your resume..."}
                    </h1>
                    <div className="h-6 mt-2">
                        <p key={loadingMessageIndex} className="text-gray-500 dark:text-gray-400 animate-fade-in">
                            {isSyncingTransit ? "Fetching description details from secure extension bridge..." : loadingMessages[loadingMessageIndex]}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="cv-design-page cv-design-grid relative min-h-screen pb-20 text-left">
                {/* Top Section: My Resumes */}
                <div className="cv-design-header mb-12 pb-12 pt-8">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center mb-8">
                            <h1 className="cv-design-title flex items-center gap-3 text-3xl">
                                <FileText className="text-[var(--cv-action-primary)]" size={32} />
                                Resumes
                            </h1>
                            <div className="flex items-center gap-3">
                                {resumes.length > 0 && (
                                    <div className={navPosition === 'side' ? 'md:hidden' : ''}>
                                        <button
                                            onClick={() => navigate('/dashboard')}
                                            className="cv-design-button-secondary px-4 py-2 text-sm"
                                        >
                                            <LayoutDashboard size={18} />
                                            <span className="hidden sm:inline">Dashboard</span>
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="cv-design-button-primary px-4 py-2 text-sm"
                                >
                                    <Plus size={20} /> New resume
                                </button>
                            </div>
                        </div>

                        {activeTailoringJob && (
                            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500 text-white animate-pulse">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                            Tailoring Mode Active ✨
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Matching your resume with <strong>{activeTailoringJob.title}</strong> at <strong>{activeTailoringJob.company}</strong>. Select any resume below to optimize, or click "New Resume".
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setActiveTailoringJob(null);
                                        sessionStorage.removeItem('jobDescriptionForOptimization');
                                        sessionStorage.removeItem('jobTitleForOptimization');
                                        sessionStorage.removeItem('jobCompanyForOptimization');
                                        setPrompt('');
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors font-medium px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {isLoadingResumes
                                ? Array.from({ length: 4 }).map((_, i) => <ResumeCardSkeleton key={i} />)
                                : resumes.length > 0 ? (
                                    resumes.map(resume => (
                                        <ResumeCard
                                            key={resume.id}
                                            resume={resume}
                                            onUpdate={updateResume}
                                            onDuplicate={duplicateResume}
                                            onDelete={handleDeleteClick}
                                            onShare={setShareModalResume}
                                            onDragStart={(e) => e.preventDefault()}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full rounded-xl border border-dashed border-[var(--cv-border-product)] bg-[var(--cv-surface-muted)] px-6 py-14 text-center">
                                        <h2 className="cv-design-title text-lg">No resumes yet</h2>
                                        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--cv-text-muted)]">
                                            Describe the job you want, paste a job post, or upload a resume you already have.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateOpen(true)}
                                            className="cv-design-button-primary mt-5 px-4 py-2 text-sm"
                                        >
                                            <Plus size={18} /> New resume
                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                </div>

                {/* Modals */}
                <NewResumeModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    prompt={prompt}
                    placeholder={placeholder}
                    onPromptChange={handleTextChange}
                    onFileProcessed={handleFileProcessed}
                    onSubmit={() => handlePromptSubmit()}
                    onRoleSelect={handleRoleSelect}
                    tailoringJob={activeTailoringJob}
                    error={error}
                />

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText={confirmModal.confirmText}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                />

                {shareModalResume && (
                    <ShareResumeModal
                        isOpen={!!shareModalResume}
                        onClose={() => setShareModalResume(null)}
                        resume={shareModalResume}
                        onUpdate={updateResume}
                    />
                )}
            </div>
        </AppLayout>
    );
};

export default GenerationHub;
