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

const mobileWorkflowActions = [
    { label: 'Start', icon: Sparkles, path: '/onboarding', className: 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50' },
    { label: 'Resume', icon: FileText, path: '/newresume', className: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900/50' },
    { label: 'Portfolio', icon: Globe, path: '/portfolio', className: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-200 dark:border-pink-900/50' },
    { label: 'Interview', icon: Mic, path: '/interview-studio', className: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/30 dark:text-purple-200 dark:border-purple-900/50' },
    { label: 'Jobs', icon: Briefcase, path: '/jobs/recommend', className: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900/50' },
    { label: 'Community', icon: MessageSquare, path: '/community', className: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50' },
    { label: 'Whiteboard', icon: PenTool, path: '/whiteboard', className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-800' },
];

const MobileWorkflowLauncher: React.FC = () => (
    <nav className="md:hidden mb-6" aria-label="Dashboard workflows">
        <div className="grid grid-cols-3 gap-2">
            {mobileWorkflowActions.map(({ label, icon: Icon, path, className }) => (
                <button
                    key={path}
                    type="button"
                    onClick={() => navigate(path)}
                    className={`min-h-[76px] rounded-2xl border px-2.5 py-3 text-center shadow-sm transition active:scale-[0.98] ${className}`}
                >
                    <Icon size={19} className="mx-auto mb-2" />
                    <span className="block text-[11px] font-bold leading-tight">{label}</span>
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
            <div className="cv-design-page cv-design-grid flex h-screen flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[var(--cv-action-primary)]" />
                <p className="cv-design-body mt-4">{t('dashboard.loading')}</p>
            </div>
        );
    }

    return (
        <AppLayout>
            <div className="cv-design-page cv-design-grid relative min-h-screen overflow-hidden">
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

                <header className="cv-design-header sticky top-0 z-20 md:hidden">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16 sm:h-20">
                            <div className="flex min-w-0 items-center gap-3">
                                <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} className="flex items-center gap-2">
                                    <Logo className="h-8 w-8" />
                                    <span className="hidden font-heading text-xl font-bold text-[var(--cv-text-heading)] sm:inline">CareerVivid</span>
                                </a>
                                <span className="hidden max-w-[240px] truncate rounded-full border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-muted)] px-3 py-1 text-xs font-semibold text-[var(--cv-text-body)] md:inline-flex">
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
                                <button onClick={() => navigate('/community')} className="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--cv-success-soft)] px-3 py-2 font-semibold text-[var(--cv-success-text)] transition-colors md:hidden">
                                    <Users size={20} /> <span className="hidden md:inline">{t('nav.community', 'Community')}</span>
                                </button>
                                <div className="relative hidden md:block" ref={newMenuRef}>
                                    <button onClick={() => setIsNewMenuOpen(!isNewMenuOpen)} className="cv-design-button-primary px-4 py-2.5 text-sm">
                                        <PlusCircle size={18} /> <span>{t('dashboard.create_new')}</span> <ChevronDown size={18} />
                                    </button>
                                    {isNewMenuOpen && (
                                        <div className="cv-design-card absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg shadow-lg">
                                            <div className="py-1">
                                                <button onClick={() => { navigate('/onboarding'); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <Sparkles size={16} /> Quick Start
                                                </button>
                                                <button onClick={() => { navigate('/newresume'); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <FileText size={16} /> {t('dashboard.new_resume')}
                                                </button>
                                                <button onClick={() => { navigate('/portfolio'); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <Globe size={16} /> New Portfolio
                                                </button>
                                                <button onClick={async () => { const id = await createWhiteboard(); navigate(`/whiteboard/${id}`); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <PenTool size={16} /> New Whiteboard
                                                </button>
                                                {/* <button onClick={() => { navigate('/sop/new'); setIsNewMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                    <ClipboardList size={16} /> New SOP Document
                                                </button> */}
                                                <button onClick={() => { navigate('/interview-studio'); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <Mic size={16} /> {t('dashboard.interview_practice')}
                                                </button>
                                                <button onClick={() => { navigate('/job-market'); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <Briefcase size={16} /> Find Jobs (Professional)
                                                </button>
                                                <button onClick={() => { navigate('/job-tracker'); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <Briefcase size={16} /> {t('dashboard.track_new_job')}
                                                </button>
                                                <div className="my-1 border-t border-[var(--cv-border-subtle)]"></div>
                                                <button onClick={() => { handleAddFolder(); setIsNewMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    <FolderPlus size={16} /> {t('dashboard.new_folder')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={userMenuRef}>
                                    <button onClick={handleStep1Click} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--cv-surface-warm-muted)] text-[var(--cv-text-body)]">
                                        {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="User" className="w-full h-full rounded-full object-cover" /> : <UserIcon size={20} />}
                                        {!isPremium && upgradeStep === 1 && (
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-vertical pointer-events-none z-50">
                                                <svg className="w-8 h-8 text-orange-500 transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                <span className="whitespace-nowrap rounded bg-[var(--cv-surface-warm-card-strong)] px-1 text-sm font-bold text-[var(--cv-warning-text)] shadow-sm">Click on Profile</span>
                                            </div>
                                        )}
                                    </button>
                                    {isUserMenuOpen && (
                                        <div className="cv-design-card absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg shadow-lg">
                                            <div className="py-1">
                                                <button onClick={() => { handleStep2Click(); navigate('/profile'); }} className="relative block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">
                                                    {t('dashboard.profile')}
                                                    {!isPremium && upgradeStep === 2 && (
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 animate-bounce-horizontal pointer-events-none">
                                                            <svg className="w-6 h-6 text-orange-500 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                            <span className="text-orange-500 font-bold text-xs whitespace-nowrap">Click Here</span>
                                                        </div>
                                                    )}
                                                </button>
                                                <button onClick={() => navigate('/developer')} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">Developer Settings (API/MCP)</button>
                                                {isPremium && <button onClick={() => navigate('/referrals')} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">Referrals</button>}
                                                {(userProfile?.roles?.includes('academic_partner') || userProfile?.role === 'academic_partner') && <button onClick={() => navigate('/academic-partner')} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">{t('dashboard.academic_partner')}</button>}
                                                {(userProfile?.roles?.includes('business_partner') || userProfile?.role === 'business_partner') && <button onClick={() => navigate('/business-partner/dashboard')} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">Business Partner</button>}
                                                {(userProfile?.roles?.includes('agency_partner') || userProfile?.role === 'agency_partner') && <button onClick={() => navigate('/agency-partner/dashboard')} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">Agency Partner</button>}
                                                {isAdmin && <button onClick={() => navigate('/admin')} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">{t('dashboard.admin')}</button>}
                                                <button onClick={logOut} className="block w-full px-4 py-2 text-left text-sm text-[var(--cv-text-body)] hover:bg-[var(--cv-danger-soft)] hover:text-[var(--cv-danger-text)]">{t('dashboard.sign_out')}</button>
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
                    <div className="mb-6 md:hidden">
                        <h1 className="cv-design-title text-[22px] transition-all">{dashboardTitle}</h1>
                        <p className="cv-design-body mt-0.5 text-[13px]">{t('dashboard.subtitle', "Here's your job search at a glance.")}</p>
                    </div>

                    <div className="mb-6 hidden md:block">
                        <h1 className="cv-design-title text-[22px] transition-all">{dashboardTitle}</h1>
                        <p className="cv-design-body mt-0.5 text-[13px]">{t('dashboard.subtitle', "Here's your job search at a glance.")}</p>
                    </div>

                    <MobileWorkflowLauncher />

                    <DashboardOverview
                        resumes={resumes}
                        portfolios={portfolios}
                        practiceHistory={practiceHistory}
                        jobApplications={jobApplications}
                        communityPostCount={myCommunityPosts.length}
                        onInterviewSelect={setSelectedJobForReport}
                    />

                    <section className="mt-8 border-t border-[var(--cv-border-subtle)] pt-5" aria-labelledby="workspace-details-heading">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                {/* "Workspace details" / "collections" name internal concepts.
                                    The user came here for their resumes and files. */}
                                <h2 id="workspace-details-heading" className="font-heading text-base font-extrabold text-[var(--cv-text-heading-product)] dark:text-white">All your files</h2>
                                <p className="mt-1 text-xs text-[var(--cv-text-muted)]">Resumes, portfolios, and whiteboards.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsWorkspaceDetailsOpen((open) => !open)}
                                aria-expanded={isWorkspaceDetailsOpen}
                                className="inline-flex items-center gap-2 rounded-lg border border-[var(--cv-border-product)] bg-[var(--cv-surface)] px-3 py-2 text-xs font-bold text-[var(--cv-text-heading-product)] transition hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)] dark:bg-slate-900 dark:text-white"
                            >
                                {isWorkspaceDetailsOpen ? 'Hide' : 'Show'}
                                <ChevronDown size={15} className={`transition-transform ${isWorkspaceDetailsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                        </div>

                        {isWorkspaceDetailsOpen && <>
                            <div className="hidden justify-end mt-6 mb-2 pr-1 md:flex">
                                <button onClick={() => setViewMode(viewMode === 'row' ? 'grid' : 'row')} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-surface-muted)] hover:text-[var(--cv-text-heading-product)] dark:hover:bg-slate-800" title={viewMode === 'row' ? 'Switch to Grid View' : 'Switch to Row View'}>
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
                    <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center text-white">Loading Report...</div>}>
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
