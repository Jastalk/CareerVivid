/**
 * Everything the editor needs to know about the tour, in one component.
 *
 * Kept out of Editor.tsx deliberately: that file already coordinates a dozen
 * concerns, and the tour is the kind of feature that should be deletable in one
 * move. It reads the trigger, runs the state machine, renders the spotlight,
 * and owns the one side effect a step has — the template it swapped.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { celebrateTourFinish } from './tourCelebration';
import { TourSpotlight } from './TourSpotlight';
import { useEditorTour } from './useEditorTour';

/**
 * The generation flow appends `?tour=1` for a user's first resume, so the
 * trigger is an explicit decision made where the resume is created rather than
 * something the editor infers from state it happens to have.
 */
export const TOUR_QUERY_FLAG = 'tour';

export const isTourRequested = (search: string = typeof window === 'undefined' ? '' : window.location.search): boolean => {
    try {
        return new URLSearchParams(search).get(TOUR_QUERY_FLAG) === '1';
    } catch {
        return false;
    }
};

/**
 * Take `?tour=1` out of the address bar once it has been read.
 *
 * Without this, a refresh or a shared link replays the tour — and the URL of a
 * resume should not carry a one-time onboarding instruction around with it.
 */
const consumeTourFlag = (): void => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(TOUR_QUERY_FLAG)) return;
    url.searchParams.delete(TOUR_QUERY_FLAG);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

interface Props {
    uid: string | undefined;
    /** False while the resume is still loading — there is nothing to point at yet. */
    ready: boolean;
    /** Current template, read when the design step starts so Undo can restore it. */
    activeTemplateId: string | undefined;
    onRestoreTemplate: (templateId: string) => void;
    /** Lets the editor show a "Show me around" entry once the tour has been seen. */
    onSeenChange?: (seen: boolean) => void;
}

export interface EditorTourHandle {
    start: () => void;
    seen: boolean;
}

export const EditorTour = React.forwardRef<EditorTourHandle, Props>(function EditorTour(
    { uid, ready, activeTemplateId, onRestoreTemplate, onSeenChange },
    ref,
) {
    const [requested] = useState(() => isTourRequested());
    const tour = useEditorTour({ uid, requested, ready });

    // Read once, at mount, then strip it. Reading it later would race the
    // history rewrite below.
    useEffect(() => {
        if (requested) consumeTourFlag();
    }, [requested]);

    useEffect(() => {
        onSeenChange?.(tour.seen);
    }, [tour.seen, onSeenChange]);

    React.useImperativeHandle(ref, () => ({ start: tour.start, seen: tour.seen }), [tour.start, tour.seen]);

    /*
     * The design step swaps their real template, which is the honest thing to
     * do — they did press it. The template in force when the step BEGINS is
     * captured so Undo has something true to restore; capturing it later would
     * record the new one and make Undo a no-op.
     */
    const undoTargetRef = useRef<string | undefined>(undefined);
    const stepId = tour.step?.id;
    useEffect(() => {
        if (stepId === 'design') undoTargetRef.current = activeTemplateId;
        // Intentionally not depending on activeTemplateId: this must snapshot
        // the value at the moment the step opens, not track it afterwards.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepId]);

    const [undone, setUndone] = useState(false);
    useEffect(() => {
        if (stepId !== 'design') setUndone(false);
    }, [stepId]);

    const handleUndo = useCallback(() => {
        const previous = undoTargetRef.current;
        if (!previous || previous === activeTemplateId) {
            setUndone(true);
            return;
        }
        onRestoreTemplate(previous);
        setUndone(true);
    }, [activeTemplateId, onRestoreTemplate]);

    useEffect(() => {
        if (tour.finished) void celebrateTourFinish();
    }, [tour.finished]);

    if (!tour.active || !tour.step) return null;

    return (
        <TourSpotlight
            step={tour.step}
            stepIndex={tour.stepIndex}
            stepCount={tour.stepCount}
            onSkip={tour.skip}
            onUndo={tour.step.undoable ? handleUndo : undefined}
            undoLabel={undone ? 'Restored' : 'Undo'}
        />
    );
});

export default EditorTour;
