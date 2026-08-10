/**
 * Starting a resume, in one place.
 *
 * The three ways to begin — describe the role, upload a file, or pick a career
 * path — used to be a second full-height section stacked under the resume list,
 * with its own logo and its own page-sized headline. The page read as two
 * unrelated screens welded together, and the "New resume" button did nothing but
 * scroll you to the seam. Nothing on screen said the halves were related.
 *
 * As a dialog the relationship is stated by the interaction itself: press the
 * button, get the thing the button names. The list above stays visible behind
 * it, so it is obvious you are adding to it.
 *
 * The order inside is deliberate. Typing or dropping a file is the fast path and
 * gets the top slot; the career paths below are the "I don't know where to
 * start" path, and are secondary in weight.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import type { Industry } from '../../data/careers';
import { CAREER_PATHS } from '../../data/careers';
import ResumeImport from '../ResumeImport';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    prompt: string;
    placeholder: string;
    onPromptChange: (value: string) => void;
    onFileProcessed: (text: string) => void;
    onSubmit: () => void;
    onRoleSelect: (role: string) => void;
    /** Shown when the user arrived here from a job they want to tailor against. */
    tailoringJob?: { title: string; company: string } | null;
    error?: string;
}

export const NewResumeModal: React.FC<Props> = ({
    isOpen,
    onClose,
    prompt,
    placeholder,
    onPromptChange,
    onFileProcessed,
    onSubmit,
    onRoleSelect,
    tailoringJob,
    error,
}) => {
    const [industry, setIndustry] = useState<Industry | null>(null);
    /*
     * Choosing a role starts a write that takes a while and lands a new document
     * in the user's list, so it asks first. The roles are also a two-column grid
     * of near-identical rows, which is exactly the shape a misclick likes.
     */
    const [pendingRole, setPendingRole] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Reopening should not resume someone else's half-finished drill-down.
    useEffect(() => {
        if (isOpen) {
            setIndustry(null);
            setPendingRole(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            // Step back one level before closing, so Escape never discards more
            // than the user can see they are in.
            if (pendingRole) setPendingRole(null);
            else if (industry) setIndustry(null);
            else onClose();
        };
        document.addEventListener('keydown', onKey);
        // The page behind must not scroll while a dialog owns the screen.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, industry, pendingRole, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[#211b16]/40 p-4 backdrop-blur-sm sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-resume-title"
        >
            <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 cursor-default"
                onClick={onClose}
            />

            <div
                ref={panelRef}
                className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--cv-border-subtle)] bg-[var(--cv-surface)] shadow-[var(--cv-shadow-modal)]"
            >
                <header className="flex items-start gap-4 border-b border-[var(--cv-border-subtle)] px-6 py-5">
                    <div className="min-w-0 flex-1">
                        <h2 id="new-resume-title" className="cv-design-title text-xl">
                            {pendingRole || (industry ? industry.name : 'New resume')}
                        </h2>
                        <p className="mt-1 text-sm text-[var(--cv-text-muted)]">
                            {pendingRole
                                ? 'Ready when you are.'
                                : industry
                                ? 'Pick the closest role. You can edit everything afterwards.'
                                : tailoringJob
                                ? `We'll aim it at ${tailoringJob.title} at ${tailoringJob.company}.`
                                : 'Describe the job, paste a job post, or upload a resume you already have.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-surface-muted)] hover:text-[var(--cv-text-heading)]"
                    >
                        <X size={18} />
                    </button>
                </header>

                {pendingRole ? (
                    <div className="px-6 py-5">
                        <p className="text-sm leading-6 text-[var(--cv-text-body-product)]">
                            We&apos;ll write a full <strong className="font-semibold text-[var(--cv-text-heading)]">{pendingRole}</strong> resume
                            {tailoringJob ? <> aimed at <strong className="font-semibold text-[var(--cv-text-heading)]">{tailoringJob.title}</strong> at {tailoringJob.company}</> : null}
                            {' '}— summary, experience bullets, skills and education. It takes a few seconds, and you can edit every line afterwards.
                        </p>

                        {error && (
                            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingRole(null)}
                                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-surface-muted)] hover:text-[var(--cv-text-heading)]"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => onRoleSelect(pendingRole)}
                                className="cv-design-button-primary px-4 py-2.5 text-sm"
                            >
                                <Sparkles size={16} /> Write my resume
                            </button>
                        </div>
                    </div>
                ) : industry ? (
                    <div className="px-6 py-5">
                        <button
                            type="button"
                            onClick={() => setIndustry(null)}
                            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text-heading)]"
                        >
                            <ChevronLeft size={16} /> Back
                        </button>
                        <div className="grid max-h-[46vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                            {industry.roles.map((role) => (
                                <button
                                    key={role.name}
                                    type="button"
                                    onClick={() => setPendingRole(role.name)}
                                    className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--cv-border-subtle)] px-4 py-3 text-left text-sm font-semibold text-[var(--cv-text-heading)] transition-colors hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)]"
                                >
                                    <span className="min-w-0 truncate">{role.name}</span>
                                    <ArrowRight size={16} className="shrink-0 text-[var(--cv-text-muted)] transition-colors group-hover:text-[var(--cv-action-primary)]" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="px-6 py-5">
                        <ResumeImport
                            value={prompt}
                            onChange={onPromptChange}
                            onFileProcessed={onFileProcessed}
                            placeholder={placeholder}
                            className="bg-transparent"
                            variant="modern"
                        >
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={!prompt.trim()}
                                title="Create resume"
                                aria-label="Create resume"
                                className="cv-design-button-primary rounded-lg p-3 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                                <ArrowRight size={20} />
                            </button>
                        </ResumeImport>

                        {error && (
                            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                {error}
                            </p>
                        )}

                        <div className="my-5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-[var(--cv-border-subtle)]" />
                            <span className="text-xs font-semibold text-[var(--cv-text-muted)]">or start from a career path</span>
                            <span className="h-px flex-1 bg-[var(--cv-border-subtle)]" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {CAREER_PATHS.map((path) => (
                                <button
                                    key={path.name}
                                    type="button"
                                    onClick={() => setIndustry(path)}
                                    className="rounded-xl border border-[var(--cv-border-subtle)] px-3 py-3 text-left text-sm font-semibold text-[var(--cv-text-heading)] transition-colors hover:border-[var(--cv-action-soft-border)] hover:bg-[var(--cv-action-soft-bg)] hover:text-[var(--cv-action-primary)]"
                                >
                                    {path.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewResumeModal;
