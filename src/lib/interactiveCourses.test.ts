import { describe, expect, it } from 'vitest';
import {
  evaluateCheck,
  getCourseExerciseCount,
  getCourseExercises,
  getCoursesByTrack,
  getCurriculumCourses,
  getInteractiveCourse,
  getInteractiveCourses,
  firstIncompleteExerciseId,
} from './interactiveCourses';
import { validateCourseDefinition } from '../types/course';
import { getCourseWidget } from '../components/CourseWidgets';
import { buildSystemDesignSteps, SYSTEM_DESIGN_SCENARIOS } from './systemDesignSimulations';
import { getSystemDesignPatternById } from './companyQuests';
import { getCourseSystemDesignPractice, getCourseSystemDesignResultId } from './systemDesignCoursePractice';

describe('interactiveCourses', () => {
  it('provides one AI lab for each module in the 10-step curriculum', () => {
    const courses = getCurriculumCourses();

    expect(courses).toHaveLength(10);
    expect(courses.map((course) => course.title.slice(0, 3))).toEqual([
      '01.',
      '02.',
      '03.',
      '04.',
      '05.',
      '06.',
      '07.',
      '08.',
      '09.',
      '10.',
    ]);
    expect(courses.every((course) => course.category === 'AI')).toBe(true);
    expect(courses.every((course) => getCourseExerciseCount(course) >= 1)).toBe(true);
  });

  it('ships the Coding Interview Patterns course on its own track, animated end to end', () => {
    const patterns = getInteractiveCourse('coding-interview-patterns')!;

    expect(patterns).toBeTruthy();
    expect(patterns.track).toBe('coding-patterns');
    expect(getCoursesByTrack('coding-patterns')).toContain(patterns);
    // Track filtering keeps it OUT of the curriculum's order-based module map.
    expect(getCurriculumCourses()).not.toContain(patterns);

    // Every pattern chapter carries its own animation (interactive lesson).
    for (const chapter of patterns.chapters) {
      const kinds = chapter.exercises.map((e) => e.kind ?? 'code');
      expect(kinds).toContain('interactive');
      expect(kinds).toContain('reading');
    }
    expect(patterns.chapters.length).toBeGreaterThanOrEqual(20);
  });

  it('teaches DFS with a registered animation and runnable preorder lab', () => {
    const patterns = getInteractiveCourse('coding-interview-patterns')!;
    const dfs = patterns.chapters.find((chapter) => chapter.id === 'ch-dfs');

    expect(dfs).toBeTruthy();
    expect(dfs?.exercises.some((exercise) => exercise.widgetId === 'dfs-tree-viz')).toBe(true);
    const codeLab = dfs?.exercises.find((exercise) => exercise.id === 'dfs-code');
    expect(codeLab?.kind).toBe('code');
    expect(codeLab?.check.type).toBe('tests');
    expect(codeLab?.check.type === 'tests' && codeLab.check.functionName).toBe('preorderValues');
  });

  it('does not expose the old placeholder coding and system-design demos', () => {
    const ids = getInteractiveCourses().map((course) => course.id);

    expect(ids).not.toContain('javascript-console');
    expect(ids).not.toContain('system-design-fundamentals');
  });

  it('ships a complete System Design Interview course with three experience roadmaps', () => {
    const course = getInteractiveCourse('system-design-interview')!;
    expect(course.track).toBe('system-design');
    expect(getCoursesByTrack('system-design')).toContain(course);
    // 12 roadmap chapters + the Classic Questions Arena (chapter 13).
    expect(course.chapters).toHaveLength(13);
    expect(getCourseExerciseCount(course)).toBe(85);

    const arena = course.chapters.find((chapter) => chapter.id === 'sd-classic-questions')!;
    expect(arena).toBeTruthy();
    const caseExercises = arena.exercises.filter((exercise) => exercise.widgetId?.startsWith('sd-case-'));
    expect(caseExercises).toHaveLength(6);

    const roadmapChapters = course.chapters.filter((chapter) => chapter.id !== 'sd-classic-questions');
    expect(roadmapChapters).toHaveLength(12);
    const roadmaps = new Set(roadmapChapters.map((chapter) => chapter.systemDesign?.roadmap));
    expect(roadmaps).toEqual(new Set(['foundations', 'product-scale', 'senior-systems']));
    expect(roadmapChapters.filter((chapter) => chapter.systemDesign?.roadmap === 'foundations')).toHaveLength(4);
    expect(roadmapChapters.filter((chapter) => chapter.systemDesign?.roadmap === 'product-scale')).toHaveLength(4);
    expect(roadmapChapters.filter((chapter) => chapter.systemDesign?.roadmap === 'senior-systems')).toHaveLength(4);

    for (const chapter of roadmapChapters) {
      expect(chapter.exercises.length).toBeGreaterThanOrEqual(6);
      expect(chapter.systemDesign?.primaryChallengeId).toBeTruthy();
      expect(getSystemDesignPatternById(chapter.systemDesign!.primaryChallengeId)).toBeTruthy();
      expect(chapter.systemDesign?.expectedRequirements.length).toBeGreaterThanOrEqual(3);
      expect(chapter.systemDesign?.requiredArchitectureComponents.length).toBeGreaterThanOrEqual(3);
      expect(chapter.systemDesign?.tradeoffs.length).toBeGreaterThanOrEqual(3);
      expect(chapter.exercises.some((exercise) => exercise.widgetId === chapter.systemDesign?.animationWidgetId)).toBe(true);
      expect(chapter.exercises.some((exercise) => exercise.widgetId === 'system-design-decision')).toBe(true);
      expect(chapter.exercises.some((exercise) => exercise.widgetId === 'system-design-answer-drill')).toBe(true);
    }
  });

  it('never lets the correct answer sit in the same slot across a course', () => {
    // Regression: every System Design quiz question and scenario decision was
    // authored with correctIndex 0, so the entire graded layer was clearable by
    // position without reading anything. Guarded course-wide, not just there.
    for (const course of getInteractiveCourses()) {
      const graded = getCourseExercises(course).flatMap((exercise) => [
        ...(exercise.quiz ?? []).map((q) => ({ at: `${exercise.id}/${q.id}`, ...q })),
        ...(exercise.systemDesignDecision ? [{ at: exercise.id, ...exercise.systemDesignDecision }] : []),
      ]);
      if (graded.length < 6) continue;

      const perSlot = graded.reduce<Record<number, number>>(
        (acc, q) => ({ ...acc, [q.correctIndex]: (acc[q.correctIndex] ?? 0) + 1 }),
        {},
      );
      const slots = Object.keys(perSlot).length;
      const busiest = Math.max(...Object.values(perSlot));

      expect(slots, `${course.id} puts every answer in one slot`).toBeGreaterThan(1);
      // A tiny bank can cluster by chance, so only hold the larger ones to a
      // spread. At 36 questions, 70% in one slot is not an accident — and the AI
      // courses showed the same authoring habit at 6, where 5-of-6 on one index
      // is already position-clearable. Six is the lowest bank this can police:
      // at three options it still permits a 3/2/1 split.
      if (graded.length >= 6) {
        expect(busiest / graded.length, `${course.id} clusters answers in one slot`).toBeLessThan(0.7);
      }

      for (const question of graded) {
        expect(new Set(question.options).size, `${question.at} repeats an option`).toBe(question.options.length);
        expect(question.options.length, `${question.at} needs real alternatives`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('teaches in the System Design readings rather than listing terms', () => {
    // Regression: the readings averaged 593 characters — a bag of vocabulary
    // with no mechanism, no worked number, and no reason anything was true.
    const course = getInteractiveCourse('system-design-interview')!;
    const readings = getCourseExercises(course).filter((exercise) => exercise.kind === 'reading');

    expect(readings).toHaveLength(13);
    for (const reading of readings) {
      const words = reading.content.trim().split(/\s+/).length;
      expect(words, `${reading.id} is too short to teach anything`).toBeGreaterThan(300);
    }

    // Each teaching module must state the invariant it preserves and tell the
    // learner what the interviewer is actually grading.
    for (const reading of readings.filter((r) => r.id.endsWith('-reading'))) {
      expect(reading.content, `${reading.id} states no invariant`).toMatch(/invariant/i);
      expect(reading.content, `${reading.id} never says what is being graded`)
        .toMatch(/interviewer is listening for/i);
    }
  });

  it('registers all System Design Interview simulation and practice widgets', () => {
    const course = getInteractiveCourse('system-design-interview')!;
    for (const exercise of getCourseExercises(course).filter((item) => item.kind === 'interactive')) {
      expect(getCourseWidget(exercise.widgetId)).toBeTruthy();
    }
  });

  it('keeps simulation state deterministic while inputs change meaningful metrics', () => {
    for (const scenario of Object.values(SYSTEM_DESIGN_SCENARIOS)) {
      const first = buildSystemDesignSteps(scenario.id, scenario.input.initial);
      const repeat = buildSystemDesignSteps(scenario.id, scenario.input.initial);
      expect(first).toEqual(repeat);
      expect(first.length).toBeGreaterThanOrEqual(4);
      expect(first.every((step) => step.nodes.length >= 3 && step.metrics.length >= 3 && step.ariaDescription.length > 30)).toBe(true);
    }
    const baseline = buildSystemDesignSteps('cache-rate-limiting', 60);
    const changed = buildSystemDesignSteps('cache-rate-limiting', 180);
    expect(changed[0].metrics).not.toEqual(baseline[0].metrics);
  });

  it('uses the existing course progress contract to advance System Design lessons', () => {
    const course = getInteractiveCourse('system-design-interview')!;
    const firstModule = course.chapters[0].exercises.map((exercise) => exercise.id);
    expect(firstIncompleteExerciseId(course, new Set(firstModule))).toBe(course.chapters[1].exercises[0].id);
  });

  it('resumes a partially completed module at its next lesson', () => {
    const course = getInteractiveCourse('coding-interview-patterns')!;
    const completed = course.chapters[0].exercises.slice(0, 2).map((exercise) => exercise.id);
    expect(firstIncompleteExerciseId(course, completed)).toBe(course.chapters[0].exercises[2].id);
  });

  it('reuses canonical questions in a course-owned mock session and result key', () => {
    const practice = getCourseSystemDesignPractice('system-design-interview', 'sd01-answer');
    expect(practice?.brief.challengeId).toBe('url-shortener');
    expect(practice?.brief.prompt).toContain('Clarify and satisfy these course requirements');
    expect(practice?.stageTitle).toContain('course mock');
    expect(getCourseSystemDesignResultId('system-design-interview', 'sd01-answer')).toBe('system-design-interview__sd01-answer');
  });

  it('every course definition passes schema validation', () => {
    for (const course of getInteractiveCourses()) {
      expect(validateCourseDefinition(course)).toEqual([]);
    }
  });

  it('pairs each lesson kind with the right check type', () => {
    const exercises = getInteractiveCourses().flatMap(getCourseExercises);

    expect(exercises.filter((exercise) => exercise.kind === 'whiteboard').length).toBeGreaterThanOrEqual(1);

    for (const exercise of exercises) {
      const kind = exercise.kind ?? 'code';
      switch (kind) {
        case 'code':
          expect(['run', 'output', 'tests']).toContain(exercise.check.type);
          expect(exercise.starterCode).toBeTruthy();
          if (exercise.check.type === 'tests') {
            expect(exercise.check.functionName).toBeTruthy();
            expect(exercise.check.tests.length).toBeGreaterThan(0);
          }
          break;
        case 'whiteboard':
          expect(exercise.check.type).toBe('diagram');
          expect(exercise.whiteboardBrief?.requirements.length).toBeGreaterThanOrEqual(4);
          break;
        case 'reading':
          expect(exercise.check.type).toBe('read');
          break;
        case 'video':
          expect(exercise.check.type).toBe('read');
          expect(exercise.videoUrl).toBeTruthy();
          break;
        case 'quiz':
          expect(exercise.check.type).toBe('quiz');
          expect(exercise.quiz?.length).toBeGreaterThan(0);
          break;
        case 'interactive':
          expect(exercise.check.type).toBe('widget');
          expect(exercise.widgetId).toBeTruthy();
          break;
        default:
          throw new Error(`Unhandled lesson kind: ${kind}`);
      }
    }
  });

  it('flagship foundations course mixes lesson kinds', () => {
    const flagship = getInteractiveCourses().find((c) => c.id === 'ai-foundations-map')!;
    const kinds = new Set(getCourseExercises(flagship).map((e) => e.kind ?? 'code'));

    expect(kinds).toContain('reading');
    expect(kinds).toContain('video');
    expect(kinds).toContain('quiz');
    expect(kinds).toContain('interactive');
    expect(kinds).toContain('code');
    // Progress compatibility: the original lab id must survive the redesign.
    expect(getCourseExercises(flagship).map((e) => e.id)).toContain('classify-ai-building-blocks');
  });

  it('shows the failing visible test case when a submitted answer is wrong', () => {
    const result = evaluateCheck(
      {
        type: 'tests',
        functionName: 'classifyConcept',
        tests: [{ input: ['large language model'], expected: 'foundation-model' }],
      },
      {
        id: 1,
        ok: true,
        results: [{
          hidden: false,
          pass: false,
          input: '["large language model"]',
          expected: '"foundation-model"',
          received: '"application-pattern"',
        }],
        logs: [],
        durationMs: 2,
      },
    );

    expect(result.pass).toBe(false);
    expect(result.detail).toContain('0/1 tests passed.');
    expect(result.detail).toContain('large language model');
    expect(result.detail).toContain('foundation-model');
  });
});
