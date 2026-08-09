import { buildLocalInterviewGuidePrompt, getGuideQuestionPool } from './localInterviewGuideCore';
import type { LocalInterviewGuide } from './localInterviewGuideCore';
import { normalizeScore } from './gamification';
import {
  CompanyCategory,
  getCompanyCategory,
  getCategoryStageQuestions,
  isCategoryStageKind,
  resolveQuestDifficulty,
  CATEGORY_SYSTEM_DESIGN_ORDER,
} from './companyCategories';

export type QuestStageKind =
  | 'screening'
  | 'coding'
  | 'system_design'
  | 'behavioral'
  | 'values'
  | 'final';

export type QuestInterviewMode = 'Behavioral' | 'Technical' | 'Mixed' | 'Screening';

export interface QuestStage {
  id: QuestStageKind;
  title: string;
  description: string;
  mode: QuestInterviewMode;
  /** Normalized 0-100 score required to clear the stage. */
  passThreshold: number;
}

const STAGE_BLUEPRINTS: Record<QuestStageKind, Omit<QuestStage, 'passThreshold'>> = {
  screening: {
    id: 'screening',
    title: 'Recruiter screen',
    description: 'Background, motivation, and role fit — make a clean first impression.',
    mode: 'Screening',
  },
  coding: {
    id: 'coding',
    title: 'Coding round',
    description: 'Technical problem solving in the company\'s style.',
    mode: 'Technical',
  },
  system_design: {
    id: 'system_design',
    title: 'System design',
    description: 'Architecture, trade-offs, and scale.',
    mode: 'Technical',
  },
  behavioral: {
    id: 'behavioral',
    title: 'Behavioral round',
    description: 'Past experience, teamwork, and impact — STAR stories.',
    mode: 'Behavioral',
  },
  values: {
    id: 'values',
    title: 'Values round',
    description: 'Mission alignment and judgment on open-ended questions.',
    mode: 'Behavioral',
  },
  final: {
    id: 'final',
    title: 'Final round',
    description: 'Hiring manager wrap-up — everything can come up.',
    mode: 'Mixed',
  },
};

/**
 * Derive the canonical six-stage quest line for every company. Source guides
 * vary in how much of their interview loop they document, but an incomplete
 * guide must not make the product look like that company only has one or two
 * rounds. The per-company pool leads when available and the category banks
 * supply the remaining official practice prompts.
 */
export const buildQuestLine = (_guide: LocalInterviewGuide): QuestStage[] => {
  const kinds: QuestStageKind[] = [
    'screening',
    'coding',
    'system_design',
    'behavioral',
    'values',
    'final',
  ];

  return kinds.map((kind) => ({
    ...STAGE_BLUEPRINTS[kind],
    passThreshold: 70,
  }));
};

/** Interview prompt for one quest stage: full company context + stage focus. */
export const buildQuestStagePrompt = (guide: LocalInterviewGuide, stage: QuestStage): string => {
  const base = buildLocalInterviewGuidePrompt(guide, {
    mode: stage.mode,
    difficulty: 'Standard',
    duration: '15 min',
  });

  return [
    base,
    '',
    `This session is the "${stage.title}" stage of the ${guide.company} interview loop.`,
    `Stage focus: ${stage.description}`,
    'Stay in character for this stage only — do not mix in question types that belong to other stages.',
  ].join('\n');
};

/** Resolve a guide to its interview-style category (with keyword fallback). */
export const resolveGuideCategory = (guide: LocalInterviewGuide): CompanyCategory =>
  getCompanyCategory({
    slug: guide.slug,
    company: guide.company,
    hintText: [
      ...guide.interviewStages,
      ...guide.codingTopics,
      ...guide.systemDesignTopics,
      ...guide.behavioralTopics,
      ...guide.tips,
    ].join(' '),
  });

const dedupeConcat = (...lists: string[][]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const q of list) {
      if (q && !seen.has(q)) { seen.add(q); out.push(q); }
    }
  }
  return out;
};

/**
 * Question pool for a stage. The lead source is chosen per stage so the pool's
 * first questions match the round:
 *  - screening: the light, get-to-know-you category bank leads (NOT the guide's
 *    deep behavioral questions) — a recruiter screen, not a technical round.
 *  - values: the company's own values questions lead, then the category bank.
 *  - final: the tailored final-round category bank leads, then guide questions.
 * Difficulty tier is drawn from the company's rating (screening capped light).
 * The generic company-name fallback is only reached when everything is empty.
 */
