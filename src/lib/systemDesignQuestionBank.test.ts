import { describe, expect, it } from 'vitest';
import {
  CASE_DRILLS,
  CAPACITY_QUICKFIRE,
  FLAW_SCENES,
  LATENCY_CARDS,
  ORDERING_SETS,
  getCaseDrill,
} from './systemDesignQuestionBank';

describe('systemDesignQuestionBank', () => {
  it('ships six classic case drills with unique ids', () => {
    expect(CASE_DRILLS).toHaveLength(6);
    expect(new Set(CASE_DRILLS.map((c) => c.id)).size).toBe(6);
    expect(getCaseDrill('twitter-timeline')?.title).toContain('Twitter');
  });

  it('every case drill is structurally sound', () => {
    for (const drill of CASE_DRILLS) {
      // Clarify: exactly requiredCount essential options, plus distractors.
      const essentials = drill.clarify.options.filter((o) => o.essential);
      expect(essentials).toHaveLength(drill.clarify.requiredCount);
      expect(drill.clarify.options.length).toBeGreaterThan(drill.clarify.requiredCount);
      for (const option of drill.clarify.options) expect(option.why.length).toBeGreaterThan(10);

      // Estimate: positive answers with usable tolerance.
      expect(drill.estimate.length).toBeGreaterThanOrEqual(2);
      for (const q of drill.estimate) {
        expect(q.answer).toBeGreaterThan(0);
        expect(q.tolerance).toBeGreaterThan(0);
        expect(q.tolerance).toBeLessThan(1);
        expect(q.working.length).toBeGreaterThan(10);
      }

      // MCQs: correctIndex in range, rationale present.
      for (const q of [...drill.decide, drill.followup]) {
        expect(q.options.length).toBeGreaterThanOrEqual(3);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
        expect(q.why.length).toBeGreaterThan(10);
      }
    }
  });

  it('latency cards have distinct options and the answer is not among distractors', () => {
    expect(LATENCY_CARDS.length).toBeGreaterThanOrEqual(8);
    for (const card of LATENCY_CARDS) {
      expect(card.distractors).not.toContain(card.answer);
      expect(new Set([card.answer, ...card.distractors]).size).toBe(card.distractors.length + 1);
    }
  });

  it('capacity quick-fire answers accept the documented working', () => {
    for (const q of CAPACITY_QUICKFIRE) {
      expect(q.answer).toBeGreaterThan(0);
      expect(q.tolerance).toBeGreaterThan(0);
    }
    // Spot-check the arithmetic itself.
    expect(Math.abs(1_000_000 / 86_400 - 11.6)).toBeLessThan(0.1);
    expect(500_000_000 / 86_400).toBeCloseTo(5787, -1);
    expect(10_000_000 * 500 / 1e9).toBe(5);
  });

  it('flaw scenes each point at exactly one existing component', () => {
    for (const scene of FLAW_SCENES) {
      expect(scene.components.map((c) => c.id)).toContain(scene.flawedId);
      expect(new Set(scene.components.map((c) => c.id)).size).toBe(scene.components.length);
    }
  });

  it('ordering sets have unique items (shuffle + tap-matching relies on it)', () => {
    for (const set of ORDERING_SETS) {
      expect(new Set(set.items).size).toBe(set.items.length);
      expect(set.items.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('serves case drills with the answer position scrambled, not authored-first', () => {
    // The defect: drills are authored answer-first (essential clarify questions
    // written before the distractors, the right decision before the wrong ones),
    // so serving them raw let a learner clear the whole arena by picking the
    // first three and then option two. getCaseDrill permutes on the way out.
    const answerSlots = new Set<number>();
    const essentialSlots = new Set<string>();

    for (const authored of CASE_DRILLS) {
      const served = getCaseDrill(authored.id)!;

      // The shuffle must preserve content: same options, answer still correct.
      const authoredMcqs = [...authored.decide, authored.followup];
      const servedMcqs = [...served.decide, served.followup];
      expect(servedMcqs).toHaveLength(authoredMcqs.length);
      for (const [i, question] of servedMcqs.entries()) {
        const source = authoredMcqs[i];
        expect([...question.options].sort()).toEqual([...source.options].sort());
        expect(question.options[question.correctIndex]).toBe(source.options[source.correctIndex]);
        answerSlots.add(question.correctIndex);
      }

      expect([...served.clarify.options].map((o) => o.text).sort())
        .toEqual([...authored.clarify.options].map((o) => o.text).sort());
      expect(served.clarify.options.filter((o) => o.essential))
        .toHaveLength(authored.clarify.requiredCount);
      essentialSlots.add(
        served.clarify.options.flatMap((o, i) => (o.essential ? [i] : [])).join(','),
      );

      // Same drill, same order — a retry must not look like a new question.
      expect(getCaseDrill(authored.id)).toEqual(served);
    }

    // No single slot can carry the answer, and the essential clarify questions
    // must not land in the same three positions in every drill.
    expect(answerSlots.size).toBeGreaterThan(1);
    expect(essentialSlots.size).toBeGreaterThan(1);
    expect(essentialSlots.has('0,1,2')).toBe(false);
  });
});
