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
import '../Landing/live/liveLanding.css';

/** Titles read like files on a desk, so the window bar shows one. */
const toFilename = (title: string, extension: string): string => {
    const slug = (title || 'untitled').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug || 'untitled'}.${extension}`;
};

/** Icon buttons: one muted colour, hover is opacity. */
const ICON_BUTTON = 'rounded-lg p-2 transition hover:opacity-65';

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
            className="cvl-win cvl-win-lift group relative flex cursor-grab select-none flex-col active:cursor-grabbing"
        >
            <div className="cvl-bar">
                <span className="cvl-dot cvl-dot-r" />
                <span className="cvl-dot cvl-dot-y" />
                <span className="cvl-dot cvl-dot-g" />
                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>{toFilename(resume.title, 'pdf')}</span>
            </div>
            <div onClick={!isEditingTitle ? navigateToEdit : undefined} className="block flex-grow cursor-pointer border-b p-4" style={{ borderColor: 'var(--cvl-line)' }}>
                <div ref={previewContainerRef} className="relative mb-4 w-full select-none overflow-hidden rounded-lg border aspect-[210/297]" style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}>
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
                        className="w-full select-text truncate rounded-md border px-2 py-0.5 text-[16px] font-semibold"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-ink)' }}
                    />
                ) : (
                    <h3 onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="truncate text-[16px] font-semibold tracking-tight" title="Double-click to rename">{resume.title}</h3>
                )}
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--cvl-muted)' }}>Updated <time dateTime={new Date(resume.updatedAt).toISOString()} title={formatAbsoluteTime(resume.updatedAt)}>{formatRelativeTime(resume.updatedAt)}</time></p>
            </div>
            <div className="flex items-center justify-between p-2.5" style={{ background: 'var(--cvl-paper-2)' }}>
                <div className="flex gap-1.5" style={{ color: 'var(--cvl-muted)' }}>
                    <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} title="Rename Resume" className={`block ${ICON_BUTTON}`}><Edit3 size={16} /></button>
                    <button onClick={() => onDuplicate(resume.id)} title="Duplicate Resume" className={ICON_BUTTON}><Copy size={16} /></button>
                    <button onClick={handleDelete} title="Delete Resume" className={ICON_BUTTON} style={{ color: 'var(--cvl-amber)' }}><Trash2 size={16} /></button>
                </div>
                <button onClick={() => onShare(resume)} title="Share Resume" className={ICON_BUTTON} style={{ color: 'var(--cvl-purple)' }}><Share2 size={16} /></button>
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