export const getStageQuestionPool = (guide: LocalInterviewGuide, stage: QuestStage): string[] => {
  const guidePool = getGuideQuestionPool(guide, stage.mode);

  if (isCategoryStageKind(stage.id)) {
    const category = resolveGuideCategory(guide);
    // Screening stays light (capped at medium); other rounds scale with rating.
    const difficulty = stage.id === 'screening'
      ? resolveQuestDifficulty(Math.min(guide.difficulty ?? 5, 6))
      : resolveQuestDifficulty(guide.difficulty);
    const categoryQs = getCategoryStageQuestions(guide.company, category, stage.id, difficulty);
    const guideValues = guide.sampleQuestions?.values ?? [];

    if (stage.id === 'behavioral') {
      // company-specific behavioral questions lead; the difficulty-tiered
      // category behavioral bank backfills so the round scales with the company.
      const guideBehavioral = guide.sampleQuestions?.behavioral ?? [];
      return dedupeConcat(guideBehavioral, categoryQs, guidePool);
    }
    if (stage.id === 'values') {
      // company-specific values lead; category values + guide pool backfill
      return dedupeConcat(guideValues, categoryQs, guidePool);
    }
    if (stage.id === 'screening') {
      // light category rapport leads; only light guide values may backfill —
      // deliberately NOT the guide's deep behavioral questions.
      return dedupeConcat(categoryQs, guideValues);
    }
    // final: tailored final-round bank leads, then guide questions backfill.
    return dedupeConcat(categoryQs, guidePool);
  }

  return guidePool;
};

/**
 * Curated per-stage fallback questions, templated with the company name.
 * Used when the guide has too few questions and AI generation is unavailable,
 * so a quest stage can always start.
 */
export const getStageFallbackQuestions = (company: string, stage: QuestStage): string[] => {
  switch (stage.id) {
    case 'screening':
      return [
        `Walk me through your background and what brings you to ${company}.`,
        `What do you know about ${company}, and why do you want to work here?`,
        'What are you looking for in your next role?',
        'What is your proudest accomplishment in your current or most recent position?',
        'What is your timeline, and are you interviewing elsewhere?',
      ];
    case 'coding':
      return [
        'Given an array of integers, find the two numbers that add up to a target value. Talk through your approach, complexity, and edge cases.',
        'Design a data structure that supports insert, delete, and get-random in constant time. Explain your reasoning.',
        'Given a string, find the length of the longest substring without repeating characters. Walk through your solution.',
        'How would you detect a cycle in a linked list? Compare at least two approaches.',
        'Describe how you would test the solution you just wrote. What edge cases matter most?',
      ];
    case 'system_design':
      return [
        // New techinterview.org canon prompts on top…
        'Design Twitter’s home timeline. Compare fan-out on write versus read, and how the follow graph shapes it.',
        'Design a real-time chat system like Discord. Cover message delivery, presence, and channel fan-out.',
        // …existing prompts preserved below.
        `Design a service at ${company}-scale that shortens URLs. Cover the API, storage, and how you handle hot keys.`,
        'Design a rate limiter for a public API. Discuss algorithms, distributed coordination, and failure modes.',
        'How would you design a news feed that serves millions of users? Focus on fan-out strategy and caching.',
        'A service you own suddenly sees 10x traffic. Walk me through how you diagnose and scale it.',
      ];
    case 'behavioral':
      return [
        'Tell me about a time you disagreed with a teammate or manager. How did it resolve?',
        'Describe a project that failed or fell short. What did you learn and change afterward?',
        'Tell me about a time you had to deliver under a tight deadline. What trade-offs did you make?',
        'Give me an example of when you took ownership of something outside your job description.',
        'Describe the piece of work you are most proud of. What was your specific contribution?',
      ];
    case 'values':
      return [
        `Why ${company} specifically, rather than other companies in this space?`,
        'Tell me about a time you had to make a decision where the right thing and the easy thing were different.',
        'How do you decide when to move fast versus when to be careful?',
        'What kind of team culture brings out your best work, and what have you done to build it?',
      ];
    case 'final':
      return [
        'Looking back at the whole process, what role do you see yourself playing here in your first six months?',
        'What questions do you have about the team, the roadmap, or how we work?',
        'Tell me about the hardest technical or product decision you have made. Would you make it again?',
        'What would make you turn down an offer from us?',
        'Is there anything we have not asked about that you think we should know?',
      ];
  }
};

