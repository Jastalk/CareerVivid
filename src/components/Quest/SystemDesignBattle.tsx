import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import {
    Bot,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    Layers,
    Lightbulb,
    Loader2,
    Maximize2,
    Mic,
    MousePointer2,
    Send,
    Sparkles,
    Swords,
    X,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import MobileExperienceGate from './MobileExperienceGate';
import {
    analyzeSystemDesignDiagram,
    DiagramStyle,
    DIAGRAM_STYLE_DESCRIPTIONS,
    DIAGRAM_STYLE_LABELS,
    generateStyledExcalidrawDiagram,
    SystemDesignCoachResult,
    voiceSystemDesignCoach,
    VoiceCoachMessage,
} from '../../services/geminiService';
import { InterviewAnalysis, QuestSystemDesignArtifact } from '../../types';
import { SystemDesignBrief } from '../../lib/companyQuests';
import { buildSystemDesignDiagramElements } from '../../lib/systemDesignCanvas';
import { toTranscriptEntries } from '../../lib/voiceTranscript';

const InterviewReportModal = React.lazy(() => import('../InterviewReportModal'));

interface SystemDesignBattleProps {
    /** Omitted for browser-only guest practice. */
    userId?: string;
    company: string;
    stageTitle: string;
    brief: SystemDesignBrief;
    /** Course practice reuses the battle UI but owns an independent result record. */
    practiceContext?: 'quest' | 'course';
    /** Guest mode never calls Gemini or persists progress. */
    isGuestPractice?: boolean;
    initialArtifact?: QuestSystemDesignArtifact;
    saveAnalysis?: (analysis: Omit<InterviewAnalysis, 'id' | 'timestamp'>) => Promise<InterviewAnalysis>;
    onAnalysisComplete?: (analysis: InterviewAnalysis) => void;
    onGuestSubmissionComplete?: (challengeId: string) => void;
    onGuestNextChallenge?: () => void;
    onClose: () => void;
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const toSerializableScene = <T,>(value: T): T =>
    value == null ? value : JSON.parse(JSON.stringify(value));

const parseSceneJson = <T,>(value: string | undefined, fallback: T): T => {
    if (!value) return fallback;
    try { return JSON.parse(value) as T; }
    catch { return fallback; }
};

const getArtifactElements = (artifact: QuestSystemDesignArtifact | undefined): any[] => {
    if (!artifact) return [];
    if (artifact.elementsJson) return parseSceneJson<any[]>(artifact.elementsJson, []);
    return artifact.elements ?? [];
};

const getArtifactFiles = (artifact: QuestSystemDesignArtifact | undefined): Record<string, any> | undefined => {
    if (!artifact) return undefined;
    if (artifact.filesJson) return parseSceneJson<Record<string, any>>(artifact.filesJson, {});
    return artifact.files;
};

const STYLES: DiagramStyle[] = ['auto', 'flow', 'layered', 'sequence'];

const getSuggestedComponents = (value: string | undefined) => (value ?? '')
    .split(',')
    .map((component) => component.trim())
    .filter(Boolean)
    .slice(0, 3);

const StyleIcon: React.FC<{ style: DiagramStyle; size?: number }> = ({ style, size = 14 }) => {
    if (style === 'layered') return <Layers size={size} />;
    if (style === 'sequence') return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="3" height="14" rx="1" fill="currentColor" opacity=".4"/>
            <rect x="12" y="1" width="3" height="14" rx="1" fill="currentColor" opacity=".4"/>
            <path d="M4 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M12 9H4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
    );
    if (style === 'flow') return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <rect x="1" y="5" width="4" height="6" rx="1" fill="currentColor" opacity=".7"/>
            <rect x="11" y="5" width="4" height="6" rx="1" fill="currentColor" opacity=".7"/>
            <path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    );
    return <Sparkles size={size} />;
};

