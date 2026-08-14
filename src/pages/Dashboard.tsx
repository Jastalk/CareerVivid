import React, { Suspense, useRef, useEffect, useState } from 'react';
import { PlusCircle, FileText, Mic, Briefcase, Loader2, Globe, User as UserIcon, ChevronDown, FolderPlus, PenTool, LayoutGrid, List, Users, MessageSquare, Sparkles } from 'lucide-react';

// Hooks & Logic
import { useDashboard } from '../hooks/useDashboard';
import { navigate } from '../utils/navigation';

// UI Components
import AppLayout from '../components/Layout/AppLayout';
import ThemeToggle from '../components/ThemeToggle';
import ConfirmationModal from '../components/ConfirmationModal';
import Logo from '../components/Logo';
import ShareResumeModal from '../components/ShareResumeModal';
import SharePortfolioModal from '../components/SharePortfolioModal';
import ShareWhiteboardModal from '../components/ShareWhiteboardModal';
import LanguageSelect from '../components/LanguageSelect';
import AIUsageProgressBar from '../components/AIUsageProgressBar';
import { getPlanDisplayName } from '../config/subscriptionCatalog';
import '../components/Landing/live/liveLanding.css';

// Refactored Sections
import {
    ResumesSection,
    PortfoliosSection,
    InterviewStudioSection,
    WhiteboardsSection,
    JobTrackerSection
} from '../components/Dashboard/DashboardSections';

import DashboardPreviewSection from '../components/Dashboard/DashboardPreviewSection';
import DashboardPostCard from '../components/Dashboard/DashboardPostCard';
import { MobilePostCard } from '../components/Dashboard/DashboardMobileCards';
import ReorderDashboardModal from '../components/Dashboard/ReorderDashboardModal';
import JobDetailModal from '../components/JobTracker/JobDetailModal';
import DashboardOverview from '../components/Dashboard/DashboardOverview';

// Lazy load modal
const InterviewReportModal = React.lazy(() => import('../components/InterviewReportModal'));

/** One row in either dropdown. Hover is opacity, so no second colour is needed. */
const MENU_ITEM = 'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition hover:opacity-65';

// The three things the product actually sells lead this list, in the same
// order the public page sells them.
const mobileWorkflowActions = [
    { label: 'Quests', icon: Mic, path: '/interview-studio', accent: 'var(--cvl-purple)', soft: 'var(--cvl-purple-soft)' },
    { label: 'Resume', icon: FileText, path: '/newresume', accent: 'var(--cvl-green)', soft: 'var(--cvl-green-soft)' },
    { label: 'Whiteboard', icon: PenTool, path: '/whiteboard', accent: 'var(--cvl-amber)', soft: 'var(--cvl-amber-soft)' },
    { label: 'Jobs', icon: Briefcase, path: '/jobs/recommend', accent: 'var(--cvl-green)', soft: 'var(--cvl-green-soft)' },
    { label: 'Portfolio', icon: Globe, path: '/portfolio', accent: 'var(--cvl-purple)', soft: 'var(--cvl-purple-soft)' },
    { label: 'Community', icon: MessageSquare, path: '/community', accent: 'var(--cvl-amber)', soft: 'var(--cvl-amber-soft)' },
    { label: 'Start', icon: Sparkles, path: '/onboarding', accent: 'var(--cvl-purple)', soft: 'var(--cvl-purple-soft)' },
];

const MobileWorkflowLauncher: React.FC = () => (
    <nav className="cvl-win md:hidden" aria-label="Dashboard workflows">
        <div className="cvl-bar">
            <span className="cvl-dot cvl-dot-r" />
            <span className="cvl-dot cvl-dot-y" />
            <span className="cvl-dot cvl-dot-g" />
            <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>shortcuts.txt</span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
            {mobileWorkflowActions.map(({ label, icon: Icon, path, accent, soft }) => (
                <button
                    key={path}
                    type="button"
                    onClick={() => navigate(path)}
                    className="min-h-[76px] rounded-xl border px-2.5 py-3 text-center transition active:scale-[0.98]"
                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                >
                    <span
                        className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: soft, color: accent }}
                    >
                        <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="block text-[11px] font-semibold leading-tight">{label}</span>
                </button>
            ))}
        </div>
    </nav>
);

