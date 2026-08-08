import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, Session, LiveServerMessage } from '@google/genai';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { analyzeInterviewTranscript } from '../../services/geminiService';
import {
  encodeBase64 as encode,
  decodeBase64 as decode,
  decodeAudioData,
  downsampleBuffer,
} from '../../utils/liveAudio';
import { useAuth } from '../../contexts/AuthContext';
import { usePracticeHistory } from '../../hooks/useJobHistory';
import { GenAIBlob, InterviewAnalysis, InterviewSessionDraft, InterviewStatus, PracticeHistoryEntry, TranscriptEntry } from '../../types';
import { getNextQuestionIndex } from '../../utils/interviewProgress';

const analysisLoadingMessages = [
  'Reviewing your full transcript...',
  'Analyzing vocal tone and confidence...',
  'Assessing clarity and articulation...',
  'Evaluating the relevance of your answers...',
  'Identifying your key strengths...',
  'Compiling constructive feedback...',
  'Putting the final touches on your report...',
];

const GENERIC_COMPANY_LABELS = new Set([
  'job',
  'jobs',
  'custom practice',
  'unknown',
  'unknown company',
  'n/a',
  'na',
  'none',
  'general',
]);

const INACTIVITY_TIMEOUT_MS = 90000;
const AUDIO_ACTIVITY_TIMER_RESET_MS = 2000;
const FINAL_AUDIO_DRAIN_GRACE_MS = 1200;
const DRAFT_SAVE_DEBOUNCE_MS = 1200;

type AgentPrewarmStatus = 'idle' | 'preparing' | 'ready' | 'error';

// PCM helpers live in src/utils/liveAudio.ts so the Career Agent's voice
// session shares one implementation instead of a divergent copy.


const cleanInterviewLabel = (value?: string) =>
  (value || '').replace(/\s*<[^>]+>\s*$/g, '').trim();

const getSpecificCompanyName = (value?: string) => {
  const cleaned = cleanInterviewLabel(value);
  if (!cleaned || GENERIC_COMPANY_LABELS.has(cleaned.toLowerCase())) return '';
  return cleaned;
};

const safelyStopAudioSource = (source: AudioBufferSourceNode) => {
  try {
    source.stop();
  } catch {
    // Source nodes throw if they have already stopped.
  }
};

const normalizeDraftTranscript = (transcript: TranscriptEntry[] = []): TranscriptEntry[] =>
  transcript
    .filter(entry => entry.text.trim())
    .map(entry => ({
      speaker: entry.speaker,
      text: entry.text,
      isFinal: entry.isFinal ?? false,
      timestamp: entry.timestamp ?? Date.now(),
    }));

export interface UseAIInterviewAgentSessionParams {
  jobId: string;
  interviewPrompt: string;
  questions: string[];
  isFirstTime: boolean;
  resumeContext: string;
  jobTitle: string;
  jobCompany: string;
  onClose: () => void;
  isGuestMode?: boolean;
  initialTranscript?: TranscriptEntry[];
  resumeFromQuestionIndex?: number;
  onDraftChange?: (draft: InterviewSessionDraft | null) => Promise<void> | void;
  /** Called after an analysis is generated and saved (signed-in users only). */
  onAnalysisComplete?: (analysis: InterviewAnalysis) => void;
}

