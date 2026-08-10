import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Edit3, Copy, Trash2, Share2 } from 'lucide-react';
import { ResumeData } from '../../types';
import ResumePreview from '../ResumePreview';
import { navigate } from '../../utils/navigation';
import { useWorkspaceItemActions } from '../../hooks/useWorkspaceItemActions';
import { SidebarContextMenu } from '../Navigation/SidebarContextMenu';
import { createPortal } from 'react-dom';
import ConfirmationModal from '../ConfirmationModal';
import { formatRelativeTime, formatAbsoluteTime } from '../../utils/relativeTime';

interface ResumeCardProps {
    resume: ResumeData;
    onUpdate: (id: string, data: Partial<ResumeData>) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onShare: (resume: ResumeData) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ResumeCard: React.FC<ResumeCardProps> = ({ resume, onUpdate, onDuplicate, onDelete, onShare, onDragStart }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(resume.title);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.2);

    useEffect(() => {
        setTitle(resume.title);
    }, [resume.title]);

    useLayoutEffect(() => {
        const calculateScale = () => {
            if (previewContainerRef.current) {
                const parentWidth = previewContainerRef.current.offsetWidth;
                const originalWidth = 824; // Base width of the ResumePreview component for styling
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
    }, []);

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
    } = useWorkspaceItemActions(`resume-${resume.id}`, resume.title);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const navigateToEdit = () => {
        navigate(`/edit/${resume.id}`);
    };

    const handleTitleSave = () => {
        if (title.trim() === '') {
            setTitle(resume.title); // reset if empty
        } else {
            onUpdate(resume.id, { title });
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
            className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 shadow-sm hover:shadow-md hover:shadow-indigo-500/[0.03] flex flex-col cursor-grab active:cursor-grabbing overflow-hidden group relative select-none"
        >
            <div onClick={!isEditingTitle ? navigateToEdit : undefined} className="block p-4 border-b border-slate-200/50 dark:border-slate-800/50 group-hover:bg-gray-50/50 dark:group-hover:bg-[#1a2029] transition-colors flex-grow cursor-pointer">
                <div ref={previewContainerRef} className="w-full aspect-[210/297] bg-white dark:bg-gray-800 rounded-xl mb-4 overflow-hidden relative shadow-inner ring-1 ring-slate-200/70 dark:ring-slate-700/60 select-none">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none select-none"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '824px',
                            height: '1165px', // 824 * (297/210)
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        <ResumePreview
                            resume={resume}
                            template={resume.templateId}
                            previewId={`dashboard-resume-preview-${resume.id}`}
                            className="shadow-none select-none"
                        />
                    </div>
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
                                setTitle(resume.title);
                                setIsEditingTitle(false);
                            }
                        }}
                        autoFocus
                        className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate w-full border rounded-md px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:outline-none select-text"
                    />
                ) : (
                    <h3 onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate" title="Double-click to rename">{resume.title}</h3>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">Updated <time dateTime={new Date(resume.updatedAt).toISOString()} title={formatAbsoluteTime(resume.updatedAt)}>{formatRelativeTime(resume.updatedAt)}</time></p>
            </div>
            <div className="p-2.5 flex justify-between items-center bg-gray-50/50 dark:bg-[#10141a]">
                <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} title="Rename Resume" className="p-2 block rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"><Edit3 size={16} /></button>
                    <button onClick={() => onDuplicate(resume.id)} title="Duplicate Resume" className="p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"><Copy size={16} /></button>
                    <button onClick={handleDelete} title="Delete Resume" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                </div>
                <button onClick={() => onShare(resume)} title="Share Resume" className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Share2 size={16} /></button>
            </div>

            {/* Context Menu */}
            {contextMenu && createPortal(
                <SidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    nodeTitle={resume.title}
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
                title="Delete Resume"
                message={`Are you sure you want to delete "${resume.title}"? This will remove it from your workspace and any folders.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={() => {
                    confirmDelete();
                    onDelete(resume.id);
                }}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};

export default ResumeCard;
