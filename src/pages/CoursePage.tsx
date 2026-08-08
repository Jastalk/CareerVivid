import React, { useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    Clock3,
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

const STATE_ICON_WELL: Record<CourseModuleWithState['state'], string> = {
    completed: 'bg-[var(--cv-success-50)] text-[var(--cv-success-600)] border border-[var(--cv-success-600)]/30',
    available: 'cv-design-icon-well',
    locked: 'bg-[var(--cv-surface-warm-muted,transparent)] text-[var(--cv-text-muted)] border border-[var(--cv-border-warm)]',
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
            {/* Same warm background as every other page — the catalog no longer swaps design systems. */}
            <div className="cv-design-page cv-design-grid relative min-h-screen pb-16 text-left">
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
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text-muted)] hover:text-[var(--cv-text-heading)] transition-colors"
                            >
                                <ArrowLeft size={14} /> {t('courses.back_to_courses', 'Back to courses')}
                            </button>

                            <div className="grid grid-cols-1 items-start gap-5 @[1080px]/course-page:grid-cols-[minmax(0,1fr)_340px]">
                                <main className="space-y-4">
                                    {/* Hero */}
                                    <section className="cv-design-card p-4 sm:p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="cv-design-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2.5 py-1 text-xs">
                                                    <GraduationCap size={14} />
                                                    <span>AI-agent curriculum</span>
                                                </div>
                                                <h1 className="cv-design-title text-2xl sm:text-3xl">Build real AI agents, step by step</h1>
                                                <p className="cv-design-body mt-1.5 max-w-2xl text-sm">
                                                    10 steps from LLM foundations to a shipped portfolio project. Each step mixes readings, videos, animated playgrounds, quizzes, and a code lab — curated from Microsoft, OpenAI, Anthropic, Google, and Hugging Face's open courses.
                                                </p>
                                            </div>
                                            {currentLab && (
                                                <button
                                                    type="button"
                                                    onClick={() => openCourse(currentLab.id)}
                                                    className="cv-design-button-primary inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm"
                                                >
                                                    <Play size={15} />
                                                    {completedCount > 0 ? 'Continue' : 'Start'} step {currentModule?.order}
                                                    <ArrowRight size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </section>

                                    {/* The learning path — one row per step */}
                                    <section className="cv-design-card overflow-hidden">
                                        <ol>
                                            {modules.map((module, idx) => {
                                                const isExpanded = expandedId === module.id;
                                                const isLast = idx === modules.length - 1;
                                                const isCompleting = completingId === module.id;
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
                                                    <li key={module.id} className={!isLast ? 'border-b border-[var(--cv-border-warm)]' : ''}>
                                                        <div
                                                            className={`flex w-full items-center gap-3 p-4 text-left transition-colors sm:p-5 ${module.state !== 'locked' ? 'hover:bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.02))]' : 'opacity-60'} ${isCurrent ? 'bg-[var(--cv-action-soft-bg,rgba(99,91,213,0.04))]' : ''}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpand(module)}
                                                                // Locked rows stay clickable for guests so the tap opens
                                                                // the sign-in gate instead of dying silently.
                                                                disabled={module.state === 'locked' && Boolean(currentUser)}
                                                                aria-expanded={isExpanded}
                                                                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                                                            >
                                                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${STATE_ICON_WELL[module.state]}`}>
                                                                    {module.state === 'completed' ? <CheckCircle2 size={17} /> : module.state === 'locked' ? <Lock size={14} /> : module.order}
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h2 className="cv-design-title text-base sm:text-lg">{module.title}</h2>
                                                                        {isCurrent && (
                                                                            <span className="rounded-full bg-[var(--cv-action-primary)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                                                                                Up next
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="cv-design-body mt-0.5 truncate text-xs sm:text-sm">{module.objective}</p>
                                                                    {lab && module.state !== 'locked' && (
                                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                            <p className="flex items-center gap-x-2 text-[11px] font-bold text-[var(--cv-text-muted)]">
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
                                                                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--cv-border-warm)]">
                                                                                <span
                                                                                    className={`block h-full rounded-full transition-[width] duration-500 ${lessonPct >= 100 ? 'bg-[var(--cv-success-600)]' : 'bg-[var(--cv-action-primary)]'}`}
                                                                                    style={{ width: `${Math.max(lessonPct, doneLessons > 0 ? 6 : 0)}%` }}
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                            {lab && module.state !== 'locked' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openCourse(lab.id)}
                                                                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${isCurrent
                                                                        ? 'cv-design-button-primary'
                                                                        : 'border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] text-[var(--cv-action-primary)] hover:border-[var(--cv-action-primary)]'}`}
                                                                >
                                                                    <Play size={13} />
                                                                    {actionLabel}
                                                                </button>
                                                            )}
                                                            {module.state !== 'locked' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(module)}
                                                                    aria-expanded={isExpanded}
                                                                    aria-label={isExpanded ? 'Hide details' : 'Show details'}
                                                                    className="shrink-0 p-1 text-[var(--cv-text-muted)] transition-colors hover:text-[var(--cv-text-heading)]"
                                                                >
                                                                    <ChevronDown
                                                                        size={18}
                                                                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="space-y-4 border-t border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-muted,transparent)] px-4 pb-5 pt-4 sm:px-5">
                                                                <div>
                                                                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--cv-text-eyebrow)]">
                                                                        <Sparkles size={12} /> What you'll learn
                                                                    </p>
                                                                    <ul className="space-y-1.5">
                                                                        {module.topics.map((topic) => (
                                                                            <li key={topic} className="cv-design-body flex items-start gap-2 text-xs sm:text-sm">
                                                                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--cv-action-primary)]" />
                                                                                {topic}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>

                                                                {module.exercise && (
                                                                    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-3">
                                                                        <span className="cv-design-icon-well mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                                                                            <BookOpen size={12} />
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--cv-text-muted)]">Exercise</p>
                                                                            <p className="cv-design-body mt-0.5 text-xs sm:text-sm">{module.exercise}</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {module.project && (
                                                                    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-3">
                                                                        <span className="cv-design-icon-well mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                                                                            <Target size={12} />
                                                                        </span>
                                                                        <div className="min-w-0">
                                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--cv-text-muted)]">Project</p>
                                                                            <p className="cv-design-body mt-0.5 text-xs sm:text-sm">{module.project}</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {module.sourceIds.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--cv-text-muted)]">Sources</span>
                                                                        {module.sourceIds.map((sourceId) => {
                                                                            const source = getLearningSourceById(sourceId);
                                                                            if (!source) return null;
                                                                            return source.repoUrl ? (
                                                                                <a
                                                                                    key={sourceId}
                                                                                    href={source.repoUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1 rounded-full border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--cv-text-body)] transition-colors hover:border-[var(--cv-action-border)] hover:text-[var(--cv-action-primary)]"
                                                                                >
                                                                                    {source.title}
                                                                                    <ExternalLink size={10} />
                                                                                </a>
                                                                            ) : (
                                                                                <span key={sourceId} className="rounded-full border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card-strong)] px-2 py-0.5 text-[11px] font-medium text-[var(--cv-text-body)]">
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
                                                                            className="cv-design-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs"
                                                                        >
                                                                            <Play size={13} /> {actionLabel} lessons
                                                                            <ArrowRight size={13} />
                                                                        </button>
                                                                    )}
                                                                    {module.state === 'completed' ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cv-success-600)]">
                                                                            <CheckCircle2 size={14} /> Module complete
                                                                        </span>
                                                                    ) : currentUser ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleComplete(module.id)}
                                                                            disabled={isCompleting}
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] px-4 text-xs font-bold text-[var(--cv-text-body)] transition-colors hover:border-[var(--cv-action-border)] disabled:cursor-not-allowed"
                                                                        >
                                                                            {isCompleting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                                            Mark complete
                                                                        </button>
                                                                    ) : (
                                                                        <p className="cv-design-body text-xs">Sign in to track your progress through this module.</p>
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
                                            <section className="cv-design-card p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="cv-design-title text-base">Level {isLoadingLevel ? '—' : levelInfo.level}</p>
                                                        <p className="cv-design-body mt-0.5 text-xs">
                                                            {isLoadingLevel ? 'Loading…' : `${levelInfo.currentLevelXp} / ${levelInfo.nextLevelXp} XP to level ${levelInfo.level + 1}`}
                                                        </p>
                                                    </div>
                                                    <span className="cv-design-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                                                        <Zap size={16} />
                                                    </span>
                                                </div>
                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cv-border-warm)]">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--cv-action-primary)] transition-[width] duration-500"
                                                        style={{ width: `${Math.max((isLoadingLevel ? 0 : levelInfo.progress) * 100, 2)}%` }}
                                                    />
                                                </div>
                                            </section>

                                            {/* Course progress */}
                                            <section className="cv-design-card p-4">
                                                <h2 className="cv-design-title text-base">Course progress</h2>
                                                <p className="cv-design-body mt-0.5 text-xs">
                                                    {isLoadingCourse ? 'Loading…' : `${completedCount} / ${totalCount} modules completed`}
                                                </p>
                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--cv-border-warm)]">
                                                    <div
                                                        className="h-full rounded-full bg-[var(--cv-action-primary)] transition-[width] duration-500"
                                                        style={{ width: `${Math.max(progressPct, completedCount > 0 ? 4 : 0)}%` }}
                                                    />
                                                </div>
                                                {courseComplete && (
                                                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[var(--cv-success-600)]">
                                                        <Rocket size={14} /> Curriculum complete — nice work!
                                                    </p>
                                                )}
                                            </section>

                                            {/* Course badges: one per completed module */}
                                            <section className="cv-design-card p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <h2 className="cv-design-title text-base">Course badges</h2>
                                                    <span className="cv-design-body text-xs">{completedCount} / {totalCount}</span>
                                                </div>
                                                <p className="cv-design-body mt-0.5 text-xs">Complete a module to earn its badge — collect 'em all.</p>
                                                <div className="mt-3 grid grid-cols-5 gap-2">
                                                    {modules.map((module) => {
                                                        const earned = module.state === 'completed';
                                                        return (
                                                            <div
                                                                key={module.id}
                                                                title={module.title}
                                                                className={`flex aspect-square items-center justify-center rounded-lg border text-xs font-extrabold transition-colors ${earned
                                                                    ? 'border-[var(--cv-success-600)]/40 bg-[var(--cv-success-50)] text-[var(--cv-success-600)]'
                                                                    : 'border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] text-[var(--cv-text-muted)]'
                                                                    }`}
                                                            >
                                                                {earned ? <CheckCircle2 size={16} /> : module.order}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        </>
                                    ) : (
                                        <section className="cv-design-card p-4">
                                            <h2 className="cv-design-title text-base">Your progress</h2>
                                            <p className="cv-design-body mt-1.5 text-xs">Sign in to save your module completions, earn XP, and unlock the next chapter automatically.</p>
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
