import React, { Suspense, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ChevronLeft,
    ClipboardList,
    Lightbulb,
    Loader2,
    PenTool,
    Play,
    RotateCcw,
    Send,
    Terminal,
    XCircle,
    Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useQuestCodeRunner } from '../hooks/useQuestCodeRunner';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { navigate } from '../utils/navigation';
import {
    evaluateCheck,
    getCourseExerciseCount,
    locateExercise,
    getInteractiveCourses,
    type LessonKind,
} from '../lib/interactiveCourses';
import { getCourseWidget } from '../components/CourseWidgets';
import QuizBlock from '../components/CourseWidgets/QuizBlock';
import AuthGateModal from '../components/AuthGateModal';
import { getCourseModules, getCourseTotalCount } from '../lib/courseCurriculum';

const JS_TIMEOUT_MS = 5_000;
const PY_TIMEOUT_MS = 60_000;

interface InteractiveLessonPageProps {
    courseId: string;
    exerciseId: string;
}

const codeStorageKey = (courseId: string, exerciseId: string) => `cv_lesson_${courseId}_${exerciseId}`;
const whiteboardStorageKey = (courseId: string, exerciseId: string) => `cv_lesson_board_${courseId}_${exerciseId}`;

const toSerializableScene = <T,>(value: T): T =>
    value == null ? value : JSON.parse(JSON.stringify(value));

/** Convert YouTube watch / short links into embeddable URLs; other URLs pass through. */
const toEmbedUrl = (url: string): string => {
    const short = url.match(/youtu\.be\/([\w-]{6,})/);
    if (short) return `https://www.youtube.com/embed/${short[1]}`;
    const watch = url.match(/[?&]v=([\w-]{6,})/);
    if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
    return url;
};

