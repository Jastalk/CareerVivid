import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGENT_CODING_QUESTIONS,
  AGENT_PRACTICE_CATALOG,
  AGENT_SYSTEM_DESIGN_QUESTIONS,
} from '../../functions/src/agentPracticeCatalog.generated';
import { getCodingPool } from './codingChallenges';
import { buildSystemDesignBrief, getSystemDesignPool } from './companyQuests';
import type { LocalInterviewGuide } from './localInterviewGuides';

const guidesDirectory = join(__dirname, '../../data/interview-guides');
const guides = readdirSync(guidesDirectory)
  .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
  .map((file) => JSON.parse(readFileSync(join(guidesDirectory, file), 'utf8')) as LocalInterviewGuide);

describe('Career Agent technical-question catalog', () => {
  it('matches every company coding workspace pool exactly', () => {
    for (const guide of guides) {
      const expected = getCodingPool(guide);
      const generated = AGENT_PRACTICE_CATALOG[guide.slug];
      expect(generated?.coding, guide.slug).toEqual(expected.map((challenge) => challenge.id));
      for (const challenge of expected) {
        expect(AGENT_CODING_QUESTIONS[challenge.id]?.question, `${guide.slug}:${challenge.id}`)
          .toBe(`${challenge.title}: ${challenge.description}`);
      }
    }
  });

  it('matches every company system-design workspace pool exactly', () => {
    for (const guide of guides) {
      const expected = getSystemDesignPool(guide);
      const generated = AGENT_PRACTICE_CATALOG[guide.slug];
      expect(generated?.systemDesign, guide.slug).toEqual(expected.map((pattern) => pattern.id));
      for (const pattern of expected) {
        const brief = buildSystemDesignBrief(guide, pattern);
        expect(AGENT_SYSTEM_DESIGN_QUESTIONS[guide.slug]?.[pattern.id]?.question, `${guide.slug}:${pattern.id}`)
          .toBe(brief.challenge);
      }
    }
  });
});
