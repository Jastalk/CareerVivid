import React, { useRef, useState, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { ResumeData, DEFAULT_FORMATTING_SETTINGS, type FormattingSettings } from '../../../types';
import ResumePreview from '../../../components/ResumePreview';
import AdvancedAnnotationCanvas from '../../../components/AdvancedAnnotationCanvas';
import { AnnotationObject } from '../../../services/annotationService';
import { Minus, Plus, Eye, Sparkles, Sliders, ArrowUpToLine, Undo2 } from 'lucide-react';
import { isAtTightestLayout, tightenLayout, trailingOverflowRatio } from '../../../utils/fitToPages';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIReview } from '../../../contexts/AIReviewContext';
import { calculateResumeScore } from '../../../utils/resumeScoreUtils';
import { addSelectedSkillSuggestionsToResume } from '../../../utils/aiReviewDataGuards';

import {
    A4_HEIGHT_PX,
    countPages,
    measurePaintedContentBottom,
    A4_WIDTH_PX,
    PAGE_SAFE_PADDING_PX,
    PAGINATION_SPACER_CLASS,
    applyPaginationSpacing,
    collectSpacerPlacements,
    applySpacerPlacements
} from '../../../utils/paginationUtils';

const PAGE_GAP_PX = 40;
const EDGE_CONTROL_WIDTH_PX = 84;
const EDGE_CONTROL_GAP_PX = 12;
const EDGE_CONTROL_LEFT_OFFSET_PX = EDGE_CONTROL_WIDTH_PX + EDGE_CONTROL_GAP_PX;
const TOP_CONTROL_DOCK_HEIGHT_PX = 58;
const PREVIEW_VERTICAL_PADDING_PX = 18;
const PREVIEW_LEFT_PADDING_PX = 18;
const PREVIEW_RIGHT_PADDING_PX = 18;
const PREVIEW_RIGHT_RAIL_PX = EDGE_CONTROL_LEFT_OFFSET_PX;
const EDGE_CONTROL_COLLAPSE_THRESHOLD_PX = 6;
const MAX_AUTO_FIT_ZOOM = 0.9;
const MIN_ZOOM = 0.55;
const MOBILE_MIN_ZOOM = 0.32;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;

