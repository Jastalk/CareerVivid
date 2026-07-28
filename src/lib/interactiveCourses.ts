import i18n from '../i18n';
import type { RunnerResponse } from '../workers/questCodeRunner.worker';
import {
  validateCourseDefinition,
  type CourseDefinition,
  type InteractiveCourse,
  type InteractiveChapter,
  type InteractiveExercise,
  type LessonCheck,
} from '../types/course';

// Re-export the canonical schema types so existing imports keep working.
export type {
  CourseCategory,
  CourseDefinition,
  CourseDifficulty,
  CourseStatus,
  InteractiveChapter,
  InteractiveCourse,
  InteractiveExercise,
  LessonCheck,
  LessonKind,
  LessonLanguage,
  QuizQuestion,
  SystemDesignAnswerDrill,
  SystemDesignDecision,
  SystemDesignModuleMetadata,
  SystemDesignPracticeVariant,
  WhiteboardBrief,
} from '../types/course';

/**
 * Interactive courses are data-driven: each course is one JSON file in
 * `data/courses/` conforming to `CourseDefinition` (see src/types/course.ts).
 *
 * To add a course: copy an existing file, give it a new `id` and `order`,
 * set `status` to "published" when ready. No code changes needed.
 */
const courseFiles = import.meta.glob('../../data/courses/*.json', { eager: true }) as Record<
  string,
  { default: CourseDefinition }
>;

const ALL_COURSES: CourseDefinition[] = Object.values(courseFiles)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);

if (import.meta.env?.DEV) {
  for (const course of ALL_COURSES) {
    for (const error of validateCourseDefinition(course)) {
      console.warn(`Invalid course definition: ${error}`);
    }
  }
}

const COURSES: InteractiveCourse[] = ALL_COURSES.filter((c) => c.status === 'published');

const translate = (key: string, defaultValue: string): string => {
  return i18n.t(key, { defaultValue });
};

const localizeCourse = (course: InteractiveCourse): InteractiveCourse => {
  const courseKey = `courses.${course.id}`;
  
  return {
    ...course,
    title: translate(`${courseKey}.title`, course.title),
    tagline: translate(`${courseKey}.tagline`, course.tagline),
    description: translate(`${courseKey}.description`, course.description),
    // difficulty stays untranslated: it's a typed enum used in logic/filters;
    // UI layers translate it at render time instead.
    difficulty: course.difficulty,
    chapters: course.chapters.map((chapter) => {
      const chapterKey = `${courseKey}.chapters.${chapter.id}`;
      return {
        ...chapter,
        title: translate(`${chapterKey}.title`, chapter.title),
        exercises: chapter.exercises.map((exercise) => {
          const exerciseKey = `${courseKey}.exercises.${exercise.id}`;
          return {
            ...exercise,
            title: translate(`${exerciseKey}.title`, exercise.title),
            content: translate(`${exerciseKey}.content`, exercise.content),
            hint: exercise.hint ? translate(`${exerciseKey}.hint`, exercise.hint) : undefined,
            whiteboardBrief: exercise.whiteboardBrief ? {
              requirements: exercise.whiteboardBrief.requirements.map((req, idx) =>
                translate(`${exerciseKey}.whiteboardBrief.requirements.${idx}`, req)
              ),
            } : undefined,
            quiz: exercise.quiz ? exercise.quiz.map((q) => {
              const qKey = `${exerciseKey}.quiz.${q.id}`;
              return {
                ...q,
                prompt: translate(`${qKey}.prompt`, q.prompt),
                explanation: q.explanation ? translate(`${qKey}.explanation`, q.explanation) : undefined,
                options: q.options.map((opt, idx) =>
                  translate(`${qKey}.options.${idx}`, opt)
                ),
              };
            }) : undefined,
          };
        }),
      };
    }),
  };
};

let cachedLang: string | null = null;
let cachedCourses: InteractiveCourse[] = [];
let cachedCurriculumCourses: InteractiveCourse[] = [];
let cachedCoursesByTrack = new Map<string, InteractiveCourse[]>();
let cachedCourseMap = new Map<string, InteractiveCourse>();

const getLocalizedData = () => {
  const currentLang = i18n.language || 'en';
  if (currentLang === cachedLang) {
    return {
      courses: cachedCourses,
      curriculumCourses: cachedCurriculumCourses,
      coursesByTrack: cachedCoursesByTrack,
      courseMap: cachedCourseMap,
    };
  }

  // Language changed or first run: Clear cache and rebuild
  cachedLang = currentLang;
  cachedCourses = COURSES.map(localizeCourse);
  cachedCurriculumCourses = cachedCourses.filter((c) => (c.track ?? 'ai-agent') === 'ai-agent');
  
  cachedCoursesByTrack.clear();
  cachedCourseMap.clear();
  for (const course of cachedCourses) {
    cachedCourseMap.set(course.id, course);
    const track = course.track ?? 'ai-agent';
    if (!cachedCoursesByTrack.has(track)) {
      cachedCoursesByTrack.set(track, []);
    }
    cachedCoursesByTrack.get(track)!.push(course);
  }

  return {
    courses: cachedCourses,
    curriculumCourses: cachedCurriculumCourses,
    coursesByTrack: cachedCoursesByTrack,
    courseMap: cachedCourseMap,
  };
};

