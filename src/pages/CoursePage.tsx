import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ExternalLink,
    GraduationCap,
    Loader2,
    Lock,
    Play,
    Rocket,
    Sparkles,
    Target,
    Zap,
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import CodingInterviewRoadmap from '../components/Course/CodingInterviewRoadmap';
import SystemDesignInterviewRoadmap from '../components/Course/SystemDesignInterviewRoadmap';
import LearningCatalog from '../components/Course/LearningCatalog';
import { navigate } from '../utils/navigation';
import {
    getInteractiveCourses,
    getCurriculumCourses,
    getInteractiveCourse,
    getCourseExerciseCount,
    getCourseExercises,
    firstIncompleteExerciseId,
    locateExercise,
    type InteractiveCourse,
} from '../lib/interactiveCourses';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { useAllCourseProgress } from '../hooks/useAllCourseProgress';
import SEOHelper from '../components/SEOHelper';
import AuthGateModal, { AuthGateModalProps } from '../components/AuthGateModal';
import { canAccessCourse, canAccessLesson, hasFreeEntryPoint } from '../config/accessPolicy';
import { stripLanguagePrefix } from '../utils/languagePreference';
import {
    CourseModuleWithState,
    getCourseModulesWithState,
    getCourseTotalCount,
    getLearningSourceById,
} from '../lib/courseCurriculum';
import { getLearningSeoKey, getLearningSeoPage } from '../lib/learningSeo';
import '../components/Landing/live/liveLanding.css';

/**
 * The numbered well at the head of a step row. It is the primary state cue,
 * so each state gets its own ground AND its own glyph — colour alone would
 * leave the three states indistinguishable to anyone who cannot see it.
 */
const stateWell = (state: CourseModuleWithState['state']): React.CSSProperties => {
    if (state === 'completed') return { background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)', borderColor: 'var(--cvl-green)' };
    if (state === 'locked') return { background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)', borderColor: 'var(--cvl-line)' };
    return { background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)', borderColor: 'var(--cvl-line)' };
};

/**
 * One unified learning path: each of the 10 steps combines the curriculum
 * module (objective, topics, sources) with its interactive lessons. No
 * duplicated lists — the row's primary action opens the lessons, expanding
 * the row reveals the details.
 */
