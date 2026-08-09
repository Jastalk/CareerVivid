export type LocalQuestionType = 'coding' | 'behavioral' | 'systemDesign' | 'values' | 'other';

export interface LocalInterviewGuide {
  company: string;
  slug: string;
  url: string;
  scrapedAt: string;
  interviewStages: string[];
  codingTopics: string[];
  systemDesignTopics: string[];
  behavioralTopics: string[];
  sampleQuestions: Record<LocalQuestionType, string[]>;
  difficulty: number | null;
  tips: string[];
  compensation: string[] | null;
  rawSummary?: string;
}

/**
 * Detects questions written from the candidate's point of view. These come
 * from scraped FAQ content and must never be asked by the interviewer.
 */
const CANDIDATE_QUESTION_PATTERNS: RegExp[] = [
  /^(do|can|will|should|would|am|are|is) i\b/i,
  /\bdo i (need|have to|get)\b/i,
  /\bhow (hard|difficult|tough|intense) (is|are)\b/i,
  /\bhow does .+ compare (to|with|against)\b/i,
  /\b(is|are) (it|they|the \w+) (worth|really|actually|still)\b/i,
  /\bworth (joining|it|the equity)\b/i,
  /\bwhat('s| is) it like\b/i,
  /\bwhat('s| is) (the )?(engineering|company|team) (culture|bar)\b/i,
  /\bremote.friendly\b|\bwork.life balance\b|\bwlb\b/i,
  /\b(ipo|acquisition|merger|layoffs?|funding|valuation|stock price|equity)\b.*\b(outlook|worth|valuable|changed|affect|impact|going|happening|recovery)\b/i,
  /\bhow (has|did) .+ (acquisition|merger|deal|ipo) (change|affect|impact)/i,
  /\bwhat('s| is) happening\b/i,
  /\bstill (hiring|worth|growing)\b/i,
  /\b(the|their) (interviews?|coding rounds?|onsite|process|loop)\b.*\breally\b/i,
  /\bhow long (does|is) (the )?(process|loop|interview)\b/i,
  /\b(lowball|down.?level|negotiat)/i,
  /\b(comp|compensation|salary|pay|equity|rsu)s?\b.*\b(good|competitive|fair|top|real)\b/i,
];

export const isCandidateDirectedQuestion = (question: string): boolean =>
  CANDIDATE_QUESTION_PATTERNS.some((pattern) => pattern.test(question));

export const getGuideQuestionPool = (guide: LocalInterviewGuide, mode: string): string[] => {
  const questions: Partial<Record<LocalQuestionType, string[]>> = guide.sampleQuestions || {};
  const modeKey = mode.toLowerCase();

  const preferred =
    modeKey === 'technical'
      ? [...(questions.coding || []), ...(questions.systemDesign || [])]
      : modeKey === 'behavioral'
        ? [...(questions.behavioral || []), ...(questions.values || [])]
        : modeKey === 'screening'
          ? [...(questions.values || []), ...(questions.behavioral || [])]
          : [
              ...(questions.coding || []),
              ...(questions.systemDesign || []),
              ...(questions.behavioral || []),
              ...(questions.values || []),
            ];

  const fallback = [
    ...(questions.coding || []),
    ...(questions.systemDesign || []),
    ...(questions.behavioral || []),
    ...(questions.values || []),
  ];

  return Array.from(new Set(preferred.length ? preferred : fallback))
    .filter(Boolean)
    .filter((question) => !isCandidateDirectedQuestion(question));
};

export const getQuestionTargetCount = (duration: string): number => {
  if (duration.startsWith('30')) return 8;
  if (duration.startsWith('15')) return 5;
  return 3;
};

export const buildLocalInterviewGuidePrompt = (
  guide: LocalInterviewGuide,
  setup: { mode: string; difficulty: string; duration: string },
): string => {
  const lines = [
    `Company: ${guide.company}`,
    `Source: ${guide.url}`,
    `Mode: ${setup.mode}`,
    `Difficulty: ${setup.difficulty}`,
    `Target duration: ${setup.duration}`,
    `Company difficulty: ${guide.difficulty ? `${guide.difficulty}/10` : 'not rated'}`,
    '',
    'Interview stages:',
    ...(guide.interviewStages.length ? guide.interviewStages.map((stage) => `- ${stage}`) : ['- No published stages available.']),
    '',
    'Coding topics:',
    ...(guide.codingTopics.length ? guide.codingTopics.map((topic) => `- ${topic}`) : ['- No published coding topics available.']),
    '',
    'System design topics:',
    ...(guide.systemDesignTopics.length ? guide.systemDesignTopics.map((topic) => `- ${topic}`) : ['- No published system design topics available.']),
    '',
    'Behavioral focus:',
    ...(guide.behavioralTopics.length ? guide.behavioralTopics.map((topic) => `- ${topic}`) : ['- No published behavioral topics available.']),
    '',
    'Preparation tips:',
    ...(guide.tips.length ? guide.tips.slice(0, 6).map((tip) => `- ${tip}`) : ['- Use company stage and topic context to prepare.']),
    '',
    'Use this company guide to run a realistic mock interview. Ask practical follow-up questions, keep the session focused, and adapt to the candidate answers.',
  ];

  return lines.join('\n');
};
