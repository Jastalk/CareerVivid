/**
 * Seeded, stable option shuffling for graded multiple-choice content.
 *
 * Why this exists: hand-authored question banks drift towards putting the
 * correct answer in the same slot every time — the System Design bank had all
 * 24 quiz answers at index 0 and all 18 case-drill answers at index 1, which
 * made the entire graded layer clearable by position without reading a word.
 *
 * The shuffle is seeded by a string (the prompt), so a learner sees the same
 * order every visit — retrying a question they got wrong must not look like a
 * different question — while the correct answer lands wherever the seed puts
 * it. Deterministic also means snapshot tests and SSR stay stable.
 */

/** FNV-1a. Small, fast, and good enough spread for a few options. */
const hashSeed = (seed: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32 — a compact PRNG with a 32-bit state. */
const createRandom = (seed: number) => {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * The permutation applied to `length` items under `seed`: `result[i]` is the
 * original index now shown in position `i`. Returned separately from the
 * shuffle so callers can remap a `correctIndex` alongside its options.
 */
export const permutationFor = (length: number, seed: string): number[] => {
  const order = Array.from({ length }, (_, i) => i);
  const random = createRandom(hashSeed(seed));
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/** Reorder `items` by the permutation for `seed`. */
export const shuffleWithSeed = <T>(items: readonly T[], seed: string): T[] =>
  permutationFor(items.length, seed).map((index) => items[index]);

/**
 * Shuffle a multiple-choice question's options and move `correctIndex` with
 * them, so position carries no information about the answer.
 */
export const shuffleChoices = <T>(
  options: readonly T[],
  correctIndex: number,
  seed: string,
): { options: T[]; correctIndex: number } => {
  const order = permutationFor(options.length, seed);
  return {
    options: order.map((index) => options[index]),
    correctIndex: order.indexOf(correctIndex),
  };
};
