/**
 * Canonical quest-question inventory totals.
 *
 * Shared by the Web summaries generator and the iOS catalog generator so the
 * two surfaces can never advertise different numbers. The counting rule mirrors
 * scripts/generate-interview-guide-summaries.mjs exactly: the full quest
 * inventory = each company's own guide questions PLUS the category-bank
 * questions (all difficulty tiers) materialized for that company, deduped the
 * same way the quest tracker and the Firestore seed do.
 */

const TIERS = ['easy', 'medium', 'hard'];

/** Category-bank questions for one company + stage, across all tiers. */
export const categoryQuestions = (guide, banks, stage) => {
  const category = banks.companyCategory?.[guide.slug];
  if (!category) throw new Error(`Missing category assignment for ${guide.slug}.`);
  return TIERS.flatMap((tier) =>
    (banks.questionBanks?.[category]?.[stage]?.[tier] ?? [])
      .map((question) => String(question).replace(/\{company\}/g, guide.company)),
  );
};

/** Full quest inventory for one company (what the studio advertises). */
export const questQuestionCount = (guide, banks) => {
  const samples = guide.sampleQuestions ?? {};
  const behavioral = samples.behavioral ?? [];
  const values = samples.values ?? [];
  return [
    ...categoryQuestions(guide, banks, 'screening'),
    ...(samples.coding ?? []),
    ...(samples.systemDesign ?? []),
    ...behavioral,
    ...categoryQuestions(guide, banks, 'behavioral').filter((question) => !behavioral.includes(question)),
    ...values,
    ...categoryQuestions(guide, banks, 'values').filter((question) => !values.includes(question)),
    ...categoryQuestions(guide, banks, 'final'),
  ].length;
};

/**
 * Totals advertised in product UI (Web studio and the iOS app).
 *   companies — number of company guides
 *   stages    — published interview stages across all guides
 *   questions — full quest question inventory (guide + category banks)
 */
export const computeQuestTotals = (guides, banks) => ({
  companies: guides.length,
  stages: guides.reduce((count, guide) => count + (guide.interviewStages?.length ?? 0), 0),
  questions: guides.reduce((count, guide) => count + questQuestionCount(guide, banks), 0),
});
