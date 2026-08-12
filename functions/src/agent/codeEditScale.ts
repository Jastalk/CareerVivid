/**
 * How much of the solution an edit would author.
 *
 * "The agent is able to write some of the code for users, but not the whole
 * solution" — that is the product line, and `syntax` vs `logic` is too blunt to
 * express it. Adding three lines to work someone already did is help. Turning a
 * five-line scaffold into a finished Trie is doing the interview for them, and
 * both were arriving as kind "logic".
 *
 * So the measure is proportion, not intent: how much real code does the user
 * already have, and how much would this edit add on top? Someone who has
 * written thirty lines and needs one more is helped; someone who has written
 * nothing and would receive forty is replaced.
 *
 * Deliberately counts lines rather than parsing. A tighter measure would need a
 * per-language AST, and the question here is only "is this a nudge or the whole
 * answer" — which line counts answer well enough to be worth explaining to a
 * user.
 */

/** Lines that carry code. Comments and blanks are not work the user did. */
export function meaningfulLines(source: string): number {
    return source
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//") && !l.startsWith("#") && !l.startsWith("*") && !l.startsWith("/*"))
        .length;
}

export interface EditScale {
    before: number;
    after: number;
    added: number;
    /** True when the edit would author most of what ends up on screen. */
    writesMostOfIt: boolean;
}

/**
 * A scored round allows a nudge, not a handover.
 *
 * The floor exists so a genuinely small edit is never blocked by arithmetic: on
 * an empty buffer every addition is "most of it" by ratio, and refusing to add
 * two lines to a blank file would be absurd.
 */
const FREE_LINES = 6;
const MAX_SHARE_OF_RESULT = 0.5;

export function assessCodeEditScale(baseCode: string, nextCode: string): EditScale {
    const before = meaningfulLines(baseCode);
    const after = meaningfulLines(nextCode);
    const added = Math.max(0, after - before);

    return {
        before,
        after,
        added,
        // Small edits always pass. Beyond that, the edit may not be most of the
        // finished result — that is the difference between helping someone with
        // their solution and handing them one.
        writesMostOfIt: added > FREE_LINES && after > 0 && added / after > MAX_SHARE_OF_RESULT,
    };
}
