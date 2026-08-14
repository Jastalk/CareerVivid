import React, { useState } from 'react';
import { Edit3, Copy, Trash2, PenTool, Share2 } from 'lucide-react';
import { WhiteboardData } from '../../types';
import { navigate } from '../../utils/navigation';
import { useWorkspaceItemActions } from '../../hooks/useWorkspaceItemActions';
import { SidebarContextMenu } from '../Navigation/SidebarContextMenu';
import { createPortal } from 'react-dom';
import ConfirmationModal from '../ConfirmationModal';
import { formatRelativeTime, formatAbsoluteTime } from '../../utils/relativeTime';
import '../Landing/live/liveLanding.css';

/** Boards read like files on a desk, so the window bar shows one. */
const toFilename = (title: string): string => {
    const slug = (title || 'untitled').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug || 'untitled'}.excalidraw`;
};

const ICON_BUTTON = 'rounded-lg p-2 transition hover:opacity-65';

interface WhiteboardCardProps {
    whiteboard: WhiteboardData;
    onUpdate: (id: string, data: Partial<WhiteboardData>) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onShare?: (whiteboard: WhiteboardData) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const WhiteboardCard: React.FC<WhiteboardCardProps> = ({ whiteboard, onUpdate, onDuplicate, onDelete, onShare, onDragStart }) => {
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
    } = useWorkspaceItemActions(`whiteboard-${whiteboard.id}`, whiteboard.title);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(whiteboard.title);

    const hasDrawing = whiteboard.excalidrawData?.elements && whiteboard.excalidrawData.elements.length > 0;
    const hasThumbnail = !!whiteboard.thumbnailSvg;

    const navigateToEdit = () => {
        navigate(`/whiteboard/${whiteboard.id}`);
    };

    const handleTitleSave = () => {
        if (title.trim() === '') {
            setTitle(whiteboard.title);
        } else {
            onUpdate(whiteboard.id, { title });
        }
        setIsEditingTitle(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onContextMenu={handleContextMenu}
            className="cvl-win cvl-win-lift group relative flex cursor-grab flex-col active:cursor-grabbing"
        >
            <div className="cvl-bar">
                <span className="cvl-dot cvl-dot-r" />
                <span className="cvl-dot cvl-dot-y" />
                <span className="cvl-dot cvl-dot-g" />
                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>{toFilename(whiteboard.title)}</span>
            </div>
            <div onClick={!isEditingTitle ? navigateToEdit : undefined} className="block flex-grow cursor-pointer border-b p-4" style={{ borderColor: 'var(--cvl-line)' }}>
                {/* Thumbnail Preview or Empty Placeholder */}
                <div
                    className="mb-4 flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border aspect-[16/9]"
                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                >
                    {hasThumbnail ? (
                        <img
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(whiteboard.thumbnailSvg!)}`}
                            alt="Whiteboard thumbnail"
                            className="w-full h-full object-contain"
                        />
                    ) : hasDrawing ? (
                        <div className="text-center" style={{ color: 'var(--cvl-faint)' }}>
                            <PenTool size={30} className="mx-auto mb-1 opacity-60" />
                            <span className="cvl-mono text-[11px]">generating preview…</span>
                        </div>
                    ) : (
                        <div className="text-center" style={{ color: 'var(--cvl-faint)' }}>
                            <PenTool size={30} className="mx-auto mb-1 opacity-60" />
                            <span className="cvl-mono text-[11px]">empty board</span>
                        </div>
                    )}
                </div>

                {isEditingTitle ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTitleSave();
                            if (e.key === 'Escape') {
                                setTitle(whiteboard.title);
                                setIsEditingTitle(false);
                            }
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="w-full truncate rounded-md border px-2 py-0.5 text-[16px] font-semibold"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-ink)' }}
                    />
                ) : (
                    <h3 onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="truncate text-[16px] font-semibold tracking-tight" title="Double-click to rename">{whiteboard.title}</h3>
                )}
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--cvl-muted)' }}>Updated <time dateTime={new Date(whiteboard.updatedAt).toISOString()} title={formatAbsoluteTime(whiteboard.updatedAt)}>{formatRelativeTime(whiteboard.updatedAt)}</time></p>
            </div>

            <div className="flex items-center justify-between p-2.5" style={{ background: 'var(--cvl-paper-2)' }}>
                <div className="flex gap-1.5" style={{ color: 'var(--cvl-muted)' }}>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} title="Rename Whiteboard" className={`block ${ICON_BUTTON}`}><Edit3 size={16} /></button>
                    <button onClick={() => onDuplicate(whiteboard.id)} title="Duplicate Whiteboard" className={ICON_BUTTON}><Copy size={16} /></button>
                    <button onClick={handleDelete} title="Delete Whiteboard" className={ICON_BUTTON} style={{ color: 'var(--cvl-amber)' }}><Trash2 size={16} /></button>
                </div>
                {onShare && (
                    <button onClick={() => onShare(whiteboard)} title="Share Whiteboard" className={ICON_BUTTON} style={{ color: 'var(--cvl-purple)' }}><Share2 size={16} /></button>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && createPortal(
                <SidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    nodeTitle={whiteboard.title}
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
                title="Delete Whiteboard"
                message={`Are you sure you want to delete "${whiteboard.title}"? This will remove it from your workspace and any folders.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={() => {
                    confirmDelete();
                    onDelete(whiteboard.id);
                }}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};

export default WhiteboardCard;
