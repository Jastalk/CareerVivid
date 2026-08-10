import { describe, it, expect } from 'vitest';
import {
  SYSTEM_DESIGN_PATTERNS,
  buildQuestLine,
  buildQuestStagePrompt,
  buildSystemDesignBrief,
  getStageFallbackQuestions,
  getStageQuestionPool,
  getSystemDesignPool,
  isStageCleared,
  selectNextSystemDesignChallenge,
} from './companyQuests';
import { LocalInterviewGuide } from './localInterviewGuides';

const makeGuide = (overrides: Partial<LocalInterviewGuide> = {}): LocalInterviewGuide => ({
  company: 'TestCo',
  slug: 'testco',
  url: 'https://example.com/testco',
  scrapedAt: '2026-07-02T00:00:00.000Z',
  interviewStages: ['Phone Screen (45 minutes)', 'Onsite (4-5 rounds)'],
  codingTopics: ['Arrays and strings'],
  systemDesignTopics: [],
  behavioralTopics: ['Teamwork'],
  sampleQuestions: { coding: [], behavioral: [], systemDesign: [], values: [], other: [] },
  difficulty: 6,
  tips: [],
  compensation: null,
  ...overrides,
});

describe('buildQuestLine', () => {
  it('always includes all six canonical interview stages in order', () => {
    const ids = buildQuestLine(makeGuide()).map((s) => s.id);
    expect(ids).toEqual(['screening', 'coding', 'system_design', 'behavioral', 'values', 'final']);
  });

  it('uses a 70-point clear threshold for every stage', () => {
    const easy = buildQuestLine(makeGuide({ difficulty: 6 }));
    const hard = buildQuestLine(makeGuide({ difficulty: 8.5 }));

    expect(easy.find((s) => s.id === 'coding')!.passThreshold).toBe(70);
    expect(easy.find((s) => s.id === 'final')!.passThreshold).toBe(70);
    expect(hard.find((s) => s.id === 'coding')!.passThreshold).toBe(70);
    expect(hard.find((s) => s.id === 'final')!.passThreshold).toBe(70);
  });
});

describe('buildQuestStagePrompt', () => {
  it('includes company context and stage focus', () => {
    const guide = makeGuide();
    const stage = buildQuestLine(guide)[0];
    const prompt = buildQuestStagePrompt(guide, stage);

    expect(prompt).toContain('Company: TestCo');
    expect(prompt).toContain('Recruiter screen');
    expect(prompt).toContain('Stage focus:');
  });
});

describe('getStageFallbackQuestions', () => {
  it('provides at least 3 questions for every stage kind', () => {
    const guide = makeGuide({
      systemDesignTopics: ['Design something'],
      sampleQuestions: { coding: [], behavioral: [], systemDesign: [], values: ['Why?'], other: [] },
    });
    for (const stage of buildQuestLine(guide)) {
      const questions = getStageFallbackQuestions('TestCo', stage);
      expect(questions.length).toBeGreaterThanOrEqual(3);
      expect(new Set(questions).size).toBe(questions.length);
    }
  });

  it('personalizes screening and values questions with the company name', () => {
    const guide = makeGuide();
    const screening = buildQuestLine(guide)[0];
    const questions = getStageFallbackQuestions('Stripe', screening);
    expect(questions.some((q) => q.includes('Stripe'))).toBe(true);
  });
});

