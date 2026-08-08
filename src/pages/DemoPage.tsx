import React, { useState, useEffect } from 'react';
import { generateResumeFromPrompt, generateDemoInterviewQuestions } from '../services/geminiService';
import { Loader2, Mic, Wand2, ArrowLeft, Search, Briefcase, ChevronRight } from 'lucide-react';
import { navigate } from '../utils/navigation';
import { createBlankResume } from '../constants';
import { auth, db } from '../firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CAREER_PATHS } from '../data/careers';
import { trackDemoEvent } from '../services/trackingService';
import DemoResumeInfoModal from '../components/DemoResumeInfoModal';
import { useTranslation } from 'react-i18next';
import SEOHelper from '../components/SEOHelper';

const ACADEMIA_RESEARCH_PATH = {
    name: 'Academia & Research',
    roles: [
        { name: 'Research Scientist (Ph.D.)' },
        { name: 'Quantitative Analyst (Ph.D.)' },
        { name: 'Machine Learning Scientist (Ph.D.)' },
        { name: 'Data Scientist (Ph.D.)' },
        { name: 'University Professor' },
        { name: 'Postdoctoral Fellow' },
    ],
};

const ALL_DEMO_PATHS = [...CAREER_PATHS, ACADEMIA_RESEARCH_PATH];

const resumeLoadingMessages = [
    "Analyzing your selected role...",
    "Drafting a professional summary...",
    "Highlighting key skills and experiences...",
    "Structuring the resume layout...",
    "Finalizing your preview...",
];

const interviewLoadingMessages = [
    "Warming up the AI interviewer, Vivid...",
    "Reviewing the role requirements...",
    "Crafting tailored, insightful questions...",
    "Setting up the virtual interview room...",
    "Final checks... Get ready to shine!",
];


