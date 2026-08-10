import { describe, expect, it } from 'vitest';

/*
 * The shipped bug: "105% — Polishing recommended edits…".
 *
 * The old stepper read
 *     if (p >= 92) return p;
 *     return p + Math.floor(Math.random() * 15) + 5;
 * which caps the INPUT and never the RESULT, so a tick from 91 could add 19 and
 * render 110. A progress bar reading over 100 tells the user the thing they are
 * waiting on is broken, at the exact moment they are being asked to trust its
 * output.
 *
 * The stepper is reproduced here rather than exported from the component: it is
 * three lines inside a React effect, and lifting it out to make it importable
 * would be more indirection than the rule is worth. What matters is that the
 * rule itself is stated somewhere a regression trips over.
 */

const CEILING = 92;

/** The fixed stepper: the ceiling applies to the result. */
const step = (p: number, roll: number) => Math.min(CEILING, p + roll + 5);

/** The stepper as it shipped, kept to prove the test would have caught it. */
const brokenStep = (p: number, roll: number) => (p >= CEILING ? p : p + roll + 5);

const ROLLS = Array.from({ length: 15 }, (_, i) => i); // Math.floor(random * 15)

describe('AI Recruiter Agent scan progress', () => {
    it('never exceeds the ceiling, from any starting point', () => {
        for (let p = 0; p <= CEILING; p++) {
            for (const roll of ROLLS) {
                expect(step(p, roll), `${p} + ${roll}`).toBeLessThanOrEqual(CEILING);
            }
        }
    });

    it('would have caught the shipped version', () => {
        // 91 + 14 + 5 = 110, which is what put 105% on screen.
        expect(brokenStep(91, 14)).toBeGreaterThan(100);
        expect(step(91, 14)).toBe(CEILING);
    });

    it('still moves forward, so the wait has a shape', () => {
        let p = 0;
        const seen = [p];
        for (let i = 0; i < 20; i++) {
            p = step(p, 7);
            seen.push(p);
        }
        expect(seen[1]).toBeGreaterThan(seen[0]);
        expect(p).toBe(CEILING);
    });

    /*
     * Stopping short of 100 is deliberate: the last stretch belongs to the
     * response actually arriving, so the bar never claims to be finished before
     * the work is.
     */
    it('stops short of complete', () => {
        expect(CEILING).toBeLessThan(100);
    });
});
