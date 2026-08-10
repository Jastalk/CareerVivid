import React, { useState } from 'react';
import { Edit3, Copy, Trash2, PenTool, Share2 } from 'lucide-react';
import { WhiteboardData } from '../../types';
import { navigate } from '../../utils/navigation';
import { useWorkspaceItemActions } from '../../hooks/useWorkspaceItemActions';
import { SidebarContextMenu } from '../Navigation/SidebarContextMenu';
import { createPortal } from 'react-dom';
import ConfirmationModal from '../ConfirmationModal';
import { formatRelativeTime, formatAbsoluteTime } from '../../utils/relativeTime';

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
            className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 shadow-sm hover:shadow-md hover:shadow-indigo-500/[0.03] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden group relative"
        >
            <div onClick={!isEditingTitle ? navigateToEdit : undefined} className="block p-4 border-b border-slate-200/50 dark:border-slate-800/50 group-hover:bg-gray-50/50 dark:group-hover:bg-[#1a2029] transition-colors flex-grow cursor-pointer">
                {/* Thumbnail Preview or Empty Placeholder */}
                <div
                    className="w-full aspect-[16/9] bg-white dark:bg-gray-700/50 rounded-lg mb-4 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-600 overflow-hidden"
                >
                    {hasThumbnail ? (
                        <img
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(whiteboard.thumbnailSvg!)}`}
                            alt="Whiteboard thumbnail"
                            className="w-full h-full object-contain"
                        />
                    ) : hasDrawing ? (
                        <div className="text-gray-400 dark:text-gray-500 text-center">
                            <PenTool size={32} className="mb-1 opacity-50 mx-auto" />
                            <span className="text-xs font-medium">Generating preview...</span>
                        </div>
                    ) : (
                        <div className="text-gray-400 dark:text-gray-500 text-center">
                            <PenTool size={32} className="mb-1 opacity-50 mx-auto" />
                            <span className="text-xs font-medium">Empty Whiteboard</span>
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
                        className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate w-full border rounded-md px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                ) : (
                    <h3 onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate" title="Double-click to rename">{whiteboard.title}</h3>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">Updated <time dateTime={new Date(whiteboard.updatedAt).toISOString()} title={formatAbsoluteTime(whiteboard.updatedAt)}>{formatRelativeTime(whiteboard.updatedAt)}</time></p>
            </div>

            <div className="p-2.5 flex justify-between items-center bg-gray-50/50 dark:bg-[#10141a]">
                <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} title="Rename Whiteboard" className="p-2 block rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"><Edit3 size={16} /></button>
                    <button onClick={() => onDuplicate(whiteboard.id)} title="Duplicate Whiteboard" className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"><Copy size={16} /></button>
                    <button onClick={handleDelete} title="Delete Whiteboard" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                </div>
                {onShare && (
                    <button onClick={() => onShare(whiteboard)} title="Share Whiteboard" className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Share2 size={16} /></button>
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
