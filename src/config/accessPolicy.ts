import courseAccess from '../../data/course-access.json';

/**
 * Central access policy for guest preview and plan-based entitlements.
 *
 * The product is browsable like a storefront:
 *  - Guests (signed out) can VIEW /learning, /interview-studio, /community.
 *  - Guests can OPEN the free course and company quest pages.
 *  - Everything else prompts the auth gate; paid tiers unlock the catalog.
 *
 * Keep every rule here — pages import these helpers instead of hard-coding
 * ids, so pricing changes are one-file edits.
 */

/**
 * Courses anyone can open, signed in or not.
 * - ai-foundations-map: module 1 of the AI Agent Builder Curriculum.
 * - coding-interview-patterns: launch promo — free while the course grows;
 *   move it behind Pro by removing it from this set (one-line change).
 *
 * Some paid courses can also declare a guest preview in course-access.json.
 * Those previews are deliberately separate from this set: a guest may open
 * the course overview and its marked lessons, but not the full course.
 */
export const FREE_COURSE_IDS: ReadonlySet<string> = new Set([
    'ai-foundations-map',
    'coding-interview-patterns',
]);

export const isCourseFreeForGuests = (courseId: string): boolean => FREE_COURSE_IDS.has(courseId);

type GuestPreview = {
    startExerciseId: string;
    exerciseIdPrefixes: readonly string[];
    exerciseIds: readonly string[];
};

const getCourseGuestPreview = (courseId: string): GuestPreview | undefined =>
    (courseAccess.guestPreviews as Record<string, GuestPreview | undefined>)[courseId];

/** A guest can always view an overview when the course has any free module. */
export const hasGuestCoursePreview = (courseId: string): boolean =>
    isCourseFreeForGuests(courseId) || Boolean(getCourseGuestPreview(courseId));

/** True only for an entire free course or a lesson in a marked guest module. */
export const isCourseExerciseFreeForGuests = (courseId: string, exerciseId: string): boolean => {
    if (isCourseFreeForGuests(courseId)) return true;
    const preview = getCourseGuestPreview(courseId);
    return preview?.exerciseIdPrefixes.some((prefix) => exerciseId.startsWith(prefix))
        || preview?.exerciseIds.includes(exerciseId)
        || false;
};

/** First public lesson used for anonymous resume links into a partial preview. */
export const getGuestCoursePreviewStartExerciseId = (courseId: string): string | undefined => {
    return getCourseGuestPreview(courseId)?.startExerciseId;
};

/**
 * Chapters anyone can open even though the rest of their course is paid.
 *
 * These four are the "Core Design" level (Level 1 of 3) of System Design
 * Interview — 29 lessons — offered free on the same terms as Coding Interview
 * Patterns: no account, no Pro. Levels 2 and 3 (Production Scale, Distributed
 * Systems) and the Classic Questions Arena stay behind Pro.
 *
 * The ids match `systemDesign.roadmap === 'foundations'` in
 * data/courses/12-system-design-interview.json. They are listed explicitly
 * rather than derived so that pricing lives in this file, not in course
 * content — moving a chapter between levels must not silently change what is
 * free. `accessPolicy.test.ts` asserts the two stay in sync.
 */
export const FREE_CHAPTER_IDS: ReadonlySet<string> = new Set([
    'sd-interview-framework',
    'sd-capacity-estimation',
    'sd-api-data-models',
    'sd-core-building-blocks',
]);

export const isChapterFreeForGuests = (chapterId: string): boolean => FREE_CHAPTER_IDS.has(chapterId);

/**
 * True when a guest may open one specific lesson.
 *
 * Course-level access still wins — a wholly free course needs no chapter
 * lookup. Pass `chapterId` when the caller knows which chapter the lesson
 * belongs to (resolve it with `locateExercise`); omitting it falls back to
 * course-level access, which is the safe direction to be wrong in.
 */
export const isLessonFreeForGuests = (courseId: string, chapterId?: string): boolean =>
    FREE_COURSE_IDS.has(courseId) || (Boolean(chapterId) && FREE_CHAPTER_IDS.has(chapterId as string));

/**
 * Company quests: every quest PAGE is browsable by guests. Local coding and
 * whiteboard practice are also available without an account for every company.
 * AI review, voice coaching, diagram generation, persistence, XP, and all
 * real-time API work remain authenticated features.
 */

/** Only local, browser-executed technical stages are available to guests. */
export const canGuestUseLocalQuestStage = (_slug: string, stageId: string): boolean =>
    stageId === 'coding' || stageId === 'system_design';

/**
 * Course entitlement per account state:
 *  - guest / free account → free courses only (progress + XP require an account)
 *  - premium (Pro / Max / Enterprise) → full catalog
 */
export const canAccessCourse = (
    courseId: string,
    { isSignedIn, isPremium }: { isSignedIn: boolean; isPremium: boolean },
): boolean => {
    if (isPremium) return true;
    if (FREE_COURSE_IDS.has(courseId)) return true;
    // Signed-in free users are limited to the free tier catalog for now;
    // interviews are metered separately through AI credits.
    void isSignedIn;
    return false;
};

/**
 * True when a course has ANY free entry point — a wholly free course, or a
 * paid course with a free chapter such as System Design Interview's Core
 * Design level. Drives whether the catalog offers "Start" or the auth gate.
 */
export const hasFreeEntryPoint = (courseId: string, chapterIds: string[]): boolean =>
    FREE_COURSE_IDS.has(courseId) || chapterIds.some((id) => FREE_CHAPTER_IDS.has(id));

/**
 * Per-lesson entitlement. Premium unlocks everything; otherwise the lesson
 * must sit in a free course or a free chapter.
 */
export const canAccessLesson = (
    courseId: string,
    chapterId: string | undefined,
    { isSignedIn, isPremium }: { isSignedIn: boolean; isPremium: boolean },
): boolean => {
    if (isPremium) return true;
    void isSignedIn;
    return isLessonFreeForGuests(courseId, chapterId);
};
