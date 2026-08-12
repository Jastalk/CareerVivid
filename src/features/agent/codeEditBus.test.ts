import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCodeEdit, canApplyCodeEdits, registerCodeEditor, unregisterCodeEditor, type CodeEdit } from './codeEditBus';

/*
 * The agent's write channel into an open coding round.
 *
 * Deliberately not a stored proposal: a proposal lives 30 minutes, and a code
 * buffer changes every keystroke. An edit written against code the user has
 * since rewritten must refuse rather than silently discard their work.
 */

const edit = (over: Partial<CodeEdit> = {}): CodeEdit => ({
    nextCode: 'function f() { return 1; }',
    baseCode: 'function f() { return 1 }',
    language: 'javascript',
    kind: 'syntax',
    summary: 'add the missing semicolon',
    ...over,
});

beforeEach(() => unregisterCodeEditor('test'));

describe('codeEditBus', () => {
    it('reports honestly when no round is open', () => {
        expect(canApplyCodeEdits()).toBe(false);
        const result = applyCodeEdit(edit());
        expect(result.applied).toBe(false);
        expect(result.reason).toMatch(/no longer open/i);
    });

    it('hands an approved edit to the open round', () => {
        const apply = vi.fn(() => ({ applied: true }));
        registerCodeEditor('test', apply);

        expect(canApplyCodeEdits()).toBe(true);
        expect(applyCodeEdit(edit()).applied).toBe(true);
        expect(apply).toHaveBeenCalledOnce();
    });

    it('passes the round own refusal straight back', () => {
        registerCodeEditor('test', () => ({ applied: false, reason: 'Your code changed since that suggestion was written.' }));
        expect(applyCodeEdit(edit()).reason).toMatch(/code changed/i);
    });

    /*
     * Rounds overlap during a switch: React mounts the replacement before
     * unmounting the old one. A departing round must not deregister the
     * applier its replacement already installed.
     */
    it('only the current owner can deregister', () => {
        registerCodeEditor('round-b', () => ({ applied: true }));
        unregisterCodeEditor('round-a');
        expect(canApplyCodeEdits()).toBe(true);

        unregisterCodeEditor('round-b');
        expect(canApplyCodeEdits()).toBe(false);
    });
});