interface EditorPreviewProps {
    resume: ResumeData;
    viewMode: 'edit' | 'preview';
    scale: number;
    currentUserUid: string;
    showAnnotationOverlay: boolean;
    annotationUrl: string | null;
    annotationObjects: AnnotationObject[];
    isPreviewBlurred: boolean;
    onResumeChange: (updates: Partial<ResumeData>) => void;
    onFocusField: (fieldId: string) => void;
    onDoubleClick: () => void;
    isAnyDropdownOpen?: boolean;
    isRightPanelOpen?: boolean;
    setIsRightPanelOpen?: (open: boolean) => void;
    /**
     * Fired when the user switches between suggested edits and PDF preview, so
     * the page can put the side panels where that view needs them. The preview
     * reports the intent; Editor.tsx decides the layout.
     */
    onReviewModeChange?: (isReviewMode: boolean) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * How little ink a trailing page can hold before we offer to reclaim it.
 *
 * Under a fifth of a page is a line or two of spillover — almost always an
 * accident of spacing rather than a page the user meant to write. Above it the
 * page is real content, and offering to squeeze it away would be offering to
 * mangle their resume.
 */
const RECLAIMABLE_TRAILING_RATIO = 0.2;

const EditorPreview: React.FC<EditorPreviewProps> = ({
    resume, viewMode, scale, currentUserUid,
    showAnnotationOverlay, annotationUrl, annotationObjects, isPreviewBlurred,
    onResumeChange, onFocusField, onDoubleClick, isAnyDropdownOpen = false,
    isRightPanelOpen = false, setIsRightPanelOpen, onReviewModeChange
}) => {
    const editorPreviewContainerRef = useRef<HTMLDivElement>(null);
    const edgeControlsRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const blurOverlayRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState<number>(0);
    const [fitScale, setFitScale] = useState(scale);
    const [zoomOffset, setZoomOffset] = useState(0);
    const [isCompactPreview, setIsCompactPreview] = useState(false);

    // AI Review Context safely
    let review: any = null;
    try {
        review = useAIReview();
    } catch (e) {}

    // Calculate score dynamically in preview
    const scoreData = useMemo(() => calculateResumeScore(resume), [resume]);
    const score = scoreData.overallScore;

    const scoreClass = useMemo(() => {
        if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50';
        if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/50';
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/50';
    }, [score]);

    // Copy and augment resume to natively support suggested additions rendering inside templates
    const augmentedResume = useMemo(() => {
        if (!review?.isReviewMode || !resume) return resume;
        return addSelectedSkillSuggestionsToResume(resume, review.suggestions, review.selectedSuggestionIds);
    }, [resume, review?.isReviewMode, review?.selectedSuggestionIds, review?.suggestions]);

    // Detect overflow
    const hasOverflow = useMemo(() => contentHeight > A4_HEIGHT_PX, [contentHeight]);
    const pageCount = useMemo(() => countPages(contentHeight), [contentHeight]);
    /*
     * Offered only when the last page is nearly empty AND there is still
     * spacing to give back. Showing a button that cannot work is worse than
     * showing none.
     */
    const trailingRatio = useMemo(
        () => trailingOverflowRatio(contentHeight, A4_HEIGHT_PX),
        [contentHeight],
    );
    const canReclaimLastPage = useMemo(
        () => pageCount > 1
            && trailingRatio > 0
            && trailingRatio <= RECLAIMABLE_TRAILING_RATIO
            && !isAtTightestLayout(resume.formattingSettings),
        [pageCount, trailingRatio, resume.formattingSettings],
    );
    const [fitUndo, setFitUndo] = useState<FormattingSettings | null>(null);

    const handleFitToFewerPages = useCallback(() => {
        const before = { ...DEFAULT_FORMATTING_SETTINGS, ...(resume.formattingSettings ?? {}) };
        const { settings } = tightenLayout(before, trailingRatio);
        setFitUndo(before);
        onResumeChange({ formattingSettings: settings });
    }, [onResumeChange, resume.formattingSettings, trailingRatio]);

    const handleUndoFit = useCallback(() => {
        if (!fitUndo) return;
        onResumeChange({ formattingSettings: fitUndo });
        setFitUndo(null);
    }, [fitUndo, onResumeChange]);
    const minZoom = isCompactPreview ? MOBILE_MIN_ZOOM : MIN_ZOOM;
    const effectiveScale = useMemo(() => clamp(fitScale + zoomOffset, minZoom, MAX_ZOOM), [fitScale, minZoom, zoomOffset]);
    const pageStackHeight = useMemo(
        () => (pageCount * A4_HEIGHT_PX) + (Math.max(0, pageCount - 1) * PAGE_GAP_PX),
        [pageCount]
    );
    const scaledPageWidth = A4_WIDTH_PX * effectiveScale;
    const scaledStackHeight = pageStackHeight * effectiveScale;
    const useControlRail = !isCompactPreview && !isRightPanelOpen;
    /*
     * Anything that is not the side rail docks above the page.
     *
     * The compact layout used to float a `sticky bottom-3` pill instead, which
     * never pinned: the pages are absolutely positioned, so the pill's static
     * position is the TOP of the frame, and `bottom` has nothing to push it
     * away from. It therefore parked over the top of the resume — the same
     * complaint as the wide layout, reached by a different route. One dock rule
     * covers both, and a control that is always above the page can never be
     * over it.
     */
    const useTopControlDock = !useControlRail;
    const previewFrameWidth = scaledPageWidth + (useControlRail ? PREVIEW_RIGHT_RAIL_PX : 0);
    const previewFrameHeight = scaledStackHeight + (useTopControlDock ? TOP_CONTROL_DOCK_HEIGHT_PX : 0);
    const pageTopOffset = useTopControlDock ? TOP_CONTROL_DOCK_HEIGHT_PX : 0;
    const zoomPercent = Math.round(effectiveScale * 100);
    const isFitZoom = Math.abs(zoomOffset) < 0.005;
    const isActualSize = Math.abs(effectiveScale - 1) < 0.005;

    const setZoomScale = (nextScale: number) => {
        setZoomOffset(clamp(nextScale - fitScale, minZoom - fitScale, MAX_ZOOM - fitScale));
    };

    const adjustZoom = (direction: -1 | 1) => {
        setZoomScale(effectiveScale + (direction * ZOOM_STEP));
    };

    /**
     * ⌘/Ctrl with +, - and 0, the way every other document does it.
     *
     * People reach for these without being told, and when the app does not
     * answer the browser does — zooming the entire editor chrome instead of the
     * page, which is never what was wanted. Answering the shortcut and calling
     * `preventDefault` keeps the zoom on the document.
     *
     * Typing is left alone: inside a field, `-` and `0` are characters.
     */
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.altKey) return;

