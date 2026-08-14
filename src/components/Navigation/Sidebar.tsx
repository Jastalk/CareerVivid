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
    ChevronUp,
    Terminal,
    UserRound,
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
import '../Landing/live/liveLanding.css';

/*
 * The rail is the one surface every signed-in page renders inside, so it uses
 * the same token set as the pages themselves — desk ground, paper panels, one
 * purple. It deliberately skips the window chrome the dashboard cards wear:
 * traffic lights above a navigation list would be decoration on the one thing
 * a user looks at forty times a week.
 *
 * Quiet text here is --cvl-muted rather than --cvl-faint. The rail is grounded
 * on --cvl-desk, which is a shade darker than --cvl-paper in light mode, and
 * --cvl-faint is only measured against paper.
 */

/**
 * The XP strip and the credit meter are the only two things in the rail that
 * paint a filled bar, and they have to read as the same kind of measure.
 * Remapping the product-wide `--cv-*` variables on XpStatusCard's wrapper pulls
 * what it takes from them onto the rail's palette without reaching into a
 * component five other pages also render.
 *
 * It is a partial fix, and worth naming as one. Of the two variants used here,
 * only `strip` reads any of these names (`--cv-surface-warm-card-strong`, for
 * its hover). `collapsed` is built entirely from raw hex, `bg-white`, and
 * `dark:` variants (XpStatusCard.tsx:37-38) — none of which this wrapper can
 * reach — and `strip`'s streak flame is `text-[#d97706]` / `fill-amber-400/60`
 * for the same reason. Putting those on tokens means editing XpStatusCard,
 * which is outside this file's remit.
 */
