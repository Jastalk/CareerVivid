import { InterviewGuideSummary, INTERVIEW_GUIDE_SUMMARIES } from '../data/interviewGuideSummaries.generated';
import type { LocalInterviewGuide } from './localInterviewGuideCore';

export type { LocalInterviewGuide, LocalQuestionType } from './localInterviewGuideCore';
export {
  buildLocalInterviewGuidePrompt,
  getGuideQuestionPool,
  getQuestionTargetCount,
  isCandidateDirectedQuestion,
} from './localInterviewGuideCore';

const guideModules = import.meta.glob('../../data/interview-guides/*.json') as Record<
  string,
  () => Promise<{ default: LocalInterviewGuide }>
>;

export const getFeaturedInterviewGuideSummaries = (limit = 12): InterviewGuideSummary[] => (
  [...INTERVIEW_GUIDE_SUMMARIES]
    .sort((a, b) => {
      const bScore = b.questionCount * 4 + b.stageCount * 2 + b.tipCount + (b.difficulty ?? 0);
      const aScore = a.questionCount * 4 + a.stageCount * 2 + a.tipCount + (a.difficulty ?? 0);
      return bScore - aScore || a.company.localeCompare(b.company);
    })
    .slice(0, limit)
);

export const searchInterviewGuideSummaries = (query: string, limit = 12): InterviewGuideSummary[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return getFeaturedInterviewGuideSummaries(limit);

  return INTERVIEW_GUIDE_SUMMARIES
    .filter((guide) => (
      guide.company.toLowerCase().includes(normalizedQuery)
      || guide.slug.toLowerCase().includes(normalizedQuery)
      || guide.topics.some((topic) => topic.toLowerCase().includes(normalizedQuery))
    ))
    .sort((a, b) => a.company.localeCompare(b.company))
    .slice(0, limit);
};

export interface GuideCategory {
  id: string;
  label: string;
  slugs: Set<string> | null; // null = all companies
}

const BIG_TECH_SLUGS = new Set([
  'adobe', 'amazon', 'apple', 'cisco', 'google', 'meta-facebook', 'microsoft',
  'netflix', 'oracle-interview', 'salesforce', 'sap', 'servicenow',
]);

const AI_LAB_SLUGS = new Set([
  'anthropic', 'anyscale-interview-guide', 'black-forest-labs-interview-guide',
  'character-ai-interview-guide', 'cohere', 'cursor', 'decagon-interview-guide',
  'deepgram-interview-guide', 'elevenlabs-interview-guide', 'fireworks-ai',
  'glean-interview-guide', 'harvey-interview-guide', 'hippocratic-ai-interview-guide',
  'hugging-face-interview-guide', 'lambda-labs-interview-guide', 'langchain',
  'llamaindex-interview-guide', 'mistral-ai-interview-guide', 'modal', 'motherduck',
  'openai', 'perplexity', 'pika-labs-interview-guide', 'pinecone-interview-guide',
  'qdrant-interview-guide', 'reka-ai-interview-guide', 'replicate',
  'runway-interview-guide', 'sakana-ai-interview-guide', 'scale-ai',
  'sierra-interview-guide', 'stability-ai-interview-guide', 'suno-interview-guide',
  'tempus-ai-interview-guide', 'together-ai', 'turso', 'weaviate-interview-guide', 'xai',
]);

const FINTECH_SLUGS = new Set([
  'adyen-interview-guide', 'affirm-interview-guide', 'akuna-capital-interview-guide',
  'american-express-interview-guide', 'aqr-capital-management-interview-guide',
  'bank-of-america-bofa-securities-interview-guide', 'blackrock-interview-guide',
  'block', 'bloomberg', 'brex', 'bridgewater-associates-interview-guide',
  'capital-one-interview-guide', 'carta-interview-guide', 'chime',
  'crypto-trio-circle-ripple-chainalysis-interview-guide',
  'citadel-hedge-fund-interview-guide', 'citadel-securities', 'citi-interview-guide',
  'coinbase', 'de-shaw', 'deel', 'deutsche-bank-interview-guide', 'drw-interview-guide',
  'evercore-interview-guide', 'fidelity-investments-interview-guide',
  'flow-traders-interview-guide', 'galaxy-digital-interview-guide',
  'goldman-sachs-strats-engineering-interview-guide', 'gusto-interview-guide',
  'hudson-river-trading', 'imc-trading-interview-guide', 'jane-street',
  'jpmorgan-tech-quant-interview-guide', 'jump-trading', 'klarna-interview-guide',
  'kraken-interview-guide', 'lazard-interview-guide', 'man-group-interview-guide',
  'marqeta-interview-guide', 'mercury', 'millennium-management-interview-guide',
  'morgan-stanley-tech-quant-interview-guide', 'optiver-interview-guide', 'paypal',
  'plaid', 'point72-interview-guide', 'ramp', 'renaissance-technologies-interview-guide',
  'robinhood', 'sig-susquehanna-interview-guide', 'sofi-interview-guide',
  'state-street-interview-guide', 'stripe', 'tower-research-capital-interview-guide',
  'two-sigma', 'ubs-interview-guide', 'vanguard-interview-guide',
  'virtu-financial-interview-guide', 'wealthfront', 'wells-fargo-interview-guide',
  'wintermute-interview-guide', 'wise-interview-guide', 'xtx-markets-interview-guide',
]);