const SystemDesignBattle: React.FC<SystemDesignBattleProps> = ({
    userId,
    company,
    stageTitle,
    brief,
    practiceContext = 'quest',
    isGuestPractice = false,
    initialArtifact,
    saveAnalysis,
    onAnalysisComplete,
    onGuestSubmissionComplete,
    onGuestNextChallenge,
    onClose,
}) => {
    const { resolvedTheme } = useTheme();
    const excalidrawAPIRef = useRef<any>(null);

    // ── Core state ───────────────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [generationNotice, setGenerationNotice] = useState('');
    const [reportEntry, setReportEntry] = useState<InterviewAnalysis | null>(null);
    const [isCanvasGuideVisible, setIsCanvasGuideVisible] = useState(true);
    // Mobile: the brief starts collapsed so the canvas gets the full screen.
    const [briefOpen, setBriefOpen] = useState(false);
    // Mobile: show a "better on desktop" gate before opening the round.
    const isMobileViewport = useMediaQuery('(max-width: 1023px)');
    const [mobileGateAcknowledged, setMobileGateAcknowledged] = useState(false);
    const [guestSubmissionNotice, setGuestSubmissionNotice] = useState('');
    const [guestSubmissionPassed, setGuestSubmissionPassed] = useState(false);

    const matchingInitialArtifact = initialArtifact?.type === 'system_design' && initialArtifact.challengeId === brief.challengeId
        ? initialArtifact : undefined;

    const initialData = useMemo(() => ({
        elements: getArtifactElements(matchingInitialArtifact),
        appState: { viewBackgroundColor: resolvedTheme === 'dark' ? '#1f2937' : '#ffffff' },
        files: getArtifactFiles(matchingInitialArtifact),
    }), [matchingInitialArtifact, resolvedTheme]);

    // ── Diagram style picker ─────────────────────────────────────────────────
    const [selectedStyle, setSelectedStyle] = useState<DiagramStyle>('auto');
    const [stylePickerOpen, setStylePickerOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const stylePickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (stylePickerRef.current && !stylePickerRef.current.contains(e.target as Node)) {
                setStylePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError('');
        setGenerationNotice('');
        setStylePickerOpen(false);
        try {
            const diagram = await generateStyledExcalidrawDiagram(userId, brief.prompt, selectedStyle);
            const api = excalidrawAPIRef.current;
            if (!api) {
                throw new Error('The whiteboard is still loading. Try generating again in a moment.');
            }

            const elements = buildSystemDesignDiagramElements(diagram.plan, selectedStyle);
            api.updateScene({
                elements,
                appState: {
                    activeTool: { type: 'selection' },
                    selectedElementIds: {},
                },
            });
            api.scrollToContent(elements, {
                fitToViewport: true,
                viewportZoomFactor: 0.78,
                minZoom: 0.45,
                maxZoom: 1.15,
                animate: true,
            });
            setGenerationNotice(diagram.usedFallback
                ? 'Generated an editable starter diagram. You can change every component and connection.'
                : 'Generated an editable architecture diagram with clear component and connection labels.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate diagram.');
        } finally {
            setIsGenerating(false);
        }
    };

    const focusDiagram = useCallback(() => {
        const api = excalidrawAPIRef.current;
        const elements = api?.getSceneElements().filter((element: any) => !element.isDeleted) ?? [];
        if (!elements.length) {
            setError('Add a component first, then use Focus diagram to center your work.');
            return;
        }
        api.scrollToContent(elements, {
            fitToViewport: true,
            viewportZoomFactor: 0.78,
            minZoom: 0.45,
            maxZoom: 1.15,
            animate: true,
        });
    }, []);

    // ── Voice coaching state ─────────────────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [coachHistory, setCoachHistory] = useState<VoiceCoachMessage[]>([]);
    const [lastCoachResult, setLastCoachResult] = useState<SystemDesignCoachResult | null>(null);
    const [coachPanelOpen, setCoachPanelOpen] = useState(false);
    const recognitionRef = useRef<any>(null);
    const voiceTranscriptRef = useRef('');
    const coachScrollRef = useRef<HTMLDivElement | null>(null);
    const suggestedComponents = useMemo(
        () => getSuggestedComponents(lastCoachResult?.suggestedComponents),
        [lastCoachResult?.suggestedComponents],
    );

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
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) final += t;
                else interim += t;
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

        // Prefer grouped shape labels so arrow descriptions do not distract the coach.
        const api = excalidrawAPIRef.current;
        const existingComponents: string[] = [];
        if (api) {
            const elements = api.getSceneElements().filter((el: any) => !el.isDeleted);
            const componentGroupIds = new Set(
                elements
                    .filter((el: any) => el.type === 'rectangle')
                    .flatMap((el: any) => el.groupIds ?? []),
            );
            const componentLabels = elements
                .filter((el: any) => el.type === 'text' && el.text?.trim())
                .filter((el: any) => (el.groupIds ?? []).some((groupId: string) => componentGroupIds.has(groupId)))
                .map((el: any) => el.text.trim());
            const labels = componentLabels.length
                ? componentLabels
                : elements
                    .filter((el: any) => el.type === 'text' && el.text?.trim())
                    .map((el: any) => el.text.trim());
            existingComponents.push(...new Set(labels));
        }

        setIsProcessingVoice(true);
        try {
            const result = await voiceSystemDesignCoach({
                problem: brief.prompt,
                requirements: brief.requirements,
                userDescription: description,
                existingComponents,
                conversationHistory: coachHistory,
            });

            setLastCoachResult(result);
            setCoachHistory((prev) => [
                ...prev,
                { role: 'user', text: description },
                { role: 'coach', text: result.coachingMessage },
            ]);
            voiceTranscriptRef.current = '';
            setVoiceTranscript('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Voice coaching failed.');
        } finally {
            setIsProcessingVoice(false);
        }
    }, [voiceTranscript, brief, coachHistory]);

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const api = excalidrawAPIRef.current;
        if (!api) return;

        const elements = api.getSceneElements().filter((el: any) => !el.isDeleted);
        if (elements.length < 2) {
            setError('Draw your design first — add a few components and connections before submitting.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setGuestSubmissionNotice('');
        setGuestSubmissionPassed(false);
        try {
            if (isGuestPractice) {
                setGuestSubmissionPassed(true);
                onGuestSubmissionComplete?.(brief.challengeId);
                setGuestSubmissionNotice('Design submitted. This challenge is cleared for this session.');
                return;
            }
            if (!userId || !saveAnalysis || !onAnalysisComplete) {
                throw new Error('Sign in to submit this design for AI review.');
            }
            const blob = await exportToBlob({
                elements,
                appState: { ...api.getAppState(), exportWithDarkMode: false, exportBackground: true },
                files: api.getFiles(),
                mimeType: 'image/png',
                quality: 0.92,
            });
            const dataUrl = await blobToDataUrl(blob);

            const files = api.getFiles();
            const serializedElements = toSerializableScene(elements);
            const serializedFiles = toSerializableScene(files) ?? {};
            const analysisData = await analyzeSystemDesignDiagram(userId, dataUrl, brief.prompt);

            const questArtifact: QuestSystemDesignArtifact = {
                type: 'system_design',
                challengeId: brief.challengeId,
                elementsJson: JSON.stringify(serializedElements),
                ...(Object.keys(serializedFiles).length ? { filesJson: JSON.stringify(serializedFiles) } : {}),
            };

            const saved = await saveAnalysis({
                ...analysisData,
                transcript: toTranscriptEntries(coachHistory),
                questArtifact,
            });
            setReportEntry(saved);
            onAnalysisComplete(saved);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to review your design. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Mobile experience gate ───────────────────────────────────────────────
    if (isMobileViewport && !mobileGateAcknowledged) {
        return (
            <MobileExperienceGate
                roundType="system-design"
                onContinue={() => setMobileGateAcknowledged(true)}
                onBack={onClose}
            />
        );
    }

    // ── Report view ──────────────────────────────────────────────────────────
    if (reportEntry) {
        const historyEntry = {
            id: reportEntry.id,
            job: {
                id: reportEntry.id,
                title: practiceContext === 'course' ? `${company} course practice — ${stageTitle}` : `${company} quest — ${stageTitle}`,
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
                            <Swords size={16} className="sm:hidden" />
                            <Swords size={18} className="hidden sm:block" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[15px] font-extrabold tracking-tight text-gray-900 sm:text-base dark:text-gray-100">{company} · {stageTitle}</h2>
                            <p className="hidden truncate text-xs font-medium text-gray-500 sm:block dark:text-gray-400">{isGuestPractice ? 'Draw and submit locally. Sign in for AI review and saved progress.' : 'Draw your architecture, then submit for AI review'}</p>
                        </div>
                    </div>

                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:overflow-visible">

                        {!isGuestPractice && (
                            /* Generate with AI + style picker */
                            <div ref={stylePickerRef} className="relative shrink-0">
                            <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || isSubmitting}
                                    className="inline-flex h-9 items-center gap-1.5 bg-white px-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    {isGenerating
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <StyleIcon style={selectedStyle} size={13} />}
                                    <span className="sm:hidden">Generate</span><span className="hidden sm:inline">{isGenerating ? 'Generating…' : 'Generate with AI'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStylePickerOpen((o) => !o)}
                                    disabled={isGenerating || isSubmitting}
                                    title="Choose diagram style"
                                    className="flex h-9 w-8 items-center justify-center border-l border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                >
                                    <ChevronDown size={13} />
                                </button>
                            </div>

                            {/* Style dropdown */}
                            {stylePickerOpen && (
                                <div className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Diagram style</p>
                                    {STYLES.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => { setSelectedStyle(s); setStylePickerOpen(false); }}
                                            className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedStyle === s ? 'bg-[#f3f2ff] dark:bg-[#312d6b]/50' : ''}`}
                                        >
                                            <span className={`mt-0.5 shrink-0 ${selectedStyle === s ? 'text-[#625bd5] dark:text-[#b8b4ff]' : 'text-gray-400'}`}>
                                                <StyleIcon style={s} size={15} />
                                            </span>
                                            <div>
                                                <p className={`text-xs font-bold ${selectedStyle === s ? 'text-[#625bd5] dark:text-[#b8b4ff]' : 'text-gray-700 dark:text-gray-200'}`}>
                                                    {DIAGRAM_STYLE_LABELS[s]}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                                                    {DIAGRAM_STYLE_DESCRIPTIONS[s]}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            </div>
                        )}

                        {!isGuestPractice && (
                            /* Voice coach: recording is explicit, then the user sends the note for feedback. */
                            <button
                            type="button"
                            onClick={isListening || voiceTranscript.trim() ? stopListeningAndProcess : startListening}
                            disabled={isProcessingVoice || isSubmitting}
                            title={isListening || voiceTranscript.trim() ? 'Send this explanation to the AI coach' : 'Describe your architecture verbally'}
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
                                : isListening || voiceTranscript.trim() ? <Send size={14} /> : <Mic size={14} />}
                            <span className="sm:hidden">{isListening || voiceTranscript.trim() ? 'Send' : 'Coach'}</span><span className="hidden sm:inline">{isProcessingVoice ? 'Preparing coaching…' : isListening || voiceTranscript.trim() ? 'Send to coach' : 'Talk to coach'}</span>
                            </button>
                        )}

                        {/* Coach panel toggle (only when history exists) */}
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
                            onClick={focusDiagram}
                            title="Center and zoom to the current diagram"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            <Maximize2 size={14} />
                            <span className="sm:hidden">Focus</span><span className="hidden sm:inline">Focus diagram</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-transparent bg-[#625bd5] px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#514ac5] disabled:cursor-not-allowed disabled:opacity-60 sm:px-3.5 dark:bg-[#7069dc] dark:hover:bg-[#8d88e6]"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            <span className="sm:hidden">Submit</span><span className="hidden sm:inline">{isSubmitting ? (isGuestPractice ? 'Submitting…' : 'Reviewing…') : isGuestPractice ? 'Submit design' : 'Submit for review'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {/* Error bar */}
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
                                Next system design challenge
                                <Send size={12} />
                            </button>
                        )}
                    </div>
                )}

                {generationNotice && (
                    <div className="shrink-0 border-b border-[#dfe2ff] bg-[#f8f7ff] px-4 py-2 text-xs font-semibold text-[#4a4499] dark:border-[#484273] dark:bg-[#1a1730] dark:text-[#c8c5ff]">
                        {generationNotice}
                    </div>
                )}

                {/* Live transcript bar */}
                {isListening && (
                    <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 dark:border-rose-900 dark:bg-rose-950/40">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-300">Listening…</span>
                            <span className="min-w-0 truncate text-xs text-rose-500/80 dark:text-rose-400/80">
                                {voiceTranscript || 'Describe your architecture — components, data flow, scaling approach…'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Suggested components hint strip (when panel is closed) */}
                {lastCoachResult && !coachPanelOpen && (
                    <div className="shrink-0 border-b border-[#e8e6ff] bg-[#f8f7ff] px-4 py-2 dark:border-[#312d6b] dark:bg-[#1a1730]">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4a4499] dark:text-[#c8c5ff]">
                            <span className="font-bold">Next focus:</span>
                            <span>{lastCoachResult.focusArea}</span>
                            <span className="text-[#8a86c9] dark:text-[#9b96ef]">Try: {lastCoachResult.nextAction}</span>
                        </div>
                    </div>
                )}

                {/* Body: brief + canvas + coach panel */}
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">

                    {/* Mobile: collapsed brief summary bar (tap to expand) */}
                    <button
                        type="button"
                        onClick={() => setBriefOpen(true)}
                        className="flex shrink-0 items-center gap-2 border-b border-[#ececf4] bg-[#fbfbfe] px-4 py-2.5 text-left lg:hidden dark:border-gray-800 dark:bg-gray-900/60"
                    >
                        <ClipboardList size={14} className="shrink-0 text-[#625bd5] dark:text-[#9b96ef]" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-gray-700 dark:text-gray-200">{brief.challenge}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#f3f2ff] px-2 py-1 text-[11px] font-bold text-[#625bd5] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff]">
                            Brief <ChevronDown size={12} />
                        </span>
                    </button>

                    {/* Brief panel — overlay on mobile when expanded, static column on desktop */}
                    <aside className={`${briefOpen ? 'flex' : 'hidden'} absolute inset-0 z-30 flex-col overflow-y-auto border-b border-[#ececf4] bg-[#fbfbfe] p-4 dark:border-gray-800 dark:bg-gray-900/60 sm:p-5 lg:static lg:z-auto lg:flex lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r xl:w-[360px]`}>
                        <div className="mb-3 flex items-center justify-between lg:hidden">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#9b96ef]">
                                <ClipboardList size={13} /> Design brief
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
                            <ClipboardList size={13} /> Design brief
                        </div>
                        <p className="mt-2.5 text-base font-bold leading-snug text-gray-900 dark:text-gray-100">{brief.challenge}</p>
                        <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Requirements</p>
                        <ul className="mt-2 space-y-2.5">
                            {brief.requirements.map((req, i) => (
                                <li key={req} className="flex gap-2.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#f3f2ff] text-[11px] font-extrabold text-[#625bd5] ring-1 ring-[#dfe2ff] dark:bg-[#312d6b]/50 dark:text-[#b8b4ff] dark:ring-[#625bd5]/40">
                                        {i + 1}
                                    </span>
                                    {req}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#a97935] dark:text-amber-300">
                                <Lightbulb size={13} /> Drawing tip
                            </p>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                                Label your boxes (clients, services, databases, caches, queues) and draw arrows for data flow. The AI grades clarity, coverage, and scalability.
                            </p>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                            <CheckCircle2 size={13} className="text-[#15803d] dark:text-emerald-300" /> Pass this stage by covering the core requirements.
                        </p>
                        {/* Voice coach tip */}
                        {!isGuestPractice && (
                            <div className="mt-4 rounded-lg border border-[#dfe2ff] bg-[#f3f2ff] p-3 dark:border-[#625bd5]/30 dark:bg-[#312d6b]/30">
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#b8b4ff]">
                                <Mic size={12} /> Voice coach
                            </p>
                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#4a4499] dark:text-[#c8c5ff]">
                                Use <strong>Talk to coach</strong> to explain your approach, then <strong>Send to coach</strong> when you want a focused hint.
                            </p>
                            </div>
                        )}
                    </aside>

                    {/* Excalidraw canvas — fills the screen on mobile, column on desktop */}
                    <div className="relative min-h-0 flex-1 bg-white lg:h-auto dark:bg-gray-900">
                        <Excalidraw
                            excalidrawAPI={(api: any) => { excalidrawAPIRef.current = api; }}
                            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                            initialData={initialData}
                        />
                        {isCanvasGuideVisible && (
                            <div className="absolute bottom-4 left-4 z-10 hidden max-w-[320px] rounded-lg border border-[#dfe2ff] bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur sm:block dark:border-[#484273] dark:bg-gray-900/95">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#625bd5] dark:text-[#b8b4ff]">
                                        <MousePointer2 size={13} /> Canvas controls
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsCanvasGuideVisible(false)}
                                        title="Close canvas controls guide"
                                        aria-label="Close canvas controls guide"
                                        className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                                    Pinch with two fingers or use Ctrl/Cmd + scroll to zoom. Click a component to reveal its resize handles. Shift + click adds components to your selection, or drag across empty canvas to select several.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* AI Coach panel */}
                    {!isGuestPractice && coachPanelOpen && (
                        <aside className="flex h-[44svh] w-full shrink-0 flex-col border-t border-[#ececf4] bg-[#faf9ff] lg:h-auto lg:w-80 lg:border-l lg:border-t-0 dark:border-gray-800 dark:bg-[#1a1730] xl:w-[320px]">
                            <div className="flex shrink-0 items-center justify-between border-b border-[#ececf4] px-4 py-3 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#625bd5] text-white dark:bg-[#7069dc]">
                                        <Bot size={14} />
                                    </span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">AI Design Coach</span>
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
                                    <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
                                        Use <strong>Talk to coach</strong> to describe your system design. You decide when to send it for feedback.
                                    </p>
                                )}
                                {coachHistory.map((msg, i) => (
                                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${msg.role === 'user' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-[#625bd5] text-white dark:bg-[#7069dc]'}`}>
                                            {msg.role === 'user' ? 'You' : 'AI'}
                                        </span>
                                        <div className={`max-w-[220px] rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${msg.role === 'user' ? 'rounded-tr-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' : 'rounded-tl-sm bg-[#625bd5]/10 text-[#3d3699] dark:bg-[#625bd5]/20 dark:text-[#c8c5ff]'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isProcessingVoice && (
                                    <div className="flex gap-2">
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#625bd5] text-[10px] font-bold text-white dark:bg-[#7069dc]">AI</span>
                                        <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[#625bd5]/10 px-3 py-2 dark:bg-[#625bd5]/20">
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#625bd5]" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#625bd5]" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#625bd5]" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Candidate-specific, incremental coaching prompt. */}
                            {lastCoachResult && (
                                <div className="shrink-0 border-t border-[#ececf4] bg-white/60 px-4 py-3 dark:border-gray-800 dark:bg-transparent">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#625bd5] dark:text-[#b8b4ff]">Your next move</p>
                                    <p className="mt-1 text-xs font-bold text-gray-800 dark:text-gray-100">{lastCoachResult.focusArea}</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">{lastCoachResult.whyItMatters}</p>
                                    <div className="mt-2 rounded-md border border-[#dfe2ff] bg-[#f8f7ff] px-2.5 py-2 text-[11px] leading-relaxed text-[#4a4499] dark:border-[#625bd5]/30 dark:bg-[#312d6b]/30 dark:text-[#c8c5ff]">
                                        <span className="font-bold">Try this: </span>{lastCoachResult.nextAction}
                                    </div>
                                    {suggestedComponents.length > 0 && (
                                        <div className="mt-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">Possible building blocks</p>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {suggestedComponents.map((component) => (
                                                    <span key={component} className="rounded-md border border-[#dfe2ff] bg-white px-2 py-1 text-[10px] font-semibold text-[#4a4499] dark:border-[#625bd5]/30 dark:bg-[#1a1730] dark:text-[#c8c5ff]">
                                                        {component}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="shrink-0 border-t border-[#ececf4] px-4 py-3 dark:border-gray-800">
                                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
                                    {isListening ? 'Send to coach when you are ready for feedback' : 'Use Talk to coach in the toolbar to continue'}
                                </p>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemDesignBattle;
