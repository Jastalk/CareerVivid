/**
 * The spotlight: dim everything, cut a hole around one control, explain it.
 *
 * No Next button anywhere. The control in the hole is the only thing that
 * advances the tour, which is the whole point — someone who finishes has used
 * the editor rather than read about it.
 *
 * Rendered in a portal at the document root so it sits above the editor's own
 * stacking contexts. The sidebars, the preview toolbar and the header all
 * create their own, and a spotlight trapped inside one of them would be dimmed
 * by the very overlay it is part of.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Pencil, Undo2, X } from 'lucide-react';
import { useAnchorRect } from './useAnchorRect';
import { cutoutFrame, placeTooltip, TOOLTIP_WIDTH } from './tourPlacement';
import type { TourStep } from './tourSteps';

const PADDING = 8;

interface Props {
    step: TourStep;
    stepIndex: number;
    stepCount: number;
    onSkip: () => void;
    /** Present only on a step that changed the document. */
    onUndo?: () => void;
    undoLabel?: string;
}

export const TourSpotlight: React.FC<Props> = ({ step, stepIndex, stepCount, onSkip, onUndo, undoLabel }) => {
    const rect = useAnchorRect(step.anchor);
    const reduceMotion = useReducedMotion();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipHeight, setTooltipHeight] = useState(160);
    const [viewport, setViewport] = useState(() => ({
        width: typeof window === 'undefined' ? 0 : window.innerWidth,
        height: typeof window === 'undefined' ? 0 : window.innerHeight,
    }));

    useEffect(() => {
        const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Measured rather than assumed: the copy varies per step, and a guessed
    // height puts the tooltip over the control it is pointing at.
    useLayoutEffect(() => {
        const height = tooltipRef.current?.offsetHeight;
        if (height && Math.abs(height - tooltipHeight) > 1) setTooltipHeight(height);
    });

    /*
     * A missing anchor renders nothing at all.
     *
     * It happens for one frame whenever a step's control lives in a panel the
     * previous step just opened. Showing a dimmed screen with no hole in it
     * would read as the app having frozen — far worse than a beat of nothing.
     */
    if (!rect) return null;

    const frame = cutoutFrame(rect, PADDING, viewport);
    const placement = placeTooltip(
        { ...rect, top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 },
        tooltipHeight,
        viewport,
    );
    const radius = step.radius ?? 10;
    const isEditStep = step.advanceOn === 'edit';
    const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 };

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label={step.title}>
            {/* Dim + click blocker, everywhere except the control. */}
            {frame.map((r, i) => (
                <motion.div
                    key={i}
                    className="pointer-events-auto absolute bg-[#1a1030]/55 backdrop-blur-[1px]"
                    style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25 }}
                />
            ))}

            {/* The glow. Purely decorative, so it must never eat the click. */}
            <motion.div
                className="pointer-events-none absolute rounded-[inherit] ring-2 ring-[#8b7cf6]"
                style={{
                    top: rect.top - PADDING,
                    left: rect.left - PADDING,
                    width: rect.width + PADDING * 2,
                    height: rect.height + PADDING * 2,
                    borderRadius: radius + PADDING,
                }}
                animate={
                    reduceMotion
                        ? { boxShadow: '0 0 0 4px rgba(139,124,246,0.35)' }
                        : { boxShadow: [
                            '0 0 0 0px rgba(139,124,246,0.45)',
                            '0 0 0 10px rgba(139,124,246,0)',
                            '0 0 0 0px rgba(139,124,246,0)',
                        ] }
                }
                transition={reduceMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step.id}
                    ref={tooltipRef}
                    className="pointer-events-auto absolute rounded-2xl border border-[#e3dffb] bg-white p-4 shadow-[0_18px_50px_-12px_rgba(26,16,48,0.45)] dark:border-[#413a72] dark:bg-[#221d3f]"
                    style={{ width: TOOLTIP_WIDTH, top: placement.top, left: placement.left }}
                    initial={{ opacity: 0, y: placement.side === 'bottom' ? -8 : 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={spring}
                >
                    <div className="flex items-center gap-2">
                        <span className="flex gap-1" aria-hidden="true">
                            {Array.from({ length: stepCount }, (_, i) => (
                                <motion.span
                                    key={i}
                                    className={`block h-1.5 rounded-full ${i <= stepIndex ? 'bg-[#625bd5]' : 'bg-[#dcd7f5] dark:bg-[#3d3765]'}`}
                                    animate={{ width: i === stepIndex ? 16 : 6 }}
                                    transition={spring}
                                />
                            ))}
                        </span>
                        <span className="ml-auto text-[11px] font-semibold text-[#8b86ad]">
                            {stepIndex + 1} of {stepCount}
                        </span>
                        <button
                            type="button"
                            onClick={onSkip}
                            aria-label="Skip the tour"
                            className="-mr-1 rounded-md p-1 text-[#8b86ad] transition-colors hover:bg-black/5 hover:text-[#3d3699] dark:hover:bg-white/10"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <h2 className="mt-2.5 font-heading text-[15px] font-bold leading-snug text-[#1f1a3d] dark:text-white">
                        {step.title}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#5f5a80] dark:text-[#b9b3dd]">
                        {step.body}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                        {/* The hint has to name the action that actually advances.
                            The last step ends on a real edit, and telling someone
                            to click there would be a dead end. */}
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#625bd5] dark:text-[#b8b4ff]">
                            <motion.span
                                animate={reduceMotion ? {} : isEditStep ? { y: [0, -2, 0] } : { x: [0, 3, 0], y: [0, -3, 0] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                                className="inline-flex"
                            >
                                {isEditStep ? <Pencil size={13} /> : <ArrowUpRight size={14} />}
                            </motion.span>
                            {isEditStep ? 'Edit any line to finish' : 'Click it to continue'}
                        </span>

                        {step.undoable && onUndo && (
                            <button
                                type="button"
                                onClick={onUndo}
                                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#8b86ad] transition-colors hover:bg-black/5 hover:text-[#3d3699] dark:hover:bg-white/10"
                            >
                                <Undo2 size={13} />
                                {undoLabel ?? 'Undo'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>,
        document.body,
    );
};

export default TourSpotlight;