export const isStageCleared = (bestScore: number | undefined, stage: QuestStage): boolean =>
  bestScore !== undefined && normalizeScore(bestScore) >= stage.passThreshold;

export interface SystemDesignBrief {
  challengeId: string;
  challenge: string;
  category: SystemDesignCategory;
  focus: string;
  requirements: string[];
  /** Full text passed to the vision grader. */
  prompt: string;
}

/**
 * Two design tracks, mirroring techinterview.org/category/system-design:
 * classic distributed-systems "System Design" and the "Mobile System Design"
 * track.
 */
export type SystemDesignCategory = 'System Design' | 'Mobile System Design';

export interface SystemDesignPattern {
  id: string;
  /** Canonical challenge title, e.g. "Design a URL shortener". */
  title: string;
  category: SystemDesignCategory;
  /** What this design exercises — used as the brief's focus line. */
  focus: string;
  /** Domain tags matched against the company's guide to rank the pool. */
  tags?: string[];
}

/**
 * Canonical system design catalog, mirroring the problem set on
 * techinterview.org/category/system-design: the classic "system design canon"
 * (URL shortener, Twitter, rate limiter, Discord, news feed) plus the full
 * Mobile System Design track. Used to build whiteboard briefs when a company
 * guide carries no system-design topic of its own.
 */
export const SYSTEM_DESIGN_PATTERNS: SystemDesignPattern[] = [
  // The system design canon
  { id: 'url-shortener', title: 'Design a URL shortener', category: 'System Design', focus: 'key generation, storage, redirects, and hot-key handling', tags: ['storage', 'redirect', 'link', 'scale', 'cache'] },
  { id: 'twitter', title: 'Design Twitter', category: 'System Design', focus: 'the home timeline, fan-out on write vs read, and the follow graph', tags: ['social', 'feed', 'timeline', 'graph', 'ranking'] },
  { id: 'rate-limiter', title: 'Design a rate limiter', category: 'System Design', focus: 'token-bucket vs sliding-window, distributed coordination, and failure modes', tags: ['api', 'infra', 'platform', 'security', 'distributed', 'traffic'] },
  { id: 'discord', title: 'Design Discord', category: 'System Design', focus: 'real-time messaging, presence, and channel fan-out at scale', tags: ['realtime', 'chat', 'messaging', 'presence', 'streaming'] },
  { id: 'news-feed', title: 'Design a news feed', category: 'System Design', focus: 'ranking, fan-out strategy, and caching for millions of users', tags: ['feed', 'ranking', 'content', 'social', 'recommendation'] },
  // Mobile system design track
  { id: 'smart-home-hub', title: 'Design a mobile smart home hub (Google Home / Alexa)', category: 'Mobile System Design', focus: 'device pairing, offline control, and real-time state sync', tags: ['iot', 'hardware', 'device', 'home', 'realtime'] },
  { id: 'voice-memos', title: 'Design a mobile voice memos / audio recording app', category: 'Mobile System Design', focus: 'local capture, background upload, and cross-device sync', tags: ['audio', 'voice', 'recording', 'sync', 'mobile'] },
  { id: 'dating-app', title: 'Design a mobile Hinge-style dating app', category: 'Mobile System Design', focus: 'the match feed, geo queries, and messaging', tags: ['dating', 'social', 'feed', 'geo', 'messaging'] },
  { id: 'bike-share', title: 'Design a mobile bike-share / scooter rental app', category: 'Mobile System Design', focus: 'live vehicle locations, reservations, and trip lifecycle', tags: ['geo', 'map', 'fleet', 'reservation', 'iot'] },
  { id: 'event-ticketing', title: 'Design a mobile event ticketing app (Ticketmaster, AXS, DICE)', category: 'Mobile System Design', focus: 'inventory holds, high-contention checkout, and offline tickets', tags: ['ticket', 'event', 'checkout', 'inventory', 'queue'] },
  { id: 'kids-education', title: "Design a mobile children's educational app", category: 'Mobile System Design', focus: 'profiles, time limits, and offline lesson content', tags: ['education', 'learning', 'child', 'profile', 'offline'] },
  { id: 'sky-map-ar', title: 'Design a mobile astronomy / sky map AR app', category: 'Mobile System Design', focus: 'sensor fusion, offline star catalogs, and AR overlay', tags: ['ar', 'sensor', 'camera', 'offline', 'map'] },
  { id: 'manga-reader', title: 'Design a mobile comics / manga reader', category: 'Mobile System Design', focus: 'image prefetching, offline downloads, and reading progress sync', tags: ['content', 'image', 'reader', 'offline', 'media'] },
  { id: 'online-course', title: 'Design a mobile online course app (Coursera-style)', category: 'Mobile System Design', focus: 'video streaming, offline downloads, and progress tracking', tags: ['education', 'learning', 'video', 'streaming', 'progress'] },
  { id: 'personal-finance', title: 'Design a mobile personal finance app (Mint-style aggregation)', category: 'Mobile System Design', focus: 'account aggregation, sync, and sensitive-data security', tags: ['finance', 'fintech', 'bank', 'aggregation', 'security'] },
  { id: 'fitness-coach', title: 'Design a mobile workout / fitness coaching app', category: 'Mobile System Design', focus: 'workout tracking, wearable sync, and offline sessions', tags: ['fitness', 'health', 'wearable', 'tracking', 'offline'] },
  { id: 'translation-camera', title: 'Design a mobile translation camera (Google Lens-style)', category: 'Mobile System Design', focus: 'on-device OCR, real-time translation, and model updates', tags: ['camera', 'ocr', 'ai', 'ml', 'translation', 'vision'] },
  { id: 'encrypted-messenger', title: 'Design a mobile encrypted messenger (Signal-style)', category: 'Mobile System Design', focus: 'end-to-end encryption, multi-device sync, and message delivery', tags: ['security', 'privacy', 'messaging', 'chat', 'encryption'] },
  { id: 'public-transit', title: 'Design a mobile public transit app', category: 'Mobile System Design', focus: 'real-time arrivals, route planning, alerts, and offline maps', tags: ['transit', 'map', 'geo', 'realtime', 'routing'] },
  { id: 'travel-booking', title: 'Design a mobile travel booking app', category: 'Mobile System Design', focus: 'search, itinerary storage, and offline boarding passes', tags: ['travel', 'booking', 'search', 'itinerary', 'checkout'] },
  { id: 'mobile-browser', title: 'Design a mobile browser (Chrome / Safari on iOS)', category: 'Mobile System Design', focus: 'tab management, history sync, and rendering/networking', tags: ['browser', 'frontend', 'networking', 'sync', 'storage'] },
];

