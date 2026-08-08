import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import {
    Bot,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    Code2,
    Lightbulb,
    Loader2,
    Mic,
    Play,
    Send,
    Sparkles,
    Terminal,
    X,
    XCircle,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import MobileExperienceGate from './MobileExperienceGate';
import { analyzeCodingSubmission, voiceToCode, VoiceCoachMessage, VoiceToCodeResult } from '../../services/geminiService';
import { InterviewAnalysis, QuestCodingArtifact, QuestCodingDraft } from '../../types';
import {
    CODING_LANGUAGES,
    CODING_LANGUAGE_LABELS,
    CodingBrief,
    CodingLanguage,
    CodingRunSummary,
    ExecutableCodingLanguage,
    getCodingFunctionName,
    getCodingStarterCode,
    isExecutableCodingLanguage,
} from '../../lib/codingChallenges';
import { useQuestCodeRunner } from '../../hooks/useQuestCodeRunner';
import type { RunnerResponse } from '../../workers/questCodeRunner.worker';
import { toTranscriptEntries } from '../../lib/voiceTranscript';

const InterviewReportModal = React.lazy(() => import('../InterviewReportModal'));

interface CodingBattleProps {
    /** Omitted for browser-only guest practice. */
    userId?: string;
    company: string;
    stageTitle: string;
    brief: CodingBrief;
    preferredLanguage: CodingLanguage;
    /** Guest mode never calls Gemini or persists progress. */
    isGuestPractice?: boolean;
    initialArtifact?: QuestCodingArtifact;
    initialDraft?: QuestCodingDraft;
    saveDraft?: (draft: QuestCodingDraft) => Promise<void>;
    /** Persist the analysis and return the saved record (with id + timestamp). */
    saveAnalysis?: (analysis: Omit<InterviewAnalysis, 'id' | 'timestamp'>) => Promise<InterviewAnalysis>;
    onAnalysisComplete?: (analysis: InterviewAnalysis) => void;
    onGuestSubmissionComplete?: (challengeId: string) => void;
    onGuestNextChallenge?: () => void;
    onClose: () => void;
}

const JS_TIMEOUT_MS = 5_000;
/** First Python run downloads the Pyodide runtime, so the budget is generous. */
const PY_TIMEOUT_MS = 60_000;

const summarize = (response: RunnerResponse, hiddenIncluded: boolean): CodingRunSummary => {
    const results = response.results.filter((r) => hiddenIncluded || !r.hidden);
    return {
        passed: results.filter((r) => r.pass).length,
        total: results.length,
        results,
        durationMs: response.durationMs,
    };
};

const isCodingLanguage = (value: string | undefined): value is CodingLanguage =>
    !!value && (CODING_LANGUAGES as readonly string[]).includes(value);

const formatJavaScript = async (source: string) => {
    const [prettier, babelParser] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/babel'),
    ]);
    // @ts-ignore — estree plugin is required alongside Babel by Prettier's standalone build.
    const estreePlugin = await import('prettier/plugins/estree');
    return prettier.format(source, {
        parser: 'babel',
        plugins: [babelParser, estreePlugin],
        semi: true,
        singleQuote: true,
        tabWidth: 4,
        printWidth: 100,
        trailingComma: 'es5',
    });
};

const getSuggestedTests = (value: string | undefined) => (value ?? '')
    .split(',')
    .map((test) => test.trim())
    .filter(Boolean)
    .slice(0, 3);

const buildInitialCodeByLanguage = (
    brief: CodingBrief,
    artifact: QuestCodingArtifact | undefined,
    draft: QuestCodingDraft | undefined,
): Record<CodingLanguage, string> => {
    const starter = Object.fromEntries(
        CODING_LANGUAGES.map((lang) => [lang, getCodingStarterCode(brief.challenge, lang)]),
    ) as Record<CodingLanguage, string>;
    if (draft?.challengeId === brief.challenge.id) {
        return Object.fromEntries(
            CODING_LANGUAGES.map((lang) => [
                lang,
                draft.codeByLanguage?.[lang] ?? (draft.language === lang ? draft.code : starter[lang]),
            ]),
        ) as Record<CodingLanguage, string>;
    }
    if (!artifact || artifact.challengeId !== brief.challenge.id) {
        return starter;
    }

    return Object.fromEntries(
        CODING_LANGUAGES.map((lang) => [
            lang,
            artifact.codeByLanguage?.[lang] ?? (artifact.language === lang ? artifact.code : starter[lang]),
        ]),
    ) as Record<CodingLanguage, string>;
};

