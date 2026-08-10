/**
 * The editor tour's state machine.
 *
 * Advancing is driven by the user clicking the REAL control, not a Next button.
 * That is enforced with one capture-phase listener on the document: if the
 * click landed inside the element carrying this step's `data-tour`, the step is
 * done. Capture phase matters — the control's own handler will re-render or
 * unmount things, and by the bubble phase the element the user clicked may no
 * longer be in the tree to match against.
 *
 * The hook owns progress only. Where the spotlight sits and how it moves is
 * TourSpotlight's problem.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TOUR_STEPS, type TourStep } from './tourSteps';
import { hasSeenTour, recordTourOutcome } from './tourStorage';

/**
 * Below this the editor collapses to a single column and the side rails behave
 * differently, so the steps would point at controls that are not on screen.
 * The tour does not auto-run there; the replay entry point still exists for
 * when the mobile version is built.
 */
export const TOUR_MIN_WIDTH = 1024;

export const isTourViewport = (): boolean =>
    typeof window !== 'undefined' && window.innerWidth >= TOUR_MIN_WIDTH;

export interface EditorTourState {
    active: boolean;
    step: TourStep | null;
    stepIndex: number;
    stepCount: number;
    /** Set for one beat after a step is completed, so the UI can celebrate. */
    justCompleted: boolean;
    finished: boolean;
    start: () => void;
    skip: () => void;
    /** True when this device has already been through it. Drives "Show me around". */
    seen: boolean;
}

export function useEditorTour(opts: {
    uid: string | undefined;
    /** Set by the generation flow for a user's first resume. */
    requested: boolean;
    /** Blocks auto-start until the editor has something to point at. */
    ready: boolean;
}): EditorTourState {
    const { uid, requested, ready } = opts;

    const [stepIndex, setStepIndex] = useState(-1);
    const [justCompleted, setJustCompleted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [seen, setSeen] = useState(() => (uid ? hasSeenTour(uid) : true));

    const active = stepIndex >= 0 && stepIndex < TOUR_STEPS.length;
    const step = active ? TOUR_STEPS[stepIndex] : null;

    const start = useCallback(() => {
        if (!isTourViewport()) return;
        setFinished(false);
        setJustCompleted(false);
        setStepIndex(0);
    }, []);

    const end = useCallback(
        (outcome: 'completed' | 'skipped') => {
            setStepIndex(-1);
            setSeen(true);
            setFinished(outcome === 'completed');
            if (uid) recordTourOutcome(uid, outcome);
        },
        [uid],
    );

    const skip = useCallback(() => end('skipped'), [end]);

    /*
     * Auto-start once per mount, and only when asked.
     *
     * `seen` deliberately does NOT block this. The request arrives as a URL flag
     * that only a fresh generation sets, and the editor strips it immediately —
     * so "requested" already means "this just happened", not "this might have
     * happened once". Letting a previous visit suppress it is what made the
     * walkthrough invisible to anyone who already owned a resume.
     *
     * `seen` still records the outcome, which is what the replay entry point
     * and any future "you have done this before" copy read.
     */
    const autoStarted = useRef(false);
    useEffect(() => {
        if (autoStarted.current) return;
        if (!requested || !ready || !uid || !isTourViewport()) return;
        autoStarted.current = true;
        start();
    }, [requested, ready, uid, start]);

    const advanceStep = useCallback(() => {
        setJustCompleted(true);
        setStepIndex((i) => {
            const next = i + 1;
            if (next >= TOUR_STEPS.length) {
                // Deferred: calling end() during this handler would set state
                // while the control the user touched is still running its own.
                queueMicrotask(() => end('completed'));
                return -1;
            }
            return next;
        });
    }, [end]);

    // Advance when the user does this step's action.
    const anchor = step?.anchor;
    const advanceOn = step?.advanceOn ?? 'anchor-click';
    useEffect(() => {
        if (!anchor) return;

        /*
         * The last step ends on a real edit, not a click.
         *
         * Its point is that an AI first draft is meant to be rewritten, and a
         * click would let someone finish having typed nothing. `input` fires
         * for typing, pasting and dictation alike, so any genuine change counts
         * — but only inside the editor column, so clicking around the preview
         * cannot satisfy it by accident.
         */
        if (advanceOn === 'edit') {
            const onInput = (event: Event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (!target.closest(`[data-tour="${anchor}"]`)) return;
                advanceStep();
            };
            document.addEventListener('input', onInput, true);
            return () => document.removeEventListener('input', onInput, true);
        }

        const onClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.closest(`[data-tour="${anchor}"]`)) return;
            advanceStep();
        };

        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, [anchor, advanceOn, advanceStep]);

    // Escape leaves. A tour with no exit is a trap.
    useEffect(() => {
        if (!active) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') skip();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, skip]);

    // Clear the celebration flag once the pop has had time to play.
    useEffect(() => {
        if (!justCompleted) return;
        const timer = setTimeout(() => setJustCompleted(false), 600);
        return () => clearTimeout(timer);
    }, [justCompleted]);

    // If the window shrinks below the supported width mid-tour, leave rather
    // than point at controls that are no longer there.
    useEffect(() => {
        if (!active) return;
        const onResize = () => {
            if (!isTourViewport()) skip();
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [active, skip]);

    return useMemo(
        () => ({
            active,
            step,
            stepIndex: active ? stepIndex : -1,
            stepCount: TOUR_STEPS.length,
            justCompleted,
            finished,
            start,
            skip,
            seen,
        }),
        [active, step, stepIndex, justCompleted, finished, start, skip, seen],
    );
}