export const COMPANY_SYSTEM_DESIGN_POOL_SIZE = 5;

/** Stable tiny hash so a company keeps the same fallback design between visits. */
const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Deterministically pick a classic-canon design (URL shortener, Twitter, rate
 * limiter, Discord, news feed) for a company and phrase it with the company
 * name, so a quest always has a real system-design prompt to draw.
 */
const companyFlavoredCanon = (company: string): SystemDesignPattern => {
  const canon = SYSTEM_DESIGN_PATTERNS.filter((p) => p.category === 'System Design');
  const pattern = canon[hashString(company) % canon.length];
  return pattern;
};

/**
 * Turn raw guide topics into stable challenge objects. A company guide may
 * name several system-design topics; each becomes a distinct whiteboard prompt.
 */
const slugify = (value: string): string => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'system-design'
);

const makeGuideSystemDesignPattern = (
  guide: LocalInterviewGuide,
  topic: string,
  index: number,
): SystemDesignPattern => ({
  id: `guide-${slugify(topic)}-${index}`,
  title: cleanChallenge(topic, guide.company),
  category: 'System Design',
  focus: 'the company-specific prompt from this interview guide',
  tags: topic.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
});

const getSystemDesignMatchText = (guide: LocalInterviewGuide): string => [
  guide.company,
  guide.slug,
  ...guide.interviewStages,
  ...guide.systemDesignTopics,
  ...guide.codingTopics,
  ...guide.behavioralTopics,
  ...guide.tips,
  ...(guide.sampleQuestions?.systemDesign ?? []),
  ...(guide.sampleQuestions?.coding ?? []),
].join(' ').toLowerCase();

const getSystemDesignMatchScore = (
  pattern: SystemDesignPattern,
  text: string,
  tokens: Set<string>,
): number => (
  (pattern.tags ?? []).reduce((score, tag) => {
    const matched = tag.length <= 3 ? tokens.has(tag) : text.includes(tag);
    return score + (matched ? 1 : 0);
  }, 0)
);

export const getSystemDesignPatternById = (id: string): SystemDesignPattern | undefined =>
  SYSTEM_DESIGN_PATTERNS.find((p) => p.id === id);

