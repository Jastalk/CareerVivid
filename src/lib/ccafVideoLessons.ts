/**
 * Which course video belongs to which exam domain.
 *
 * The shot scripts that produced those videos live in scripts/ccaf/lessonScripts.ts
 * — they are build-time inputs, and shipping them to the browser would cost every
 * visitor a payload they can never see.
 */

import type { LocalizedText } from './ccafMissions';

/**
 * One produced video per domain — the real course, generated externally with
 * Gemini's video model rather than assembled in the app.
 *
 * Watching a domain's video once unlocks that domain's questions. The gate is
 * per domain, not per mission: the video teaches the whole domain in one go.
 *
 * Drop the file at `public/ccaf-lessons/<src>`. A domain with no entry here
 * simply has no gate, so the other four stay playable while their videos are
 * still being produced.
 */
export interface DomainVideo {
    domainOrder: number;
    /** Path under public/ccaf-lessons/. */
    src: string;
    /** Optional still shown before playback starts. */
    poster?: string;
    title: LocalizedText;
}

export const DOMAIN_VIDEOS: DomainVideo[] = [
    {
        domainOrder: 1,
        src: 'domain-1.mp4',
        title: {
            en: 'Domain 1 · Agentic Architecture & Orchestration',
            zh: 'Domain 1 · 编排区 · Agentic 架构与编排',
        },
    },
];

/**
 * Course videos are hidden until they are finished.
 *
 * The Domain 1 entry below is kept, not deleted — the film exists and is still
 * being cut. Flipping this to `true` brings every video surface back at once:
 * the lesson card inside a mission, the rewatch overlay, and the toolbar entry
 * all go through `domainVideoFor`.
 *
 * When they do come back, they come back as an offer, not a gate. Opening a
 * mission goes straight to the questions either way — see MissionDialog, where
 * `showingLesson` now starts false.
 */
export const VIDEO_LESSONS_ENABLED = false;

export const domainVideoFor = (domainOrder: number): DomainVideo | undefined =>
    VIDEO_LESSONS_ENABLED
        ? DOMAIN_VIDEOS.find(video => video.domainOrder === domainOrder)
        : undefined;

/** Public URL for a domain video. */
export const domainVideoSrc = (video: DomainVideo): string =>
    `/ccaf-lessons/${video.src}`;
