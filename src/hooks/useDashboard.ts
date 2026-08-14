import { useState, useEffect, useRef } from 'react';
import { useResumes } from '../hooks/useResumes';
import { usePortfolios } from '../hooks/usePortfolios';
import { useWhiteboards } from '../hooks/useWhiteboards';
import { ResumeData, PracticeHistoryEntry, JobApplicationData, Folder, WhiteboardData } from '../types';
import { PortfolioData } from '../features/portfolio/types/portfolio';
import { useAuth } from '../contexts/AuthContext';
import { usePracticeHistory } from '../hooks/useJobHistory';
import { useJobTracker } from '../hooks/useJobTracker';
import { navigate } from '../utils/navigation';
import { db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { trackDemoConversion } from '../services/trackingService';
import { useTranslation } from 'react-i18next';
import { useSidebarStore } from '../store/useSidebarStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMyCommunityPosts } from '../hooks/useMyCommunityPosts';
import { SectionItem } from '../components/Dashboard/ReorderDashboardModal';

const SECTIONS_CONFIG: SectionItem[] = [
    { id: 'interviewStudio', label: 'Technical Interview Simulator Sessions' },
    { id: 'resumes', label: 'My Resumes' },
    { id: 'whiteboards', label: 'My Whiteboards' },
    { id: 'portfolios', label: 'Portfolios' },
    { id: 'communityPosts', label: 'My Community Posts' },
    { id: 'jobTracker', label: 'Career Pipeline' },
];

const DEFAULT_ORDER = SECTIONS_CONFIG.map(s => s.id);

const DEFAULT_SECTION_NAMES: Record<string, string> = {
    interviewStudio: 'Technical Interview Simulator Sessions',
    resumes: 'My Resumes',
    whiteboards: 'My Whiteboards',
    portfolios: 'Portfolios',
    communityPosts: 'My Community Posts',
    jobTracker: 'Career Pipeline',
};

export const useDashboard = () => {
    const dashboardTitle = useSidebarStore(state => state.getNodeTitle('/dashboard')) || 'Dashboard';
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const { t } = useTranslation();

    const { resumes, deleteResume, updateResume, isLoading: isLoadingResumes, saveAIGeneratedResume, duplicateResume } = useResumes();
    const { portfolios, deletePortfolio, updatePortfolio, duplicatePortfolio } = usePortfolios();
    const { practiceHistory, deletePracticeHistory, updatePracticeHistory, isLoading: isLoadingHistory, addCompletedPractice } = usePracticeHistory();
    const { jobApplications, deleteJobApplication, updateJobApplication, isLoading: isLoadingJobs, deleteAllJobApplications } = useJobTracker();
    const { whiteboards, createWhiteboard, deleteWhiteboard, duplicateWhiteboard, updateWhiteboard } = useWhiteboards();
    const { posts: myCommunityPosts, isLoading: isLoadingCommunityPosts, deletePost: deleteCommunityPost } = useMyCommunityPosts();

    const { currentUser, logOut, isAdmin, userProfile, isPremium, aiUsage } = useAuth();

    const [selectedJobForReport, setSelectedJobForReport] = useState<PracticeHistoryEntry | null>(null);
    const [selectedJobApplication, setSelectedJobApplication] = useState<JobApplicationData | null>(null);
    const [shareModalResume, setShareModalResume] = useState<ResumeData | null>(null);
    const [shareModalPortfolio, setShareModalPortfolio] = useState<PortfolioData | null>(null);
    const [shareModalWhiteboard, setShareModalWhiteboard] = useState<WhiteboardData | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [limitMessage, setLimitMessage] = useState('You have reached your site limit. Please upgrade your plan to create more.');

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, confirmText: 'Confirm' });

    const [viewMode, setViewMode] = useState<'row' | 'grid'>(() => {
        return (localStorage.getItem('careervivid_dashboard_view') as 'row' | 'grid') || 'row';
    });

    useEffect(() => {
        localStorage.setItem('careervivid_dashboard_view', viewMode);
    }, [viewMode]);

    const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('careervivid_dashboard_order');
            if (stored) {
                const parsed = JSON.parse(stored);
                const missing = DEFAULT_ORDER.filter(id => !parsed.includes(id));
                return [...parsed, ...missing];
            }
        } catch (e) {
            console.error("Failed to parse dashboard order:", e);
        }
        return DEFAULT_ORDER;
    });

    useEffect(() => {
        localStorage.setItem('careervivid_dashboard_order', JSON.stringify(sectionOrder));
    }, [sectionOrder]);

    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    const [sectionNames, setSectionNames] = useState<Record<string, string>>(() => {
        try {
            const stored = localStorage.getItem('careervivid_section_names');
            if (stored) return { ...DEFAULT_SECTION_NAMES, ...JSON.parse(stored) };
        } catch (e) {
            console.error("Failed to parse section names:", e);
        }
        return { ...DEFAULT_SECTION_NAMES };
    });

    const handleSectionNameChange = (sectionId: string, newName: string) => {
        setSectionNames(prev => {
            const updated = { ...prev, [sectionId]: newName };
            localStorage.setItem('careervivid_section_names', JSON.stringify(updated));
            return updated;
        });
    };

    const handleDuplicatePortfolio = async (id: string) => {
        const portfolio = portfolios.find(p => p.id === id);
        if (!portfolio) return;
        
        const totalCount = portfolios.length;
        const bioLinksCount = portfolios.filter(p => p.mode === 'linkinbio').length;

        if (!isPremium && totalCount >= 2) {
            setLimitMessage('Free users can only create up to 2 sites. Please upgrade your plan to create more.');
            setIsUpgradeModalOpen(true);
            return;
        }

        if (portfolio.mode === 'linkinbio' && !isPremium && bioLinksCount >= 1) {
            setLimitMessage('You have reached your Bio-Link limit. Please upgrade your plan to create more.');
            setIsUpgradeModalOpen(true);
            return;
        }

        await duplicatePortfolio(id);
    };

    useEffect(() => {
        if (!currentUser) return;
        const importGuestData = async () => {
            const guestResumeJSON = localStorage.getItem('guestResume');
            if (guestResumeJSON) {
                /*
                 * Claim the key BEFORE the await, not after.
                 *
                 * useGuestDataMigration reads the same key on sign-in and
                 * claims it the same way. Removing it after `await
                 * saveAIGeneratedResume` left a window — the whole duration of
                 * that write — in which the other reader still saw the draft
                 * and saved its own copy, giving the account two identical
                 * resumes, which on the free plan is the one-resume limit blown
                 * by the import itself. Whoever removes the key first wins; the
                 * loser sees nothing and does nothing.
                 */
                localStorage.removeItem('guestResume');
                try {
                    const guestResume = JSON.parse(guestResumeJSON);
                    await saveAIGeneratedResume(guestResume);
                    trackDemoConversion('convertedResumeUsers');
                } catch (e) {
                    console.error(e);
                    // A failed import must not be the same thing as a deleted
                    // resume.
                    try { localStorage.setItem('guestResume', guestResumeJSON); } catch { /* storage full */ }
                }
            }
            const guestInterviewJSON = localStorage.getItem('guestInterview');
            if (guestInterviewJSON) {
                try {
                    const guestInterview = JSON.parse(guestInterviewJSON);
                    await addCompletedPractice(guestInterview);
                    localStorage.removeItem('guestInterview');
                    trackDemoConversion('convertedInterviewUsers');
                } catch (e) { console.error(e); }
            }
        };
        const timer = setTimeout(importGuestData, 500);
        return () => clearTimeout(timer);
    }, [currentUser, saveAIGeneratedResume, addCompletedPractice]);

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [folders, setFolders] = useState<Folder[]>([]);

    const [upgradeStep, setUpgradeStep] = useState(() => {
        const stored = localStorage.getItem('upgrade_guide_step');
        return stored ? parseInt(stored) : 0;
    });

    useEffect(() => {
        const handleTrigger = () => setUpgradeStep(1);
        window.addEventListener('trigger-upgrade-guide', handleTrigger);
        return () => window.removeEventListener('trigger-upgrade-guide', handleTrigger);
    }, []);

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    const handleStep1Click = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
        if (upgradeStep === 1) {
            localStorage.setItem('upgrade_guide_step', '2');
            setUpgradeStep(2);
        }
    };

    const handleAddFolder = () => {
        const newFolder = { id: `folder_${Date.now()}`, title: t('dashboard.new_folder'), order: folders.length };
        setFolders(prev => [...prev, newFolder]);
    };

    const handleStep2Click = () => {
        if (upgradeStep === 2) {
            localStorage.setItem('upgrade_guide_step', '3');
            setUpgradeStep(3);
        }
    };

    const confirmItemDelete = (id: string, type: 'resume' | 'practice' | 'job' | 'portfolio' | 'post', coverImage?: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('dashboard.confirm_delete_title', { type }),
            message: t('dashboard.confirm_delete_message', { type }),
            onConfirm: () => {
                if (type === 'resume') deleteResume(id);
                if (type === 'portfolio') deletePortfolio(id);
                if (type === 'practice') deletePracticeHistory(id);
                if (type === 'job') deleteJobApplication(id);
                if (type === 'post') deleteCommunityPost(id, coverImage);
                closeConfirmModal();
            },
            confirmText: t('dashboard.delete')
        });
    };

    const confirmDeleteTracker = async () => {
        setConfirmModal({
            isOpen: true,
            title: t('dashboard.delete_all_jobs_title'),
            message: t('dashboard.delete_all_jobs_message'),
            onConfirm: async () => {
                try {
                    await deleteAllJobApplications();
                } catch (error) {
                    console.error("Error deleting all job applications:", error);
                }
                closeConfirmModal();
            },
            confirmText: t('dashboard.yes_delete_all')
        });
    };

    return {
        dashboardTitle,
        isDesktop,
        t,
        resumes,
        deleteResume,
        updateResume,
        duplicateResume,
        isLoadingResumes,
        portfolios,
        deletePortfolio,
        updatePortfolio,
        practiceHistory,
        deletePracticeHistory,
        jobApplications,
        updateJobApplication,
        deleteJobApplication,
        whiteboards,
        createWhiteboard,
        deleteWhiteboard,
        duplicateWhiteboard,
        updateWhiteboard,
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
        setConfirmModal,
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
        folders,
        upgradeStep,
        handleStep1Click,
        handleAddFolder,
        handleStep2Click,
        confirmItemDelete,
        confirmDeleteTracker,
        closeConfirmModal
    };
};