const CoursePage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { currentUser, isPremium } = useAuth();
    const [authGate, setAuthGate] = useState<Pick<AuthGateModalProps, 'title' | 'message' | 'variant'> | null>(null);

    const { levelInfo, isLoading: isLoadingLevel } = useUserProgress();
    const { progress, isLoading: isLoadingCourse, complete } = useCourseProgress('ai-agent-curriculum', getCourseTotalCount());
    const { progressByCourse } = useAllCourseProgress();
    const currentPath = stripLanguagePrefix(window.location.pathname);
    const parts = currentPath.split('/');
    const selectedCourseId = parts[2] || null;
    const seoPage = getLearningSeoPage(getLearningSeoKey(selectedCourseId));
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);

    const interactiveCourses = useMemo(() => getInteractiveCourses(), [i18n.language]);
    // The curriculum path only maps its OWN track's modules to steps 1..10 —
    // other courses (e.g. Coding Interview Patterns) live in separate tracks.
    const curriculumCourses = useMemo(() => getCurriculumCourses(), [i18n.language]);
    const patternsCourse = useMemo(() => getInteractiveCourse('coding-interview-patterns'), [i18n.language]);
    const systemDesignCourse = useMemo(() => getInteractiveCourse('system-design-interview'), [i18n.language]);
    const labByModuleOrder = useMemo(
        () => new Map(curriculumCourses.map((course, index) => [index + 1, course])),
        [curriculumCourses],
    );
    const completedIds = progress?.completedModuleIds ?? [];
    const modules = useMemo(() => getCourseModulesWithState(completedIds), [completedIds]);
    const totalCount = getCourseTotalCount();
    const completedCount = completedIds.length;
    const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const courseComplete = totalCount > 0 && completedCount === totalCount;

    const currentModule = useMemo(() => modules.find((m) => m.state === 'available'), [modules]);
    const currentLab = currentModule ? labByModuleOrder.get(currentModule.order) : undefined;
    const activeModule = currentModule ?? modules.at(-1);
    const activeLab = activeModule ? labByModuleOrder.get(activeModule.order) : undefined;
    const totalLessonCount = useMemo(
        () => interactiveCourses.reduce((total, course) => total + getCourseExerciseCount(course), 0),
        [interactiveCourses],
    );
    const completedLessonCount = useMemo(
        () => interactiveCourses.reduce((total, course) => {
            const completedExercises = new Set(progressByCourse[course.id]?.completedModuleIds ?? []);
            return total + getCourseExercises(course).filter((exercise) => completedExercises.has(exercise.id)).length;
        }, 0),
        [interactiveCourses, progressByCourse],
    );
    const activeLessonCount = activeLab ? getCourseExerciseCount(activeLab) : 0;

    /** Lessons finished inside one course JSON (per-exercise progress). */
    const lessonsDoneFor = (course: InteractiveCourse) => {
        const done = new Set(progressByCourse[course.id]?.completedModuleIds ?? []);
        return getCourseExercises(course).filter((exercise) => done.has(exercise.id)).length;
    };
    const curriculumLessonTotal = curriculumCourses.reduce((t, c) => t + getCourseExerciseCount(c), 0);
    const curriculumLessonsDone = curriculumCourses.reduce((t, c) => t + lessonsDoneFor(c), 0);
    const curriculumMinutes = curriculumCourses.reduce((t, c) => t + (c.estimatedMinutes ?? 0), 0);
    const patternsLessonTotal = patternsCourse ? getCourseExerciseCount(patternsCourse) : 0;
    const patternsLessonsDone = patternsCourse ? lessonsDoneFor(patternsCourse) : 0;
    const systemDesignLessonTotal = systemDesignCourse ? getCourseExerciseCount(systemDesignCourse) : 0;
    const systemDesignLessonsDone = systemDesignCourse ? lessonsDoneFor(systemDesignCourse) : 0;

    /** Opens the saved next lesson when callers do not name a specific lesson. */
    const openCourse = (courseId: string, destination = `/learn/${courseId}`) => {
        const course = getInteractiveCourse(courseId);
        const resumeDestination = course && destination === `/learn/${courseId}`
            ? `/learn/${courseId}/${firstIncompleteExerciseId(course, progressByCourse[courseId]?.completedModuleIds ?? [])}`
            : destination;

        // Resolve the specific lesson first: a paid course can still have free
        // chapters (System Design Interview's Core Design level), so entitlement
        // is decided per lesson rather than per course.
        const targetExerciseId = resumeDestination.startsWith('/learn/')
            ? resumeDestination.split('/')[3] ?? ''
            : '';
        const targetChapterId = targetExerciseId
            ? locateExercise(courseId, targetExerciseId)?.chapter.id
            : undefined;
        const auth = { isSignedIn: Boolean(currentUser), isPremium: Boolean(isPremium) };

        // `/learning/<id>` is the course's roadmap PAGE, not a lesson — browsing
        // it should never be gated when any part of the course is free, or the
        // catalog advertises a free level behind a sign-in wall.
        const isBrowseDestination = resumeDestination.startsWith('/learning/');
        const chapterIds = course?.chapters.map((chapter) => chapter.id) ?? [];

        if (
            canAccessCourse(courseId, auth)
            || canAccessLesson(courseId, targetChapterId, auth)
            || (isBrowseDestination && hasFreeEntryPoint(courseId, chapterIds))
        ) {
            navigate(resumeDestination);
            return;
        }
        if (!currentUser) {
            setAuthGate({
                title: 'Sign in to open this course',
                message: 'The Foundations course is free for everyone — create an account to unlock the rest of the curriculum and save your progress.',
                variant: 'signin',
            });
            return;
        }
        setAuthGate({ variant: 'upgrade' });
    };

    const toggleExpand = (module: CourseModuleWithState) => {
        if (module.state === 'locked') {
            // Guests clicking a locked module get the sign-in gate instead of
            // a dead click — same conversion moment as the interview quests.
            if (!currentUser) {
                setAuthGate({
                    title: `Sign in to unlock ${module.title}`,
                    message: 'Foundations is free for everyone. Create a free account to work through the rest of the curriculum in order and keep your progress.',
                    variant: 'signin',
                });
            }
            return;
        }
        setExpandedId((prev) => (prev === module.id ? null : module.id));
    };

    const handleComplete = async (moduleId: string) => {
        if (!currentUser) return;
        setCompletingId(moduleId);
        try {
            await complete(moduleId);
            setExpandedId((prev) => {
                const next = modules.find((m) => m.order === (modules.find((mm) => mm.id === moduleId)?.order ?? 0) + 1);
                return next && next.state !== 'locked' ? next.id : prev;
            });
        } catch (e) {
            console.error('Failed to mark module complete:', e);
        } finally {
            setCompletingId(null);
        }
    };

    return (
        <AppLayout>
            <SEOHelper
                title={seoPage.title}
                description={seoPage.description}
                keywords={seoPage.keywords}
                url={`https://careervivid.app${seoPage.path}`}
                schemaData={seoPage.schemaData}
            />
            {authGate && <AuthGateModal {...authGate} onClose={() => setAuthGate(null)} />}
            {/* Same desk as the dashboard — the catalog no longer swaps design systems. */}
            <div className="cvl relative min-h-screen pb-16 text-left">
                <div className="@container/course-page mx-auto max-w-screen-2xl px-4 py-6 text-left sm:px-6 lg:px-8 lg:py-8">
                    {!selectedCourseId ? (
                        <LearningCatalog
                            patternsCourse={patternsCourse}
                            systemDesignCourse={systemDesignCourse}
                            patternsLessonTotal={patternsLessonTotal}
                            patternsLessonsDone={patternsLessonsDone}
                            curriculumLessonTotal={curriculumLessonTotal}
                            curriculumLessonsDone={curriculumLessonsDone}
                            curriculumMinutes={curriculumMinutes}
                            systemDesignLessonTotal={systemDesignLessonTotal}
                            systemDesignLessonsDone={systemDesignLessonsDone}
                            completedLessonCount={completedLessonCount}
                            totalLessonCount={totalLessonCount}
                            activeLabId={activeLab?.id}
                            courseComplete={courseComplete}
                            onOpenCourse={openCourse}
                            onOpenQuest={() => navigate('/learning/ccaf-quest')}
                        />
                    ) : selectedCourseId === patternsCourse?.id && patternsCourse ? (
                        <CodingInterviewRoadmap
                            course={patternsCourse}
                            progress={progressByCourse[patternsCourse.id]}
                            onBack={() => navigate('/learning')}
                            onResume={() => openCourse(patternsCourse.id)}
                            onOpenExercise={(exerciseId) => openCourse(patternsCourse.id, `/learn/${patternsCourse.id}/${exerciseId}`)}
                        />
                    ) : selectedCourseId === systemDesignCourse?.id && systemDesignCourse ? (
                        <SystemDesignInterviewRoadmap
                            course={systemDesignCourse}
                            progress={progressByCourse[systemDesignCourse.id]}
                            onBack={() => navigate('/learning')}
                            onResume={() => openCourse(systemDesignCourse.id)}
                            onOpenExercise={(exerciseId) => openCourse(systemDesignCourse.id, `/learn/${systemDesignCourse.id}/${exerciseId}`)}
                        />
                    ) : (
                        <div className="space-y-4">
                            {/* Back Button */}
                            <button
                                onClick={() => navigate('/learning')}
                                className="cvl-btn-ghost -ml-2 inline-flex items-center gap-1.5 px-2 py-1.5 text-[12px] font-semibold"
                            >
                                <ArrowLeft size={14} aria-hidden="true" /> {t('courses.back_to_courses', 'Back to courses')}
                            </button>

                            <div className="grid grid-cols-1 items-start gap-5 @[1080px]/course-page:grid-cols-[minmax(0,1fr)_340px]">
                                <main className="space-y-4">
                                    {/* Hero */}
                                    <section className="cvl-panel p-4 sm:p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div
                                                    className="cvl-mono mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]"
                                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                                >
                                                    <GraduationCap size={14} aria-hidden="true" />
                                                    <span>AI-agent curriculum</span>
                                                </div>
                                                <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">Build real AI agents, step by step</h1>
                                                <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
                                                    10 steps from LLM foundations to a shipped portfolio project. Each step mixes readings, videos, animated playgrounds, quizzes, and a code lab — curated from Microsoft, OpenAI, Anthropic, Google, and Hugging Face's open courses.
                                                </p>
                                            </div>
                                            {currentLab && (
                                                <button
                                                    type="button"
                                                    onClick={() => openCourse(currentLab.id)}
                                                    className="cvl-cta inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition"
                                                >
                                                    <Play size={15} aria-hidden="true" />
                                                    {completedCount > 0 ? 'Continue' : 'Start'} step {currentModule?.order}
                                                    <ArrowRight size={15} aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </section>

                                    {/* The learning path — one row per step */}
                                    <section className="cvl-panel overflow-hidden">
                                        <ol>
                                            {modules.map((module, idx) => {
                                                const isExpanded = expandedId === module.id;
                                                const isLast = idx === modules.length - 1;
                                                const isCompleting = completingId === module.id;
                                                const isLocked = module.state === 'locked';
                                                const lab = labByModuleOrder.get(module.order);
                                                const lessonCount = lab ? getCourseExerciseCount(lab) : 0;
                                                const isCurrent = module.id === currentModule?.id;
                                                const labProgress = lab ? progressByCourse[lab.id] : undefined;
                                                const doneLessons = lab && labProgress
                                                    ? getCourseExercises(lab).filter((e) => labProgress.completedModuleIds.includes(e.id)).length
                                                    : 0;
                                                const lessonPct = lessonCount > 0 ? Math.round((doneLessons / lessonCount) * 100) : 0;
                                                const actionLabel = module.state === 'completed' || (lessonCount > 0 && doneLessons >= lessonCount)
                                                    ? 'Review'
                                                    : doneLessons > 0 ? 'Continue' : 'Start';
                                                return (
                                                    <li
                                                        key={module.id}
                                                        className={!isLast ? 'border-b' : ''}
                                                        style={!isLast ? { borderColor: 'var(--cvl-line)' } : undefined}
                                                    >
                                                        {/*
                                                          * The row is the click target, so it has to answer the
                                                          * pointer. A row that is already the current step keeps
                                                          * its purple ground — it is highlighted for a different
                                                          * reason — and a row whose button is disabled gets
                                                          * nothing, because nothing will happen.
                                                          */}
                                                        <div
                                                            className={`flex w-full items-center gap-3 p-4 text-left transition-colors sm:p-5 ${
                                                                isCurrent || (isLocked && currentUser)
                                                                    ? ''
                                                                    : 'hover:bg-[var(--cvl-paper-2)]'
                                                            }`}
                                                            style={isCurrent ? { background: 'var(--cvl-purple-soft)' } : undefined}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpand(module)}
                                                                // Locked rows stay clickable for guests so the tap opens
                                                                // the sign-in gate instead of dying silently.
                                                                disabled={isLocked && Boolean(currentUser)}
                                                                aria-expanded={isExpanded}
                                                                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                                                            >
                                                                <span
                                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold"
                                                                    style={stateWell(module.state)}
                                                                >
                                                                    {module.state === 'completed'
                                                                        ? <CheckCircle2 size={17} aria-hidden="true" />
                                                                        : isLocked
                                                                            ? <Lock size={14} aria-hidden="true" />
                                                                            : module.order}
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h2 className="text-[15px] font-semibold leading-snug tracking-tight sm:text-[17px]">{module.title}</h2>
                                                                        {isCurrent && (
                                                                            <span
                                                                                className="cvl-mono rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                                                                                style={{ background: 'var(--cvl-paper)', color: 'var(--cvl-purple)' }}
                                                                            >
                                                                                Up next
                                                                            </span>
                                                                        )}
                                                                        {/* The lock glyph carries the state visually; this
                                                                            names it, so it survives for a screen reader
                                                                            and for anyone who reads the row in a hurry. */}
                                                                        {isLocked && (
                                                                            <span
                                                                                className="cvl-mono inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                                                                                style={{ background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                                                            >
                                                                                <Lock size={10} aria-hidden="true" /> Locked
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="mt-0.5 truncate text-[12.5px] leading-relaxed sm:text-[13.5px]" style={{ color: 'var(--cvl-muted)' }}>
                                                                        {module.objective}
                                                                    </p>
                                                                    {lab && !isLocked && (
                                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                            <p className="cvl-mono flex items-center gap-x-2 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                                                                <span className="uppercase">{lab.difficulty}</span>
                                                                                <span aria-hidden>·</span>
                                                                                <span>{doneLessons} / {lessonCount} lessons</span>
                                                                                {lab.estimatedMinutes && (
                                                                                    <>
                                                                                        <span aria-hidden>·</span>
                                                                                        <span>~{lab.estimatedMinutes} min</span>
                                                                                    </>
                                                                                )}
                                                                            </p>
                                                                            <span
                                                                                className="h-2 w-24 overflow-hidden rounded-full border"
                                                                                style={{ background: 'var(--cvl-paper-2)', borderColor: 'var(--cvl-line)' }}
                                                                            >
                                                                                <span
                                                                                    className="block h-full rounded-full transition-[width] duration-500"
                                                                                    style={{
                                                                                        width: `${Math.max(lessonPct, doneLessons > 0 ? 6 : 0)}%`,
                                                                                        background: lessonPct >= 100 ? 'var(--cvl-green)' : 'var(--cvl-purple)',
                                                                                    }}
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {lab && !isLocked && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openCourse(lab.id)}
                                                                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition ${isCurrent ? 'cvl-cta' : 'cvl-btn'}`}
                                                                >
                                                                    <Play size={13} aria-hidden="true" />
                                                                    {actionLabel}
                                                                </button>
                                                            )}
                                                            {!isLocked && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(module)}
                                                                    aria-expanded={isExpanded}
                                                                    aria-label={isExpanded ? 'Hide details' : 'Show details'}
                                                                    className="cvl-btn-ghost shrink-0 p-1.5"
                                                                >
                                                                    <ChevronDown
                                                                        size={18}
                                                                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isExpanded && (
                                                            <div
                                                                className="space-y-4 border-t px-4 pb-5 pt-4 sm:px-5"
                                                                style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)' }}
                                                            >
                                                                <div>
                                                                    <p className="cvl-mono mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
                                                                        <Sparkles size={12} aria-hidden="true" /> What you'll learn
                                                                    </p>
                                                                    <ul className="space-y-1.5">
                                                                        {module.topics.map((topic) => (
                                                                            <li key={topic} className="flex items-start gap-2 text-[12.5px] leading-relaxed sm:text-[13.5px]" style={{ color: 'var(--cvl-muted)' }}>
                                                                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--cvl-purple)' }} />
                                                                                {topic}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>

                                                                {module.exercise && (
                                                                    <div className="cvl-panel flex items-start gap-2.5 p-3">
                                                                        <span
                                                                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                                                                            style={{ background: 'var(--cvl-purple-soft)', color: 'var(--cvl-purple)' }}
                                                                        >
                                                                            <BookOpen size={12} aria-hidden="true" />
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>Exercise</p>
                                                                            <p className="mt-0.5 text-[12.5px] leading-relaxed sm:text-[13.5px]" style={{ color: 'var(--cvl-muted)' }}>{module.exercise}</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {module.project && (
                                                                    <div className="cvl-panel flex items-start gap-2.5 p-3">
                                                                        <span
                                                                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                                                                            style={{ background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }}
                                                                        >
                                                                            <Target size={12} aria-hidden="true" />
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-faint)' }}>Project</p>
                                                                            <p className="mt-0.5 text-[12.5px] leading-relaxed sm:text-[13.5px]" style={{ color: 'var(--cvl-muted)' }}>{module.project}</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {module.sourceIds.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>Sources</span>
                                                                        {module.sourceIds.map((sourceId) => {
                                                                            const source = getLearningSourceById(sourceId);
                                                                            if (!source) return null;
                                                                            return source.repoUrl ? (
                                                                                <a
                                                                                    key={sourceId}
                                                                                    href={source.repoUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="cvl-btn inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                                                                                >
                                                                                    {source.title}
                                                                                    <ExternalLink size={10} aria-hidden="true" />
                                                                                </a>
                                                                            ) : (
                                                                                <span
                                                                                    key={sourceId}
                                                                                    className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                                                                    style={{ borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper)', color: 'var(--cvl-muted)' }}
                                                                                >
                                                                                    {source.title}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                                                    {lab && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openCourse(lab.id)}
                                                                            className="cvl-cta inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold transition"
                                                                        >
                                                                            <Play size={13} aria-hidden="true" /> {actionLabel} lessons
                                                                            <ArrowRight size={13} aria-hidden="true" />
                                                                        </button>
                                                                    )}
                                                                    {module.state === 'completed' ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--cvl-green)' }}>
                                                                            <CheckCircle2 size={14} aria-hidden="true" /> Module complete
                                                                        </span>
                                                                    ) : currentUser ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleComplete(module.id)}
                                                                            disabled={isCompleting}
                                                                            aria-busy={isCompleting}
                                                                            className="cvl-btn inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[12px] font-semibold disabled:cursor-not-allowed"
                                                                        >
                                                                            {/*
                                                                              * The label changes, not just the icon. A reader
                                                                              * with reduced motion gets a still spinner, which
                                                                              * beside an unchanged label is indistinguishable
                                                                              * from the idle button.
                                                                              */}
                                                                            {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                                                                            {isCompleting ? 'Saving…' : 'Mark complete'}
                                                                        </button>
                                                                    ) : (
                                                                        <p className="text-[12px]" style={{ color: 'var(--cvl-muted)' }}>Sign in to track your progress through this module.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </section>
                                </main>

                                <aside className="space-y-4 @[1080px]/course-page:sticky @[1080px]/course-page:top-6">
                                    {currentUser ? (
                                        <>
                                            {/* Level */}
                                            <section className="cvl-panel p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[15px] font-semibold tracking-tight">Level {isLoadingLevel ? '—' : levelInfo.level}</p>
                                                        <p className="cvl-mono mt-1 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                                            {isLoadingLevel ? 'Loading…' : `${levelInfo.currentLevelXp} / ${levelInfo.nextLevelXp} XP to level ${levelInfo.level + 1}`}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                                                        style={{ background: 'var(--cvl-amber-soft)', color: 'var(--cvl-amber)' }}
                                                    >
                                                        <Zap size={16} aria-hidden="true" />
                                                    </span>
                                                </div>
                                                <div
                                                    className="mt-3 h-2 overflow-hidden rounded-full border"
                                                    style={{ background: 'var(--cvl-paper-2)', borderColor: 'var(--cvl-line)' }}
                                                >
                                                    <div
                                                        className="h-full rounded-full transition-[width] duration-500"
                                                        style={{ width: `${Math.max((isLoadingLevel ? 0 : levelInfo.progress) * 100, 2)}%`, background: 'var(--cvl-purple)' }}
                                                    />
                                                </div>
                                            </section>

                                            {/* Course progress */}
                                            <section className="cvl-panel p-4">
                                                <h2 className="text-[15px] font-semibold tracking-tight">Course progress</h2>
                                                <p className="cvl-mono mt-1 text-[11px]" style={{ color: 'var(--cvl-muted)' }}>
                                                    {isLoadingCourse ? 'Loading…' : `${completedCount} / ${totalCount} modules completed`}
                                                </p>
                                                <div
                                                    className="mt-3 h-2 overflow-hidden rounded-full border"
                                                    style={{ background: 'var(--cvl-paper-2)', borderColor: 'var(--cvl-line)' }}
                                                >
                                                    <div
                                                        className="h-full rounded-full transition-[width] duration-500"
                                                        style={{ width: `${Math.max(progressPct, completedCount > 0 ? 4 : 0)}%`, background: 'var(--cvl-purple)' }}
                                                    />
                                                </div>
                                                {courseComplete && (
                                                    <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--cvl-green)' }}>
                                                        <Rocket size={14} aria-hidden="true" /> Curriculum complete — nice work!
                                                    </p>
                                                )}
                                            </section>

                                            {/* Course badges: one per completed module */}
                                            <section className="cvl-panel p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <h2 className="text-[15px] font-semibold tracking-tight">Course badges</h2>
                                                    <span className="cvl-mono text-[11px]" style={{ color: 'var(--cvl-muted)' }}>{completedCount} / {totalCount}</span>
                                                </div>
                                                <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>Complete a module to earn its badge — collect 'em all.</p>
                                                <div className="mt-3 grid grid-cols-5 gap-2">
                                                    {modules.map((module) => {
                                                        const earned = module.state === 'completed';
                                                        return (
                                                            <div
                                                                key={module.id}
                                                                title={module.title}
                                                                className="flex aspect-square items-center justify-center rounded-lg border text-[12px] font-bold transition-colors"
                                                                style={earned
                                                                    ? { borderColor: 'var(--cvl-green)', background: 'var(--cvl-green-soft)', color: 'var(--cvl-green)' }
                                                                    : { borderColor: 'var(--cvl-line)', background: 'var(--cvl-paper-2)', color: 'var(--cvl-muted)' }}
                                                            >
                                                                {earned ? <CheckCircle2 size={16} aria-hidden="true" /> : module.order}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        </>
                                    ) : (
                                        <section className="cvl-panel p-4">
                                            <h2 className="text-[15px] font-semibold tracking-tight">Your progress</h2>
                                            <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>Sign in to save your module completions, earn XP, and unlock the next chapter automatically.</p>
                                        </section>
                                    )}
                                </aside>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};

export default CoursePage;
