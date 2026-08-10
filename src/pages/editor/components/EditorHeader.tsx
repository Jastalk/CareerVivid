import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Share2, Download, ChevronDown, FileText, FileType, Loader2, Languages, Eye, MoreVertical, Edit as EditIcon, Moon, Sun, Sparkles, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ResumeData } from '../../../types';
import ThemeToggle from '../../../components/ThemeToggle';
import { SUPPORTED_TRANSLATE_LANGUAGES } from '../../../constants';
import { navigate } from '../../../utils/navigation';

const CoverLetterManagerModal = React.lazy(() => import('./CoverLetterManagerModal'));
const TailorResumeModal = React.lazy(() => import('./TailorResumeModal'));

interface EditorHeaderProps {
    resume: ResumeData;
    currentUser: any;
    isShared: boolean;
    isGuestMode: boolean;
    isTranslating: boolean;
    isExporting: boolean;
    hasAnnotations: boolean;
    hasViewedFeedback: boolean;
    commentsCount: number;
    showAnnotationOverlay: boolean;
    theme: string;
    showGuideArrow: boolean;
    onResumeChange: (updates: Partial<ResumeData>) => void;
    onExport: (optionId: string) => void;
    onTranslate: (langCode: string) => void;
    onToggleFeedback: () => void;
    onShare: () => void;
    onToggleTheme: () => void;
    setViewMode: (mode: 'edit' | 'preview') => void;
    onDismissGuideArrow?: () => void;
    onExportToGoogleDocs?: (format?: 'google-docs' | 'docx') => void;
    onDropdownChange?: (isOpen: boolean) => void;
    initialTailorModalOpen?: boolean;
    initialJobDescription?: string;
    initialCoverLetterOpen?: boolean;
    initialCoverLetterSeed?: { jobTitle?: string; companyName?: string; jobDescription?: string } | null;
}

type CoverLetterSeed = {
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
} | null;

