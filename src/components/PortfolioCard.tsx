import React, { useState, useRef, useLayoutEffect } from 'react';
import { Edit3, Copy, Trash2, Share2 } from 'lucide-react';
import { PortfolioData } from '../features/portfolio/types/portfolio';
import { navigate } from '../utils/navigation';
import { TEMPLATES } from '../features/portfolio/templates';
import LinkTreeVisual from '../features/portfolio/templates/linkinbio/LinkTreeVisual';
import { getTheme } from '../features/portfolio/styles/themes';
import { useWorkspaceItemActions } from '../hooks/useWorkspaceItemActions';
import { SidebarContextMenu } from './Navigation/SidebarContextMenu';
import { createPortal } from 'react-dom';
import ConfirmationModal from './ConfirmationModal';
import { formatRelativeTime, formatAbsoluteTime } from '../utils/relativeTime';

interface PortfolioCardProps {
    portfolio: PortfolioData;
    onUpdate: (id: string, data: Partial<PortfolioData>) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onShare: (portfolio: PortfolioData) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({
    portfolio,
    onUpdate,
    onDuplicate,
    onDelete,
    onShare,
    onDragStart
}) => {
    const {
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isMoveModalOpen,
        setIsMoveModalOpen,
        isEditing,
        setIsEditing,
        handleRename,
        handleDelete,
        confirmDelete,
        onMove,
        confirmMove,
        nodes
    } = useWorkspaceItemActions(`portfolio-${portfolio.id}`, portfolio.title);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(portfolio.title);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.15);

    // Determine if this is a bio-link portfolio
    const isBioLink = portfolio.mode === 'linkinbio';
    // For bio-links, use 9:16 portrait aspect ratio; for regular portfolios use 16:9 landscape
    const aspectClass = isBioLink ? 'aspect-[9/16]' : 'aspect-video';
    const originalWidth = isBioLink ? 430 : 1200;
    const originalHeight = isBioLink ? 932 : 675;

    useLayoutEffect(() => {
        const calculateScale = () => {
            if (previewContainerRef.current) {
                const parentWidth = previewContainerRef.current.offsetWidth;
                if (parentWidth > 0) {
                    setScale(parentWidth / originalWidth);
                }
            }
        };

        calculateScale();
        const resizeObserver = new ResizeObserver(calculateScale);
        if (previewContainerRef.current) {
            resizeObserver.observe(previewContainerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [originalWidth]);

    const navigateToEdit = () => {
        navigate(`/portfolio/edit/${portfolio.id}`);
    };

    const handleTitleSave = () => {
        if (title.trim() === '') {
            setTitle(portfolio.title);
        } else {
            onUpdate(portfolio.id, { title });
        }
        setIsEditingTitle(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const CurrentTemplate = TEMPLATES[portfolio.templateId as keyof typeof TEMPLATES] || TEMPLATES.minimalist;

    // Get theme for bio-link preview
    const bioLinkTheme = isBioLink && portfolio.linkInBio?.themeId ? getTheme(portfolio.linkInBio.themeId) : undefined;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onContextMenu={handleContextMenu}
            className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-[24px] border border-white/50 dark:border-gray-800/50 transition-all duration-300 hover:border-primary-500/30 dark:hover:border-primary-400/30 hover:shadow-lg flex flex-col cursor-grab active:cursor-grabbing overflow-hidden group relative"
        >
            <div
                onClick={!isEditingTitle ? navigateToEdit : undefined}
                className="block p-4 border-b border-gray-100 dark:border-gray-800/60 group-hover:bg-gray-50/50 dark:group-hover:bg-[#1a2029] transition-colors flex-grow cursor-pointer"
            >
                {/* Portfolio Preview - aspect ratio depends on mode */}
                <div
                    ref={previewContainerRef}
                    className={`w-full ${aspectClass} bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden relative`}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${originalWidth}px`,
                            height: `${originalHeight}px`,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        {isBioLink && portfolio.linkInBio && bioLinkTheme ? (
                            <LinkTreeVisual data={portfolio} />
                        ) : (
                            <CurrentTemplate data={portfolio} />
                        )}
                    </div>
                </div>

                {/* Title */}
                {isEditingTitle ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTitleSave();
                            if (e.key === 'Escape') {
                                setTitle(portfolio.title);
                                setIsEditingTitle(false);
                            }
                        }}
                        autoFocus
                        className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate w-full border rounded-md px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                ) : (
                    <h3
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditingTitle(true);
                        }}
                        className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate"
                        title="Double-click to rename"
                    >
                        {portfolio.title}
                    </h3>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Updated <time dateTime={new Date(portfolio.updatedAt).toISOString()} title={formatAbsoluteTime(portfolio.updatedAt)}>{formatRelativeTime(portfolio.updatedAt)}</time>
                </p>
            </div>

            {/* Action Buttons */}
            <div className="p-2.5 flex justify-between items-center bg-gray-50/50 dark:bg-[#10141a]">
                <div className="flex gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                        title="Rename Portfolio"
                        className="p-2 block rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={() => onDuplicate(portfolio.id)}
                        title="Duplicate Portfolio"
                        className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={handleDelete}
                        title="Delete Portfolio"
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <button
                    onClick={() => onShare(portfolio)}
                    title="Share Portfolio"
                    className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                    <Share2 size={16} />
                </button>
            </div>

            {/* Context Menu */}
            {contextMenu && createPortal(
                <SidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    nodeTitle={portfolio.title}
                    onClose={() => setContextMenu(null)}
                    onRename={() => {
                        setIsEditingTitle(true);
                        setContextMenu(null);
                    }}
                    onDelete={() => {
                        handleDelete();
                        setContextMenu(null);
                    }}
                />,
                document.body
            )}

            {/* Modals */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Portfolio"
                message={`Are you sure you want to delete "${portfolio.title}"? This will remove it from your workspace and any folders.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={() => {
                    confirmDelete();
                    onDelete(portfolio.id);
                }}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};

export default PortfolioCard;