export const getInteractiveCourses = (): InteractiveCourse[] => {
  return getLocalizedData().courses;
};

/** Modules belonging to one track ('ai-agent' when the JSON omits `track`). */
export const getCoursesByTrack = (track: string): InteractiveCourse[] => {
  return getLocalizedData().coursesByTrack.get(track) ?? [];
};

/** The 10 modules of the AI Agent Builder Curriculum (order preserved). */
export const getCurriculumCourses = (): InteractiveCourse[] => {
  return getLocalizedData().curriculumCourses;
};

export const getInteractiveCourse = (courseId: string): InteractiveCourse | undefined => {
  return getLocalizedData().courseMap.get(courseId);
};

export const getCourseExercises = (course: InteractiveCourse): InteractiveExercise[] =>
  course.chapters.flatMap((chapter) => chapter.exercises);

export const getCourseExerciseCount = (course: InteractiveCourse): number =>
  getCourseExercises(course).length;

/**
 * Catalog totals for marketing and SEO copy.
 *
 * Derived from the published course JSON rather than typed by hand, so the
 * numbers in titles, meta descriptions, and schema.org Course entities stay
 * true as courses are added. `src/lib/seoCatalogTotals.test.ts` asserts the
 * hardcoded numbers in index.html still match these.
 */
export const getCourseCatalogTotals = (): { courses: number; lessons: number } => {
  const courses = getInteractiveCourses();
  return {
    courses: courses.length,
    lessons: courses.reduce((total, course) => total + getCourseExerciseCount(course), 0),
  };
};

export const getFirstExerciseId = (courseId: string): string | undefined => {
  const course = getInteractiveCourse(courseId);
  return course ? getCourseExercises(course)[0]?.id : undefined;
};

export interface ExerciseLocation {
  course: InteractiveCourse;
  chapter: InteractiveChapter;
  exercise: InteractiveExercise;
  index: number;
  total: number;
  prevExerciseId: string | null;
  nextExerciseId: string | null;
}

export const locateExercise = (courseId: string, exerciseId: string): ExerciseLocation | undefined => {
  const course = getInteractiveCourse(courseId);
  if (!course) return undefined;
  const flat = getCourseExercises(course);
  const position = flat.findIndex((e) => e.id === exerciseId);
  if (position < 0) return undefined;
  const exercise = flat[position];
  const chapter = course.chapters.find((ch) => ch.exercises.some((e) => e.id === exerciseId))!;
  return {
    course,
    chapter,
    exercise,
    index: position + 1,
    total: flat.length,
    prevExerciseId: position > 0 ? flat[position - 1].id : null,
    nextExerciseId: position < flat.length - 1 ? flat[position + 1].id : null,
  };
};

export const firstIncompleteExerciseId = (
  course: InteractiveCourse,
  completedIds: Iterable<string>,
): string => {
  const completed = new Set(completedIds);
  const flat = getCourseExercises(course);
  return (flat.find((e) => !completed.has(e.id)) ?? flat[0]).id;
};

export interface CheckResult {
  pass: boolean;
  detail?: string;
}

export const evaluateCheck = (check: LessonCheck, response: RunnerResponse): CheckResult => {
  if (check.type === 'diagram') {
    return { pass: false, detail: 'Whiteboard exercises are graded separately.' };
  }

  if (!response.ok) return { pass: false, detail: response.error ?? 'Your code did not run.' };

  if (check.type === 'run') return { pass: true };

  if (check.type === 'output') {
    const output = response.logs.join('\n').trim();
    const expected = check.expected.trim();
    if (check.match === 'includes') {
      return output.includes(expected)
        ? { pass: true }
        : { pass: false, detail: `Expected the output to include:\n${expected}\n\nGot:\n${output || '(no output)'}` };
    }
    return output === expected
      ? { pass: true }
      : { pass: false, detail: `Expected:\n${expected}\n\nGot:\n${output || '(no output)'}` };
  }

  const total = response.results.length;
  const passed = response.results.filter((r) => r.pass).length;
  if (total > 0 && passed === total) return { pass: true };

  const failureDetails = response.results
    .filter((r) => !r.pass && !r.hidden)
    .slice(0, 3)
    .map((r) => `Input ${r.input}: expected ${r.expected}, got ${r.error ?? r.received}`);

  return {
    pass: false,
    detail: [
      `${passed}/${total} tests passed.`,
      ...failureDetails,
    ].join('\n'),
  };
};
