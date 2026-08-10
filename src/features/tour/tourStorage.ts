/**
 * Remembering whether someone has already been shown the editor tour.
 *
 * localStorage, per user id, not a Firestore field: this is a UI preference
 * that has to be readable synchronously during the first render. Reading it
 * from the server would mean the tour either flashes on and disappears, or is
 * delayed past the moment it was supposed to greet them.
 *
 * The cost is that it is per-device. Someone who generates their first resume
 * on a laptop and opens it on a desktop can see the tour twice. That is a far
 * smaller problem than a tour that flickers, and the tour is skippable.
 */

import { TOUR_VERSION } from './tourSteps';

export type TourOutcome = 'completed' | 'skipped';

const key = (uid: string) => `cv.editorTour.v${TOUR_VERSION}.${uid}`;

/** Storage can throw in private browsing and in embedded webviews. */
const safe = <T>(fn: () => T, fallback: T): T => {
    try {
        return fn();
    } catch {
        return fallback;
    }
};

export const hasSeenTour = (uid: string): boolean =>
    safe(() => Boolean(uid) && localStorage.getItem(key(uid)) !== null, false);

export const recordTourOutcome = (uid: string, outcome: TourOutcome): void => {
    safe(() => {
        if (uid) localStorage.setItem(key(uid), outcome);
    }, undefined);
};

/** Used by the replay entry point, so "Show me around" works a second time. */
export const clearTourMemory = (uid: string): void => {
    safe(() => {
        if (uid) localStorage.removeItem(key(uid));
    }, undefined);
};
