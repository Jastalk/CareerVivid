/**
 * The five things someone needs to know to use the resume editor.
 *
 * Written against the state a newly generated resume lands in: PDF Preview
 * active, both side rails collapsed, the score already on screen. Each step
 * targets a real control, and the user clicks THAT control to advance — there
 * is no Next button, because pressing Next teaches nothing. Getting through the
 * tour means having actually used the editor once.
 *
 * Kept to five. Every extra step is people who quit before the end.
 */

export interface TourStep {
    id: string;
    /** Matches `data-tour="…"` on the real control. */
    anchor: string;
    title: string;
    body: string;
    /** Corner radius of the cutout, matched to the control's own rounding. */
    radius?: number;
    /**
     * Step 4 changes their document. The tooltip offers a one-tap undo, which
     * only makes sense where a step actually wrote something.
     */
    undoable?: boolean;
    /**
     * What counts as doing this step.
     *
     * `anchor-click` is the default: press the control in the spotlight. The
     * last step ends on `edit` instead, because "change something" is not a
     * click — accepting a click there would let someone finish the tour without
     * having typed a character, which is the one thing that step exists to make
     * them do.
     */
    advanceOn?: 'anchor-click' | 'edit';
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'score',
        anchor: 'score-pill',
        title: 'This number is your resume, graded',
        body: 'Recruiters skim for the same things we do. Tap the score to see what it is made of.',
        radius: 999,
    },
    {
        id: 'suggestions',
        anchor: 'suggested-edits',
        title: 'We already found things to fix',
        body: 'Suggested Edits shows concrete rewrites, one at a time. Accept one and watch the score move.',
        radius: 999,
    },
    {
        id: 'content',
        anchor: 'tab-content',
        title: 'Everything here is yours to change',
        body: 'The Editor tab is where you rewrite anything. The preview updates as you type — no save button to hunt for.',
        radius: 8,
    },
    {
        id: 'design',
        anchor: 'tab-design',
        title: 'Same words, different look',
        body: 'Layout & Style swaps the template instantly. Every one of them is built to survive an ATS scan.',
        radius: 8,
        undoable: true,
    },
    {
        id: 'download',
        anchor: 'download-pdf',
        title: 'Take it with you',
        body: 'Download a PDF whenever you like — your resume is saved as you go.',
        radius: 999,
    },
    {
        id: 'click-to-edit',
        anchor: 'resume-canvas',
        title: 'Click straight onto the page',
        body: 'Tap any line on your resume. The editor on the left jumps to exactly that sentence — no hunting for the right field.',
        radius: 4,
    },
    {
        id: 'make-it-yours',
        anchor: 'editor-fields',
        title: 'Now change something',
        body: 'This resume was written by AI, so every word is a first draft. Edit one line and watch the page update as you type.',
        radius: 12,
        advanceOn: 'edit',
    },
];

export const TOUR_VERSION = 1;
export const TOUR_STEP_COUNT = TOUR_STEPS.length;
