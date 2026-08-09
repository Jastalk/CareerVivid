import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Mic,
    Briefcase,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut,
    LogIn,
    Sun,
    Moon,
    Monitor,
    CreditCard,
    Gift,
    FolderOpen,
    LayoutDashboard,
    Settings,
    Sparkles,
    GraduationCap,
    Bot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import Logo from '../Logo';
import { SUPPORTED_LANGUAGES } from '../../constants';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../utils/navigation';
import {
    buildLocalizedPath,
    getStoredLanguagePreference,
    normalizeLanguageCode,
    setStoredLanguagePreference,
    stripLanguagePrefix,
} from '../../utils/languagePreference';
import AIUsageProgressBar from '../AIUsageProgressBar';
import XpStatusCard from '../Gamification/XpStatusCard';
import { getPlanDisplayName } from '../../config/subscriptionCatalog';
import { useSidebarStore } from '../../store/useSidebarStore';
import { SidebarNode } from '../../types';
import { SidebarContextMenu } from './SidebarContextMenu';
import ConfirmationModal from '../ConfirmationModal';
import { useResumes } from '../../hooks/useResumes';
import { usePortfolios } from '../../hooks/usePortfolios';
import { useWhiteboards } from '../../hooks/useWhiteboards';
import { usePracticeHistory } from '../../hooks/useJobHistory';
import { useMyCommunityPosts } from '../../hooks/useMyCommunityPosts';
import SidebarDocumentList from './SidebarDocumentList';
import { getPreferredUserAvatar } from '../../utils/avatarFallback';

const generateDefaultNodes = (t: any): SidebarNode[] => {
    return [];
};