const HARDWARE_SLUGS = new Set([
  'amd-interview-guide', 'anduril-interview-guide', 'apple-silicon-team-interview-guide',
  'blue-origin-interview-guide', 'broadcom-interview-guide',
  'defense-primes-lockheed-northrop-raytheon-interview-guide', 'intel-interview-guide',
  'nvidia', 'qualcomm-interview-guide', 'samsung-electronics-interview-guide',
  'sony-interview-guide', 'spacex-interview-guide', 'tesla',
]);

export const GUIDE_CATEGORIES: GuideCategory[] = [
  { id: 'all', label: 'All', slugs: null },
  { id: 'bigtech', label: 'Big Tech', slugs: BIG_TECH_SLUGS },
  { id: 'ai', label: 'AI Labs', slugs: AI_LAB_SLUGS },
  { id: 'fintech', label: 'Fintech & Quant', slugs: FINTECH_SLUGS },
  { id: 'hardware', label: 'Hardware', slugs: HARDWARE_SLUGS },
];

const guideRichnessScore = (guide: InterviewGuideSummary): number => (
  guide.questionCount * 4 + guide.stageCount * 2 + guide.tipCount + (guide.difficulty ?? 0)
);

/**
 * Filter guides by free-text query + category. Returns the visible page
 * plus the total match count so callers can render a "show more" control.
 */
export const filterInterviewGuideSummaries = (
  options: { query?: string; categoryId?: string; limit?: number } = {},
): { guides: InterviewGuideSummary[]; total: number } => {
  const { query = '', categoryId = 'all', limit = 12 } = options;
  const normalizedQuery = query.trim().toLowerCase();
  const category = GUIDE_CATEGORIES.find((c) => c.id === categoryId);

  let matches = INTERVIEW_GUIDE_SUMMARIES.filter((guide) => (
    !category?.slugs || category.slugs.has(guide.slug)
  ));

  if (normalizedQuery) {
    matches = matches.filter((guide) => (
      guide.company.toLowerCase().includes(normalizedQuery)
      || guide.slug.toLowerCase().includes(normalizedQuery)
      || guide.topics.some((topic) => topic.toLowerCase().includes(normalizedQuery))
    ));
  }

  const sorted = matches.sort((a, b) => {
    if (normalizedQuery) {
      // Name matches surface above topic-only matches
      const aName = a.company.toLowerCase().startsWith(normalizedQuery) ? 0 : a.company.toLowerCase().includes(normalizedQuery) ? 1 : 2;
      const bName = b.company.toLowerCase().startsWith(normalizedQuery) ? 0 : b.company.toLowerCase().includes(normalizedQuery) ? 1 : 2;
      if (aName !== bName) return aName - bName;
    }
    return guideRichnessScore(b) - guideRichnessScore(a) || a.company.localeCompare(b.company);
  });

  return { guides: sorted.slice(0, limit), total: sorted.length };
};

/**
 * Shorten a raw topic string into chip-sized text: cuts at the first
 * parenthetical/sentence break and caps the length.
 */
export const formatGuideTopicChip = (topic: string, maxLength = 46): string => {
  let text = topic.split(/\s+[—–-]\s+/)[0].split(' (')[0];
  const sentenceEnd = text.indexOf('. ');
  if (sentenceEnd > 12) text = text.slice(0, sentenceEnd);
  text = text.replace(/[.:,;]\s*$/, '').trim();
  if (text.length > maxLength) {
    const clipped = text.slice(0, maxLength);
    text = `${clipped.slice(0, Math.max(clipped.lastIndexOf(' '), 20))}…`;
  }
  return text;
};

/**
 * Resolve a company name to its quest guide slug (synchronously, by checking
 * the bundled guide modules). Returns null when no guide exists.
 */
export const findQuestSlugForCompany = (company?: string): string | null => {
  if (!company) return null;
  const base = company.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!base) return null;
  for (const slug of [base, `${base}-interview-guide`]) {
    if (guideModules[`../../data/interview-guides/${slug}.json`]) return slug;
  }
  return null;
};

export const loadLocalInterviewGuide = async (slug: string): Promise<LocalInterviewGuide | null> => {
  const loader = guideModules[`../../data/interview-guides/${slug}.json`];
  if (!loader) return null;
  const module = await loader();
  return module.default;
};