export const getAllSystemDesignPatterns = (): SystemDesignPattern[] => [...SYSTEM_DESIGN_PATTERNS];

/**
 * Build the company's system-design pool. Guide topics come first because they
 * are the best available company signal; the canonical techinterview.org
 * catalog fills the rest, ranked by domain tags and a deterministic fallback.
 */
export const getSystemDesignPool = (guide: LocalInterviewGuide): SystemDesignPattern[] => {
  const ordered: SystemDesignPattern[] = [];
  const seen = new Set<string>();
  const push = (pattern: SystemDesignPattern | undefined) => {
    if (pattern && !seen.has(pattern.id)) {
      seen.add(pattern.id);
      ordered.push(pattern);
    }
  };

  guide.systemDesignTopics
    .filter((topic) => topic.trim().length > 0)
    .forEach((topic, index) => push(makeGuideSystemDesignPattern(guide, topic, index)));

  // Category-preferred canon designs come next: a strong company-type signal
  // when the guide names no system-design topics of its own.
  const category = resolveGuideCategory(guide);
  (CATEGORY_SYSTEM_DESIGN_ORDER[category] ?? []).forEach((id) => push(getSystemDesignPatternById(id)));

  const text = getSystemDesignMatchText(guide);
  const tokens = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
  const seed = hashString(guide.company);
  const scored = SYSTEM_DESIGN_PATTERNS
    .map((pattern, index) => ({ pattern, index, score: getSystemDesignMatchScore(pattern, text, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || ((seed + a.index) % 17) - ((seed + b.index) % 17));

  for (const item of scored) push(item.pattern);

  const fallback = companyFlavoredCanon(guide.company);
  const fallbackIndex = SYSTEM_DESIGN_PATTERNS.findIndex((p) => p.id === fallback.id);
  for (let i = 0; i < SYSTEM_DESIGN_PATTERNS.length; i += 1) {
    push(SYSTEM_DESIGN_PATTERNS[(fallbackIndex + i) % SYSTEM_DESIGN_PATTERNS.length]);
  }

  return ordered.slice(0, COMPANY_SYSTEM_DESIGN_POOL_SIZE);
};

export const selectNextSystemDesignChallenge = (
  guide: LocalInterviewGuide,
  clearedChallengeIds: Iterable<string> = [],
): SystemDesignPattern => {
  const pool = getSystemDesignPool(guide);
  const cleared = new Set(clearedChallengeIds);
  const next = pool.find((p) => !cleared.has(p.id));
  if (next) return next;
  return pool[cleared.size % pool.length];
};

const formatSystemDesignChallenge = (guide: LocalInterviewGuide, challenge: SystemDesignPattern): string => {
  if (challenge.id.startsWith('guide-')) return challenge.title;
  return `${challenge.title} for ${guide.company}.`;
};

/**
 * Build a system design challenge for the whiteboard stage. Pass a specific
 * challenge to serve it; otherwise defaults to the best company-fit prompt.
 */
export const buildSystemDesignBrief = (
  guide: LocalInterviewGuide,
  challenge?: SystemDesignPattern,
): SystemDesignBrief => {
  const chosen = challenge ?? getSystemDesignPool(guide)[0];
  const challengeText = formatSystemDesignChallenge(guide, chosen);

  const requirements = [
    'Show the major components and how requests flow between them.',
    'Include data storage and explain what each store holds.',
    'Handle scale: caching, load balancing, or partitioning where it matters.',
    'Call out at least one bottleneck or failure mode and how you address it.',
  ];

  const prompt = [
    `Challenge: ${challengeText}`,
    `Category: ${chosen.category}`,
    `Focus: ${chosen.focus}`,
    '',
    'Requirements:',
    ...requirements.map((r) => `- ${r}`),
    '',
    `Design difficulty target: ${guide.difficulty ? `${guide.difficulty}/10` : 'standard'}.`,
  ].join('\n');

  return {
    challengeId: chosen.id,
    challenge: challengeText,
    category: chosen.category,
    focus: chosen.focus,
    requirements,
    prompt,
  };
};

/** Turn a raw guide topic into a "Design ..." challenge sentence. */
const cleanChallenge = (topic: string, company: string): string => {
  const trimmed = topic.split(/[.\n]/)[0].trim();
  if (/^design\b/i.test(trimmed)) return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  return `Design ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)} at ${company} scale.`;
};