            // `event.target` is only an Element for real key presses; guard the
            // lookup so a synthetic event dispatched on window cannot throw here.
            const target = event.target;
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;

            if (event.key === '=' || event.key === '+') {
                event.preventDefault();
                adjustZoom(1);
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                adjustZoom(-1);
            } else if (event.key === '0') {
                event.preventDefault();
                setZoomOffset(0);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    useLayoutEffect(() => {
        const calculateFitScale = () => {
            const container = editorPreviewContainerRef.current;
            if (!container) return;

            const compactPreview = container.clientWidth < 640;
            const rightRailWidth = !compactPreview && !isRightPanelOpen ? PREVIEW_RIGHT_RAIL_PX : 0;
            const availableWidth = container.clientWidth - rightRailWidth - PREVIEW_LEFT_PADDING_PX - PREVIEW_RIGHT_PADDING_PX;
            const nextFitScale = clamp(availableWidth / A4_WIDTH_PX, compactPreview ? MOBILE_MIN_ZOOM : MIN_ZOOM, MAX_AUTO_FIT_ZOOM);
            setIsCompactPreview(compactPreview);
            setFitScale(nextFitScale);
        };

        calculateFitScale();
        const resizeObserver = new ResizeObserver(calculateFitScale);
        if (editorPreviewContainerRef.current) {
            resizeObserver.observe(editorPreviewContainerRef.current);
        }
        window.addEventListener('resize', calculateFitScale);
        const timeout = setTimeout(calculateFitScale, 300);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', calculateFitScale);
            clearTimeout(timeout);
        };
    }, [isRightPanelOpen, viewMode]);

    useLayoutEffect(() => {
        setZoomOffset(0);
    }, [isRightPanelOpen]);

