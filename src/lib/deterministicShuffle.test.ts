import { describe, expect, it } from 'vitest';
import { permutationFor, shuffleChoices, shuffleWithSeed } from './deterministicShuffle';

describe('deterministicShuffle', () => {
  it('returns the same order for the same seed, so a retry is the same question', () => {
    const options = ['a', 'b', 'c', 'd'];
    expect(shuffleWithSeed(options, 'why-a-queue')).toEqual(shuffleWithSeed(options, 'why-a-queue'));
  });

  it('produces a genuine permutation — nothing lost, nothing duplicated', () => {
    const options = ['a', 'b', 'c', 'd', 'e', 'f'];
    const shuffled = shuffleWithSeed(options, 'seed');
    expect([...shuffled].sort()).toEqual([...options].sort());
  });

  it('moves correctIndex with its option', () => {
    const options = ['wrong-1', 'right', 'wrong-2', 'wrong-3'];
    const result = shuffleChoices(options, 1, 'a-prompt');
    expect(result.options[result.correctIndex]).toBe('right');
  });

  it('spreads the correct answer across every slot rather than favouring one', () => {
    // The defect this guards: hand-authored banks put the answer in the same
    // slot every time, which makes the graded layer clearable by position.
    const counts = new Array(4).fill(0);
    for (let i = 0; i < 200; i += 1) {
      counts[shuffleChoices(['a', 'b', 'c', 'd'], 0, `prompt-${i}`).correctIndex] += 1;
    }
    expect(counts.every((n) => n > 200 / 4 / 2)).toBe(true);
  });

  it('handles degenerate lengths without throwing', () => {
    expect(permutationFor(0, 'x')).toEqual([]);
    expect(permutationFor(1, 'x')).toEqual([0]);
  });
});