const loadWhiteboardScene = (courseId: string, exerciseId: string, background: string) => {
    if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(whiteboardStorageKey(courseId, exerciseId));
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                // Fall through to a clean board when saved data is malformed.
            }
        }
    }
    return {
        elements: [],
        appState: { viewBackgroundColor: background },
        files: {},
    };
};
const InteractiveLessonPage: React.FC<InteractiveLessonPageProps> = ({ courseId, exerciseId }) => {
    const { t, i18n } = useTranslation();
    const { resolvedTheme } = useTheme();
    const { currentUser } = useAuth();
    const { run } = useQuestCodeRunner();
    const excalidrawAPIRef = useRef<any>(null);

    const location = useMemo(() => locateExercise(courseId, exerciseId), [courseId, exerciseId, i18n.language]);
    const initialWhiteboardData = useMemo(
        () => loadWhiteboardScene(courseId, exerciseId, resolvedTheme === 'dark' ? '#1f2937' : '#ffffff'),
        [courseId, exerciseId, resolvedTheme],
    );
    const totalCount = location ? getCourseExerciseCount(location.course) : 0;
    const { progress, complete } = useCourseProgress(courseId, totalCount);
    const { complete: completeCurriculumModule } = useCourseProgress('ai-agent-curriculum', getCourseTotalCount());
    const backRoute = courseId === 'coding-interview-patterns' ? '/learning' : `/learning/${courseId}`;

    const [code, setCode] = useState<string>(() => {
        if (typeof window !== 'undefined' && location) {
            const saved = window.localStorage.getItem(codeStorageKey(courseId, exerciseId));
            if (saved !== null) return saved;
        }
        return location?.exercise.starterCode ?? '';
    });
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ pass: boolean; detail?: string } | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [showAuthGate, setShowAuthGate] = useState(false);

    if (!location) {
        return (
            <div className="cv-design-page flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="cv-design-title text-xl">{t('courses.lesson_not_found', 'Lesson not found')}</p>
                <button onClick={() => navigate(backRoute)} className="cv-design-button-secondary rounded-lg px-4 py-2 text-sm">
                    {t('courses.back_to_course', 'Back to course')}
                </button>
            </div>
        );
    }

    const { course, chapter, exercise, index, total, prevExerciseId, nextExerciseId } = location;
    const completedIds = progress?.completedModuleIds ?? [];
    const isCompleted = completedIds.includes(exercise.id) || result?.pass === true;
    const editorProgress = total ? Math.round((completedIds.length / total) * 100) : 0;
    const kind: LessonKind = exercise.kind ?? (exercise.check.type === 'diagram' ? 'whiteboard' : 'code');
    const isWhiteboardExercise = kind === 'whiteboard';
    const isStandaloneLesson = kind === 'reading' || kind === 'video' || kind === 'quiz' || kind === 'interactive';

    const markComplete = async () => {
        setResult({ pass: true });
        if (!currentUser) {
            // Guests can finish the free course's lessons — banking XP and
            // progress is the account hook.
            setShowAuthGate(true);
            return;
        }
        if (!completedIds.includes(exercise.id)) {
            await complete(exercise.id, exercise.xp);
        }
    };

    const updateCode = (value: string) => {
        setCode(value);
        if (typeof window !== 'undefined') window.localStorage.setItem(codeStorageKey(courseId, exerciseId), value);
    };

    const resetCode = () => {
        const starter = exercise.starterCode ?? '';
        setCode(starter);
        setLogs([]);
        setError('');
        setResult(null);
        if (typeof window !== 'undefined') window.localStorage.setItem(codeStorageKey(courseId, exerciseId), starter);
    };

    const resetWhiteboard = () => {
        const api = excalidrawAPIRef.current;
        const cleanScene = {
            elements: [],
            appState: { viewBackgroundColor: resolvedTheme === 'dark' ? '#1f2937' : '#ffffff' },
            files: {},
        };
        api?.updateScene(cleanScene);
        setLogs([]);
        setError('');
        setResult(null);
        if (typeof window !== 'undefined') window.localStorage.removeItem(whiteboardStorageKey(courseId, exerciseId));
    };

    const saveWhiteboardScene = (elements: readonly any[], appState: Record<string, any>, files: Record<string, any>) => {
        if (typeof window === 'undefined') return;
        const filtered = elements.filter((el: any) => !el.isDeleted);
        const payload = {
            elements: toSerializableScene(filtered),
            appState: {
                viewBackgroundColor: appState.viewBackgroundColor ?? (resolvedTheme === 'dark' ? '#1f2937' : '#ffffff'),
            },
            files: toSerializableScene(files ?? {}),
        };
        window.localStorage.setItem(whiteboardStorageKey(courseId, exerciseId), JSON.stringify(payload));
    };

    const executeScript = async () => {
        const timeoutMs = exercise.language === 'python' ? PY_TIMEOUT_MS : JS_TIMEOUT_MS;
        const response = await run({ language: exercise.language, code, mode: 'script', timeoutMs });
        setLogs(response.logs.length > 0 ? response.logs : ['Code ran successfully. Submit answer to check your solution.']);
        return response;
    };

    const executeCheck = async () => {
        const check = exercise.check;
        const timeoutMs = exercise.language === 'python' ? PY_TIMEOUT_MS : JS_TIMEOUT_MS;
        const response = check.type === 'tests'
            ? await run({ language: exercise.language, code, mode: 'tests', functionName: check.functionName, tests: check.tests, timeoutMs })
            : await run({ language: exercise.language, code, mode: 'script', timeoutMs });
        setLogs(response.logs);
        return response;
    };

    const handleRun = async () => {
        setIsRunning(true);
        setError('');
        setResult(null);
        try {
            const response = await executeScript();
            if (!response.ok) setError(response.error || 'Your code did not run.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to run your code.');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (isWhiteboardExercise) {
            const api = excalidrawAPIRef.current;
            const elements = api?.getSceneElements?.().filter((el: any) => !el.isDeleted) ?? [];
            const passThreshold = exercise.check.type === 'diagram' ? exercise.check.passThreshold : 4;
            const outcome = elements.length >= passThreshold
                ? { pass: true, detail: `Diagram has ${elements.length} elements.` }
                : { pass: false, detail: `Add at least ${passThreshold} components, labels, or connectors before submitting. Current count: ${elements.length}.` };
            setResult(outcome);
            setError('');
            if (outcome.pass && currentUser && !completedIds.includes(exercise.id)) {
                await complete(exercise.id, exercise.xp);
            }
            return;
        }

        setIsSubmitting(true);
        setError('');
        setResult(null);
        try {
            const response = await executeCheck();
            const outcome = evaluateCheck(exercise.check, response);
            setResult(outcome);
            if (outcome.pass && currentUser && !completedIds.includes(exercise.id)) {
                await complete(exercise.id, exercise.xp);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to check your answer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const goTo = (id: string | null) => {
        if (id) navigate(`/learn/${courseId}/${id}`);
    };

    const handleFinishCourse = async () => {
        // 1. Mark the current final exercise as complete (if not already completed)
        if (!isCompleted) {
            await markComplete();
        }
        
        // 2. Identify curriculum module by order index and mark it complete automatically
        try {
            const coursesList = getInteractiveCourses();
            const courseIdx = coursesList.findIndex(c => c.id === courseId);
            if (courseIdx >= 0) {
                const targetOrder = courseIdx + 1;
                const curriculumModules = getCourseModules();
                const matchedModule = curriculumModules.find(m => m.order === targetOrder);
                if (matchedModule) {
                    await completeCurriculumModule(matchedModule.id);
                }
            }
        } catch (err) {
            console.error('Failed to mark curriculum module complete:', err);
        }
        
        // 3. Navigate back to curriculum dashboard
        navigate(backRoute);
    };

    const busy = isRunning || isSubmitting;

    return (
        <div className="cv-design-page flex h-screen flex-col overflow-hidden">
            {showAuthGate && (
                <AuthGateModal
                    title="Nice work — save your progress?"
                    message="You finished this lesson as a guest. Create a free account to bank the XP, keep your streak, and unlock the rest of the curriculum."
                    onClose={() => setShowAuthGate(false)}
                />
            )}
            {/* Top bar */}
            <header className="flex shrink-0 items-center gap-3 border-b border-[var(--cv-border-warm)] px-3 py-2.5 sm:px-4">
                <button
                    onClick={() => navigate(backRoute)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--cv-text-muted)] transition-colors hover:bg-[var(--cv-surface-warm-muted,rgba(0,0,0,0.04))] hover:text-[var(--cv-text-heading)]"
                    aria-label="Back to course"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="hidden font-bold text-[var(--cv-text-heading)] sm:inline">{course.title}</span>
                    <span className="hidden text-[var(--cv-text-muted)] sm:inline">/</span>
                    <span className="truncate font-semibold text-[var(--cv-text-body)]">{chapter.title}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-[var(--cv-border-warm)] sm:block">
                        <div className="h-full rounded-full bg-[var(--cv-action-solid)] transition-[width] duration-500" style={{ width: `${editorProgress}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-[var(--cv-text-muted)]">{editorProgress}%</span>
                </div>
            </header>

            {/* Standalone lessons: reading / video / quiz / interactive */}
            {isStandaloneLesson ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl p-5 pb-10 lg:p-8">
                        <div className="cv-design-eyebrow mb-2">{t('courses.lesson_counter', { index, total, defaultValue: 'Lesson {{index}} of {{total}}' })}</div>

                        {kind === 'video' && exercise.videoUrl && (
                            <div className="mb-5 overflow-hidden rounded-2xl border border-[var(--cv-border-warm)] bg-black">
                                <iframe
                                    src={toEmbedUrl(exercise.videoUrl)}
                                    title={exercise.title}
                                    className="aspect-video w-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        <div className="cv-lesson-prose max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{exercise.content}</ReactMarkdown>
                        </div>

                        {kind === 'interactive' && (
                            <div className="mt-6">
                                {(() => {
                                    const Widget = getCourseWidget(exercise.widgetId);
                                    if (!Widget) {
                                        return (
                                            <p className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                Interactive widget "{exercise.widgetId}" is not registered.
                                            </p>
                                        );
                                    }
                                    return (
                                        <Suspense fallback={<div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-[var(--cv-text-muted)]" size={20} /></div>}>
                                            <Widget
                                                completed={isCompleted}
                                                onComplete={() => { void markComplete(); }}
                                                course={course}
                                                chapter={chapter}
                                                exercise={exercise}
                                                completedExerciseIds={completedIds}
                                            />
                                        </Suspense>
                                    );
                                })()}
                            </div>
                        )}

                        {kind === 'quiz' && exercise.quiz && (
                            <div className="mt-6">
                                <QuizBlock
                                    questions={exercise.quiz}
                                    minCorrect={exercise.check.type === 'quiz' ? exercise.check.minCorrect : undefined}
                                    completed={isCompleted}
                                    onPass={() => { void markComplete(); }}
                                />
                            </div>
                        )}

                        {exercise.attribution && (
                            <p className="mt-8 border-t border-[var(--cv-border-warm)] pt-3 text-[11px] font-medium text-[var(--cv-text-muted)]">
                                {exercise.attribution}
                            </p>
                        )}

                        {(kind === 'reading' || kind === 'video') && (
                            <div className="mt-8 flex items-center gap-3">
                                <button
                                    onClick={() => { void markComplete(); }}
                                    disabled={isCompleted}
                                    className="cv-design-button-primary inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm disabled:cursor-default disabled:opacity-60"
                                >
                                    <CheckCircle2 size={16} />
                                    {isCompleted ? 'Completed' : `Mark as done · +${exercise.xp} XP`}
                                </button>
                                {isCompleted && (
                                    nextExerciseId ? (
                                        <button onClick={() => goTo(nextExerciseId)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] px-4 text-sm font-bold text-[var(--cv-text-body)] hover:border-[var(--cv-action-border)]">
                                            Next lesson <ArrowRight size={15} />
                                        </button>
                                    ) : (
                                        <button onClick={handleFinishCourse} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:border-emerald-400">
                                            Finish Course <CheckCircle2 size={15} className="text-emerald-600" />
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        {(kind === 'quiz' || kind === 'interactive') && isCompleted && (
                            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 size={16} /> Lesson complete · +{exercise.xp} XP
                                {nextExerciseId ? (
                                    <button onClick={() => goTo(nextExerciseId)} className="ml-auto inline-flex items-center gap-1 underline">
                                        Next lesson <ArrowRight size={14} />
                                    </button>
                                ) : (
                                    <button onClick={handleFinishCourse} className="ml-auto inline-flex items-center gap-1 underline">
                                        Finish Course <CheckCircle2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                {/* Instructions */}
                <section className="min-h-0 overflow-y-auto border-b border-[var(--cv-border-warm)] p-5 lg:w-[42%] lg:border-b-0 lg:border-r lg:p-6">
                    <div className="cv-design-eyebrow mb-2">Exercise {index} of {total}</div>
                    <div className="cv-lesson-prose max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{exercise.content}</ReactMarkdown>
                    </div>

                    {exercise.hint && (
                        <div className="mt-6">
                            <button
                                onClick={() => setShowHint((s) => !s)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--cv-text-eyebrow)] hover:opacity-80"
                            >
                                <Lightbulb size={13} /> {showHint ? 'Hide hint' : 'Show hint'}
                            </button>
                            {showHint && (
                                <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] p-3 font-mono text-[12px] text-[var(--cv-text-body)]">{exercise.hint}</pre>
                            )}
                        </div>
                    )}
                </section>

                {isWhiteboardExercise ? (
                    <section className="flex min-h-0 flex-1 flex-col bg-[#f8f8fb] dark:bg-[#111827]">
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#ececf4] bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
                            <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[var(--cv-text-heading)] dark:text-gray-100">
                                <PenTool size={14} className="text-[var(--cv-action-primary)]" />
                                <span className="truncate">architecture-whiteboard.excalidraw</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetWhiteboard}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#ececf4] bg-white px-3 text-xs font-bold text-gray-700 transition-colors hover:bg-[#f7f7fc] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <RotateCcw size={13} />
                                    Reset
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--cv-action-solid)] px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--cv-action-primary-hover)]"
                                >
                                    <Send size={13} />
                                    Submit drawing
                                </button>
                            </div>
                        </div>

                        <div className="min-h-[360px] flex-1 bg-white dark:bg-gray-900">
                            <Excalidraw
                                excalidrawAPI={(api: any) => { excalidrawAPIRef.current = api; }}
                                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                initialData={initialWhiteboardData}
                                onChange={(elements, appState, files) => saveWhiteboardScene(elements, appState as Record<string, any>, files as Record<string, any>)}
                            />
                        </div>

                        <div className="shrink-0 border-t border-[#ececf4] bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--cv-action-primary)]">
                                        <ClipboardList size={12} /> Drawing requirements
                                    </p>
                                    <ul className="mt-1.5 grid gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                                        {(exercise.whiteboardBrief?.requirements ?? []).map((requirement, requirementIndex) => (
                                            <li key={requirement} className="flex min-w-0 gap-1.5">
                                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-[#f3f2ff] text-[10px] font-extrabold text-[#625bd5] ring-1 ring-[#dfe2ff] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff] dark:ring-[#625bd5]/40">
                                                    {requirementIndex + 1}
                                                </span>
                                                <span>{requirement}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {result && (
                                    <div className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${result.pass
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                                        <p className="flex items-center gap-1.5 font-bold">
                                            {result.pass ? <CheckCircle2 size={14} /> : <Lightbulb size={14} />}
                                            {result.pass ? `Architecture saved · +${exercise.xp} XP` : 'Keep drawing'}
                                        </p>
                                        {result.detail && <p className="mt-1 font-medium">{result.detail}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="flex min-h-0 flex-1 flex-col bg-[#0f1117] dark:bg-[#0b0d13]">
                    {/* Editor header */}
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                        <span className="flex items-center gap-2 font-mono text-xs font-semibold text-gray-300">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#e5c07b]" />
                            {exercise.language === 'python' ? 'script.py' : 'script.js'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={resetCode}
                                disabled={busy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-bold text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RotateCcw size={13} />
                                Reset
                            </button>
                            <button
                                onClick={handleRun}
                                disabled={busy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-bold text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                                Run
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={busy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--cv-action-solid)] px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--cv-action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                Submit answer
                            </button>
                        </div>
                    </div>

                    {/* Code editor */}
                    <div className="min-h-0 flex-1 overflow-auto">
                        <CodeMirror
                            value={code}
                            height="100%"
                            style={{ height: '100%', fontSize: 13 }}
                            theme="dark"
                            extensions={[exercise.language === 'python' ? python() : javascript()]}
                            onChange={updateCode}
                            basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: true }}
                        />
                    </div>

                    {/* Terminal */}
                    <div className="h-44 shrink-0 overflow-y-auto border-t border-white/10 bg-[#0b0d13] p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            <Terminal size={12} /> Terminal
                        </p>

                        {result && (
                            <div className={`mt-2 flex items-start gap-2 rounded-lg border p-2.5 text-xs ${result.pass
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                                {result.pass ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}
                                <div className="min-w-0">
                                    <p className="font-bold">{result.pass ? `Correct! +${exercise.xp} XP` : 'Not quite yet'}</p>
                                    {result.detail && <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] opacity-90">{result.detail}</pre>}
                                </div>
                            </div>
                        )}

                        {error && (
                            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 font-mono text-[11px] text-rose-300">{error}</pre>
                        )}

                        {!error && logs.length > 0 && (
                            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-gray-200">{logs.join('\n')}</pre>
                        )}

                        {!error && !result && logs.length === 0 && (
                            <p className="mt-2 font-mono text-[12px] text-gray-500">{t('courses.click_run_hint', 'Click ')}<span className="text-gray-300">{t('courses.run', 'Run')}</span>{t('courses.click_run_hint_end', ' to see your output here.')}</p>
                        )}
                    </div>
                    </section>
                )}
            </div>
            )}

            {/* Bottom nav bar */}
            <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--cv-border-warm)] px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-bold text-[var(--cv-text-heading)]">{exercise.title}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--cv-action-border)] bg-[var(--cv-action-soft-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--cv-action-primary)]">
                        <Zap size={10} /> {exercise.xp} XP
                    </span>
                    {isCompleted && (
                        <span className="hidden shrink-0 items-center gap-1 text-[11px] font-bold text-[var(--cv-success-600)] sm:inline-flex">
                            <CheckCircle2 size={12} /> {t('courses.done', 'Done')}
                        </span>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => goTo(prevExerciseId)}
                        disabled={!prevExerciseId}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--cv-border-warm)] bg-[var(--cv-surface-warm-card)] px-3 text-xs font-bold text-[var(--cv-text-body)] transition-colors hover:border-[var(--cv-action-border)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ArrowLeft size={14} /> {t('courses.back', 'Back')}
                    </button>
                    {nextExerciseId ? (
                        <button
                            onClick={() => goTo(nextExerciseId)}
                            className="cv-design-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs"
                        >
                            {t('courses.next', 'Next')} <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleFinishCourse}
                            className="cv-design-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800"
                        >
                            {t('courses.finish_course', 'Finish Course')} <CheckCircle2 size={14} />
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default InteractiveLessonPage;