const CodingBattle: React.FC<CodingBattleProps> = ({
    userId,
    company,
    stageTitle,
    brief,
    preferredLanguage,
    isGuestPractice = false,
    initialArtifact,
    initialDraft,
    saveDraft,
    saveAnalysis,
    onAnalysisComplete,
    onGuestSubmissionComplete,
    onGuestNextChallenge,
    onClose,
}) => {
    const { resolvedTheme } = useTheme();
    const { run } = useQuestCodeRunner();
    const { challenge } = brief;
    const requestedInitialLanguage = initialDraft?.challengeId === challenge.id && isCodingLanguage(initialDraft.language)
        ? initialDraft.language
        : initialArtifact?.challengeId === challenge.id && isCodingLanguage(initialArtifact.language)
            ? initialArtifact.language
            : preferredLanguage;
    const initialLanguage = isGuestPractice && !isExecutableCodingLanguage(requestedInitialLanguage)
        ? 'javascript'
        : requestedInitialLanguage;

    const [language, setLanguage] = useState<CodingLanguage>(initialLanguage);
    const [codeByLanguage, setCodeByLanguage] = useState<Record<CodingLanguage, string>>(
        () => buildInitialCodeByLanguage(brief, initialArtifact, initialDraft),
    );
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [guestSubmissionNotice, setGuestSubmissionNotice] = useState('');
    const [guestSubmissionPassed, setGuestSubmissionPassed] = useState(false);
    const [error, setError] = useState('');
    const [runSummary, setRunSummary] = useState<CodingRunSummary | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [reportEntry, setReportEntry] = useState<InterviewAnalysis | null>(null);
    const [voiceCodeChange, setVoiceCodeChange] = useState<{
        language: CodingLanguage;
        beforeCode: string;
        appliedCode: string;
    } | null>(null);

    // ── Voice-to-Code state ──────────────────────────────────────────────────
    // NOTE: code must be declared before voice hooks so useCallback closures can read it.
    // (The canonical `const code = ...` below this block is kept as-is for the render.)
    const [isListening, setIsListening] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [coachHistory, setCoachHistory] = useState<VoiceCoachMessage[]>([]);
    const [lastCoachResult, setLastCoachResult] = useState<VoiceToCodeResult | null>(null);
    const [coachPanelOpen, setCoachPanelOpen] = useState(false);
    // Mobile: the brief starts collapsed so the code editor gets the full screen.
    const [briefOpen, setBriefOpen] = useState(false);
    // Mobile: show a "better on desktop" gate before opening the round.
    const isMobileViewport = useMediaQuery('(max-width: 1023px)');
    const [mobileGateAcknowledged, setMobileGateAcknowledged] = useState(false);
    const recognitionRef = useRef<any>(null);
    const voiceTranscriptRef = useRef('');
    const coachScrollRef = useRef<HTMLDivElement | null>(null);
    const suggestedTests = useMemo(
        () => getSuggestedTests(lastCoachResult?.suggestedTests),
        [lastCoachResult?.suggestedTests],
    );

    // Scroll coach panel to bottom on new messages
    useEffect(() => {
        if (coachScrollRef.current) {
            coachScrollRef.current.scrollTop = coachScrollRef.current.scrollHeight;
        }
    }, [coachHistory]);

    const startListening = useCallback(() => {
        const SpeechRecognitionImpl =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionImpl) {
            setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
            return;
        }
        const recognition: any = new SpeechRecognitionImpl();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += transcript;
                else interim += transcript;
            }
            if (final) {
                voiceTranscriptRef.current = `${voiceTranscriptRef.current} ${final}`.trim();
            }
            setVoiceTranscript([voiceTranscriptRef.current, interim].filter(Boolean).join(' ').trim());
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        voiceTranscriptRef.current = '';
        setVoiceTranscript('');
        setCoachPanelOpen(true);
    }, []);

    const stopListeningAndProcess = useCallback(async () => {
        recognitionRef.current?.stop();
        setIsListening(false);

        const description = voiceTranscriptRef.current.trim() || voiceTranscript.trim();
        if (!description) return;

        setIsProcessingVoice(true);
        try {
            const result = await voiceToCode({
                problem: `${challenge.title}\n\n${challenge.description}\n\nRequirements:\n${challenge.requirements.join('\n')}`,
                language,
                userDescription: description,
                currentCode: codeByLanguage[language],
                conversationHistory: coachHistory,
            });

            let formattedCode = result.convertedCode;
            if (language === 'javascript') {
                try {
                    formattedCode = await formatJavaScript(result.convertedCode);
                } catch (formatError) {
                    console.warn('Could not auto-format voice-generated JavaScript', formatError);
                }
            }

            // Apply the candidate's described approach, with a safe one-click undo while unchanged.
            const previousCode = codeByLanguage[language];
            setCodeByLanguage((prev) => ({ ...prev, [language]: formattedCode }));
            setVoiceCodeChange({
                language,
                beforeCode: previousCode,
                appliedCode: formattedCode,
            });
            setLastCoachResult(result);

            // Append to coach history
            setCoachHistory((prev) => [
                ...prev,
                { role: 'user', text: description },
                { role: 'coach', text: result.coachingMessage },
            ]);

            voiceTranscriptRef.current = '';
            setVoiceTranscript('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Voice-to-code failed.');
        } finally {
            setIsProcessingVoice(false);
        }
    }, [voiceTranscript, language, codeByLanguage, challenge, coachHistory]);

    const code = codeByLanguage[language];
    const hasUndoableVoiceCode = voiceCodeChange?.language === language && code === voiceCodeChange.appliedCode;
    const canRunLocally = isExecutableCodingLanguage(language);

    const persistCurrentDraft = useCallback(() => {
        if (!saveDraft || isSubmitting) return Promise.resolve();
        return saveDraft({
            challengeId: challenge.id,
            language,
            code,
            codeByLanguage,
            updatedAt: Date.now(),
        });
    }, [challenge.id, code, codeByLanguage, isSubmitting, language, saveDraft]);

    useEffect(() => {
        if (!saveDraft || isSubmitting) return;
        const timeout = window.setTimeout(() => {
            void persistCurrentDraft();
        }, 800);
        return () => window.clearTimeout(timeout);
    }, [isSubmitting, persistCurrentDraft, saveDraft]);

    const handleClose = useCallback(() => {
        void persistCurrentDraft();
        onClose();
    }, [onClose, persistCurrentDraft]);

    const extensions = useMemo(
        () => (language === 'python' ? [python()] : language === 'javascript' ? [javascript()] : []),
        [language],
    );
    const visibleTests = useMemo(() => challenge.tests.filter((t) => !t.hidden), [challenge]);

    const executeTests = async (
        runLanguage: ExecutableCodingLanguage,
        includeHidden: boolean,
    ): Promise<CodingRunSummary> => {
        const response = await run({
            language: runLanguage,
            code,
            functionName: getCodingFunctionName(challenge, runLanguage),
            tests: includeHidden ? challenge.tests : visibleTests,
            timeoutMs: runLanguage === 'python' ? PY_TIMEOUT_MS : JS_TIMEOUT_MS,
        });
        setLogs(response.logs);
        if (!response.ok) throw new Error(response.error || 'Your code failed to run.');
        return summarize(response, includeHidden);
    };

    const handleRun = async () => {
        if (!canRunLocally) {
            setRunSummary(null);
            setLogs([]);
            setError(`${CODING_LANGUAGE_LABELS[language]} is AI-reviewed here. Local test execution is available for JavaScript and Python.`);
            return;
        }
        setIsRunning(true);
        setError('');
        try {
            setRunSummary(await executeTests(language, false));
        } catch (e) {
            setRunSummary(null);
            setError(e instanceof Error ? e.message : 'Failed to run your code.');
        } finally {
            setIsRunning(false);
        }
    };

    const undoVoiceCode = useCallback(() => {
        if (!voiceCodeChange || voiceCodeChange.language !== language || codeByLanguage[language] !== voiceCodeChange.appliedCode) {
            return;
        }
        setCodeByLanguage((prev) => ({ ...prev, [language]: voiceCodeChange.beforeCode }));
        setVoiceCodeChange(null);
    }, [codeByLanguage, language, voiceCodeChange]);

    const handleSubmit = async () => {
        if (code.trim() === getCodingStarterCode(challenge, language).trim() || !code.trim()) {
            setError('Write your solution first — replace the starter code before submitting.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setGuestSubmissionNotice('');
        setGuestSubmissionPassed(false);
        try {
            const summary = canRunLocally
                ? await executeTests(language, true)
                : { passed: 0, total: 0, results: [], durationMs: 0 };
            setRunSummary(summary);

            if (isGuestPractice) {
                if (!canRunLocally) {
                    setError('Guest practice can run JavaScript and Python in this browser. Switch languages or sign in for AI review in other languages.');
                    return;
                }
                const passed = summary.total > 0 && summary.passed === summary.total;
                setGuestSubmissionPassed(passed);
                if (passed) onGuestSubmissionComplete?.(challenge.id);
                setGuestSubmissionNotice(passed
                    ? 'All local tests passed. This problem is cleared for this session.'
                    : `Local submission finished: ${summary.passed}/${summary.total} tests passed. Fix the failing cases, then submit again.`);
                return;
            }

            if (!userId || !saveAnalysis || !onAnalysisComplete) {
                throw new Error('Sign in to submit this solution for AI review.');
            }

            const analysisData = await analyzeCodingSubmission(userId, {
                language,
                code,
                brief: brief.prompt,
                passed: summary.passed,
                total: summary.total,
                failures: summary.results
                    .filter((r) => !r.pass)
                    .slice(0, 5)
                    .map((r) => `input=${r.input} expected=${r.expected} received=${r.error ?? r.received}`),
            });

            const saved = await saveAnalysis({
                ...analysisData,
                transcript: toTranscriptEntries(coachHistory),
                questArtifact: {
                    type: 'coding',
                    challengeId: challenge.id,
                    language,
                    code,
                    codeByLanguage,
                },
            });
            setReportEntry(saved);
            onAnalysisComplete(saved);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to review your solution. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [isFormatting, setIsFormatting] = useState(false);

    const handleFormat = useCallback(async () => {
        if (language !== 'javascript') {
            setError('Auto-format is currently supported for JavaScript only. Python, C++, Java, and C# coming soon.');
            return;
        }
        setIsFormatting(true);
        setError('');
        try {
            const formatted = await formatJavaScript(code);
            setCodeByLanguage((prev) => ({ ...prev, [language]: formatted }));
        } catch (e) {
            setError(e instanceof Error ? `Format failed: ${e.message}` : 'Could not format code.');
        } finally {
            setIsFormatting(false);
        }
    }, [language, code]);

    if (isMobileViewport && !mobileGateAcknowledged) {
        return (
            <MobileExperienceGate
                roundType="coding"
                onContinue={() => setMobileGateAcknowledged(true)}
                onBack={handleClose}
            />
        );
    }

    if (reportEntry) {
        const historyEntry = {
            id: reportEntry.id,
            job: {
                id: reportEntry.id,
                title: `${company} quest — ${stageTitle}`,
                company,
                location: '',
                description: brief.prompt,
                url: '',
            },
            questions: [],
            timestamp: reportEntry.timestamp,
            interviewHistory: [reportEntry],
        };
        return (
            <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white" size={28} /></div>}>
                <InterviewReportModal
                    jobHistoryEntry={historyEntry}
                    onClose={onClose}
                    onImprove={() => setReportEntry(null)}
                />
            </Suspense>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white p-0 sm:bg-[#171411]/70 sm:p-3 sm:backdrop-blur-sm dark:bg-gray-900 sm:dark:bg-[#171411]/70">
            <div className="mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col overflow-hidden border-gray-200 bg-white sm:h-full sm:rounded-3xl sm:border sm:shadow-[0_24px_70px_rgba(17,24,39,0.24)] dark:border-gray-700 dark:bg-gray-900">
                {/* Header */}
                <header className="flex shrink-0 flex-col gap-2 border-b border-gray-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3.5 dark:border-gray-800">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#625bd5] text-white shadow-[0_4px_12px_rgba(98,91,213,0.25)] sm:h-10 sm:w-10 sm:rounded-xl dark:bg-[#7069dc]">
                            <Code2 size={16} className="sm:hidden" />
                            <Code2 size={18} className="hidden sm:block" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[15px] font-extrabold tracking-tight text-gray-900 sm:text-base dark:text-gray-100">{company} · {stageTitle}</h2>
                            <p className="hidden truncate text-xs text-gray-500 sm:block dark:text-gray-400">
                                {isGuestPractice
                                    ? 'Write and run your solution locally. Sign in for AI review and saved progress.'
                                    : canRunLocally ? 'Write and run your solution, then submit for AI review' : 'Write your solution, then submit for AI code review'}
                            </p>
                        </div>
                    </div>
                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:overflow-visible">
                        <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-200 text-xs font-bold dark:border-gray-700">
                            {CODING_LANGUAGES
                                .filter((lang) => !isGuestPractice || isExecutableCodingLanguage(lang))
                                .map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => { setLanguage(lang); setRunSummary(null); setLogs([]); setError(''); }}
                                    className={`px-3 py-1.5 transition-colors ${language === lang
                                        ? 'bg-[#625bd5] text-white dark:bg-[#7069dc]'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                                >
                                    {CODING_LANGUAGE_LABELS[lang]}
                                    {lang === preferredLanguage && (
                                        <span className="ml-1 text-[9px] font-extrabold uppercase opacity-75">Rec</span>
                                    )}
                                </button>
                                ))}
                        </div>
                        {/* Format button */}
                        <button
                            type="button"
                            onClick={handleFormat}
                            disabled={isFormatting || isRunning || isSubmitting}
                            title={language === 'javascript' ? 'Auto-format with Prettier' : 'Format (JavaScript only)'}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            {isFormatting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            <span className="sm:hidden">Format</span><span className="hidden sm:inline">{isFormatting ? 'Formatting…' : 'Format'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleRun}
                            disabled={isRunning || isSubmitting || !canRunLocally}
                            title={canRunLocally ? undefined : 'Local test execution is available for JavaScript and Python.'}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            <span className="sm:hidden">Tests</span><span className="hidden sm:inline">{isRunning ? 'Running…' : 'Run tests'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isRunning}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-transparent bg-[#625bd5] px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#514ac5] disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 dark:bg-[#7069dc] dark:hover:bg-[#8d88e6]"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            <span className="sm:hidden">Submit</span><span className="hidden sm:inline">{isSubmitting ? (isGuestPractice ? 'Submitting…' : 'Reviewing…') : isGuestPractice ? 'Submit solution' : 'Submit for review'}</span>
                        </button>
                        {!isGuestPractice && (
                            /* Voice-to-code: record an explanation, then explicitly send it to the coach. */
                            <button
                            type="button"
                            onClick={isListening || voiceTranscript.trim() ? stopListeningAndProcess : startListening}
                            disabled={isProcessingVoice || isSubmitting}
                            title={isListening || voiceTranscript.trim() ? 'Send this explanation to the AI code coach' : 'Describe your solution verbally'}
                            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 ${
                                isListening
                                    ? 'animate-pulse border-[#625bd5]/40 bg-[#f3f2ff] text-[#625bd5] dark:border-[#7069dc]/40 dark:bg-[#312d6b]/50 dark:text-[#c8c5ff]'
                                    : voiceTranscript.trim()
                                        ? 'border-[#625bd5] bg-[#625bd5] text-white hover:bg-[#514ac5] dark:border-[#7069dc] dark:bg-[#7069dc] dark:hover:bg-[#8d88e6]'
                                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {isProcessingVoice
                                ? <Loader2 size={14} className="animate-spin" />
                                : isListening || voiceTranscript.trim()
                                    ? <Send size={14} />
                                    : <Mic size={14} />}
                            <span className="sm:hidden">{isListening || voiceTranscript.trim() ? 'Send' : 'Coach'}</span><span className="hidden sm:inline">{isProcessingVoice ? 'Preparing code…' : isListening || voiceTranscript.trim() ? 'Send to code coach' : 'Talk to code coach'}</span>
                            </button>
                        )}
                        {/* Coach panel toggle */}
                        {!isGuestPractice && coachHistory.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setCoachPanelOpen((o) => !o)}
                                title="Toggle AI coach panel"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#625bd5]/30 bg-[#f3f2ff] text-[#625bd5] transition-colors hover:bg-[#e8e6ff] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff] dark:hover:bg-[#312d6b]"
                            >
                                <Bot size={16} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleClose}
                            aria-label="Close"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                        {error}
                    </div>
                )}

                {guestSubmissionNotice && (
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#cfe8d5] bg-[#eef9f2] px-4 py-2 text-xs font-semibold text-[#166534] dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <span>{guestSubmissionNotice}</span>
                        {guestSubmissionPassed && onGuestNextChallenge && (
                            <button
                                type="button"
                                onClick={onGuestNextChallenge}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#15803d] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#166534]"
                            >
                                Next coding question
                                <Send size={12} />
                            </button>
                        )}
                    </div>
                )}

                {/* Live transcript bar */}
                {isListening && (
                    <div className="shrink-0 border-b border-[#dfe2ff] bg-[#f8f7ff] px-4 py-2 dark:border-[#484273] dark:bg-[#1a1730]">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#625bd5] dark:bg-[#b8b4ff]" />
                            <span className="text-xs font-bold text-[#625bd5] dark:text-[#b8b4ff]">Recording your approach</span>
                            <span className="min-w-0 truncate text-xs text-[#4a4499]/80 dark:text-[#c8c5ff]/80">
                                {voiceTranscript || 'Explain the algorithm, data structure, and edge cases. Send it to the code coach when ready.'}
                            </span>
                        </div>
                    </div>
                )}

                {hasUndoableVoiceCode && (
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dfe2ff] bg-[#f8f7ff] px-4 py-2 dark:border-[#484273] dark:bg-[#1a1730]">
                        <p className="min-w-0 text-xs text-[#4a4499] dark:text-[#c8c5ff]">
                            <span className="font-bold">Voice draft applied.</span> Review it, then run tests before submitting.
                        </p>
                        <button
                            type="button"
                            onClick={undoVoiceCode}
                            className="shrink-0 rounded-md border border-[#625bd5]/30 bg-white px-2 py-1 text-[11px] font-bold text-[#625bd5] transition-colors hover:bg-[#f3f2ff] dark:bg-[#1a1730] dark:text-[#c8c5ff] dark:hover:bg-[#312d6b]"
                        >
                            Undo voice draft
                        </button>
                    </div>
                )}

                {/* Body: brief + editor + results */}
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                    {/* Mobile: collapsed brief summary bar (tap to expand) */}
                    <button
                        type="button"
                        onClick={() => setBriefOpen(true)}
                        className="flex shrink-0 items-center gap-2 border-b border-[#ececf4] bg-[#fbfbfe] px-4 py-2.5 text-left lg:hidden dark:border-gray-800 dark:bg-gray-900/60"
                    >
                        <ClipboardList size={14} className="shrink-0 text-[#625bd5] dark:text-[#9b96ef]" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-gray-700 dark:text-gray-200">{challenge.title}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#f3f2ff] px-2 py-1 text-[11px] font-bold text-[#625bd5] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff]">
                            Brief <ChevronDown size={12} />
                        </span>
                    </button>

                    {/* Brief panel — overlay on mobile when expanded, static column on desktop */}
                    <aside className={`${briefOpen ? 'flex' : 'hidden'} absolute inset-0 z-30 flex-col overflow-y-auto border-b border-[#ececf4] bg-[#fbfbfe] p-4 dark:border-gray-800 dark:bg-gray-900/60 sm:p-5 lg:static lg:z-auto lg:flex lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r xl:w-[360px]`}>
                        <div className="mb-3 flex items-center justify-between lg:hidden">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#9b96ef]">
                                <ClipboardList size={13} /> Coding brief
                            </span>
                            <button
                                type="button"
                                onClick={() => setBriefOpen(false)}
                                aria-label="Close brief"
                                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="hidden items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#625bd5] lg:flex dark:text-[#9b96ef]">
                            <ClipboardList size={13} /> Coding brief
                        </div>
                        <p className="mt-2.5 text-base font-bold leading-snug text-gray-900 dark:text-gray-100">{challenge.title}</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">{challenge.description}</p>
                        <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Requirements</p>
                        <ul className="mt-2 space-y-2.5">
                            {challenge.requirements.map((req, reqIndex) => (
                                <li key={req} className="flex gap-2.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#f3f2ff] text-[11px] font-extrabold text-[#625bd5] ring-1 ring-[#dfe2ff] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff] dark:ring-[#625bd5]/40">
                                        {reqIndex + 1}
                                    </span>
                                    {req}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#a97935] dark:text-amber-300">
                                <Lightbulb size={13} /> Example
                            </p>
                            <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                                {challenge.example}
                            </p>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                            <CheckCircle2 size={13} className="text-[#15803d] dark:text-emerald-300" /> {isGuestPractice ? 'Submitting runs the local test suite in this browser. Sign in to save your work or receive AI review.' : 'Submitting runs a hidden test suite — passing it clears this stage.'}
                        </p>
                        {!isGuestPractice && (
                            <div className="mt-4 rounded-lg border border-[#dfe2ff] bg-[#f3f2ff] p-3 dark:border-[#625bd5]/30 dark:bg-[#312d6b]/30">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#b8b4ff]">
                                <Mic size={12} /> Code coach
                            </p>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#4a4499] dark:text-[#c8c5ff]">
                                Use <strong>Talk to code coach</strong> to explain your idea. Choose <strong>Send to code coach</strong> when you want it translated into an editable draft and a targeted hint.
                            </p>
                            </div>
                        )}
                    </aside>

                    {/* Editor + results */}
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-auto lg:h-auto lg:min-h-0">
                            <CodeMirror
                                value={code}
                                height="100%"
                                style={{ height: '100%' }}
                                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                                extensions={extensions}
                                onChange={(value) => setCodeByLanguage((prev) => ({ ...prev, [language]: value }))}
                                basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: true }}
                            />
                        </div>

                        {/* Test results / console */}
                        <div className="h-44 shrink-0 overflow-y-auto border-t border-gray-200 bg-[#fbfbfe] p-3 sm:h-52 sm:p-4 dark:border-gray-800 dark:bg-gray-900/60">
                            <div className="flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    <Terminal size={12} /> Test results
                                </p>
                                {runSummary && (
                                    <p className={`text-[11px] font-bold ${runSummary.passed === runSummary.total ? 'text-[#15803d] dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                                        {runSummary.passed}/{runSummary.total} passed · {runSummary.durationMs} ms
                                    </p>
                                )}
                            </div>
                            {!runSummary && !logs.length && (
                                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                    {canRunLocally
                                        ? 'Press “Run tests” to execute your solution against the sample cases. Python starts a one-time runtime download on first run.'
                                        : `${CODING_LANGUAGE_LABELS[language]} is reviewed by AI in this version. Switch to JavaScript or Python to run local sample tests.`}
                                </p>
                            )}
                            {runSummary && (
                                <ul className="mt-2 space-y-1">
                                    {runSummary.results.map((r, i) => (
                                        <li key={i} className="flex items-start gap-1.5 font-mono text-[11px] leading-relaxed">
                                            {r.pass
                                                ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#15803d] dark:text-emerald-300" />
                                                : <XCircle size={13} className="mt-0.5 shrink-0 text-rose-500 dark:text-rose-300" />}
                                            <span className="min-w-0 break-all text-gray-600 dark:text-gray-300">
                                                {r.hidden ? '[hidden] ' : ''}f({r.input.slice(1, -1)}) → {r.error ? `⚠ ${r.error}` : r.received}
                                                {!r.pass && !r.error && <span className="text-gray-400 dark:text-gray-500"> · expected {r.expected}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {logs.length > 0 && (
                                <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Console</p>
                                    <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[11px] text-gray-500 dark:text-gray-400">{logs.join('\n')}</pre>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Coach panel — slides in when coachPanelOpen */}
                    {!isGuestPractice && coachPanelOpen && (
                        <aside className="flex h-[44svh] w-full shrink-0 flex-col border-t border-[#ececf4] bg-[#faf9ff] lg:h-auto lg:w-80 lg:border-l lg:border-t-0 dark:border-gray-800 dark:bg-[#1a1730] xl:w-[320px]">
                            <div className="flex shrink-0 items-center justify-between border-b border-[#ececf4] px-4 py-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#625bd5] text-white dark:bg-[#7069dc]">
                                        <Bot size={14} />
                                    </span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">AI Code Coach</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCoachPanelOpen(false)}
                                    className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Conversation */}
                            <div ref={coachScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                                {coachHistory.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
                                        Use <strong>Talk to code coach</strong> to describe your solution. You decide when to send it for feedback and an editable draft.
                                    </p>
                                )}
                                {coachHistory.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                            msg.role === 'user'
                                                ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                : 'bg-[#625bd5] text-white dark:bg-[#7069dc]'
                                        }`}>
                                            {msg.role === 'user' ? 'You' : 'AI'}
                                        </span>
                                        <div className={`max-w-[220px] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'rounded-tr-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                                                : 'rounded-tl-sm bg-[#625bd5]/10 text-[#3d3699] dark:bg-[#625bd5]/20 dark:text-[#c8c5ff]'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isProcessingVoice && (
                                    <div className="flex gap-2">
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#625bd5] text-[10px] font-bold text-white dark:bg-[#7069dc]">AI</span>
                                        <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[#625bd5]/10 px-3 py-2 dark:bg-[#625bd5]/20">
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#625bd5] dark:bg-[#b8b4ff]" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#625bd5] dark:bg-[#b8b4ff]" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#625bd5] dark:bg-[#b8b4ff]" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {lastCoachResult && (
                                <div className="shrink-0 border-t border-[#ececf4] bg-white/60 px-4 py-3 dark:border-gray-800 dark:bg-transparent">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#b8b4ff]">Your next move</p>
                                    <p className="mt-1 text-xs font-bold text-gray-800 dark:text-gray-100">{lastCoachResult.focusArea}</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">{lastCoachResult.whyItMatters}</p>
                                    <div className="mt-2 rounded-md border border-[#dfe2ff] bg-[#f8f7ff] px-2.5 py-2 text-[11px] leading-relaxed text-[#4a4499] dark:border-[#625bd5]/30 dark:bg-[#312d6b]/30 dark:text-[#c8c5ff]">
                                        <span className="font-bold">Try this: </span>{lastCoachResult.nextAction}
                                    </div>
                                    {suggestedTests.length > 0 && (
                                        <div className="mt-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Test next</p>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {suggestedTests.map((test) => (
                                                    <span key={test} className="rounded-md border border-[#dfe2ff] bg-white px-2 py-1 text-[10px] font-semibold text-[#4a4499] dark:border-[#625bd5]/30 dark:bg-[#1a1730] dark:text-[#c8c5ff]">
                                                        {test}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hint at the bottom */}
                            <div className="shrink-0 border-t border-[#ececf4] px-4 py-3 dark:border-gray-800">
                                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
                                    {isListening
                                        ? 'Send to code coach when you are ready for feedback'
                                        : 'Use Talk to code coach in the toolbar to continue'}
                                </p>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodingBattle;