const XP_STRIP_TOKENS = {
    '--cv-text-heading': 'var(--cvl-ink)',
    '--cv-text-muted': 'var(--cvl-muted)',
    '--cv-action-primary': 'var(--cvl-purple)',
    '--cv-action-solid': 'var(--cvl-purple)',
    '--cv-purple-500': 'var(--cvl-purple)',
    '--cv-surface-muted': 'var(--cvl-paper-2)',
    '--cv-surface-warm-card-strong': 'var(--cvl-paper-2)',
} as React.CSSProperties;

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
    /*
     * Account settings live behind the user card rather than in the rail.
     *
     * Subscription, Settings, Referrals, language, theme and sign-out used to
     * sit open at the bottom of every page. Together with the two meters they
     * held roughly 350px hostage, which left the seven workspace links fighting
     * for what was left — on a laptop the Files row ended up underneath the XP
     * card. None of them are navigation, and none are needed more than once a
     * session, so they belong one click away.
     */
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isAccountMenuOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!accountMenuRef.current?.contains(event.target as Node)) setIsAccountMenuOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsAccountMenuOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isAccountMenuOpen]);

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
        { label: 'Resume editor', path: '/newresume', icon: Sparkles },
        { label: 'Learning', path: '/learning', icon: GraduationCap },
    ];

    /*
     * `/developer` is not account settings — it issues the API key and walks
     * through wiring an MCP server up to Codex or Claude Code. Sitting under the
     * label "Settings" next to "Profile" it read as a duplicate of the profile
     * page, so the one place to connect a coding agent was effectively hidden.
     */
    const accountLinks = [
        { label: 'Subscription', path: '/subscription', icon: CreditCard },
        { label: 'Developer & MCP', path: '/developer', icon: Terminal },
        { label: 'Referrals', path: '/referrals', icon: Gift },
    ];

    const isActivePath = (path: string) => (
        path === '/dashboard'
            ? currentPath === path
            : currentPath === path || currentPath.startsWith(`${path}/`)
    );

    /** The active row is the only place in the rail that carries the accent. */
    const rowTone = (isActive: boolean) => (
        isActive
            ? { background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }
            : undefined
    );

    const creditsUsed = aiUsage?.count || 0;
    const creditsLimit = aiUsage?.limit || 10;
    const creditsPercent = creditsLimit > 0 ? Math.min((creditsUsed / creditsLimit) * 100, 100) : 0;
    const creditsLeft = Math.max(creditsLimit - creditsUsed, 0);
    // Running out is a warning, not a delete. Amber until it is actually gone.
    const creditsTone = creditsLeft === 0
        ? 'var(--cvl-danger)'
        : creditsPercent >= 70 ? 'var(--cvl-amber)' : 'var(--cvl-purple)';
    /*
     * Both of these states came from the AIUsageProgressBar this meter replaced,
     * and they are the reason the meter is worth having at all: the nudge is the
     * conversion path for the users about to run out, and "limit reached" is the
     * one month where the number needs to look different from every other month.
     * Same thresholds as the component's — see AIUsageProgressBar.tsx:91.
     */
    const creditsRunningLow = !isPremium && creditsLeft > 0 && creditsLeft <= Math.min(creditsLimit * 0.3, 20);
    const creditsExhausted = creditsLeft === 0;

    if (!currentUser) return null;

    return (
        <aside
            style={{
                width: `${activeSidebarWidth}px`,
                background: 'var(--cvl-desk)',
                color: 'var(--cvl-ink)',
                borderRight: '1px solid var(--cvl-line)',
                boxShadow: '4px 0 24px -20px var(--cvl-shadow)',
            }}
            data-sidebar-mode={sidebarMode}
            className="cvl fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto overscroll-contain transition-[width] duration-200 ease-in-out [scrollbar-width:thin] md:flex"
        >
            {/* Header / Logo */}
            <div
                className={`relative flex h-16 shrink-0 items-center border-b sm:h-20 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}
                style={{ borderColor: 'var(--cvl-line)' }}
            >
                <a
                    href="/dashboard"
                    onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
                    className={`flex min-w-0 items-center ${isCollapsed ? 'hidden' : 'gap-2.5'}`}
                    aria-label="CareerVivid Dashboard"
                >
                    <Logo className="h-8 w-auto shrink-0" />
                    <span className="truncate font-heading text-sm font-semibold tracking-tight">CareerVivid</span>
                </a>
                <button
                    onClick={toggleSidebarMode}
                    className="cvl-btn-ghost flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            {/* Navigation main section */}
            {/*
              * `overflow-y-auto` is what stops the rail from colliding with the
              * footer. `flex-1` + `min-h-0` let it shrink, but with no scroll
              * container the links simply painted past their box and the last
              * one rendered underneath the panel below.
              */}
            <nav className={`min-h-0 select-none overflow-y-auto ${isCollapsed ? 'flex flex-1 flex-col items-center gap-2 px-2 py-4' : 'flex flex-1 flex-col px-3 py-4'}`}>
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
                                style={rowTone(isActive)}
                                className="cvl-btn-ghost relative flex h-11 w-11 items-center justify-center rounded-lg"
                            >
                                <Icon size={18} />
                            </button>
                        );
                    })}
                    <div className="my-1 h-px w-7" style={{ background: 'var(--cvl-line)' }} />
                    <button
                        type="button"
                        onClick={() => setIsFilesOpen(true)}
                        title="Files"
                        aria-label="Open Files"
                        className="cvl-btn-ghost flex h-11 w-11 items-center justify-center rounded-lg"
                    >
                        <FolderOpen size={18} />
                    </button>
                    </>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0">
                            <span
                                className="cvl-mono mb-2 block px-1 text-[11px] uppercase tracking-[0.18em]"
                                style={{ color: 'var(--cvl-muted)' }}
                            >
                                Workspace
                            </span>
                            <div className="space-y-0.5">
                                {primaryLinks.map(({ label, path, icon: Icon }) => {
                                    const isActive = isActivePath(path);
                                    return (
                                        <button
                                            key={path}
                                            onClick={() => handleLinkClick(path)}
                                            /*
                                              * Resting rows sit in --cvl-muted and come up to
                                              * --cvl-ink on hover; only the row you are on takes
                                              * the purple. One accent in the rail means the active
                                              * page is legible at a glance instead of competing
                                              * with six near-black labels.
                                              */
                                            style={rowTone(isActive)}
                                            className="cvl-btn-ghost cv-nav-row flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold"
                                        >
                                            <Icon size={16} className="shrink-0" />
                                            <span className="min-w-0 truncate">{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--cvl-line)' }}>
                            <button
                                type="button"
                                onClick={() => setIsFilesOpen(true)}
                                aria-label="Open Files"
                                className="cvl-btn-ghost cv-nav-row flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold"
                            >
                                <FolderOpen size={16} className="shrink-0" />
                                <span>Files</span>
                                <span className="cvl-mono ml-auto text-[11px] tabular-nums">{activeDocuments.length}</span>
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Utility Section */}
            <div
                className={`relative mt-auto shrink-0 border-t ${isCollapsed ? 'px-2 py-3' : 'px-3 py-2.5'}`}
                style={{ borderColor: 'var(--cvl-line)' }}
            >
                {isCollapsed ? (
                    <div className="flex flex-col items-center gap-2">
                        <div style={XP_STRIP_TOKENS}>
                            <XpStatusCard variant="collapsed" onClick={() => navigate('/interview-studio')} />
                        </div>
                        <div className="group relative h-11 w-11 shrink-0">
                            {/*
                              * The <select> underneath is `opacity-0`, so its own
                              * :focus-visible outline paints nothing. The visible span
                              * has to carry the focus state for it, or tabbing here
                              * changes nothing anywhere on screen.
                              */}
                            <span className="cvl-btn cvl-mono pointer-events-none flex h-11 w-11 items-center justify-center rounded-lg text-[10px] font-bold uppercase group-focus-within:ring-2 group-focus-within:ring-[var(--cvl-purple)]">
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
                            className="cvl-btn flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg"
                        >
                            <img src={currentUserAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        </button>
                        <button
                            type="button"
                            onClick={logOut}
                            title="Sign out"
                            aria-label="Sign out"
                            /* The one control here you cannot undo, so it keeps the danger ink. */
                            style={{ color: 'var(--cvl-danger)' }}
                            className="cvl-btn-ghost flex h-11 w-11 items-center justify-center rounded-lg"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                <>
                {/*
                  * Two meters, one strip. Level and credits are both "how much
                  * of something do I have left" — stacking them as two bordered
                  * cards spent twice the height to say one kind of thing.
                  */}
                <div style={XP_STRIP_TOKENS}>
                    <XpStatusCard variant="strip" onClick={() => navigate('/interview-studio')} />
                </div>

                {aiUsage && (
                    <button
                        type="button"
                        onClick={() => navigate('/subscription')}
                        className="cvl-btn-ghost mt-1.5 w-full rounded-lg px-2 py-1.5 text-left"
                        aria-label="View credits and subscription"
                    >
                        <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                <CreditCard size={12} /> Credits
                            </span>
                            <span className="cvl-mono text-[11px] tabular-nums">{creditsUsed}/{creditsLimit}</span>
                        </span>
                        {/* Same bar, same track, same purple as the level meter above it. */}
                        <span className="mt-1 block h-1 overflow-hidden rounded-full" style={{ background: 'var(--cvl-paper-2)' }}>
                            <span
                                className="block h-full rounded-full transition-[width] duration-500"
                                style={{ width: `${Math.max(creditsPercent, 2)}%`, background: creditsTone }}
                            />
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                            <span
                                className="cvl-mono truncate text-[10px]"
                                style={{ color: creditsExhausted ? 'var(--cvl-danger)' : 'var(--cvl-muted)' }}
                            >
                                {creditsExhausted
                                    ? 'Limit reached'
                                    : `${getPlanDisplayName(userProfile?.plan)} · ${creditsLeft} left`}
                            </span>
                            {/*
                              * A span, not a button. The whole row is already the
                              * button and it already goes to /subscription — which is
                              * where the old nested Upgrade button ended up too, by
                              * letting its click bubble out to this same row.
                              */}
                            {creditsRunningLow && (
                                <span
                                    className="cvl-mono shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                                    style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                >
                                    Upgrade
                                </span>
                            )}
                        </span>
                    </button>
                )}
                </>
                )}
            </div>

            {/* User card — also the entry point for everything account-related. */}
            {!isCollapsed && (
            <div ref={accountMenuRef} className="relative shrink-0 border-t p-2.5" style={{ borderColor: 'var(--cvl-line)' }}>
                {isAccountMenuOpen && (
                    <div
                        role="menu"
                        aria-label="Account"
                        className="cvl-panel absolute bottom-full left-2.5 right-2.5 z-20 mb-1.5 overflow-hidden p-1"
                        style={{ boxShadow: '0 2px 4px var(--cvl-shadow), 0 22px 44px -24px var(--cvl-shadow)' }}
                    >
                        <button
                            role="menuitem"
                            onClick={() => { setIsAccountMenuOpen(false); navigate('/profile'); }}
                            className="cvl-btn-ghost cv-nav-row flex w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold"
                        >
                            <UserRound size={15} /><span className="truncate">Profile &amp; settings</span>
                        </button>

                        {accountLinks.map(({ label, path, icon: Icon }) => (
                            <button
                                key={path}
                                role="menuitem"
                                onClick={() => { setIsAccountMenuOpen(false); navigate(path); }}
                                style={rowTone(isActivePath(path))}
                                className="cvl-btn-ghost cv-nav-row flex w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold"
                            >
                                <Icon size={15} /><span className="truncate">{label}</span>
                            </button>
                        ))}

                        <div className="mx-1.5 my-1 border-t" style={{ borderColor: 'var(--cvl-line)' }} />

                        <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                            <label htmlFor="sidebar-language-select" className="shrink-0 text-xs font-semibold" style={{ color: 'var(--cvl-muted)' }}>
                                {t('resume_form.language', 'Language')}
                            </label>
                            <div className="group relative h-8 w-[96px] shrink-0">
                                {/* Same as the collapsed picker: the select is invisible,
                                    so the focus state has to live on this span. */}
                                <span className="cvl-field pointer-events-none flex h-full w-full items-center justify-end px-2 text-right text-[11px] font-semibold group-focus-within:ring-2 group-focus-within:ring-[var(--cvl-purple)]">
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
                                        <option key={language.code} value={language.code}>{language.nativeName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2.5 py-1.5">
                            <span className="text-xs font-semibold" style={{ color: 'var(--cvl-muted)' }}>Theme</span>
                            <div
                                className="flex items-center gap-0.5 rounded-lg border p-0.5"
                                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                            >
                                {themeOptions.map(opt => (
                                    <button key={opt.value} onClick={() => setTheme(opt.value)} title={opt.label} aria-label={opt.label} aria-pressed={theme === opt.value}
                                        style={theme === opt.value ? { background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' } : undefined}
                                        className="cvl-btn-ghost rounded-md p-1.5">
                                        {opt.icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mx-1.5 my-1 border-t" style={{ borderColor: 'var(--cvl-line)' }} />

                        {currentUser ? (
                            <button role="menuitem" onClick={logOut} style={{ color: 'var(--cvl-danger)' }} className="cvl-btn-ghost cv-nav-row flex w-full items-center gap-2 rounded-lg px-2.5 text-xs font-semibold">
                                <LogOut size={15} /><span>Sign out</span>
                            </button>
                        ) : (
                            <button role="menuitem" onClick={() => navigate('/signin')} style={{ color: 'var(--cvl-purple)' }} className="cvl-btn-ghost cv-nav-row flex w-full items-center gap-2 rounded-lg px-2.5 text-xs font-semibold">
                                <LogIn size={15} /><span>Sign in / Sign up</span>
                            </button>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    className="cvl-btn group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: 'var(--cvl-purple-soft)' }}>
                        <img src={currentUserAvatar} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                            {currentUser.displayName || 'My Profile'}
                        </p>
                        <p className="truncate text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                            {currentUser.email}
                        </p>
                    </div>
                    <ChevronUp size={15} className={`shrink-0 transition-transform ${isAccountMenuOpen ? '' : 'rotate-180'}`} style={{ color: 'var(--cvl-muted)' }} />
                </button>
            </div>
            )}

            {isFilesOpen && createPortal(
                <div
                    /*
                     * The drawer is portalled to <body>, outside the rail, so it has to
                     * carry `cvl` itself or none of the tokens below resolve. The desk
                     * ground and its dot grid come with that class and are painted over
                     * here — a scrim, not a surface.
                     *
                     * --cvl-shadow is the scrim, because it is the only token that is
                     * dark in both themes. Every other one flips, and a scrim mixed from
                     * --cvl-ink came out near-white over the dark page: it washed the
                     * page out instead of pushing it back.
                     */
                    className="cvl fixed inset-0 z-[70] flex justify-end p-3 sm:p-5"
                    style={{ background: 'var(--cvl-shadow)', backgroundImage: 'none' }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Files"
                >
                    <button type="button" className="absolute inset-0 cursor-default" aria-label="Close Files" onClick={() => setIsFilesOpen(false)} />
                    <section
                        className="cvl-panel relative flex h-full w-full max-w-md flex-col overflow-hidden"
                        style={{ boxShadow: '0 2px 4px var(--cvl-shadow), 0 30px 60px -30px var(--cvl-shadow)' }}
                    >
                        <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--cvl-line)' }}>
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">Files</h2>
                                <p className="mt-0.5 text-xs" style={{ color: 'var(--cvl-muted)' }}>Your resumes, portfolios, whiteboards, and practice sessions.</p>
                            </div>
                            <button type="button" onClick={() => setIsFilesOpen(false)} className="cvl-btn rounded-lg px-2.5 py-1.5 text-xs font-semibold">Close</button>
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
                className={`group absolute bottom-0 right-0 top-0 z-50 w-1.5 ${isCollapsed ? 'pointer-events-none opacity-0' : 'cursor-col-resize'}`}
            >
                {/* The grip only appears on hover, so it tints rather than fills. */}
                <div
                    className="absolute right-0 top-1/2 h-10 w-0.5 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100"
                    style={{ background: 'var(--cvl-purple)' }}
                />
            </div>

        </aside>
    );
};

export default Sidebar;
