/**
 * The agent's write channel into an open coding round.
 *
 * Reading the workspace was easy — CodingBattle publishes a snapshot and the
 * agent picks it up. Writing back had nowhere to go: every other agent write is
 * a server-side proposal against Firestore, and a code buffer is neither on the
 * server nor persisted. It is React state inside a component that may not even
 * be mounted.
 *
 * So this is the mirror of workspaceSnapshot: a module-level slot the open
 * round registers an applier on, and the agent panel calls. Same reasoning as
 * that file — publisher and reader sit on unrelated branches of the tree, and
 * threading a callback between them would touch a dozen components with no
 * stake in it.
 *
 * Deliberately NOT a stored proposal. A proposal lives 30 minutes; a code
 * buffer changes every keystroke. Approving a patch built against code the user
 * has since rewritten would silently throw their work away, so a pending edit
 * carries the exact buffer it was written against and refuses to apply if that
 * no longer matches.
 */

export interface CodeEdit {
    /** The complete buffer as it should end up. Whole-file, not a diff: an LLM
     *  producing a positional patch against a moving buffer is a bug factory. */
    nextCode: string;
    /** What the buffer was when the edit was written. Guards a stale apply. */
    baseCode: string;
    language: string;
    /** `syntax` never changes behaviour; `logic` does. Gated differently. */
    kind: 'syntax' | 'logic';
    /** One line the user reads before approving. */
    summary: string;
}

type Applier = (edit: CodeEdit) => { applied: boolean; reason?: string };

let applier: Applier | null = null;
let owner: string | null = null;

/**
 * Register the open round as the thing that receives edits.
 *
 * Ownership mirrors workspaceSnapshot: rounds overlap during a switch, and a
 * departing round must not deregister its replacement.
 */
export function registerCodeEditor(ownerId: string, fn: Applier): void {
    owner = ownerId;
    applier = fn;
}

export function unregisterCodeEditor(ownerId: string): void {
    if (owner !== ownerId) return;
    owner = null;
    applier = null;
}

export const canApplyCodeEdits = (): boolean => applier !== null;

/**
 * Apply an approved edit to the open editor.
 *
 * Returns why it failed rather than throwing, because every failure here is
 * something the user needs told: the round closed, or they kept typing and the
 * edit no longer describes their code.
 */
export function applyCodeEdit(edit: CodeEdit): { applied: boolean; reason?: string } {
    if (!applier) {
        return { applied: false, reason: 'That coding round is no longer open.' };
    }
    return applier(edit);
}
