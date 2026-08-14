import React from 'react';
import { Clock, ExternalLink, Trash2, Sparkles, BarChart } from 'lucide-react';
import { PracticeHistoryEntry } from '../../types';
import { navigate } from '../../utils/navigation';
import { useState } from 'react';
import { useWorkspaceItemActions } from '../../hooks/useWorkspaceItemActions';
import { SidebarContextMenu } from '../Navigation/SidebarContextMenu';
import { createPortal } from 'react-dom';
import ConfirmationModal from '../ConfirmationModal';
import '../Landing/live/liveLanding.css';

/** Rounds read like recordings on a desk, so the window bar shows one. */
const toFilename = (title: string): string => {
    const slug = (title || 'untitled').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${slug || 'untitled'}.wav`;
};

interface InterviewHistoryCardProps {
    entry: PracticeHistoryEntry;
    onShowReport: (entry: PracticeHistoryEntry) => void;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onPracticeAgain?: (entry: PracticeHistoryEntry) => void;
}

const InterviewHistoryCard: React.FC<InterviewHistoryCardProps> = ({ entry, onShowReport, onDelete, onDragStart, onPracticeAgain }) => {
    const draftQuestions = entry.activeInterviewDraft?.questions?.length ? entry.activeInterviewDraft.questions : entry.questions;
    const hasResumableDraft = !!entry.activeInterviewDraft?.transcript?.length &&
        !!draftQuestions?.length &&
        entry.activeInterviewDraft.questionIndex < draftQuestions.length;
    const draftQuestionLabel = hasResumableDraft
        ? `Q${Math.min((entry.activeInterviewDraft?.questionIndex ?? 0) + 1, draftQuestions?.length || 1)}/${draftQuestions?.length || 1}`
        : null;
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
    } = useWorkspaceItemActions(`interview-${entry.id}`, entry.job.title);

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const handlePracticeAgain = () => {
        if (onPracticeAgain) {
            // Already on InterviewStudio — call directly to avoid stale sessionStorage/useEffect issue
            onPracticeAgain(entry);
        } else {
            // Coming from another page — use sessionStorage + navigation
            sessionStorage.setItem('practiceJob', JSON.stringify(entry));
            navigate('/interview-studio');
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
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
                <span className="cvl-mono truncate text-[11px]" style={{ color: 'var(--cvl-faint)' }}>{toFilename(entry.job?.title)}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                    <h3 className="flex items-center gap-1.5 text-[16px] font-semibold leading-snug tracking-tight">
                        <span className="truncate">{entry.job.title}</span>
                        {entry.job.url && (
                            <a 
                                href={entry.job.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex flex-shrink-0 items-center justify-center transition hover:opacity-70"
                                style={{ color: 'var(--cvl-faint)' }}
                            >
                                <ExternalLink size={15} />
                            </a>
                        )}
                    </h3>
                    <p className="truncate text-[12.5px]" style={{ color: 'var(--cvl-muted)' }}>{entry.job.company}</p>
                </div>
                {(entry.interviewHistory?.length > 0 || draftQuestionLabel) && (
                    <div className="flex flex-shrink-0 flex-col items-end gap-1 self-start">
                        {entry.interviewHistory?.length > 0 && (
                            <div className="cvl-mono flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}>
                                {entry.interviewHistory.length} practice{entry.interviewHistory.length > 1 ? 's' : ''}
                            </div>
                        )}
                        {draftQuestionLabel && (
                            <div className="cvl-mono rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}>
                                {draftQuestionLabel}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="mb-4 flex h-5 min-w-0 items-center gap-1.5 text-xs">
                {hasResumableDraft && (
                    <>
                        <span className="cvl-mono shrink-0 rounded-full px-2 py-0.5 font-bold" style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}>
                            saved draft
                        </span>
                        <span style={{ color: 'var(--cvl-faint)' }}>·</span>
                    </>
                )}
                <span className="truncate" style={{ color: 'var(--cvl-muted)' }}>Last activity: {formatDate(entry.timestamp)}</span>
            </div>

            <div className="mt-auto flex justify-between items-center">
                <button
                    onClick={handleDelete}
                    className="rounded-full p-2 transition hover:opacity-65"
                    style={{ color: 'var(--cvl-amber)' }}
                    title="Delete this history entry"
                >
                    <Trash2 size={18} />
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={handlePracticeAgain}
                        aria-label={hasResumableDraft ? 'Resume session' : 'Practice again'}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition hover:opacity-80"
                        style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-ink)' }}
                    >
                        {hasResumableDraft ? <Clock size={16} /> : <Sparkles size={16} />}
                        {hasResumableDraft ? 'Resume' : 'Practice again'}
                    </button>
                    <button
                        onClick={() => onShowReport(entry)}
                        disabled={!entry.interviewHistory || entry.interviewHistory.length === 0}
                        className="cvl-cta flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <BarChart size={16} /> Report
                    </button>
                </div>
            </div>
            </div>

            {/* Context Menu */}
            {contextMenu && createPortal(
                <SidebarContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    nodeTitle={entry.job.title}
                    onClose={() => setContextMenu(null)}
                    onRename={() => {
                        // Rename might not apply to history title easily without database changes,
                        // but we'll leave the option or hide it if necessary.
                        // For now we'll allow it via the hook's text.
                        setIsEditing(true);
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
                title="Delete Interview Entry"
                message={`Are you sure you want to delete the interview history for "${entry.job.title}"? This cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={() => {
                    confirmDelete();
                    onDelete(entry.id);
                }}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};

export default InterviewHistoryCard;