export const useAIInterviewAgentSession = ({
  jobId,
  interviewPrompt,
  questions,
  isFirstTime,
  resumeContext,
  jobTitle,
  jobCompany,
  onClose,
  isGuestMode = false,
  initialTranscript = [],
  resumeFromQuestionIndex = 0,
  onDraftChange,
  onAnalysisComplete,
}: UseAIInterviewAgentSessionParams) => {
  const { currentUser } = useAuth();
  const { addAnalysisToJob } = usePracticeHistory();
  const initialDraftTranscript = normalizeDraftTranscript(initialTranscript);
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(initialDraftTranscript);
  const [analysisResult, setAnalysisResult] = useState<InterviewAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGreetingPrompt, setShowGreetingPrompt] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [prewarmStatus, setPrewarmStatus] = useState<AgentPrewarmStatus>('idle');

  const inactivityTimerRef = useRef<number | null>(null);
  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const prewarmPromiseRef = useRef<Promise<void> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isCleaningUpRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const actualSessionIdRef = useRef<string | null>(null);
  const latestStatusRef = useRef<InterviewStatus>('idle');
  const lastAudioActivityTimerResetRef = useRef(0);
  const pendingEndAfterPlaybackRef = useRef(false);
  const finalAudioDrainTimerRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef<TranscriptEntry[]>(initialDraftTranscript);
  const draftStartedAtRef = useRef(initialDraftTranscript[0]?.timestamp ?? Date.now());

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    latestStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    let interval: number;
    if (status === 'analyzing') {
      setLoadingMessageIndex(0);
      interval = window.setInterval(() => {
        setLoadingMessageIndex(prevIndex => {
          if (prevIndex >= analysisLoadingMessages.length - 1) return prevIndex;
          return prevIndex + 1;
        });
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [status]);

  const stopInputCapture = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;
    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close().catch(console.error);
    inputAudioContextRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (finalAudioDrainTimerRef.current) {
      clearTimeout(finalAudioDrainTimerRef.current);
      finalAudioDrainTimerRef.current = null;
    }

    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;
    isSpeakingRef.current = false;
    pendingEndAfterPlaybackRef.current = false;

    stopInputCapture();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current = null;
    audioSourcesRef.current.forEach(safelyStopAudioSource);
    audioSourcesRef.current.clear();

    sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
    sessionPromiseRef.current = null;
  }, [stopInputCapture]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const completePendingEndAfterPlayback = useCallback(() => {
    if (!pendingEndAfterPlaybackRef.current || isCleaningUpRef.current) return;
    if (audioSourcesRef.current.size > 0) return;

    if (finalAudioDrainTimerRef.current) {
      clearTimeout(finalAudioDrainTimerRef.current);
      finalAudioDrainTimerRef.current = null;
    }
    pendingEndAfterPlaybackRef.current = false;
    setStatus('ended');
    cleanup();
  }, [cleanup]);

  const finishInterviewAfterPlayback = useCallback(() => {
    const currentStatus = latestStatusRef.current;
    if (currentStatus === 'ended' || currentStatus === 'error' || isCleaningUpRef.current) return;

    pendingEndAfterPlaybackRef.current = true;
    stopInputCapture();
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (audioSourcesRef.current.size === 0) {
      if (!finalAudioDrainTimerRef.current) {
        finalAudioDrainTimerRef.current = window.setTimeout(() => {
          finalAudioDrainTimerRef.current = null;
          completePendingEndAfterPlayback();
        }, FINAL_AUDIO_DRAIN_GRACE_MS);
      }
      return;
    }

    isSpeakingRef.current = true;
    setStatus('speaking');
  }, [completePendingEndAfterPlayback, stopInputCapture]);

  const buildDraftSnapshot = useCallback((draftStatus: InterviewSessionDraft['status']): InterviewSessionDraft | null => {
    const savedTranscript = normalizeDraftTranscript(latestTranscriptRef.current);
    if (savedTranscript.length === 0) return null;

    const nextQuestionIndex = Math.min(getNextQuestionIndex(questions, savedTranscript), questions.length);
    const now = Date.now();
    const draft: InterviewSessionDraft = {
      status: draftStatus,
      transcript: savedTranscript,
      questions,
      questionIndex: nextQuestionIndex,
      startedAt: draftStartedAtRef.current,
      updatedAt: now,
    };

    if (draftStatus === 'ended_without_feedback') {
      draft.endedAt = now;
    }

    return draft;
  }, [questions]);

  const saveDraftSnapshot = useCallback((draftStatus: InterviewSessionDraft['status'] = 'in_progress') => {
    if (!onDraftChange || analysisResult) return;
    const draft = buildDraftSnapshot(draftStatus);
    if (draft) {
      void onDraftChange(draft);
    }
  }, [analysisResult, buildDraftSnapshot, onDraftChange]);

  useEffect(() => {
    if (!onDraftChange || analysisResult || transcript.length === 0 || status === 'analyzing') return undefined;

    const draftStatus: InterviewSessionDraft['status'] =
      status === 'ended' || status === 'error' ? 'ended_without_feedback' : 'in_progress';
    const timer = window.setTimeout(() => {
      saveDraftSnapshot(draftStatus);
    }, DRAFT_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [analysisResult, onDraftChange, saveDraftSnapshot, status, transcript]);

  useEffect(() => {
    const handlePageExit = () => {
      saveDraftSnapshot('ended_without_feedback');
      cleanup();
    };

    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);
    return () => {
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
    };
  }, [cleanup, saveDraftSnapshot]);

  const endInterview = useCallback(() => {
    const currentStatus = latestStatusRef.current;
    if (currentStatus === 'ended' || currentStatus === 'error' || isCleaningUpRef.current) return;
    saveDraftSnapshot('ended_without_feedback');
    setStatus('ended');
    cleanup();
  }, [cleanup, saveDraftSnapshot]);

  const handleGetFeedback = useCallback(async () => {
    const conversationTurns = transcript.filter(t => t.isFinal).length;
    if (conversationTurns < 2) {
      setError('Not enough conversation to analyze. Please try the interview again.');
      setStatus('ended');
      return;
    }

    setStatus('analyzing');
    setError(null);
    let success = false;
    try {
      const firstEntry = transcript.find(t => t.timestamp);
      const lastEntry = [...transcript].reverse().find(t => t.timestamp);
      let durationInSeconds = 0;
      if (firstEntry?.timestamp && lastEntry?.timestamp) {
        durationInSeconds = (lastEntry.timestamp - firstEntry.timestamp) / 1000;
      }

      const analysisData = await analyzeInterviewTranscript(currentUser?.uid || 'guest', transcript, interviewPrompt, durationInSeconds);

      if (!isGuestMode && currentUser && actualSessionIdRef.current) {
        try {
          const functions = getFunctions(undefined, 'us-west1');
          const billSession = httpsCallable(functions, 'billInterviewSession');
          await billSession({
            sessionId: actualSessionIdRef.current,
            transcript: transcript.map(t => ({
              speaker: t.speaker,
              text: t.text,
              isFinal: t.isFinal ?? true,
              timestamp: t.timestamp ?? null,
            })),
            feedbackReport: {
              overallScore: analysisData.overallScore ?? 0,
              communicationScore: analysisData.communicationScore ?? 0,
              confidenceScore: analysisData.confidenceScore ?? 0,
              relevanceScore: analysisData.relevanceScore ?? 0,
              strengths: analysisData.strengths || '',
              areasForImprovement: analysisData.areasForImprovement || '',
            },
          });
        } catch (billErr) {
          console.error('Billing failed, but continuing with feedback generation:', billErr);
        }
      }

      if (isGuestMode) {
        const guestAnalysis: InterviewAnalysis = {
          ...analysisData,
          transcript,
          id: `guest_analysis_${Date.now()}`,
          timestamp: Date.now(),
        };
        const guestPracticeEntry: PracticeHistoryEntry = {
          id: 'guest',
          job: {
            id: 'guest_job',
            title: jobTitle,
            company: jobCompany,
            description: interviewPrompt,
            location: '',
            url: '',
          },
          questions,
          timestamp: Date.now(),
          interviewHistory: [guestAnalysis],
        };
        localStorage.setItem('guestInterview', JSON.stringify(guestPracticeEntry));
        setAnalysisResult(guestAnalysis);
      } else if (currentUser) {
        const fullAnalysis = await addAnalysisToJob(jobId, { ...analysisData, transcript });
        await onDraftChange?.(null);
        setAnalysisResult(fullAnalysis);
        try {
          onAnalysisComplete?.(fullAnalysis);
        } catch (callbackError) {
          console.error('onAnalysisComplete callback failed:', callbackError);
        }
      } else {
        throw new Error('Cannot save feedback without being logged in.');
      }
      success = true;
    } catch (e: any) {
      setError(e.message || 'Failed to get interview feedback.');
    } finally {
      if (!success) {
        setStatus('ended');
      }
    }
  }, [currentUser, transcript, interviewPrompt, isGuestMode, jobTitle, jobCompany, questions, addAnalysisToJob, jobId, onDraftChange, onAnalysisComplete]);

  const handleInactivity = useCallback(() => {
    const currentStatus = latestStatusRef.current;

    if (currentStatus === 'speaking' || audioSourcesRef.current.size > 0) {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(handleInactivity, INACTIVITY_TIMEOUT_MS);
      return;
    }

    if (currentStatus !== 'ended' && currentStatus !== 'analyzing' && currentStatus !== 'error') {
      setError('The live interview paused after no activity. Your transcript is still visible here; request feedback only when you are ready to end this attempt.');
      endInterview();
    }
  }, [endInterview]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(handleInactivity, INACTIVITY_TIMEOUT_MS);
  }, [handleInactivity]);

  const markAudioInputActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastAudioActivityTimerResetRef.current < AUDIO_ACTIVITY_TIMER_RESET_MS) return;
    lastAudioActivityTimerResetRef.current = now;
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleClose = useCallback(() => {
    saveDraftSnapshot('ended_without_feedback');
    cleanup();
    onClose();
  }, [cleanup, onClose, saveDraftSnapshot]);

  const prewarmInterviewAgent = useCallback(() => {
    if (status !== 'idle' || prewarmStatus === 'ready' || prewarmStatus === 'error') {
      return prewarmPromiseRef.current || Promise.resolve();
    }

    if (prewarmPromiseRef.current) {
      return prewarmPromiseRef.current;
    }

    if (isGuestMode || !currentUser) {
      setPrewarmStatus('ready');
      return Promise.resolve();
    }

    // The user should never wait on warm-up: mark the session ready
    // immediately (the green Start button is available the moment the modal
    // opens) and let the token prefetch run silently in the background.
    // `startInterview` performs the full live setup regardless, so a slow or
    // failed prewarm only loses the head start — never blocks the user.
    setPrewarmStatus('ready');
    const functions = getFunctions(undefined, 'us-west1');
    const getVertexToken = httpsCallable(functions, 'getInterviewVertexToken');

    prewarmPromiseRef.current = getVertexToken({ role: jobTitle, prewarm: true })
      .catch((err) => {
        console.warn('[AI Interview] Agent prewarm failed; start will retry the live setup.', err);
        prewarmPromiseRef.current = null;
      })
      .then(() => undefined);

    return prewarmPromiseRef.current;
  }, [currentUser, isGuestMode, jobTitle, prewarmStatus, status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (typeof chatEndRef.current?.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
    if (transcript.length > 0 && showGreetingPrompt) setShowGreetingPrompt(false);

    if (status === 'listening' || status === 'speaking') {
      resetInactivityTimer();
    } else if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, [transcript, showGreetingPrompt, status, resetInactivityTimer]);

  const startInterview = async () => {
    isCleaningUpRef.current = false;
    setShowGreetingPrompt(true);
    setError(null);
    const restoredTranscript = normalizeDraftTranscript(initialTranscript);
    const isResumingSession = restoredTranscript.length > 0 || resumeFromQuestionIndex > 0;
    draftStartedAtRef.current = restoredTranscript[0]?.timestamp ?? Date.now();
    latestTranscriptRef.current = isResumingSession ? restoredTranscript : [];
    setTranscript(isResumingSession ? restoredTranscript : []);
    setAnalysisResult(null);
    setStatus('connecting');

    try {
      void prewarmPromiseRef.current?.catch(() => undefined);

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const cleanJobTitle = cleanInterviewLabel(jobTitle) || 'the target role';
      const companyLabel = cleanInterviewLabel(jobCompany);
      const specificCompanyName = getSpecificCompanyName(jobCompany);
      const companyContext = specificCompanyName
        ? `You are conducting an interview for the position of "${cleanJobTitle}" at "${specificCompanyName}".`
        : `You are conducting an interview for the position of "${cleanJobTitle}". The company is not specified; "${companyLabel || 'unknown'}" is a category or placeholder, not a company name.`;

      const nextResumeQuestionIndex = Math.min(
        Math.max(resumeFromQuestionIndex || getNextQuestionIndex(questions, restoredTranscript), 0),
        Math.max(questions.length - 1, 0),
      );
      const priorTranscriptText = restoredTranscript
        .map(entry => `${entry.speaker === 'ai' ? 'Vivid' : 'Candidate'}: ${entry.text}`)
        .join('\n')
        .slice(-6000);
      const openingInstruction = isResumingSession
        ? `You are resuming an interrupted interview. Do not repeat the full introduction and do not re-ask questions that have already been answered. Briefly say you will continue from where the candidate left off, then ask question ${nextResumeQuestionIndex + 1} from the list. If all listed questions are already covered, move to the wrap-up instructions.`
        : isFirstTime
          ? 'Begin with the exact sentence: "Hello, I\'m Vivid, your AI interviewer." Do not introduce yourself as "with Jobs", "with Custom Practice", or with any category/source label. Then give a polished introduction summarizing the company background if a specific company is available, the role overview and key responsibilities, and any relevant industry or mission context gleaned from the job description. After the introduction, politely ask: "Do you have any questions before we begin the interview?" Wait for a brief acknowledgement before proceeding.'
          : 'Start by greeting the candidate briefly. Do not introduce yourself as "with Jobs", "with Custom Practice", or with any category/source label. Then ask the first question from the list without waiting for the candidate to speak first.';

      let systemInstruction = `You are Vivid, an expert AI interviewer. If the candidate asks your name, you MUST say "My name is Vivid." Do not say Gemini or any other name. ${companyContext} Your task is to conduct a short, focused, realistic interview. ${openingInstruction}

**How to interview well (behave like a real, sharp interviewer):**
- Ask ONE question at a time, then stop and listen. Never read out the whole list or stack multiple questions together.
- Briefly acknowledge each answer in a few words before moving on ("Got it." / "Makes sense.") — warm but efficient, not effusive.
- When an answer is vague, generic, or missing substance, ask a natural follow-up that pushes for specifics: a concrete example, a number, a trade-off, or "what exactly did YOU do?". Do not accept buzzwords at face value. Limit to one or two follow-ups per question, then move on.
- If the candidate is genuinely stuck, offer a small nudge or rephrase once, then continue — do not turn it into a lecture.
- Never answer the question for the candidate, never coach them on the ideal answer mid-interview, and never reveal how you are scoring them. You are the interviewer, not the coach.
- Keep your own turns short and conversational — this is a spoken interview, not an essay. Do not monologue.
- Stay in the persona and difficulty implied by the role and company throughout.

Work through the list of questions in order, using follow-ups as above. After the final question and the candidate's answer, wrap up:

Give a concise 2-3 sentence summary of the candidate's overall performance.
Provide 2-3 short, personalized tips for improvement.
Then say: "You can view a full feedback report by clicking Get Feedback.".
Finally, append the exact text token <END_INTERVIEW> to your text output only (do not speak this token).

**Important policy:**

If the candidate asks about the company, team, or culture and you are not certain, do not fabricate details.
Be transparent about uncertainty and suggest asking the recruiter or checking official sources (e.g., the company website).
Maintain a polite and professional tone while emphasizing honesty.

Here are the questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`;
      if (isResumingSession && priorTranscriptText) {
        systemInstruction += `\n\nPrior transcript from this same interview attempt. Use it only to understand what has already happened and where to resume:\n${priorTranscriptText}`;
      }
      if (resumeContext) {
        systemInstruction += `\n\nFor additional context, here is the candidate's resume. Use this to ask more targeted questions relating their experience to the job description.\n\n--- RESUME ---\n${resumeContext}`;
      }

      let ai: GoogleGenAI;
      let modelName = 'gemini-2.5-flash-native-audio-preview-09-2025';
      actualSessionIdRef.current = null;

      if (isGuestMode || !currentUser) {
        throw new Error('Please sign in to start a live interview. CareerVivid uses a secure server-issued Vertex token for voice sessions.');
      }

      const functions = getFunctions(undefined, 'us-west1');
      const getVertexToken = httpsCallable(functions, 'getInterviewVertexToken');
      const tokenResult = await getVertexToken({ role: jobTitle });
      const { accessToken, project, location, sessionId } = tokenResult.data as {
        accessToken: string;
        project: string;
        location: string;
        sessionId: string;
      };

      actualSessionIdRef.current = sessionId;
      ai = new GoogleGenAI({
        vertexai: true,
        apiKey: accessToken,
        httpOptions: {
          baseUrl: `${location === 'global' ? 'https://aiplatform.googleapis.com' : `https://${location}-aiplatform.googleapis.com`}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent?access_token=${accessToken}`,
        },
      });

      if ((ai as any).apiClient?.clientOptions) {
        (ai as any).apiClient.clientOptions.apiKey = undefined;
      }

      modelName = `projects/${project}/locations/${location}/publishers/google/models/gemini-live-2.5-flash-native-audio`;

      sessionPromiseRef.current = ai.live.connect({
        model: modelName,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onopen: async () => {
            if (import.meta.env.DEV) {
              console.debug('[AI Interview] WebSocket connection opened successfully.');
            }
            setStatus('listening');
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;

            try {
              if (inputAudioContextRef.current.state === 'suspended') {
                await inputAudioContextRef.current.resume();
              }
              if (outputAudioContextRef.current?.state === 'suspended') {
                await outputAudioContextRef.current.resume();
              }
            } catch (e) {
              console.error('[AI Interview] Error resuming audio contexts:', e);
            }

            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            let audioChunkCount = 0;
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              if (isCleaningUpRef.current || isSpeakingRef.current) return;
              markAudioInputActivity();
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const inputSampleRate = inputAudioContextRef.current?.sampleRate || 48000;
              const downsampled = downsampleBuffer(inputData, inputSampleRate, 16000);

              if (audioChunkCount++ % 100 === 0) {
                if (import.meta.env.DEV) {
                  console.debug(`[AI Interview] Captured & resampled audio chunk #${audioChunkCount}. Original rate: ${inputSampleRate}Hz. Size: ${downsampled.length} samples.`);
                }
              }

              const buffer = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                const s = Math.max(-1, Math.min(1, downsampled[i]));
                buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }

              const pcmBlob: GenAIBlob = {
                data: encode(new Uint8Array(buffer.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };

              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (import.meta.env.DEV) {
              console.debug('[AI Interview] Received WebSocket message from server:', message);
            }
            resetInactivityTimer();
            let shouldFinishAfterCurrentAudio = false;

            const processTranscription = (transcription: { text?: string } | undefined, speaker: 'user' | 'ai') => {
              const endToken = '<END_INTERVIEW>';
              let text = transcription?.text;
              if (text) {
                if (text.includes(endToken)) {
                  shouldFinishAfterCurrentAudio = true;
                  text = text.replace(endToken, '');
                }
                if (!text) return;

                setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.speaker === speaker && !last.isFinal) {
                    const newTranscript = [...prev];
                    newTranscript[newTranscript.length - 1] = { ...last, text: last.text + text };
                    return newTranscript;
                  }
                  return [...prev, { speaker, text: text!, isFinal: false, timestamp: Date.now() }];
                });
              }
            };

            processTranscription(message.serverContent?.inputTranscription, 'user');
            processTranscription(message.serverContent?.outputTranscription, 'ai');

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              if (finalAudioDrainTimerRef.current) {
                clearTimeout(finalAudioDrainTimerRef.current);
                finalAudioDrainTimerRef.current = null;
              }
              setStatus('speaking');
              isSpeakingRef.current = true;
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  isSpeakingRef.current = false;
                  if (pendingEndAfterPlaybackRef.current) {
                    completePendingEndAfterPlayback();
                    return;
                  }

                  const currentStatus = latestStatusRef.current;
                  if (currentStatus !== 'ended' && currentStatus !== 'error' && !isCleaningUpRef.current) {
                    setStatus('listening');
                  }
                }
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.turnComplete) {
              setTranscript(prev => prev.map(t => ({ ...t, isFinal: true })));
            }

            if (shouldFinishAfterCurrentAudio) {
              finishInterviewAfterPlayback();
            }
          },
          onclose: (event?: any) => {
            if (import.meta.env.DEV) {
              console.debug('[AI Interview] WebSocket connection closed by server. Event:', event);
            }
            if (audioSourcesRef.current.size > 0 || pendingEndAfterPlaybackRef.current) {
              finishInterviewAfterPlayback();
              return;
            }
            saveDraftSnapshot('ended_without_feedback');
            setStatus('ended');
            cleanup();
          },
          onerror: (e: Event) => {
            console.error('[AI Interview] WebSocket connection error:', e);
            setError('A connection error occurred during the interview.');
            setStatus('error');
            cleanup();
          },
        },
      });
    } catch (err: any) {
      console.error(err);
      cleanup();
      const errorMessage = err.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Please allow microphone access to start.'
        : err.message?.includes('sign in')
          ? err.message
        : 'Could not start the interview. Please check your microphone.';
      setError(errorMessage);
      setStatus('error');
    }
  };

  return {
    status,
    isPreparingAgent: prewarmStatus === 'preparing',
    isAgentPrepared: prewarmStatus === 'ready',
    transcript,
    analysisResult,
    error,
    showGreetingPrompt,
    loadingMessage: analysisLoadingMessages[loadingMessageIndex],
    chatEndRef,
    handleClose,
    prewarmInterviewAgent,
    startInterview,
    endInterview,
    handleGetFeedback,
  };
};
