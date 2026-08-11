/**
 * Pulling a resume back onto fewer pages by tightening its layout.
 *
 * The button this backs says "Fit to one page", and that phrasing is the whole
 * design: a page carrying a line or two of spillover cannot be deleted — the
 * content has to go somewhere. What the user actually wants is not a page
 * removed but the resume made to fit, so the action tightens spacing rather
 * than pretending to delete.
 *
 * Every knob has a floor it will not cross. A resume squeezed past these stops
 * looking professional, which is the one thing it cannot afford to do, so the
 * action refuses rather than producing something unusable.
 */

import { DEFAULT_FORMATTING_SETTINGS, type FormattingSettings } from '../types';

interface Knob {
    key: keyof FormattingSettings;
    floor: number;
    /** Shown to the user, so they can see what the button actually did. */
    label: string;
}

/*
 * Order matters: whitespace first, then type.
 *
 * Margins and gaps are the cheapest thing to spend — a reader does not notice
 * 2rem becoming 1.5rem. Line height and body scale change how the words
 * themselves read, so they are the last resort and have the tightest floors.
 */
const KNOBS: Knob[] = [
    { key: 'pageMargin', floor: 1.25, label: 'page margins' },
    { key: 'sectionGap', floor: 0.9, label: 'section spacing' },
    { key: 'paragraphGap', floor: 0.25, label: 'paragraph spacing' },
    { key: 'lineHeight', floor: 1.2, label: 'line spacing' },
    { key: 'bodyScale', floor: 0.92, label: 'text size' },
];

export interface TightenResult {
    settings: FormattingSettings;
    /** Human-readable list of what moved, for the confirmation the user sees. */
    changed: string[];
    /** True when every knob is already at its floor — nothing left to give. */
    atLimit: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Tighten the layout by roughly `overflowRatio` of a page.
 *
 * Returns `atLimit` rather than a squeezed-past-readable result when there is
 * nothing left to take. The caller should tell the user to cut content at that
 * point, which is the honest advice — no amount of spacing will fit three
 * pages of experience onto one.
 */
export function tightenLayout(
    current: Partial<FormattingSettings> | undefined,
    overflowRatio: number,
): TightenResult {
    const settings: FormattingSettings = { ...DEFAULT_FORMATTING_SETTINGS, ...(current ?? {}) };
    const next: FormattingSettings = { ...settings };
    const changed: string[] = [];

    // A tenth of a page of spill still needs a real reduction to absorb, so the
    // pull is amplified and clamped rather than applied one-for-one.
    const pull = Math.min(0.6, Math.max(0.08, overflowRatio * 2.5));
    let roomLeft = false;

    for (const knob of KNOBS) {
        const value = settings[knob.key];
        const headroom = value - knob.floor;
        if (headroom <= 0.001) continue;
        roomLeft = true;
        const reduced = round(Math.max(knob.floor, value - headroom * pull));
        if (reduced < value) {
            next[knob.key] = reduced;
            changed.push(knob.label);
        }
    }

    return { settings: next, changed, atLimit: !roomLeft };
}

/** True when the layout has already been tightened as far as it will go. */
export function isAtTightestLayout(current: Partial<FormattingSettings> | undefined): boolean {
    return tightenLayout(current, 0.5).atLimit;
}

/**
 * How much of a page the trailing overflow takes up.
 *
 * Used to decide whether to offer the button at all: a last page that is
 * mostly full is a real page the user wrote, and offering to squeeze it away
 * would be offering to mangle their resume.
 */
export function trailingOverflowRatio(paintedBottomPx: number, pageHeightPx: number): number {
    if (paintedBottomPx <= 0 || pageHeightPx <= 0) return 0;
    const spill = paintedBottomPx % pageHeightPx;
    if (spill === 0) return 0;
    return spill / pageHeightPx;
}
