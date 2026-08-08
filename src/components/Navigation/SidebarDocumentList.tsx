import React from 'react';
import { Check, ChevronDown, FileText, Globe, Mic, MoreVertical, PenTool, SlidersHorizontal } from 'lucide-react';
import { SidebarNode } from '../../types';
import { navigate } from '../../utils/navigation';
import { getPathForNodeId } from '../../utils/workspaceNavigation';

interface SidebarDocumentListProps {
    activeDocuments: SidebarNode[];
    activeNodeId: string | null;
    editingNodeId: string | null;
    editValue: string;
    filterType: string;
    sortBy: 'createdAt' | 'updatedAt';
    isFilterDropdownOpen: boolean;
    filterDropdownRef: React.RefObject<HTMLDivElement>;
    setActiveNode: (nodeId: string) => void;
    setEditValue: (value: string) => void;
    setEditingNodeId: (nodeId: string | null) => void;
    setContextMenu: (menu: { x: number; y: number; nodeId: string; text: string; type: string } | null) => void;
    setFilterType: (type: string) => void;
    setSortBy: (sortBy: 'createdAt' | 'updatedAt') => void;
    setIsFilterDropdownOpen: (isOpen: boolean) => void;
    savePreference: (key: 'filterType' | 'sortBy', value: string) => void;
    saveRename: (id: string) => void;
    onDocumentOpen?: () => void;
}

const getDocIcon = (type: string) => {
    switch (type) {
        case 'resume':
            return <FileText size={15} className="text-sky-500" />;
        case 'portfolio':
            return <Globe size={15} className="text-emerald-500" />;
        case 'whiteboard':
            return <PenTool size={15} className="text-amber-500" />;
        case 'post':
            return <FileText size={15} className="text-violet-500" />;
        case 'interview':
            return <Mic size={15} className="text-rose-500" />;
        default:
            return <FileText size={15} className="text-gray-400" />;
    }
};