const DemoPage: React.FC = () => {
    const { t } = useTranslation();
    const [activeCategory, setActiveCategory] = useState<string>(ALL_DEMO_PATHS[0].name);
    const [searchQuery, setSearchQuery] = useState('');

    const [isGeneratingResume, setIsGeneratingResume] = useState(false);
    const [isPreparingInterview, setIsPreparingInterview] = useState(false);
    const [error, setError] = useState('');
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const [selectedRoleForResume, setSelectedRoleForResume] = useState('');

    const isLoading = isGeneratingResume || isPreparingInterview;

    // Check for pending interview intent on load (Post-Signup Redirect)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && !user.isAnonymous) {
                const intentStr = localStorage.getItem('pending_interview_intent');
                if (intentStr) {
                    try {
                        const { prompt, title } = JSON.parse(intentStr);
                        console.log("Restoring pending interview session:", title);
                        // Clean up immediate to prevent loops, then trigger
                        localStorage.removeItem('pending_interview_intent');
                        // Pass 'user' explicitly to avoid race condition with auth.currentUser
                        handleGenerateInterview(prompt, title, user);
                    } catch (e) {
                        console.error("Failed to parse interview intent", e);
                        localStorage.removeItem('pending_interview_intent');
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let interval: number;
        const messages = isGeneratingResume ? resumeLoadingMessages : interviewLoadingMessages;

        if (isLoading) {
            setLoadingMessageIndex(0); // Reset on start
            interval = window.setInterval(() => {
                setLoadingMessageIndex(prevIndex => {
                    if (prevIndex >= messages.length - 1) {
                        return prevIndex; // Stay on the last message
                    }
                    return prevIndex + 1;
                });
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGeneratingResume, isPreparingInterview]);

    if (isLoading) {
        const messages = isGeneratingResume ? resumeLoadingMessages : interviewLoadingMessages;
        const loadingText = isGeneratingResume ? 'Generating your resume preview...' : 'Preparing your interview...';
        return (
            <div className="fixed inset-0 bg-white dark:bg-gray-950 z-50 flex flex-col items-center justify-center text-center p-4">
                <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-8" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{loadingText}</h1>
                <div className="h-6 mt-4">
                    <p key={loadingMessageIndex} className="text-gray-500 dark:text-gray-400 animate-fade-in font-medium">
                        {messages[loadingMessageIndex]}
                    </p>
                </div>
            </div>
        )
    }

    const handleGenerateResume = async (name: string, experience: string) => {
        if (!experience.trim() || !selectedRoleForResume.trim()) return;

        await trackDemoEvent('totalResumeGenerations');

        const prompt = `A professional resume for a ${selectedRoleForResume} named ${name}. Their experience and goals are: ${experience}`;

        setIsGeneratingResume(true);
        setError('');
        try {
            const guestUid = `guest_${Date.now()}`;
            const aiData = await generateResumeFromPrompt(guestUid, prompt);

            if (!aiData || typeof aiData !== 'object' || !aiData.personalDetails) {
                throw new Error("AI failed to generate a valid resume. Please try a different prompt.");
            }

            const blankResume = createBlankResume();

            // Override AI-generated name with user-provided name for consistency
            const nameParts = name.split(' ');
            aiData.personalDetails.firstName = nameParts.shift() || '';
            aiData.personalDetails.lastName = nameParts.join(' ') || '';

            const guestResume = {
                ...blankResume,
                ...aiData,
                id: 'guest',
                title: `${aiData.personalDetails.jobTitle || 'New'} Resume`,
            };

            localStorage.setItem('guestResume', JSON.stringify(guestResume));
            navigate('/edit/guest');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingResume(false);
            setIsResumeModalOpen(false);
        }
    };

    const handleGenerateResumeClick = (roleName: string) => {
        setSelectedRoleForResume(roleName);
        setIsResumeModalOpen(true);
    };

    const handleGenerateInterview = async (prompt: string, title: string, explicitUser?: any) => {
        if (!prompt.trim()) return;

        // 1. Auth Guard - Strict (No Guest Access)
        // Prefer explicitUser if provided (from onAuthStateChanged), fallback to auth.currentUser
        const user = explicitUser || auth.currentUser;

        if (!user || user.isAnonymous) {
            console.log("Auth Guard: User not logged in, saving intent and redirecting.");
            // Save intent to restore after login
            localStorage.setItem('pending_interview_intent', JSON.stringify({ prompt, title }));
            // Redirect to SignUp with callback to Demo page
            navigate('/signup?redirect=/demo');
            return;
        }

        try {
            await trackDemoEvent('totalInterviewStarts');
        } catch (err) {
            console.warn("Tracking failed but proceeding with interview:", err);
        }

        setIsPreparingInterview(true);
        setError('');
        try {
            // 2. Create Job Entry in Firestore
            // We do this manually instead of using hooks to ensure immediate availability without re-renders
            const jobId = `demo_${Date.now()}`;
            const jobData = {
                title: title,
                company: 'CareerVivid Demo',
                location: 'Remote',
                description: prompt,
                url: '',
                id: jobId
            };

            // Using the same structure as usePracticeHistory
            const historyRef = doc(db, 'users', user.uid, 'practiceHistory', jobId);

            // Generate initial questions just to have them (optional, but good for consistency)
            const questions = await generateDemoInterviewQuestions(prompt);

            await setDoc(historyRef, {
                job: jobData,
                questions: questions,
                timestamp: serverTimestamp(),
                interviewHistory: [],
                section: 'interviews',
            });

            /*
            // 3. Get Auth Token for Microservice
            const functions = getFunctions(undefined, 'us-west1');
            const getToken = httpsCallable(functions, 'getInterviewAuthToken');
            const result = await getToken();
            const { token } = result.data as { token: string };

            // 4. Redirect to External Interview Studio
            const baseUrl = 'https://careervivid-371634100960.us-west1.run.app';
            const targetUrl = `${baseUrl}/#/interview-studio/${jobId}?token=${token}`;

            window.location.href = targetUrl;
            */

            navigate(`/interview-studio/${jobId}`);

        } catch (e) {
            console.error("Interview start error:", e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            setIsPreparingInterview(false);
        }
    };

    // Filter logic
    const filteredCategories = ALL_DEMO_PATHS.map(cat => ({
        ...cat,
        roles: cat.roles.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(cat => cat.roles.length > 0);

    const displayCategories = searchQuery ? filteredCategories : filteredCategories.filter(c => c.name === activeCategory);

    return (
        <>
            <SEOHelper
                title="CareerVivid Resume and Interview Demo"
                description="Try CareerVivid's guided resume and interview preparation demo for your target role."
                url="https://careervivid.app/demo"
                schemaType="SoftwareApplication"
            />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans">
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-8 pb-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto">
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Back to Home
                        </a>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{t('demo.title')}</h1>
                                <p className="text-lg text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
                                    {t('demo.subtitle')}
                                </p>
                            </div>
                            <div className="w-full md:w-auto">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search roles (e.g. Engineer)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-900 border focus:border-primary-500 rounded-lg text-sm transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {!searchQuery && (
                            <div className="flex gap-2 overflow-x-auto pb-2 mt-8 no-scrollbar mask-linear-fade">
                                {ALL_DEMO_PATHS.map(cat => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setActiveCategory(cat.name)}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all border ${activeCategory === cat.name
                                            ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {displayCategories.map((industry) => (
                            <div key={industry.name} className="mb-12 animate-fade-in">
                                {searchQuery && <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Briefcase size={20} className="text-gray-400" /> {industry.name}</h2>}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {industry.roles.map((role) => {
                                        const interviewPrompt = `A mock interview for a ${role.name} position.`;
                                        return (
                                            <div key={role.name} className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-primary-500/30 dark:hover:border-primary-500/30 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                        {role.name}
                                                    </h3>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                                                        <ChevronRight size={20} />
                                                    </div>
                                                </div>

                                                <div className="mt-auto grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => handleGenerateResumeClick(role.name)}
                                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors border border-transparent hover:border-primary-200 dark:hover:border-primary-800"
                                                    >
                                                        <Wand2 size={16} /> Resume
                                                    </button>
                                                    <button
                                                        onClick={() => handleGenerateInterview(interviewPrompt, role.name)}
                                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                                                    >
                                                        <Mic size={16} /> Interview
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {displayCategories.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-gray-500 text-lg">No roles found matching "{searchQuery}".</p>
                                <button onClick={() => setSearchQuery('')} className="mt-4 text-primary-600 font-semibold hover:underline">Clear search</button>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-100 dark:bg-red-900/90 text-red-600 dark:text-red-200 px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-fade-in">
                        {error}
                    </div>
                )}
            </div>
            <DemoResumeInfoModal
                isOpen={isResumeModalOpen}
                onClose={() => setIsResumeModalOpen(false)}
                onGenerate={handleGenerateResume}
                roleName={selectedRoleForResume}
                isLoading={isGeneratingResume}
            />
            {/* Removed AIInterviewAgentModal from here as it's no longer used */}
        </>
    );
};

export default DemoPage;
