import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildIncrementalSyncPlan,
  buildQuestionSyncManifest,
} from './seed-interview-guides.mjs';

const guides = [
  { slug: 'alpha', company: 'Alpha', sampleQuestions: { coding: ['a'] } },
  { slug: 'beta', company: 'Beta', sampleQuestions: { coding: ['b'] } },
  { slug: 'gamma', company: 'Gamma', sampleQuestions: { coding: ['c'] } },
];

const banks = {
  companyCategory: { alpha: 'consumer', beta: 'consumer', gamma: 'infra' },
  questionBanks: {
    consumer: { screening: { easy: ['consumer question'] } },
    infra: { screening: { easy: ['infra question'] } },
  },
  systemDesignOrder: { consumer: ['url-shortener'], infra: ['rate-limiter'] },
};

function manifestFor(nextGuides = guides, nextBanks = banks) {
  return buildQuestionSyncManifest(nextGuides, nextBanks);
}

test('initial manifest seeds every guide and category bank', () => {
  const plan = buildIncrementalSyncPlan(manifestFor(), null);
  assert.deepEqual(plan.guideSlugs, ['alpha', 'beta', 'gamma']);
  assert.deepEqual(plan.bankCategories, ['consumer', 'infra']);
  assert.deepEqual(plan.removedGuideSlugs, []);
});

test('unchanged manifest performs no Firestore work', () => {
  const current = manifestFor();
  const plan = buildIncrementalSyncPlan(current, current);
  assert.deepEqual(plan.guideSlugs, []);
  assert.deepEqual(plan.bankCategories, []);
  assert.deepEqual(plan.removedGuideSlugs, []);
});

test('a guide edit targets only that guide', () => {
  const editedGuides = guides.map((guide) => guide.slug === 'beta'
    ? { ...guide, sampleQuestions: { coding: ['updated'] } }
    : guide);
  const plan = buildIncrementalSyncPlan(manifestFor(editedGuides), manifestFor());
  assert.deepEqual(plan.guideSlugs, ['beta']);
  assert.deepEqual(plan.bankCategories, []);
});

test('a category-bank edit targets its bank and dependent guides', () => {
  const editedBanks = structuredClone(banks);
  editedBanks.questionBanks.consumer.screening.easy.push('another consumer question');
  const plan = buildIncrementalSyncPlan(manifestFor(guides, editedBanks), manifestFor());
  assert.deepEqual(plan.guideSlugs, ['alpha', 'beta']);
  assert.deepEqual(plan.bankCategories, ['consumer']);
});

test('a category reassignment updates the moved guide and both bank memberships', () => {
  const editedBanks = structuredClone(banks);
  editedBanks.companyCategory.beta = 'infra';
  const plan = buildIncrementalSyncPlan(manifestFor(guides, editedBanks), manifestFor());
  assert.deepEqual(plan.guideSlugs, ['beta']);
  assert.deepEqual(plan.bankCategories, ['consumer', 'infra']);
});

test('a removed guide is deleted without reseeding unaffected guides', () => {
  const plan = buildIncrementalSyncPlan(manifestFor(guides.slice(0, 2)), manifestFor());
  assert.deepEqual(plan.guideSlugs, []);
  assert.deepEqual(plan.removedGuideSlugs, ['gamma']);
  assert.deepEqual(plan.bankCategories, []);
});
