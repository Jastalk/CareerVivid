import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOUR_STEPS } from './tourSteps';
import { isTourRequested } from './EditorTour';

/*
 * The failure this exists to catch: someone renames a button, the `data-tour`
 * attribute goes with it, and the tour silently points at nothing. Every other
 * test here uses a harness with its own anchors, so none of them would notice.
 *
 * Source text rather than a rendered editor: mounting the real Editor needs
 * Firebase, CodeMirror, a resume and a signed-in user, and the thing under test
 * is only whether the attribute is present in the file that ships.
 */
const EDITOR_SOURCES = [
    'src/pages/editor/components/EditorPreview.tsx',
    'src/pages/editor/components/EditorSidebar.tsx',
    'src/pages/editor/components/EditorHeader.tsx',
];

const source = EDITOR_SOURCES.map((file) => readFileSync(join(process.cwd(), file), 'utf8')).join('\n');

describe('tour anchors', () => {
    /**
     * Matches both a literal attribute and the conditional form used where an
     * anchor must apply to only one of several rendered copies.
     */
    const anchorOccurrences = (anchor: string): number =>
        (source.match(new RegExp(`data-tour=(?:"${anchor}"|\\{[^}]*'${anchor}'[^}]*\\})`, 'g')) ?? []).length;

    it.each(TOUR_STEPS.map((s) => [s.id, s.anchor]))(
        'step "%s" points at a control that exists (%s)',
        (_id, anchor) => {
            expect(anchorOccurrences(anchor)).toBeGreaterThan(0);
        },
    );

    it('anchors every step exactly once, so the spotlight cannot pick the wrong one', () => {
        for (const step of TOUR_STEPS) {
            expect(anchorOccurrences(step.anchor), step.anchor).toBe(1);
        }
    });

    /*
     * The toolbar steps must sit on real buttons: a div would not be keyboard
     * reachable, so it could not advance the tour for anyone not using a mouse.
     *
     * Two steps are deliberately not buttons — the resume page and the editor
     * column are regions the user acts INSIDE, and both contain their own
     * focusable fields, so keyboard users still have a way through.
     */
    const REGION_ANCHORS = new Set(['resume-canvas', 'editor-fields']);

    it('puts the clickable anchors on buttons', () => {
        for (const step of TOUR_STEPS) {
            if (REGION_ANCHORS.has(step.anchor)) continue;
            const at = source.indexOf(`data-tour="${step.anchor}"`);
            const openingTag = source.lastIndexOf('<', at);
            expect(source.slice(openingTag, at), step.anchor).toMatch(/^<button/);
        }
    });

    it('ends on a step that only a real edit can satisfy', () => {
        const last = TOUR_STEPS[TOUR_STEPS.length - 1];
        expect(last.advanceOn).toBe('edit');
        // Anything else advancing on an edit would be a mistake: every other
        // step is a control the user presses.
        expect(TOUR_STEPS.filter((s) => s.advanceOn === 'edit')).toHaveLength(1);
    });

    it('gives every step copy a person can act on', () => {
        for (const step of TOUR_STEPS) {
            expect(step.title.length, `${step.id} title`).toBeGreaterThan(8);
            expect(step.body.length, `${step.id} body`).toBeGreaterThan(20);
            // The tour has no Next button, so the copy must never promise one.
            expect(step.body.toLowerCase()).not.toContain('click next');
        }
    });

    it('marks only the step that changes the document as undoable', () => {
        expect(TOUR_STEPS.filter((s) => s.undoable).map((s) => s.id)).toEqual(['design']);
    });
});

describe('isTourRequested', () => {
    it('runs only for the explicit flag', () => {
        expect(isTourRequested('?tour=1')).toBe(true);
        expect(isTourRequested('?foo=bar&tour=1')).toBe(true);
        expect(isTourRequested('?tour=0')).toBe(false);
        expect(isTourRequested('')).toBe(false);
        expect(isTourRequested('?tour=true')).toBe(false);
    });
});
