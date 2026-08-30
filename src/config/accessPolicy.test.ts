import { describe, expect, it } from 'vitest';
import {
  FREE_CHAPTER_IDS,
  canAccessLesson,
  hasFreeEntryPoint,
  canGuestUseLocalQuestStage,
  isChapterFreeForGuests,
  isCourseFreeForGuests,
  isLessonFreeForGuests,
} from './accessPolicy';
import { getInteractiveCourse } from '../lib/interactiveCourses';

describe('canGuestUseLocalQuestStage', () => {
  it.each(['sap', 'figma', 'scale-ai', 'hashicorp', 'mercury', 'vercel', 'google', 'openai', 'unknown-company'])(
    'allows local technical practice for %s',
    (slug) => {
      expect(canGuestUseLocalQuestStage(slug, 'coding')).toBe(true);
      expect(canGuestUseLocalQuestStage(slug, 'system_design')).toBe(true);
    },
  );

  it('keeps AI-assisted stages behind sign-in for every company', () => {
    expect(canGuestUseLocalQuestStage('figma', 'recruiter')).toBe(false);
    expect(canGuestUseLocalQuestStage('figma', 'behavioral')).toBe(false);
    expect(canGuestUseLocalQuestStage('openai', 'screening')).toBe(false);
    expect(canGuestUseLocalQuestStage('unknown-company', 'final')).toBe(false);
  });
});

describe('free Core Design level', () => {
  const GUEST = { isSignedIn: false, isPremium: false };
  const FREE_ACCOUNT = { isSignedIn: true, isPremium: false };
  const PRO = { isSignedIn: true, isPremium: true };
  const course = getInteractiveCourse('system-design-interview');

  it('marks exactly the four Core Design chapters free', () => {
    expect(course).toBeDefined();
    // The free set must match the roadmap level it claims to be. If a chapter
    // moves between levels in the course JSON, pricing must not change
    // silently — this forces the decision back into accessPolicy.ts.
    const foundations = course!.chapters
      .filter((chapter) => chapter.systemDesign?.roadmap === 'foundations')
      .map((chapter) => chapter.id);

    expect(new Set(foundations)).toEqual(new Set(FREE_CHAPTER_IDS));
    expect(foundations).toHaveLength(4);
  });

  it('covers 29 lessons — the whole Level 1 roadmap', () => {
    const lessons = course!.chapters
      .filter((chapter) => FREE_CHAPTER_IDS.has(chapter.id))
      .reduce((total, chapter) => total + chapter.exercises.length, 0);
    expect(lessons).toBe(29);
  });

  it('opens every Core Design lesson to a signed-out guest', () => {
    for (const chapter of course!.chapters.filter((c) => FREE_CHAPTER_IDS.has(c.id))) {
      expect(isLessonFreeForGuests('system-design-interview', chapter.id)).toBe(true);
      expect(canAccessLesson('system-design-interview', chapter.id, GUEST)).toBe(true);
      expect(canAccessLesson('system-design-interview', chapter.id, FREE_ACCOUNT)).toBe(true);
    }
  });

  it('opens every chapter to a guest, which is what the catalog advertises', () => {
    // The landing page says "free interactive courses" and "no sign-in
    // required", and the JSON-LD repeats it. A guest hitting a wall on any
    // chapter would make all of that false at the click.
    for (const chapter of course!.chapters) {
      expect(canAccessLesson('system-design-interview', chapter.id, GUEST)).toBe(true);
      expect(canAccessLesson('system-design-interview', chapter.id, FREE_ACCOUNT)).toBe(true);
      expect(canAccessLesson('system-design-interview', chapter.id, PRO)).toBe(true);
    }
  });

  it('reports the course as free, which the catalog copy and SEO key off', () => {
    expect(isCourseFreeForGuests('system-design-interview')).toBe(true);
  });

  it('keeps the chapter-level machinery intact so the catalog can be re-gated', () => {
    // ALL_COURSES_FREE is a flag, not a demolition. FREE_CHAPTER_IDS still
    // distinguishes the chapters that were free on their own, so turning the
    // flag off restores the old policy rather than requiring it be rewritten.
    const previouslyPaid = course!.chapters.filter((c) => !FREE_CHAPTER_IDS.has(c.id));
    expect(previouslyPaid).toHaveLength(9);
    for (const chapter of previouslyPaid) {
      expect(isChapterFreeForGuests(chapter.id)).toBe(false);
    }
  });

  it('still treats wholly free courses as free without a chapter id', () => {
    expect(isLessonFreeForGuests('coding-interview-patterns')).toBe(true);
    expect(isLessonFreeForGuests('ai-foundations-map')).toBe(true);
  });

  it('denies an unknown lesson rather than defaulting open', () => {
    expect(isLessonFreeForGuests('system-design-interview', undefined)).toBe(false);
    expect(isLessonFreeForGuests('system-design-interview', 'sd-not-a-chapter')).toBe(false);
  });
});

describe('the two flows from the reported screenshots', () => {
  const GUEST = { isSignedIn: false, isPremium: false };
  const course = getInteractiveCourse('system-design-interview');
  const chapterIds = course!.chapters.map((c) => c.id);

  it('1. a guest can open Core Design lessons — no login', () => {
    // Every "Start" button in the Core Design roadmap.
    const coreDesign = course!.chapters.filter((c) => c.systemDesign?.roadmap === 'foundations');
    for (const chapter of coreDesign) {
      for (const exercise of chapter.exercises) {
        expect(
          canAccessLesson('system-design-interview', chapter.id, GUEST),
          `${chapter.id}/${exercise.id} must open for a guest`,
        ).toBe(true);
      }
    }
  });

  it('2. a guest can reach the System Design roadmap page from /learning', () => {
    // Clicking the catalog card navigates to /learning/system-design-interview,
    // which is a browse page, not a lesson — it must never gate while the
    // course advertises a free level.
    expect(hasFreeEntryPoint('system-design-interview', chapterIds)).toBe(true);
  });

  it('offers an entry point into every course, including the formerly paid ones', () => {
    const aiSecurity = getInteractiveCourse('llm-security-guardrails');
    if (aiSecurity) {
      expect(hasFreeEntryPoint(aiSecurity.id, aiSecurity.chapters.map((c) => c.id))).toBe(true);
    }
  });
});
