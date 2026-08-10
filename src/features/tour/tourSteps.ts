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
        body: 'Download a PDF whenever you like. That is the whole editor — go and make it yours.',
        radius: 999,
    },
];

export const TOUR_VERSION = 1;
export const TOUR_STEP_COUNT = TOUR_STEPS.length;