const Dashboard: React.FC = () => {
    const {
        dashboardTitle,
        isDesktop,
        t,
        resumes,
        isLoadingResumes,
        updateResume,
        portfolios,
        updatePortfolio,
        practiceHistory,
        jobApplications,
        updateJobApplication,
        deleteJobApplication,
        whiteboards,
        updateWhiteboard,
        createWhiteboard,
        myCommunityPosts,
        isLoadingCommunityPosts,
        deleteCommunityPost,
        currentUser,
        logOut,
        isAdmin,
        userProfile,
        isPremium,
        aiUsage,
        selectedJobForReport,
        setSelectedJobForReport,
        selectedJobApplication,
        setSelectedJobApplication,
        shareModalResume,
        setShareModalResume,
        shareModalPortfolio,
        setShareModalPortfolio,
        shareModalWhiteboard,
        setShareModalWhiteboard,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        limitMessage,
        confirmModal,
        viewMode,
        setViewMode,
        sectionOrder,
        setSectionOrder,
        isReorderModalOpen,
        setIsReorderModalOpen,
        sectionNames,
        handleSectionNameChange,
        handleDuplicatePortfolio,
        isUserMenuOpen,
        setIsUserMenuOpen,
        isNewMenuOpen,
        setIsNewMenuOpen,
        upgradeStep,
        handleStep1Click,
        handleAddFolder,
        handleStep2Click,
        confirmItemDelete,
        confirmDeleteTracker,
        closeConfirmModal
    } = useDashboard();

    const userMenuRef = useRef<HTMLDivElement>(null);
    const newMenuRef = useRef<HTMLDivElement>(null);
    const [isWorkspaceDetailsOpen, setIsWorkspaceDetailsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
                setIsNewMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsUserMenuOpen, setIsNewMenuOpen]);

    if (isDesktop && isLoadingResumes) {
        return (
            <div className="cvl flex h-screen flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--cvl-purple)' }} />
                <p className="cvl-mono mt-4 text-[12px]" style={{ color: 'var(--cvl-muted)' }}>{t('dashboard.loading')}</p>
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="cvl min-h-screen">
                <ConfirmationModal
                    isOpen={isUpgradeModalOpen}
                    onCancel={() => setIsUpgradeModalOpen(false)}
                    onConfirm={() => navigate('/subscription')}
                    title="Limit Reached"
                    message={limitMessage}
                    confirmText="Upgrade Now"
                    cancelText="Maybe Later"
                    variant="default"
                />

                <header
                    className="sticky top-0 z-20 border-b backdrop-blur-md md:hidden"
                    style={{ borderColor: 'var(--cvl-line)', background: 'color-mix(in srgb, var(--cvl-desk) 84%, transparent)' }}
                >
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16 sm:h-20">
                            <div className="flex min-w-0 items-center gap-3">
                                <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} className="flex items-center gap-2">
                                    <Logo className="h-8 w-8" />
                                    <span className="hidden text-lg font-semibold tracking-tight sm:inline">careervivid</span>
                                </a>
                                <span
                                    className="cvl-mono hidden max-w-[240px] truncate rounded-full border px-3 py-1 text-[11px] md:inline-flex"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                >
                                    {currentUser?.email || 'Workspace'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3">
                                {aiUsage && (
                                    <div className="hidden xl:block w-48">
                                        <AIUsageProgressBar used={aiUsage.count} limit={aiUsage.limit} isPremium={isPremium} onUpgradeClick={() => navigate('/subscription')} variant="minimal" planLabel={getPlanDisplayName(userProfile?.plan)} />
                                    </div>
                                )}
                                <LanguageSelect />
                                <ThemeToggle />
                                <button
                                    onClick={() => navigate('/community')}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition hover:opacity-80 md:hidden"
                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-ink)' }}
                                >
                                    <Users size={20} /> <span className="hidden md:inline">{t('nav.community', 'Community')}</span>
                                </button>
                                <div className="relative hidden md:block" ref={newMenuRef}>
                                    <button
                                        onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                                        className="cvl-cta inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition"
                                    >
                                        <PlusCircle size={18} /> <span>{t('dashboard.create_new')}</span> <ChevronDown size={18} />
                                    </button>
                                    {isNewMenuOpen && (
                                        <div className="cvl-win absolute right-0 z-20 mt-2 w-60">
                                            <div className="cvl-bar">
                                                <span className="cvl-dot cvl-dot-r" />
                                                <span className="cvl-dot cvl-dot-y" />
                                                <span className="cvl-dot cvl-dot-g" />
                                                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>new.txt</span>
                                            </div>
                                            <div className="py-1">
                                                <button onClick={() => { navigate('/onboarding'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <Sparkles size={16} /> Quick Start
                                                </button>
                                                <button onClick={() => { navigate('/newresume'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <FileText size={16} /> {t('dashboard.new_resume')}
                                                </button>
                                                <button onClick={() => { navigate('/portfolio'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <Globe size={16} /> New Portfolio
                                                </button>
                                                <button onClick={async () => { const id = await createWhiteboard(); navigate(`/whiteboard/${id}`); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <PenTool size={16} /> New Whiteboard
                                                </button>
                                                {/* <button onClick={() => { navigate('/sop/new'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <ClipboardList size={16} /> New SOP Document
                                                </button> */}
                                                <button onClick={() => { navigate('/interview-studio'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <Mic size={16} /> {t('dashboard.interview_practice')}
                                                </button>
                                                <button onClick={() => { navigate('/job-market'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <Briefcase size={16} /> Find Jobs (Professional)
                                                </button>
                                                <button onClick={() => { navigate('/job-tracker'); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <Briefcase size={16} /> {t('dashboard.track_new_job')}
                                                </button>
                                                <div className="my-1 border-t" style={{ borderColor: 'var(--cvl-line)' }}></div>
                                                <button onClick={() => { handleAddFolder(); setIsNewMenuOpen(false); }} className={MENU_ITEM}>
                                                    <FolderPlus size={16} /> {t('dashboard.new_folder')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={handleStep1Click}
                                        className="relative flex h-10 w-10 items-center justify-center rounded-full border"
                                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                    >
                                        {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="User" className="w-full h-full rounded-full object-cover" /> : <UserIcon size={20} />}
                                        {!isPremium && upgradeStep === 1 && (
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-vertical pointer-events-none z-50">
                                                <svg className="w-8 h-8 transform -rotate-90" style={{ color: 'var(--cvl-amber)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                <span className="whitespace-nowrap rounded px-1 text-[13px] font-bold" style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}>Click on Profile</span>
                                            </div>
                                        )}
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="cvl-win absolute right-0 z-20 mt-2 w-52">
                                            <div className="cvl-bar">
                                                <span className="cvl-dot cvl-dot-r" />
                                                <span className="cvl-dot cvl-dot-y" />
                                                <span className="cvl-dot cvl-dot-g" />
                                                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>account.txt</span>
                                            </div>
                                            <div className="py-1">
                                                <button onClick={() => { handleStep2Click(); navigate('/profile'); }} className={`relative ${MENU_ITEM}`}>
                                                    {t('dashboard.profile')}
                                                    {!isPremium && upgradeStep === 2 && (
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 animate-bounce-horizontal pointer-events-none">
                                                            <svg className="w-6 h-6 transform rotate-180" style={{ color: 'var(--cvl-amber)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: 'var(--cvl-amber)' }}>Click Here</span>
                                                        </div>
                                                    )}
                                                </button>
                                                <button onClick={() => navigate('/developer')} className={MENU_ITEM}>Developer Settings (API/MCP)</button>
                                                {isPremium && <button onClick={() => navigate('/referrals')} className={MENU_ITEM}>Referrals</button>}
                                                {(userProfile?.roles?.includes('academic_partner') || userProfile?.role === 'academic_partner') && <button onClick={() => navigate('/academic-partner')} className={MENU_ITEM}>{t('dashboard.academic_partner')}</button>}
                                                {(userProfile?.roles?.includes('business_partner') || userProfile?.role === 'business_partner') && <button onClick={() => navigate('/business-partner/dashboard')} className={MENU_ITEM}>Business Partner</button>}
                                                {(userProfile?.roles?.includes('agency_partner') || userProfile?.role === 'agency_partner') && <button onClick={() => navigate('/agency-partner/dashboard')} className={MENU_ITEM}>Agency Partner</button>}
                                                {isAdmin && <button onClick={() => navigate('/admin')} className={MENU_ITEM}>{t('dashboard.admin')}</button>}
                                                <button onClick={logOut} className={MENU_ITEM} style={{ color: 'var(--cvl-muted)' }}>{t('dashboard.sign_out')}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {aiUsage && (
                            <div className="block xl:hidden pb-3 -mt-2">
                                <AIUsageProgressBar used={aiUsage.count} limit={aiUsage.limit} isPremium={isPremium} onUpgradeClick={() => navigate('/subscription')} variant="mobile-line" planLabel={getPlanDisplayName(userProfile?.plan)} />
                            </div>
                        )}
                    </div>
                </header>

                <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    {/* One heading for the page. It used to be printed twice — once
                        for mobile, once for desktop — which is two <h1>s in the DOM. */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold tracking-tight">{dashboardTitle}</h1>
                        <p className="mt-1 text-[13.5px]" style={{ color: 'var(--cvl-muted)' }}>
                            {t('dashboard.subtitle', "Here's your job search at a glance.")}
                        </p>
                    </div>

                    <DashboardOverview
                        resumes={resumes}
                        portfolios={portfolios}
                        practiceHistory={practiceHistory}
                        jobApplications={jobApplications}
                        whiteboards={whiteboards}
                        communityPostCount={myCommunityPosts.length}
                        onInterviewSelect={setSelectedJobForReport}
                    />

                    {/* The shortcut grid sits under the three primary windows: it is a
                        way to jump around, not the reason you opened the page. */}
                    <div className="mt-8">
                        <MobileWorkflowLauncher />
                    </div>

                    <section className="mt-10 border-t pt-6" style={{ borderColor: 'var(--cvl-line)' }} aria-labelledby="workspace-details-heading">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                {/* "Workspace details" / "collections" name internal concepts.
                                    The user came here for their resumes and files. */}
                                <h2 id="workspace-details-heading" className="text-[17px] font-semibold tracking-tight">All your files</h2>
                                <p className="mt-1 text-[12.5px]" style={{ color: 'var(--cvl-muted)' }}>Resumes, portfolios, and whiteboards.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsWorkspaceDetailsOpen((open) => !open)}
                                aria-expanded={isWorkspaceDetailsOpen}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold transition hover:opacity-80"
                                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-ink)' }}
                            >
                                {isWorkspaceDetailsOpen ? 'Hide' : 'Show'}
                                <ChevronDown size={15} className={`transition-transform ${isWorkspaceDetailsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                        </div>

                        {isWorkspaceDetailsOpen && <>
                            <div className="hidden justify-end mt-6 mb-2 pr-1 md:flex">
                                <button
                                    onClick={() => setViewMode(viewMode === 'row' ? 'grid' : 'row')}
                                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition hover:opacity-80"
                                    style={{ color: 'var(--cvl-muted)' }}
                                    title={viewMode === 'row' ? 'Switch to Grid View' : 'Switch to Row View'}
                                >
                                    {viewMode === 'row' ? (<><LayoutGrid size={18} /> <span className="hidden sm:inline">Grid View</span></>) : (<><List size={18} /> <span className="hidden sm:inline">Row View</span></>)}
                                </button>
                            </div>

                            {sectionOrder.map(sectionId => {
                        const commonProps = {
                            viewMode,
                            sectionName: sectionNames[sectionId],
                            onLongPress: () => setIsReorderModalOpen(true),
                            onTitleChange: (name: string) => handleSectionNameChange(sectionId, name)
                        };

                        switch (sectionId) {
                            case 'interviewStudio':
                                return <InterviewStudioSection key={sectionId} {...commonProps} setSelectedJobForReport={setSelectedJobForReport} />;
                            case 'resumes':
                                return <ResumesSection key={sectionId} {...commonProps} setShareModalResume={setShareModalResume} />;
                            case 'whiteboards':
                                return <WhiteboardsSection key={sectionId} {...commonProps} setShareModalWhiteboard={setShareModalWhiteboard} />;
                            case 'communityPosts':
                                return (
                                    <DashboardPreviewSection
                                        key={sectionId}
                                        title={sectionNames.communityPosts}
                                        items={myCommunityPosts}
                                        viewMode={viewMode}
                                        onLongPress={() => setIsReorderModalOpen(true)}
                                        onViewAll={() => navigate('/community')}
                                        onTitleChange={(name) => handleSectionNameChange('communityPosts', name)}
                                        emptyMessage="You haven't written any community posts yet. Share your experience!"
                                        mobileRenderItem={(post) => <MobilePostCard key={post.id} post={post} onDelete={deleteCommunityPost} />}
                                        renderItem={(post) => <DashboardPostCard key={post.id} post={post} onDelete={deleteCommunityPost} onDragStart={() => { }} />}
                                    />
                                );
                            case 'portfolios':
                                return <PortfoliosSection key={sectionId} {...commonProps} setShareModalPortfolio={setShareModalPortfolio} handleDuplicatePortfolio={handleDuplicatePortfolio} />;
                            case 'jobTracker':
                                return <JobTrackerSection key={sectionId} {...commonProps} setSelectedJobApplication={setSelectedJobApplication} />;
                            default:
                                return null;
                        }
                            })}
                        </>}
                    </section>
                </div>

                {/* Modals & Overlays */}
                <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={closeConfirmModal} confirmText={confirmModal.confirmText} />
                {selectedJobForReport && (
                    <Suspense fallback={(
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
                            style={{ background: 'color-mix(in srgb, var(--cvl-desk) 82%, transparent)' }}
                        >
                            <div className="cvl-win">
                                <div className="cvl-bar">
                                    <span className="cvl-dot cvl-dot-r" />
                                    <span className="cvl-dot cvl-dot-y" />
                                    <span className="cvl-dot cvl-dot-g" />
                                    <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>report.log</span>
                                </div>
                                <div className="p-5">
                                    <span className="cvl-mono text-[12px]" style={{ color: 'var(--cvl-muted)' }}>loading report…</span>
                                </div>
                            </div>
                        </div>
                    )}>
                        {/* Reopening a submitted design is the modal's own
                            default now; this page navigates away when it fires,
                            which unmounts the modal with it. */}
                        <InterviewReportModal jobHistoryEntry={selectedJobForReport} onClose={() => setSelectedJobForReport(null)} />
                    </Suspense>
                )}
                {selectedJobApplication && (
                    <JobDetailModal onClose={() => setSelectedJobApplication(null)} job={selectedJobApplication} onUpdate={updateJobApplication} onDelete={deleteJobApplication} />
                )}
                {shareModalResume && (
                    <ShareResumeModal isOpen={!!shareModalResume} onClose={() => setShareModalResume(null)} resume={shareModalResume} onUpdate={updateResume} />
                )}
                {shareModalPortfolio && (
                    <SharePortfolioModal isOpen={!!shareModalPortfolio} onClose={() => setShareModalPortfolio(null)} portfolioId={shareModalPortfolio.id} portfolioTitle={shareModalPortfolio.title} portfolioData={shareModalPortfolio} />
                )}
                {shareModalWhiteboard && (
                    <ShareWhiteboardModal isOpen={!!shareModalWhiteboard} onClose={() => setShareModalWhiteboard(null)} whiteboard={shareModalWhiteboard} />
                )}
                <ReorderDashboardModal isOpen={isReorderModalOpen} onClose={() => setIsReorderModalOpen(false)} sections={sectionOrder.map(id => ({ id, label: sectionNames[id] }))} onSave={setSectionOrder} />
            </div>
        </AppLayout>
    );
};

export default Dashboard;