const Sidebar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { toggleSidebarMode, sidebarMode, sidebarWidth, setSidebarWidth } = useNavigation();
    const { currentUser, userProfile, updateUserProfile, logOut, aiUsage, isPremium } = useAuth();
    const { theme, setTheme } = useTheme();
    const currentPath = stripLanguagePrefix(window.location.pathname);
    const currentLanguageCode =
        normalizeLanguageCode(i18n.resolvedLanguage || i18n.language) ||
        getStoredLanguagePreference() ||
        'en';
    const currentLanguageLabel =
        SUPPORTED_LANGUAGES.find((language) => language.code === currentLanguageCode)?.nativeName ||
        currentLanguageCode.toUpperCase();

    const { updateResume, deleteResume } = useResumes();
    const { updatePortfolio, deletePortfolio } = usePortfolios();
    const { updateWhiteboard, deleteWhiteboard } = useWhiteboards();
    const { deletePracticeHistory } = usePracticeHistory();
    const { deletePost: deleteCommunityPost } = useMyCommunityPosts();
    const currentUserAvatar = currentUser ? getPreferredUserAvatar({
        photoURL: (userProfile as any)?.photoURL || currentUser.photoURL,
        avatarUrl: (userProfile as any)?.avatarUrl,
        displayName: userProfile?.displayName || currentUser.displayName,
        firstName: (userProfile as any)?.firstName,
        email: userProfile?.email || currentUser.email,
        seed: userProfile?.uid || currentUser.uid,
    }) : '';

    const isResizingRef = useRef(false);
    const isCollapsed = sidebarMode === 'collapsed';
    const activeSidebarWidth = isCollapsed ? 72 : sidebarWidth;

    const startResizing = useCallback((e: React.MouseEvent) => {
        if (isCollapsed) return;
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [isCollapsed]);

    const stopResizing = useCallback(() => {
        if (isResizingRef.current) {
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current) return;
        setSidebarWidth(e.clientX);
    }, [setSidebarWidth]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const { nodes, setNodes, isInitialized, setIsInitialized, updateNodeTitle, deleteNode, activeNodeId, setActiveNode } = useSidebarStore();
    
    // UI Local States
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    
    const handleLinkClick = (path: string) => {
        navigate(path);
    };
    
    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string, text: string, type: string } | null>(null);
    
    // Modal States
    const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Filter/Sort States
    const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>(() => {
        try {
            const current = localStorage.getItem('cv_sidebar_preferences');
            if (current) {
                const preferences = JSON.parse(current);
                if (preferences.sortBy === 'createdAt' || preferences.sortBy === 'updatedAt') {
                    return preferences.sortBy;
                }
            }
        } catch (err) {
            console.error('Error reading sort preference', err);
        }
        return 'createdAt';
    });
    const [filterType, setFilterType] = useState<string>(() => {
        try {
            const current = localStorage.getItem('cv_sidebar_preferences');
            if (current) {
                const preferences = JSON.parse(current);
                if (preferences.filterType) {
                    return preferences.filterType;
                }
            }
        } catch (err) {
            console.error('Error reading filter preference', err);
        }
        return 'all';
    });
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const [isFilesOpen, setIsFilesOpen] = useState(false);

    const savePreference = (key: 'filterType' | 'sortBy', value: string) => {
        try {
            const current = localStorage.getItem('cv_sidebar_preferences');
            const preferences = current ? JSON.parse(current) : {};
            preferences[key] = value;
            localStorage.setItem('cv_sidebar_preferences', JSON.stringify(preferences));
        } catch (err) {
            console.error('Error saving preference to localStorage', err);
        }
    };

    const handleLanguageChange = (value: string) => {
        const language = setStoredLanguagePreference(value);
        i18n.changeLanguage?.(language);
        navigate(buildLocalizedPath(`${window.location.pathname}${window.location.search}${window.location.hash}`, language));
    };

    const lastSavedNodesRef = useRef<string>('');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
        };

        if (isFilterDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterDropdownOpen]);

    useEffect(() => {
        if (userProfile && !isInitialized) {
            let initialNodes: SidebarNode[] = [];

            if (userProfile.sidebarNodes && userProfile.sidebarNodes.length > 0) {
                initialNodes = userProfile.sidebarNodes;
            } else {
                initialNodes = generateDefaultNodes(t);
            }

            // Clean up: Filter out any leftover project nodes (claude-code, etc.)
            initialNodes = initialNodes.filter(n => {
                const isProj = n.id.toString().startsWith('project-') || 
                               n.data?.type === 'project' ||
                               n.id === 'project-claude-code' || 
                               n.id === 'project-antigravity' || 
                               n.id === 'project-codex' || 
                               n.id === 'project-claude-code-source-code' ||
                               ['claude-code', 'antigravity', 'codex', 'claude-code-source-code'].includes(n.text.toLowerCase());
                return !isProj;
            });

            // Re-parent any remaining children to root (0)
            initialNodes = initialNodes.map(n => {
                if (n.parent.toString().startsWith('project-')) {
                    return { ...n, parent: 0 };
                }
                return n;
            });

            lastSavedNodesRef.current = JSON.stringify(initialNodes);
            setNodes(initialNodes);
            setIsInitialized(true);
        }
    }, [userProfile, isInitialized, setNodes, setIsInitialized, t]);

    // Save changes when store updates externally
    const handleGlobalSave = useCallback(async () => {
        if (!userProfile || nodes.length === 0) return;
        try {
            const currentNodesStr = JSON.stringify(nodes);
            if (currentNodesStr !== lastSavedNodesRef.current) {
                lastSavedNodesRef.current = currentNodesStr;
                await updateUserProfile({ sidebarNodes: nodes });
            }
        } catch (e) {
            console.error(e);
        }
    }, [nodes, userProfile, updateUserProfile]);

    useEffect(() => {
        if (isInitialized && nodes.length > 0 && userProfile) {
            handleGlobalSave();
        }
    }, [isInitialized, handleGlobalSave, nodes, userProfile]);

    const startEditing = (id: string, text: string) => {
        setEditingNodeId(id);
        setEditValue(text);
    };

    const saveRename = async (id: string) => {
        if (editValue.trim() !== '') {
            const trimmedValue = editValue.trim();
            updateNodeTitle(id, trimmedValue);
            
            try {
                if (id.startsWith('resume-')) {
                    const rawId = id.replace('resume-', '');
                    await updateResume(rawId, { title: trimmedValue });
                } else if (id.startsWith('portfolio-')) {
                    const rawId = id.replace('portfolio-', '');
                    await updatePortfolio(rawId, { title: trimmedValue });
                } else if (id.startsWith('whiteboard-')) {
                    const rawId = id.replace('whiteboard-', '');
                    await updateWhiteboard(rawId, { title: trimmedValue });
                }
            } catch (err) {
                console.error('Error syncing rename with Firestore:', err);
            }
        }
        setEditingNodeId(null);
    };

    const confirmDelete = async () => {
        if (deleteNodeId) {
            const id = deleteNodeId;
            deleteNode(id);
            
            try {
                if (id.startsWith('resume-')) {
                    const rawId = id.replace('resume-', '');
                    await deleteResume(rawId);
                } else if (id.startsWith('portfolio-')) {
                    const rawId = id.replace('portfolio-', '');
                    await deletePortfolio(rawId);
                } else if (id.startsWith('whiteboard-')) {
                    const rawId = id.replace('whiteboard-', '');
                    await deleteWhiteboard(rawId);
                } else if (id.startsWith('interview-')) {
                    const rawId = id.replace('interview-', '');
                    await deletePracticeHistory(rawId);
                } else if (id.startsWith('post-')) {
                    const rawId = id.replace('post-', '');
                    await deleteCommunityPost(rawId);
                }
            } catch (err) {
                console.error('Error syncing delete with Firestore:', err);
            }
            
            setIsDeleteModalOpen(false);
            setDeleteNodeId(null);
        }
    };

    // Filter dynamic database assets (resumes, portfolios, whiteboards, posts, interviews) and sort chronologically/recently modified
    const activeDocuments = React.useMemo(() => {
        const docs = nodes.filter(n =>
            n.data?.type === 'resume' ||
            n.data?.type === 'portfolio' ||
            n.data?.type === 'whiteboard' ||
            n.data?.type === 'post' ||
            n.data?.type === 'interview'
        );

        const filtered = filterType === 'all'
            ? docs
            : docs.filter(n => n.data?.type === filterType);

        return [...filtered].sort((a, b) => {
            if (sortBy === 'createdAt') {
                const aTime = a.data?.createdAt ?? a.data?.timestamp ?? 0;
                const bTime = b.data?.createdAt ?? b.data?.timestamp ?? 0;
                return aTime - bTime;
            } else {
                const aTime = a.data?.updatedAt ?? a.data?.timestamp ?? 0;
                const bTime = b.data?.updatedAt ?? b.data?.timestamp ?? 0;
                return bTime - aTime; // Descending (newest first) for Recently Modified
            }
        });
    }, [nodes, sortBy, filterType]);

    const themeOptions = [
        { value: 'light', icon: <Sun size={14} />, label: 'Light' },
        { value: 'dark', icon: <Moon size={14} />, label: 'Dark' },
        { value: 'system', icon: <Monitor size={14} />, label: 'System' },
    ] as const;

    const primaryLinks = [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        // The durable way back to the agent. The floating panel can be closed
        // or dragged off, and a companion you cannot find again is worse than
        // one that was never there.
        { label: 'Career Agent', path: '/agent', icon: Bot },
        { label: 'Job tracker', path: '/job-tracker', icon: Briefcase },
        { label: 'Interview practice', path: '/interview-studio', icon: Mic },
        { label: 'Learning', path: '/learning', icon: GraduationCap },
        { label: 'Resume', path: '/newresume', icon: Sparkles },
    ];

    const accountLinks = [
        { label: 'Subscription', path: '/subscription', icon: CreditCard },
        { label: 'Settings', path: '/developer', icon: Settings },
        { label: 'Referrals', path: '/referrals', icon: Gift },
    ];

    const isActivePath = (path: string) => (
        path === '/dashboard'
            ? currentPath === path
            : currentPath === path || currentPath.startsWith(`${path}/`)
    );

    if (!currentUser) return null;

    return (
        <aside 
            style={{ width: `${activeSidebarWidth}px` }}
            data-sidebar-mode={sidebarMode}
            className="fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto overscroll-contain border-r border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] text-[var(--cv-text-heading)] shadow-[4px_0_24px_rgba(16,24,40,0.04)] transition-[width] duration-200 ease-in-out [scrollbar-width:thin] md:flex"
        >
            {/* Header / Logo */}
            <div className={`relative flex h-16 shrink-0 items-center border-b border-[var(--cv-border-subtle)] sm:h-20 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
                <a
                    href="/dashboard"
                    onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
                    className={`flex min-w-0 items-center ${isCollapsed ? 'hidden' : 'gap-2.5'}`}
                    aria-label="CareerVivid Dashboard"
                >
                    <Logo className="h-8 w-auto shrink-0" />
                    <span className="truncate font-heading text-sm font-extrabold tracking-tight text-[var(--cv-text-heading)]">CareerVivid</span>
                </a>
                <button
                    onClick={toggleSidebarMode}
                    className="rounded-xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] p-1.5 text-[var(--cv-text-muted)] shadow-sm transition-colors hover:border-[var(--cv-action-border)] hover:text-[var(--cv-action-primary)]"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            {/* Navigation main section */}
            <nav className={`min-h-0 select-none ${isCollapsed ? 'flex flex-1 flex-col items-center gap-2 px-2 py-4' : 'flex flex-1 flex-col px-3 py-4'}`}>
                {isCollapsed ? (
                    <>
                    {primaryLinks.map(({ label, path, icon: Icon }) => {
                        const isActive = isActivePath(path);
                        return (
                            <button
                                key={path}
                                type="button"
                                onClick={() => handleLinkClick(path)}
                                title={label}
                                aria-label={label}
                                className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${isActive ? 'border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)] shadow-sm' : 'border-transparent text-[var(--cv-text-muted)] hover:border-[var(--cv-border-subtle)] hover:bg-[var(--cv-surface-warm-card-strong)] hover:text-[var(--cv-text-heading)]'}`}
                            >
                                <Icon size={18} />
                            </button>
                        );
                    })}
                    <div className="my-1 h-px w-7 bg-[var(--cv-border-subtle)]" />
                    <button
                        type="button"
                        onClick={() => setIsFilesOpen(true)}
                        title="Files"
                        aria-label="Open Files"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-[var(--cv-text-muted)] transition-all hover:border-[var(--cv-border-subtle)] hover:bg-[var(--cv-surface-muted)] hover:text-[var(--cv-text-heading)]"
                    >
                        <FolderOpen size={18} />
                    </button>
                    </>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0">
                            <span className="cv-design-eyebrow mb-2 block px-1 text-[10px]">Workspace</span>
                            <div className="space-y-0.5">
                                {primaryLinks.map(({ label, path, icon: Icon }) => {
                                    const isActive = isActivePath(path);
                                    return (
                                        <button
                                            key={path}
                                            onClick={() => handleLinkClick(path)}
                                            className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-all ${isActive ? 'border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)] shadow-sm' : 'border-transparent text-[var(--cv-text-muted)] hover:border-[var(--cv-border-subtle)] hover:bg-[var(--cv-surface-warm-card-strong)] hover:text-[var(--cv-text-heading)]'}`}
                                        >
                                            <Icon size={15} className="shrink-0" />
                                            <span className="min-w-0 truncate">{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 border-t border-[var(--cv-border-subtle)] pt-3">
                            <button
                                type="button"
                                onClick={() => setIsFilesOpen(true)}
                                aria-label="Open Files"
                                className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left text-xs font-bold text-[var(--cv-text-muted)] transition-all hover:border-[var(--cv-border-subtle)] hover:bg-[var(--cv-surface-muted)] hover:text-[var(--cv-text-heading)]"
                            >
                                <FolderOpen size={15} className="shrink-0" />
                                <span>Files</span>
                                <span className="ml-auto text-[10px] font-semibold text-[var(--cv-text-muted)]">{activeDocuments.length}</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Utility Section */}
            <div className={`relative mt-auto shrink-0 border-t border-[var(--cv-border-subtle)] ${isCollapsed ? 'px-2 py-3' : 'px-3 py-2.5'}`}>
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-2">
                        <XpStatusCard variant="collapsed" onClick={() => navigate('/interview-studio')} />
                        <div className="group relative h-11 w-11 shrink-0">
                            <span className="pointer-events-none flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-[10px] font-extrabold uppercase text-[var(--cv-text-muted)] shadow-sm transition group-hover:border-[var(--cv-action-border)] group-hover:text-[var(--cv-action-primary)] group-focus-within:ring-2 group-focus-within:ring-[var(--cv-action-border)]">
                                {currentLanguageCode.toUpperCase()}
                            </span>
                            <select
                                value={currentLanguageCode}
                                onChange={(event) => handleLanguageChange(event.target.value)}
                                title={t('resume_form.language', 'Language')}
                                aria-label={t('resume_form.language', 'Language')}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            >
                                {SUPPORTED_LANGUAGES.map((language) => (
                                    <option key={language.code} value={language.code}>
                                        {language.nativeName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/profile')}
                            title="Profile"
                            aria-label="Profile"
                            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] shadow-sm transition hover:border-[var(--cv-action-border)]"
                        >
                            <img src={currentUserAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        </button>
                        <button
                            type="button"
                            onClick={logOut}
                            title="Sign out"
                            aria-label="Sign out"
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-slate-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-950 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                <>
                {/* Progress at a glance */}
                <XpStatusCard onClick={() => navigate('/interview-studio')} />

                {aiUsage && (
                    <button type="button" onClick={() => navigate('/subscription')} className="mb-2 w-full rounded-xl border border-[var(--cv-border-product)] bg-[var(--cv-surface)] px-3 py-2 text-left shadow-sm transition hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-purple-25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cv-border-focus)] dark:bg-slate-900/70 dark:hover:bg-[#17152d]" aria-label="View credits and subscription">
                        <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--cv-text-muted)]"><CreditCard size={12} /> Credits</span>
                        <AIUsageProgressBar used={aiUsage.count || 0} limit={aiUsage.limit || 10} isPremium={isPremium} variant="minimal" planLabel={getPlanDisplayName(userProfile?.plan)} />
                    </button>
                )}

                {/* One settings group: account links, language, theme, sign out */}
                <div className="rounded-xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-muted)] p-1 dark:bg-slate-900/40">
                    {accountLinks.map(({ label, path, icon: Icon }) => {
                        const isActive = isActivePath(path);
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${isActive ? 'bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-text-heading)] shadow-sm' : 'text-[var(--cv-text-muted)] hover:bg-[var(--cv-surface-warm-card-strong)] hover:text-[var(--cv-text-heading)]'}`}
                            >
                                <Icon size={14} />
                                <span className="truncate">{label}</span>
                            </button>
                        );
                    })}

                    <div className="mx-1.5 my-1 border-t border-[var(--cv-border-subtle)]" />

                    <div className="flex items-center justify-between gap-3 px-2.5 py-1">
                        <label htmlFor="sidebar-language-select" className="cv-design-eyebrow shrink-0 text-[10px]">
                            {t('resume_form.language', 'Language')}
                        </label>
                        <div className="group relative h-7 w-[88px] shrink-0">
                            <span className="pointer-events-none flex h-full w-full items-center justify-end rounded-lg border border-transparent bg-transparent px-2 text-right text-[11px] font-extrabold text-[var(--cv-text-heading)] outline-none transition group-hover:border-[var(--cv-border-subtle)] group-hover:bg-[var(--cv-surface-warm-card-strong)] group-focus-within:border-[var(--cv-action-border)] group-focus-within:bg-[var(--cv-surface-warm-card-strong)] group-focus-within:ring-2 group-focus-within:ring-[var(--cv-action-border)]">
                                <span className="truncate">{currentLanguageLabel}</span>
                            </span>
                            <select
                                id="sidebar-language-select"
                                aria-label={t('resume_form.language', 'Language')}
                                value={currentLanguageCode}
                                onChange={(event) => handleLanguageChange(event.target.value)}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            >
                                {SUPPORTED_LANGUAGES.map((language) => (
                                    <option key={language.code} value={language.code}>
                                        {language.nativeName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1">
                        <span className="cv-design-eyebrow text-[10px]">Theme</span>
                        <div className="flex items-center gap-0.5 rounded-xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card)] p-0.5">
                            {themeOptions.map(opt => (
                                <button key={opt.value} onClick={() => setTheme(opt.value)} title={opt.label}
                                    className={`rounded-lg p-1 transition-all ${theme === opt.value ? 'border border-[var(--cv-action-border)] bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-action-primary)] shadow-sm' : 'text-[var(--cv-text-muted)] hover:text-[var(--cv-text-heading)]'}`}>
                                    {opt.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mx-1.5 my-1 border-t border-[var(--cv-border-subtle)]" />

                    {currentUser ? (
                        <button onClick={logOut} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-danger-soft)] hover:text-[var(--cv-danger-text)]">
                            <LogOut size={14} /><span>Sign out</span>
                        </button>
                    ) : (
                        <button onClick={() => navigate('/signin')} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[var(--cv-action-primary)] transition-colors hover:bg-[var(--cv-action-soft-bg)]">
                            <LogIn size={14} /><span>Sign in / Sign up</span>
                        </button>
                    )}
                </div>
                </>
                )}
            </div>

            {/* User Profile Card */}
            {!isCollapsed && (
            <div className="relative shrink-0 border-t border-[var(--cv-border-subtle)] p-2.5">
                <div onClick={() => navigate('/profile')} className="cv-design-card group flex cursor-pointer items-center gap-3 px-3 py-2 transition-all duration-300 hover:border-[var(--cv-action-border)]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--cv-action-soft-bg)]">
                        <img src={currentUserAvatar} alt="User avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--cv-text-heading)]">
                            {currentUser.displayName || 'My Profile'}
                        </p>
                        <p className="truncate text-[11px] font-medium text-[var(--cv-text-muted)]">
                            {currentUser.email}
                        </p>
                    </div>
                </div>
            </div>
            )}

            {isFilesOpen && createPortal(
                <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/20 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Files">
                    <button type="button" className="absolute inset-0 cursor-default" aria-label="Close Files" onClick={() => setIsFilesOpen(false)} />
                    <section className="relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] shadow-[var(--cv-shadow-modal)]">
                        <header className="flex items-center justify-between border-b border-[var(--cv-border-subtle)] px-5 py-4">
                            <div>
                                <h2 className="cv-design-title text-base">Files</h2>
                                <p className="mt-0.5 text-xs font-medium text-[var(--cv-text-muted)]">Your resumes, portfolios, whiteboards, and practice sessions.</p>
                            </div>
                            <button type="button" onClick={() => setIsFilesOpen(false)} className="rounded-lg border border-[var(--cv-border-subtle)] px-2.5 py-1.5 text-xs font-bold text-[var(--cv-text-muted)] transition hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]">Close</button>
                        </header>
                        <div className="min-h-0 flex-1 p-3">
                            <SidebarDocumentList
                                activeDocuments={activeDocuments}
                                activeNodeId={activeNodeId}
                                editingNodeId={editingNodeId}
                                editValue={editValue}
                                filterType={filterType}
                                sortBy={sortBy}
                                isFilterDropdownOpen={isFilterDropdownOpen}
                                filterDropdownRef={filterDropdownRef}
                                setActiveNode={setActiveNode}
                                setEditValue={setEditValue}
                                setEditingNodeId={setEditingNodeId}
                                setContextMenu={setContextMenu}
                                setFilterType={setFilterType}
                                setSortBy={setSortBy}
                                setIsFilterDropdownOpen={setIsFilterDropdownOpen}
                                savePreference={savePreference}
                                saveRename={saveRename}
                                onDocumentOpen={() => setIsFilesOpen(false)}
                            />
                        </div>
                    </section>
                </div>,
                document.body,
            )}

            {/* Context Menu Portal */}
            {contextMenu && createPortal(
                <SidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    nodeTitle={contextMenu.text}
                    isFolder={false}
                    onClose={() => setContextMenu(null)}
                    onRename={() => {
                        startEditing(contextMenu.nodeId, contextMenu.text);
                    }}
                    onDelete={() => {
                        setDeleteNodeId(contextMenu.nodeId);
                        setIsDeleteModalOpen(true);
                    }}
                />,
                document.body
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Item"
                message={`Are you sure you want to delete "${deleteNodeId ? (nodes.find(n => n.id === deleteNodeId)?.text || '') : ''}"?`}
                confirmText="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />

            {/* Drag handle for resizing */}
            <div
                onMouseDown={startResizing}
                className={`group absolute bottom-0 right-0 top-0 z-50 w-1.5 transition-colors ${isCollapsed ? 'pointer-events-none opacity-0' : 'cursor-col-resize hover:bg-[var(--cv-action-soft-bg)] active:bg-[var(--cv-action-border)]'}`}
            >
                <div className="absolute right-0 top-1/2 h-10 w-0.5 -translate-y-1/2 rounded-full bg-[var(--cv-border-subtle)] opacity-0 transition-colors group-active:opacity-100 group-hover:bg-[var(--cv-action-primary)] group-hover:opacity-100" />
            </div>

        </aside>
    );
};

export default Sidebar;