    useLayoutEffect(() => {
        if (!isRightPanelOpen || !setIsRightPanelOpen || zoomOffset <= 0.005) return;

        const frame = requestAnimationFrame(() => {
            const container = editorPreviewContainerRef.current;
            const controls = edgeControlsRef.current;
            if (!container || !controls) return;

            const containerRect = container.getBoundingClientRect();
            const controlsRect = controls.getBoundingClientRect();
            const isTouchingScrollEdge = controlsRect.right >= containerRect.right - EDGE_CONTROL_COLLAPSE_THRESHOLD_PX;

            if (isTouchingScrollEdge) {
                setIsRightPanelOpen(false);
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [effectiveScale, isRightPanelOpen, setIsRightPanelOpen, viewMode, zoomOffset]);

    useLayoutEffect(() => {
        const frame = requestAnimationFrame(() => {
            const roots = Array.from(
                editorPreviewContainerRef.current?.querySelectorAll<HTMLElement>('[data-resume-preview-root="true"]') || []
            );

            const measurementRoot = previewRef.current;
            if (measurementRoot) {
                applyPaginationSpacing(measurementRoot);
                const placements = collectSpacerPlacements(measurementRoot);
                roots
                    .filter((root) => root !== measurementRoot)
                    .forEach((root) => applySpacerPlacements(root, placements));
            }

            if (previewRef.current) {
                /*
                 * Painted ink, not box height.
                 *
                 * `scrollHeight` includes trailing padding and collapsed
                 * margins, so a resume ending exactly at the page boundary
                 * reported a few pixels more and `Math.ceil` turned them into a
                 * whole blank second page — a page with nothing on it to
                 * delete, which is why "remove this page" was never the right
                 * fix.
                 */
                setContentHeight(measurePaintedContentBottom(previewRef.current));
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [resume, contentHeight]);

    // Force recalculation when fonts are loaded to prevent layout shifts
    useEffect(() => {
        if (typeof document !== 'undefined' && document.fonts) {
            document.fonts.ready.then(() => {
                if (previewRef.current) {
                    setContentHeight(previewRef.current.scrollHeight);
                }
            });
        }
    }, []);

    // Track content height changes for page break guides
    useEffect(() => {
        const element = previewRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use scrollHeight to get total content height including overflow
                setContentHeight(entry.target.scrollHeight);
            }
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [resume]); // Re-attach if resume changes drastically, though Ref should be stable

    return (
        <div
            ref={editorPreviewContainerRef}
            className={`
                flex-1 h-full relative bg-[#f6f2ec] [background-image:radial-gradient(rgba(102,88,66,0.14)_1px,transparent_1px)] [background-size:18px_18px] dark:bg-gray-950 dark:[background-image:radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)]
                ${viewMode === 'preview' ? 'block' : 'hidden md:block'}
                overflow-auto custom-scrollbar flex flex-col overscroll-contain
            `}
        >
            {/* Sticky Preview Header Tabs */}
            <div className="sticky top-0 z-20 flex shrink-0 select-none flex-wrap items-center justify-between gap-2 border-b border-[#e5dccf] bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:px-6 sm:py-2.5">
                <div className="flex min-w-0 flex-1 gap-1 rounded-full border border-[#e4dbcf] bg-[#fbf8f3] p-1 dark:border-gray-800 dark:bg-gray-950 sm:flex-none">
                    <button
                        data-tour="suggested-edits"
                        onClick={() => { review?.setIsReviewMode(true); onReviewModeChange?.(true); }}
                        className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all duration-200 sm:flex-none sm:px-4 ${review?.isReviewMode ? 'bg-[#22143f] text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-gray-850 dark:hover:text-gray-300'}`}
                    >
                        <Sparkles size={12} className={review?.isReviewMode ? 'animate-pulse' : ''} />
                        <span className="truncate sm:hidden">Edits</span>
                        <span className="hidden sm:inline">Suggested Edits</span>
                    </button>
                    <button
                        onClick={() => { review?.setIsReviewMode(false); onReviewModeChange?.(false); }}
                        className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all duration-200 sm:flex-none sm:px-4 ${!review?.isReviewMode ? 'bg-[#22143f] text-white shadow-md' : 'text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-gray-850 dark:hover:text-gray-300'}`}
                    >
                        <Eye size={12} />
                        <span className="truncate sm:hidden">Preview</span>
                        <span className="hidden sm:inline">PDF Preview</span>
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        data-tour="score-pill"
                        onClick={() => setIsRightPanelOpen?.(true)}
                        disabled={!setIsRightPanelOpen}
                        title="See what makes up your score"
                        className={`rounded-full border bg-white px-2.5 py-1 text-xs font-bold transition-all hover:shadow-sm enabled:hover:scale-[1.03] disabled:cursor-default sm:px-3 ${scoreClass}`}
                    >
                        <span className="sm:hidden">Score {score}</span>
                        <span className="hidden sm:inline">Resume Score {score}</span>
                    </button>
                    {setIsRightPanelOpen && (
                        <button
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                            className={`p-1.5 rounded-lg text-gray-400 hover:bg-gray-250 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-all ${isRightPanelOpen ? 'bg-gray-150 dark:bg-gray-700/50 text-indigo-600' : ''}`}
                            title={isRightPanelOpen ? "Collapse Right Panel" : "Expand Score & Match"}
                        >
                            <Sliders size={14} className={isRightPanelOpen ? 'scale-105' : ''} />
                        </button>
                    )}
                </div>
            </div>



            <div
                className="absolute left-[-9999px] top-0 w-[210mm] opacity-0 pointer-events-none"
                aria-hidden="true"
            >
                <ResumePreview
                    resume={augmentedResume}
                    template={resume.templateId}
                    previewId={`resume-preview-${resume.id || 'default'}-measure`}
                    previewRef={previewRef}
                    onUpdate={onResumeChange}
                    onFocus={onFocusField}
                />
            </div>

            <div
                className="min-h-full w-full flex justify-center items-start relative flex-grow"
                style={{
                    paddingTop: PREVIEW_VERTICAL_PADDING_PX,
                    paddingBottom: PREVIEW_VERTICAL_PADDING_PX,
                    paddingLeft: PREVIEW_LEFT_PADDING_PX,
                    paddingRight: PREVIEW_RIGHT_PADDING_PX
                }}
            >
                <div
                    className="relative transition-[width,height] duration-300"
                    style={{
                        width: previewFrameWidth,
                        minWidth: previewFrameWidth,
                        height: previewFrameHeight
                    }}
                    onDoubleClick={onDoubleClick}
                    title="Double-click to enter full-screen preview"
                >
                    <div
                        className="absolute left-0 top-0 origin-top-left transition-transform duration-300"
                        data-resume-export-root="true"
                        data-resume-id={resume.id || 'default'}
                        style={{
                            width: A4_WIDTH_PX,
                            height: pageStackHeight,
                            transform: `translateY(${pageTopOffset}px) scale(${effectiveScale})`
                        }}
                    >
                        {/* data-tour goes on page one only: every page teaches the same
                            thing, and a second anchor would make the tour spotlight pick
                            between them arbitrarily. */}
                        {Array.from({ length: pageCount }, (_, pageIndex) => (
                            <div key={`page-${pageIndex}`} className="relative mb-10 last:mb-0">
                                <div
                                    className="relative overflow-hidden rounded-sm bg-white shadow-2xl ring-1 ring-slate-200"
                                    style={{ height: `${A4_HEIGHT_PX}px`, width: `${A4_WIDTH_PX}px` }}
                                    data-resume-page={pageIndex + 1}
                                    data-tour={pageIndex === 0 ? 'resume-canvas' : undefined}
                                    aria-hidden={pageIndex > 0 ? true : undefined}
                                >
                                    <div
                                        className="absolute left-0 top-0 w-full"
                                        style={{ transform: `translateY(-${pageIndex * A4_HEIGHT_PX}px)` }}
                                    >
                                        <ResumePreview
                                            resume={augmentedResume}
                                            template={resume.templateId}
                                            previewId={`resume-preview-${resume.id || 'default'}-page-${pageIndex + 1}`}
                                            className="shadow-none"
                                            onUpdate={onResumeChange}
                                            onFocus={onFocusField}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/*
                      * Docked above the page, the controls lie down.
                      *
                      * They kept the rail's vertical stack when they moved to the
                      * dock, which made them 74px tall inside a 58px dock — so the
                      * bottom 24px sat on the page, centred right where a resume
                      * puts the candidate's name. Laid out in a row they are ~36px
                      * and clear the page entirely, and a horizontal strip above
                      * the document reads as a toolbar rather than something
                      * dropped on top of it.
                      */}
                    <div
                        ref={edgeControlsRef}
                        className={`absolute z-20 flex gap-2 ${
                            useTopControlDock
                                ? 'w-max -translate-x-1/2 flex-row items-center'
                                : 'w-[84px] flex-col'
                        }`}
                        style={{
                            left: useControlRail
                                ? scaledPageWidth + EDGE_CONTROL_GAP_PX
                                : scaledPageWidth / 2,
                            top: 10
                        }}
                    >
                        <div className="flex overflow-hidden rounded-lg bg-[#2b164f] text-white shadow-xl ring-1 ring-black/10">
                            <button
                                type="button"
                                onClick={() => adjustZoom(-1)}
                                className={`flex h-9 items-center justify-center border-r border-white/10 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${useTopControlDock ? 'w-9' : 'flex-1'}`}
                                disabled={effectiveScale <= minZoom}
                                aria-label="Zoom out"
                                title="Zoom out (⌘−)"
                            >
                                <Minus size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => adjustZoom(1)}
                                className={`flex h-9 items-center justify-center transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${useTopControlDock ? 'w-9' : 'flex-1'}`}
                                disabled={effectiveScale >= MAX_ZOOM}
                                aria-label="Zoom in"
                                title="Zoom in (⌘+)"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className={`grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 shadow-md ${useTopControlDock ? 'h-9' : ''}`}>
                            <button
                                type="button"
                                onClick={() => setZoomOffset(0)}
                                className={`border-r border-slate-200 px-2 transition-colors hover:bg-slate-50 ${useTopControlDock ? 'h-full' : 'h-7'} ${isFitZoom ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                aria-label="Fit resume to preview"
                                title="Fit to preview (⌘0)"
                            >
                                Fit
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoomScale(1)}
                                className={`px-2 tabular-nums transition-colors hover:bg-slate-50 ${useTopControlDock ? 'h-full' : 'h-7'} ${isActualSize ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                aria-label="Set zoom to 100 percent"
                                title="Set zoom to 100%"
                            >
                                {zoomPercent}%
                            </button>
                        </div>

                        {/*
                          * How long is this thing? The page badges that answer that
                          * sit on the right-hand rail, which only exists when the
                          * right panel is closed — so in the docked layout the one
                          * fact a resume writer cares about most quietly vanished.
                          * A resume spilling onto page 2 is worth knowing before you
                          * scroll down and find out.
                          */}
                        {useTopControlDock && pageCount > 1 && (
                            <span className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold tabular-nums text-slate-600 shadow-md">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                {pageCount} pages
                            </span>
                        )}
                    </div>

                    {Array.from({ length: pageCount }, (_, pageIndex) => (
                        <div
                            key={`page-label-${pageIndex}`}
                            className={`absolute hidden w-[84px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-sm ${useControlRail ? 'xl:flex' : ''}`}
                            style={{
                                left: scaledPageWidth + EDGE_CONTROL_GAP_PX,
                                top: pageTopOffset + (pageIndex * (A4_HEIGHT_PX + PAGE_GAP_PX) * effectiveScale) + 82
                            }}
                        >
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                Page {pageIndex + 1}
                        </div>
                    ))}

                    {/*
                      * Attached to the page it is about, not hidden in a menu.
                      *
                      * "Fit to one page" rather than "delete page": the spillover
                      * is real content and has to go somewhere, so the honest
                      * action is to make the resume fit rather than to pretend a
                      * page can be thrown away.
                      */}
                    {canReclaimLastPage && (
                        <div
                            className={`absolute hidden flex-col items-start gap-1 ${useControlRail ? 'xl:flex' : ''}`}
                            style={{
                                left: scaledPageWidth + EDGE_CONTROL_GAP_PX,
                                top: pageTopOffset + ((pageCount - 1) * (A4_HEIGHT_PX + PAGE_GAP_PX) * effectiveScale) + 112
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleFitToFewerPages}
                                title="Tighten spacing so this resume fits on fewer pages"
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#c7d2fe] bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-bold text-[#211b4d] shadow-sm transition-colors hover:bg-[#e0e7ff] dark:border-primary-800 dark:bg-primary-600 dark:text-white dark:hover:bg-primary-500"
                            >
                                <ArrowUpToLine size={12} />
                                Fit to {pageCount - 1} page{pageCount - 1 > 1 ? 's' : ''}
                            </button>
                            {fitUndo && (
                                <button
                                    type="button"
                                    onClick={handleUndoFit}
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800 dark:text-gray-400 dark:hover:bg-white/10"
                                >
                                    <Undo2 size={11} />
                                    Undo
                                </button>
                            )}
                        </div>
                    )}

                    {/* Annotation Overlay for Review Feedback */}
                    {showAnnotationOverlay && annotationUrl && (
                        <AdvancedAnnotationCanvas
                            resumeId={resume.id!}
                            ownerId={currentUserUid}
                            width={794} // 210mm @ 96dpi approx
                            height={1123} // 297mm @ 96dpi approx
                            initialImage={annotationUrl}
                            initialObjects={annotationObjects}
                            isReadOnly={true}
                        />
                    )}

                    {/* Anti-Screenshot Blur Overlay */}
                    <div
                        ref={blurOverlayRef}
                        className="absolute inset-0 backdrop-blur-3xl bg-white/40 dark:bg-gray-900/40 z-50 items-center justify-center rounded-sm overflow-hidden"
                        style={{ display: isPreviewBlurred ? 'flex' : 'none' }}
                    >
                        <div className="text-center max-w-md mx-auto px-6 py-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
                            <div className="mb-4">
                                <svg className="w-16 h-16 mx-auto text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Content Protected
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                                Screenshots are disabled to protect your resume content. Please use the Download button to save your resume as a PDF.
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <kbd className="px-2 py-1 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded shadow-sm">
                                    ESC
                                </kbd>
                                <span className="text-sm text-gray-600 dark:text-gray-400">to dismiss</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorPreview;