const SidebarDocumentList: React.FC<SidebarDocumentListProps> = ({
    activeDocuments,
    activeNodeId,
    editingNodeId,
    editValue,
    filterType,
    sortBy,
    isFilterDropdownOpen,
    filterDropdownRef,
    setActiveNode,
    setEditValue,
    setEditingNodeId,
    setContextMenu,
    setFilterType,
    setSortBy,
    setIsFilterDropdownOpen,
    savePreference,
    saveRename,
    onDocumentOpen,
}) => {
    const listRef = React.useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = React.useState({
        canScroll: false,
        atBottom: true,
        remainingRows: 0,
    });
    const filterLabel = filterType === 'all'
        ? 'All'
        : `${filterType.charAt(0).toUpperCase()}${filterType.slice(1)}s`;
    const sortLabel = sortBy === 'updatedAt' ? 'Recent' : 'Created';

    const updateScrollState = React.useCallback(() => {
        const list = listRef.current;
        if (!list) return;

        const hiddenHeight = list.scrollHeight - list.clientHeight;
        const remainingHeight = hiddenHeight - list.scrollTop;
        const canScroll = hiddenHeight > 8;
        const atBottom = remainingHeight <= 12;

        const estimatedRemainingRows = canScroll && !atBottom
            ? Math.max(1, Math.ceil(remainingHeight / 42))
            : 0;
        const nextState = {
            canScroll,
            atBottom,
            remainingRows: Math.min(Math.max(activeDocuments.length - 1, 0), estimatedRemainingRows),
        };

        setScrollState((previousState) => {
            if (
                previousState.canScroll === nextState.canScroll &&
                previousState.atBottom === nextState.atBottom &&
                previousState.remainingRows === nextState.remainingRows
            ) {
                return previousState;
            }

            return nextState;
        });
    }, [activeDocuments.length]);

    React.useEffect(() => {
        const list = listRef.current;
        if (!list) return;

        const rafId = window.requestAnimationFrame(updateScrollState);
        list.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(updateScrollState)
            : null;
        resizeObserver?.observe(list);

        return () => {
            window.cancelAnimationFrame(rafId);
            list.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
            resizeObserver?.disconnect();
        };
    }, [filterType, sortBy, updateScrollState]);

    const scrollToMoreFiles = () => {
        listRef.current?.scrollBy({ top: 220, behavior: 'smooth' });
    };
    const moreFilesLabel = scrollState.remainingRows === 1
        ? '1 more file'
        : `${scrollState.remainingRows} more files`;

    return (
        <div className="cv-design-card flex h-full min-h-0 flex-col p-2">
            <div className="mb-2 flex shrink-0 items-start justify-between gap-3 px-1.5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="cv-design-eyebrow text-[10px]">Files</span>
                        <span className="rounded-full bg-[var(--cv-surface-warm-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--cv-text-muted)]">{activeDocuments.length}</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] font-medium text-[var(--cv-text-muted)]">
                        {filterLabel} / {sortLabel}
                    </p>
                </div>
                <div className="relative" ref={filterDropdownRef}>
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            setIsFilterDropdownOpen(!isFilterDropdownOpen);
                        }}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all ${isFilterDropdownOpen || filterType !== 'all' ? 'border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)]' : 'border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] text-[var(--cv-text-muted)] hover:border-[var(--cv-action-border)] hover:text-[var(--cv-text-heading)]'}`}
                        title="Filter & Sort"
                    >
                        <SlidersHorizontal size={12} />
                        <span>Filter</span>
                        {filterType !== 'all' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cv-action-primary)]"></span>}
                    </button>

                    {isFilterDropdownOpen && (
                        <div className="cv-design-card absolute right-0 z-50 mt-2 w-52 py-2 text-[11px] font-semibold text-[var(--cv-text-body)] shadow-xl backdrop-blur-2xl">
                            <div className="mb-1 border-b border-[var(--cv-border-subtle)] px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--cv-text-muted)]">Filter By Type</div>
                            {[
                                { value: 'all', label: 'All Files' },
                                { value: 'resume', label: 'Resumes' },
                                { value: 'portfolio', label: 'Portfolios' },
                                { value: 'whiteboard', label: 'Whiteboards' },
                                { value: 'interview', label: 'Interviews' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setFilterType(option.value);
                                        savePreference('filterType', option.value);
                                    }}
                                    className={`flex w-full items-center justify-between px-3.5 py-1.5 text-left transition-all hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)] ${filterType === option.value ? 'bg-[var(--cv-action-soft-bg)] font-bold text-[var(--cv-action-primary)]' : ''}`}
                                >
                                    <span>{option.label}</span>
                                    {filterType === option.value && <Check size={12} className="shrink-0 text-[var(--cv-action-primary)]" />}
                                </button>
                            ))}

                            <div className="my-1 h-px bg-[var(--cv-border-subtle)]"></div>
                            <div className="mb-1 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--cv-text-muted)]">Sort By</div>
                            {[
                                { value: 'createdAt', label: 'Sequence of Events' },
                                { value: 'updatedAt', label: 'Recently Modified' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSortBy(option.value as 'createdAt' | 'updatedAt');
                                        savePreference('sortBy', option.value);
                                    }}
                                    className={`flex w-full items-center justify-between px-3.5 py-1.5 text-left transition-all hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)] ${sortBy === option.value ? 'bg-[var(--cv-action-soft-bg)] font-bold text-[var(--cv-action-primary)]' : ''}`}
                                >
                                    <span>{option.label}</span>
                                    {sortBy === option.value && <Check size={12} className="shrink-0 text-[var(--cv-action-primary)]" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                <div
                    ref={listRef}
                    className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]"
                >
                    {activeDocuments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--cv-border-subtle)] px-4 py-6 text-center">
                            <span className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--cv-text-muted)]">No Files Found</span>
                            <span className="text-[9px] font-medium leading-normal text-[var(--cv-text-muted)]">
                                {filterType === 'all' ? 'Try creating a new document!' : `No items match the "${filterType}" filter.`}
                            </span>
                        </div>
                    ) : (
                        activeDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => {
                                    setActiveNode(doc.id.toString());
                                    navigate(getPathForNodeId(doc.id, doc.data?.type));
                                    onDocumentOpen?.();
                                }}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: doc.id, text: doc.text, type: doc.data?.type || 'file' });
                                }}
                                className={`group/doc flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-all ${activeNodeId === doc.id.toString() ? 'border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] font-bold text-[var(--cv-action-primary)] shadow-sm' : 'border-transparent font-semibold text-[var(--cv-text-body)] hover:border-[var(--cv-border-subtle)] hover:bg-[var(--cv-surface-warm-card-strong)] hover:text-[var(--cv-text-heading)]'}`}
                            >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--cv-surface-warm-muted)]">{getDocIcon(doc.data?.type || '')}</div>

                                {editingNodeId === doc.id ? (
                                    <input
                                        value={editValue}
                                        onChange={(event) => setEditValue(event.target.value)}
                                        onBlur={() => saveRename(doc.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') saveRename(doc.id);
                                            if (event.key === 'Escape') setEditingNodeId(null);
                                        }}
                                        className="flex-1 rounded border border-[var(--cv-action-border)] bg-[var(--cv-surface-warm-card-strong)] px-1.5 py-0.5 text-xs font-semibold text-[var(--cv-text-heading)] outline-none"
                                        onClick={(event) => event.stopPropagation()}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="flex-1 truncate">{doc.text}</span>
                                )}

                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        const rect = event.currentTarget.getBoundingClientRect();
                                        setContextMenu({ x: rect.left, y: rect.bottom, nodeId: doc.id, text: doc.text, type: doc.data?.type || 'file' });
                                    }}
                                    className="rounded p-0.5 text-[var(--cv-text-muted)] opacity-0 transition-opacity hover:bg-[var(--cv-surface-warm-muted)] group-hover/doc:opacity-100"
                                >
                                    <MoreVertical size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {scrollState.canScroll && !scrollState.atBottom && (
                    <div className="shrink-0 border-t border-[var(--cv-border-subtle)] px-1.5 pt-1.5">
                        <button
                            type="button"
                            onClick={scrollToMoreFiles}
                            aria-label="Show more files"
                            className="flex min-h-[32px] w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface-warm-card-strong)] px-3 py-1.5 text-[11px] font-extrabold text-[var(--cv-text-body)] shadow-[0_1px_2px_rgba(55,38,18,0.05)] transition hover:border-[var(--cv-action-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]"
                        >
                            <ChevronDown size={13} className="shrink-0" />
                            <span className="min-w-0 truncate">{moreFilesLabel} below</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarDocumentList;