describe('getStageQuestionPool — screening is light + difficulty tiers', () => {
  const stageByIdFor = (guide: LocalInterviewGuide, id: string) =>
    buildQuestLine(guide).find((s) => s.id === id)!;

  it('leads the screening round with light rapport, not deep guide behavioral', () => {
    const guide = makeGuide({
      company: 'Acme',
      difficulty: 9, // high-difficulty company
      sampleQuestions: {
        coding: [], systemDesign: [],
        behavioral: ['Tell me about a time you disagreed with your manager and how it resolved.'],
        values: [], other: [],
      },
    });
    const screening = stageByIdFor(guide, 'screening');
    const pool = getStageQuestionPool(guide, screening);
    // the deep behavioral question must NOT lead the recruiter screen
    expect(pool[0]).not.toContain('disagreed with your manager');
    // first screening question should be a light/get-to-know-you rapport prompt
    expect(pool[0].toLowerCase()).toMatch(
      /about yourself|new opportunities|looking for|what do you know about|draws you to|prompting you|day to day/,
    );
  });

  it('screening never surfaces the guide behavioral question in the top 5', () => {
    const guide = makeGuide({
      difficulty: 10,
      sampleQuestions: {
        coding: [], systemDesign: [],
        behavioral: ['Describe the hardest architectural decision you have ever made.'],
        values: [], other: [],
      },
    });
    const pool = getStageQuestionPool(guide, stageByIdFor(guide, 'screening')).slice(0, 5);
    expect(pool.join(' ')).not.toContain('hardest architectural decision');
  });

  it('behavioral leads with company questions, then scales category difficulty', () => {
    const guide = makeGuide({
      difficulty: 9, // -> hard tier for the category behavioral bank
      sampleQuestions: {
        coding: [], systemDesign: [],
        behavioral: ['Company-specific behavioral question.'],
        values: [], other: [],
      },
    });
    const pool = getStageQuestionPool(guide, buildQuestLine(guide).find((s) => s.id === 'behavioral')!);
    // the company's own behavioral question leads
    expect(pool[0]).toBe('Company-specific behavioral question.');
    // a hard-tier category behavioral question is layered in
    expect(pool.join(' ').toLowerCase()).toContain('biggest professional failure');
  });

  it('scales values/final difficulty with the company rating', () => {
    const easyCo = makeGuide({ company: 'EasyCo', slug: 'unknown-easyco', difficulty: 3 });
    const hardCo = makeGuide({ company: 'HardCo', slug: 'unknown-hardco', difficulty: 9 });
    const finalOf = (g: LocalInterviewGuide) =>
      getStageQuestionPool(g, buildQuestLine(g).find((s) => s.id === 'final')!)[0];
    // easy vs hard companies get a different leading final-round question
    expect(finalOf(easyCo)).not.toBe(finalOf(hardCo));
  });
});

describe('buildSystemDesignBrief', () => {
  it('uses a guide system design topic when available', () => {
    const guide = makeGuide({ systemDesignTopics: ['Design a distributed rate limiter'] });
    const brief = buildSystemDesignBrief(guide);
    expect(brief.challengeId).toBe('guide-design-a-distributed-rate-limiter-0');
    expect(brief.challenge).toContain('rate limiter');
    expect(brief.category).toBe('System Design');
    expect(brief.focus).toContain('company-specific');
    expect(brief.requirements.length).toBeGreaterThanOrEqual(3);
    expect(brief.prompt).toContain('Requirements:');
  });

  it('falls back to a company-flavored challenge with no topics', () => {
    const guide = makeGuide({ company: 'Acme', systemDesignTopics: [] });
    const brief = buildSystemDesignBrief(guide);
    expect(brief.challenge).toContain('Acme');
  });

  it('normalizes a non-"design" topic into a design challenge', () => {
    const guide = makeGuide({ company: 'Acme', systemDesignTopics: ['E-commerce checkout systems'] });
    const brief = buildSystemDesignBrief(guide);
    expect(brief.challenge.toLowerCase()).toContain('design');
    expect(brief.challenge).toContain('Acme');
  });

  it('draws the topic-less fallback from the classic system design canon', () => {
    const brief = buildSystemDesignBrief(makeGuide({ company: 'Acme', systemDesignTopics: [] }));
    const canonTitles = SYSTEM_DESIGN_PATTERNS
      .filter((p) => p.category === 'System Design')
      .map((p) => p.title);
    expect(canonTitles.some((title) => brief.challenge.startsWith(title))).toBe(true);
  });

  it('builds a prompt from a selected system design challenge', () => {
    const guide = makeGuide({ company: 'FinCo', systemDesignTopics: [] });
    const financePrompt = SYSTEM_DESIGN_PATTERNS.find((p) => p.id === 'personal-finance')!;
    const brief = buildSystemDesignBrief(guide, financePrompt);
    expect(brief.challengeId).toBe('personal-finance');
    expect(brief.challenge).toContain('FinCo');
    expect(brief.prompt).toContain('Mobile System Design');
    expect(brief.prompt).toContain(financePrompt.focus);
  });
});

