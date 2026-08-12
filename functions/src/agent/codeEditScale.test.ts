import { describe, expect, it } from 'vitest';
import { assessCodeEditScale, meaningfulLines } from './codeEditScale';

/*
 * "The agent is able to write some of the code for users, but not the whole
 * solution." kind syntax-vs-logic could not express that: adding three lines to
 * existing work and turning a scaffold into a finished Trie both arrived as
 * "logic", and refusing both left the agent saying it had "an issue with the
 * tool".
 */

const SCAFFOLD = `function trieOps(operations) {
  // operations: [["insert", word] | ["search", word], ...]
  // Return one result per operation.
}`;

const FINISHED = `function trieOps(operations) {
  const root = {};
  const results = [];
  for (const [op, arg] of operations) {
    let node = root;
    if (op === 'insert') {
      for (const ch of arg) { node[ch] = node[ch] || {}; node = node[ch]; }
      node.end = true;
      results.push(null);
    } else if (op === 'search') {
      for (const ch of arg) { if (!node[ch]) { node = null; break; } node = node[ch]; }
      results.push(Boolean(node && node.end));
    } else {
      for (const ch of arg) { if (!node[ch]) { node = null; break; } node = node[ch]; }
      results.push(Boolean(node));
    }
  }
  return results;
}`;

describe('meaningfulLines', () => {
    it('does not count comments or blanks as work the user did', () => {
        expect(meaningfulLines(SCAFFOLD)).toBe(2); // the signature and the brace
    });

    it('counts real code', () => {
        expect(meaningfulLines('const a = 1;\nconst b = 2;')).toBe(2);
    });
});

describe('assessCodeEditScale', () => {
    /* The exact case from the round: scaffold in, finished solution out. */
    it('flags an edit that writes the whole solution', () => {
        const scale = assessCodeEditScale(SCAFFOLD, FINISHED);
        expect(scale.writesMostOfIt).toBe(true);
        expect(scale.added).toBeGreaterThan(10);
    });

    it('allows a nudge on top of real work', () => {
        const theirWork = FINISHED;
        const oneMoreLine = FINISHED.replace('return results;', 'if (!results.length) return [];\n  return results;');
        expect(assessCodeEditScale(theirWork, oneMoreLine).writesMostOfIt).toBe(false);
    });

    /*
     * On an empty buffer every addition is "most of it" by ratio. Refusing to
     * add two lines to a blank file would be arithmetic, not judgement.
     */
    it('never blocks a genuinely small edit', () => {
        expect(assessCodeEditScale('', 'const a = 1;\nconst b = 2;').writesMostOfIt).toBe(false);
        expect(assessCodeEditScale(SCAFFOLD, SCAFFOLD + '\nconst a = 1;').writesMostOfIt).toBe(false);
    });

    it('treats a pure deletion or reformat as no new work', () => {
        expect(assessCodeEditScale(FINISHED, SCAFFOLD).added).toBe(0);
        expect(assessCodeEditScale(FINISHED, FINISHED).writesMostOfIt).toBe(false);
    });

    it('is not fooled by padding the edit with comments', () => {
        const commented = SCAFFOLD + '\n' + Array.from({ length: 30 }, (_, i) => `  // note ${i}`).join('\n');
        expect(assessCodeEditScale(SCAFFOLD, commented).added).toBe(0);
    });
});