const EditorHeader: React.FC<EditorHeaderProps> = ({
    resume, currentUser, isShared, isGuestMode, isTranslating,
    isExporting, hasAnnotations, hasViewedFeedback, commentsCount, showAnnotationOverlay,
    theme, showGuideArrow, onResumeChange, onExport, onTranslate,
    onToggleFeedback, onShare, onToggleTheme, setViewMode, onDismissGuideArrow,
    onExportToGoogleDocs, onDropdownChange,
    initialTailorModalOpen, initialJobDescription,
    initialCoverLetterOpen, initialCoverLetterSeed,
}) => {
    const { t } = useTranslation();
    const [isDesktopDownloadMenuOpen, setIsDesktopDownloadMenuOpen] = useState(false);
    const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);
    const [isMobileMoreMenuOpen, setIsMobileMoreMenuOpen] = useState(false);
    const [isCoverLetterModalOpen, setIsCoverLetterModalOpen] = useState(false);
    const [coverLetterSeed, setCoverLetterSeed] = useState<CoverLetterSeed>(null);
    const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
    const [tailorJobDescription, setTailorJobDescription] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('coverLetter') !== '1') return;

        const seedStr = sessionStorage.getItem('cv_cover_letter_seed');
        if (seedStr) {
            try {
                setCoverLetterSeed(JSON.parse(seedStr));
            } catch (error) {
                console.error('Error parsing cover letter seed:', error);
            } finally {
                sessionStorage.removeItem('cv_cover_letter_seed');
            }
        }

        setIsCoverLetterModalOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
    }, []);

    // Extension cover letter transit: open modal with pre-seeded job data from Editor.tsx
    useEffect(() => {
        if (!initialCoverLetterOpen) return;
        if (initialCoverLetterSeed) {
            setCoverLetterSeed(initialCoverLetterSeed);
        }
        setIsCoverLetterModalOpen(true);
    }, [initialCoverLetterOpen, initialCoverLetterSeed]);

    useEffect(() => {
        if (initialTailorModalOpen) {
            setIsTailorModalOpen(true);
        }
    }, [initialTailorModalOpen]);

    useEffect(() => {
        if (initialJobDescription) {
            setTailorJobDescription(initialJobDescription);
        }
    }, [initialJobDescription]);

    useEffect(() => {
        const handleOpenTailor = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail?.jobDescription) {
                setTailorJobDescription(customEvent.detail.jobDescription);
            }
            setIsTailorModalOpen(true);
        };
        window.addEventListener('open-ai-tailor', handleOpenTailor);
        return () => window.removeEventListener('open-ai-tailor', handleOpenTailor);
    }, []);

    const [isDownloadClosing, setIsDownloadClosing] = useState(false);
    const [isTranslateClosing, setIsTranslateClosing] = useState(false);
    const [isMobileMoreClosing, setIsMobileMoreClosing] = useState(false);

    const desktopDownloadMenuRef = useRef<HTMLDivElement>(null);
    const translateMenuRef = useRef<HTMLDivElement>(null);
    const mobileMoreMenuRef = useRef<HTMLDivElement>(null);

    const exportActions = [
        {
            id: 'pdf',
            title: 'Export as PDF',
            description: 'Recommended. Matches the resume preview exactly.',
            icon: FileText,
            action: () => onExport('pdf')
        },
        {
            id: 'google-docs',
            title: 'Export to Google Docs',
            description: 'Creates an editable Google Doc in your Drive.',
            icon: FileText,
            action: () => onExportToGoogleDocs?.('google-docs')
        },
        {
            id: 'docx',
            title: 'Export as .DOCX',
            description: 'Best for editing in Word or uploading to Google Docs.',
            icon: FileType,
            action: () => onExportToGoogleDocs?.('docx')
        }
    ];

    const closeDownloadMenu = () => {
        setIsDownloadClosing(true);
        setTimeout(() => {
            setIsDesktopDownloadMenuOpen(false);
            setIsDownloadClosing(false);
            // Only notify closed if translate is also closed
            if (!isTranslateMenuOpen) onDropdownChange?.(false);
        }, 300);
    };

    const closeTranslateMenu = () => {
        setIsTranslateClosing(true);
        setTimeout(() => {
            setIsTranslateMenuOpen(false);
            setIsTranslateClosing(false);
            // Only notify closed if download is also closed
            if (!isDesktopDownloadMenuOpen) onDropdownChange?.(false);
        }, 300);
    };

    const closeMobileMoreMenu = () => {
        setIsMobileMoreClosing(true);
        setTimeout(() => {
            setIsMobileMoreMenuOpen(false);
            setIsMobileMoreClosing(false);
        }, 300);
    };

    // Click Outside Detection
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isDesktopDownloadMenuOpen && !isDownloadClosing && desktopDownloadMenuRef.current && !desktopDownloadMenuRef.current.contains(event.target as Node)) {
                closeDownloadMenu();
            }
            if (isTranslateMenuOpen && !isTranslateClosing && translateMenuRef.current && !translateMenuRef.current.contains(event.target as Node)) {
                closeTranslateMenu();
            }
            if (isMobileMoreMenuOpen && !isMobileMoreClosing && mobileMoreMenuRef.current && !mobileMoreMenuRef.current.contains(event.target as Node)) {
                closeMobileMoreMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDesktopDownloadMenuOpen, isTranslateMenuOpen, isMobileMoreMenuOpen, isDownloadClosing, isTranslateClosing, isMobileMoreClosing]);

    return (
        <header className="relative z-40 flex-shrink-0 border-b border-[#e7ded2] bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
            <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-6 md:flex md:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    {!isShared && (
                        <button onClick={() => navigate('/dashboard')} title="Back to Dashboard" className="rounded-full p-2 text-slate-500 transition-colors hover:bg-[#f3eee6] hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-850 dark:hover:text-white">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    {isShared ? (
                        <div className="flex items-center gap-2">
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                <Share2 size={12} /> {t('editor.shared_editor')}
                            </div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{resume.title}</h1>
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={resume.title}
                            onChange={e => onResumeChange({ title: e.target.value })}
                            className="-ml-2 w-full min-w-0 max-w-[calc(100vw-120px)] truncate rounded-md bg-transparent px-2 py-1 text-base font-black text-slate-900 outline-none transition-all focus:bg-white focus:ring-1 focus:ring-primary-500 dark:text-white dark:focus:bg-gray-900 sm:max-w-[360px]"
                        />
                    )}
                </div>
                <div className="flex items-center gap-2 z-10">
                    <div className="hidden md:flex items-center gap-1">
                        <ThemeToggle />
                    </div>

                    {/* Mobile Menu */}
                    <div className="md:hidden relative" ref={mobileMoreMenuRef}>
                        {showGuideArrow && (
                            <div className="absolute -bottom-16 right-0 flex flex-col items-end animate-bounce z-50">
                                <div className="bg-primary-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium mb-1 whitespace-nowrap">
                                    Share or Preview here! →
                                </div>
                                <svg className="w-8 h-8 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l-8 8h5v12h6V10h5z" />
                                </svg>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (isMobileMoreMenuOpen) {
                                    closeMobileMoreMenu();
                                } else {
                                    setIsMobileMoreMenuOpen(true);
                                    if (onDismissGuideArrow) onDismissGuideArrow();
                                }
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600 shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                            aria-label="Open resume actions"
                        >
                            <MoreVertical size={22} className="stroke-2" />
                        </button>
                        {isMobileMoreMenuOpen && (
                            <div className={`absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 border dark:border-gray-700 origin-top-right ${isMobileMoreClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'}`}>
                                <div className="py-1">
                                    <p className="px-4 py-2 text-xs text-gray-400">View Mode</p>
                                    <button onClick={() => { setViewMode('edit'); closeMobileMoreMenu(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><EditIcon size={16} /> Edit</button>
                                    <button onClick={() => { setViewMode('preview'); closeMobileMoreMenu(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><Eye size={16} /> Preview</button>
                                    {/* Review Feedback Section - Mobile */}
                                    {!isShared && !isGuestMode && (hasAnnotations || commentsCount > 0) && (
                                        <>
                                            <div className="border-t my-1 dark:border-gray-600"></div>
                                            <p className="px-4 py-2 text-xs text-gray-400">Feedback</p>
                                            <button
                                                onClick={() => {
                                                    onToggleFeedback();
                                                    closeMobileMoreMenu();
                                                }}
                                                className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm transition-colors ${showAnnotationOverlay
                                                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                <Eye size={16} />
                                                <span>Review Feedback</span>
                                                {!hasViewedFeedback && (
                                                    <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                )}
                                            </button>
                                        </>
                                    )}
                                    <div className="border-t my-1 dark:border-gray-600"></div>
                                    <p className="px-4 py-2 text-xs text-gray-400">Export</p>
                                    {exportActions.map(action => {
                                        const Icon = action.icon;
                                        return (
                                            <button key={action.id} onClick={() => { action.action(); closeMobileMoreMenu(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                <Icon size={16} /> {action.title}
                                            </button>
                                        );
                                    })}
                                    <div className="border-t my-1 dark:border-gray-600"></div>
                                    <button onClick={() => { onToggleTheme(); closeMobileMoreMenu(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />} Toggle Theme
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Centered Actions (Desktop) - Evenly Spaced & Offset for Preview Area */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 w-auto max-w-[min(780px,58vw)] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[#e6ded3] bg-[#fbf8f3]/95 p-1 shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
                    {/* DOWNLOAD MENU */}
                    <div className="relative" ref={desktopDownloadMenuRef}>
                        <button
                            data-tour="download-pdf"
                            onClick={() => {
                                if (isDesktopDownloadMenuOpen) {
                                    closeDownloadMenu();
                                } else {
                                    setIsDesktopDownloadMenuOpen(true);
                                    onDropdownChange?.(true);
                                }
                            }}
                            disabled={isExporting}
                            className="flex items-center gap-2 rounded-full border border-[#c7d2fe] bg-[#EEF2FF] px-4 py-2 text-sm font-bold text-[#211b4d] shadow-sm transition-colors hover:bg-[#e0e7ff] hover:text-[#18083d] disabled:cursor-not-allowed disabled:bg-[#f5f7ff] disabled:text-slate-400 dark:border-primary-800 dark:bg-primary-600 dark:text-white dark:hover:bg-primary-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                        >
                            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            <span>Download PDF</span>
                            <ChevronDown size={18} />
                        </button>
                        {isDesktopDownloadMenuOpen && (
                            <div className={`absolute right-0 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 origin-top-right ${isDownloadClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'}`}>
                                <div className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {exportActions.map(action => {
                                        const Icon = action.icon;
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={() => { action.action(); closeDownloadMenu(); }}
                                                disabled={isExporting}
                                                className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-700/70"
                                            >
                                                <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300">
                                                    <Icon size={20} />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-[#18083d] dark:text-white">{action.title}</p>
                                                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-gray-400">{action.description}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* TRANSLATE MENU */}
                    {!isShared && (
                        <div className="relative" ref={translateMenuRef}>
                            <button
                                onClick={() => {
                                    if (isTranslateMenuOpen) {
                                        closeTranslateMenu();
                                    } else {
                                        setIsTranslateMenuOpen(true);
                                        onDropdownChange?.(true);
                                    }
                                }}
                                disabled={isTranslating}
                                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
                            >
                                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                                <span>Translate</span>
                                <ChevronDown size={14} className={`transition-transform ${isTranslateMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isTranslateMenuOpen && (
                                <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border dark:border-gray-700 max-h-80 overflow-y-auto origin-top ${isTranslateClosing ? 'animate-dropdown-out' : 'animate-dropdown-in'}`}>
                                    <div className="py-1">
                                        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">Translate Resume To:</div>
                                        {SUPPORTED_TRANSLATE_LANGUAGES.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => { onTranslate(lang.code); closeTranslateMenu(); }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                {lang.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NEW: COVER LETTER BUTTON */}
                    {!isShared && (
                        <button
                            onClick={() => setIsCoverLetterModalOpen(true)}
                            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            <Sparkles size={16} className="text-purple-500" />
                            <span>Cover Letter</span>
                        </button>
                    )}

                    {/* NEW: AI TAILOR BUTTON */}
                    {!isShared && (
                        <button
                            onClick={() => setIsTailorModalOpen(true)}
                            className="flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-2 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:bg-primary-900/10 dark:text-primary-300 dark:hover:bg-primary-900/30"
                        >
                            <Wand2 size={16} />
                            <span>AI Tailor</span>
                        </button>
                    )}

                    {/* Feedback and sharing stay separate so candidates can review comments without losing the share action. */}
                    {!isShared && !isGuestMode && (
                        <div className="flex items-center gap-1">
                            {(hasAnnotations || commentsCount > 0) && (
                                <button
                                    onClick={onToggleFeedback}
                                    className={`relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${showAnnotationOverlay
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                                        : 'text-slate-600 hover:bg-white hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800'
                                        }`}
                                    title="Toggle feedback annotations and comments"
                                >
                                    <Eye size={16} />
                                    <span>Review Feedback</span>
                                    {/* Visual indicator badge */}
                                    {(!hasViewedFeedback && (commentsCount > 0 || hasAnnotations)) && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={onShare}
                                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-950 dark:text-gray-300 dark:hover:bg-gray-800"
                                title="Share this resume"
                            >
                                <Share2 size={16} />
                                <span>Share</span>
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <React.Suspense fallback={null}>
                {isCoverLetterModalOpen && (
                    <CoverLetterManagerModal
                        isOpen={isCoverLetterModalOpen}
                        onClose={() => setIsCoverLetterModalOpen(false)}
                        resume={resume}
                        theme={theme}
                        initialJob={coverLetterSeed}
                    />
                )}

                {isTailorModalOpen && (
                    <TailorResumeModal
                        isOpen={isTailorModalOpen}
                        onClose={() => setIsTailorModalOpen(false)}
                        resume={resume}
                        onResumeChange={onResumeChange}
                        theme={theme}
                        initialJobDescription={tailorJobDescription}
                    />
                )}
            </React.Suspense>
        </header>
    );
};

export default EditorHeader;