describe('getSystemDesignPool', () => {
  it('turns multiple guide topics into multiple company prompts', () => {
    const pool = getSystemDesignPool(makeGuide({
      systemDesignTopics: [
        'Design a low-latency market data platform',
        'Design portfolio rebalancing workflows',
      ],
    }));
    expect(pool[0].id).toBe('guide-design-a-low-latency-market-data-platform-0');
    expect(pool[1].id).toBe('guide-design-portfolio-rebalancing-workflows-1');
    expect(pool.length).toBeGreaterThanOrEqual(3);
  });

  it('ranks catalog prompts by company domain tags', () => {
    const pool = getSystemDesignPool(makeGuide({
      company: 'Wealthfront',
      slug: 'wealthfront',
      systemDesignTopics: [],
      codingTopics: ['portfolio', 'finance', 'tax lots'],
    }));
    expect(pool.map((p) => p.id)).toContain('personal-finance');
  });

  it('selects the first uncleared prompt and rotates after all are cleared', () => {
    const guide = makeGuide({
      systemDesignTopics: ['Design search indexing', 'Design offline sync'],
    });
    const pool = getSystemDesignPool(guide);
    expect(selectNextSystemDesignChallenge(guide, [pool[0].id]).id).toBe(pool[1].id);
    expect(selectNextSystemDesignChallenge(guide, pool.map((p) => p.id)).id).toBe(pool[0].id);
  });
});

describe('SYSTEM_DESIGN_PATTERNS (techinterview.org catalog)', () => {
  it('includes the classic system design canon', () => {
    const ids = SYSTEM_DESIGN_PATTERNS.filter((p) => p.category === 'System Design').map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(['url-shortener', 'twitter', 'rate-limiter', 'discord', 'news-feed']),
    );
  });

  it('includes a mobile system design track', () => {
    const mobile = SYSTEM_DESIGN_PATTERNS.filter((p) => p.category === 'Mobile System Design');
    expect(mobile.length).toBeGreaterThanOrEqual(10);
    expect(mobile.map((p) => p.id)).toEqual(
      expect.arrayContaining(['encrypted-messenger', 'public-transit']),
    );
  });

  it('has unique ids and a focus line for every pattern', () => {
    const ids = SYSTEM_DESIGN_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pattern of SYSTEM_DESIGN_PATTERNS) {
      expect(pattern.title.length).toBeGreaterThan(0);
      expect(pattern.focus.length).toBeGreaterThan(0);
    }
  });
});

describe('isStageCleared', () => {
  const stage = { ...buildQuestLine(makeGuide())[1] }; // coding

  /*
   * The threshold is read off the stage rather than written in.
   *
   * These asserted 75 — the per-stage value before Competition 2026 (#110)
   * unified every stage to 70 — so the test failed on a deliberate product
   * change and stayed red. Deriving it tests the rule (at or above clears,
   * below does not), which is what this function actually promises, and
   * survives the threshold moving again.
   */
  it('handles 0-100 scores', () => {
    expect(isStageCleared(stage.passThreshold, stage)).toBe(true);
    expect(isStageCleared(stage.passThreshold - 1, stage)).toBe(false);
  });

  it('handles 0-10 scores via normalization', () => {
    expect(isStageCleared(stage.passThreshold / 10, stage)).toBe(true);
    expect(isStageCleared((stage.passThreshold - 10) / 10, stage)).toBe(false);
  });

  it('handles missing scores', () => {
    expect(isStageCleared(undefined, stage)).toBe(false);
  });
});
