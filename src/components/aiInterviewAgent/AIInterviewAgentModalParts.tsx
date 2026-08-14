import React from 'react';
import {
  BarChart,
  Bot,
  Briefcase,
  CheckCircle2,
  Circle,
  ClipboardList,
  Loader2,
  Mic,
  Radio,
  Sparkles,
  StopCircle,
  User,
  X,
} from 'lucide-react';
import { InterviewStatus, TranscriptEntry } from '../../types';
import { getFinalTranscriptTurns, getQuestionFlowStates } from '../../utils/interviewProgress';

type StatusTone = 'green' | 'blue' | 'amber' | 'red' | 'gray';

const statusToneClasses: Record<StatusTone, {
  dot: string;
  ping: string;
  panel: string;
  ring: string;
}> = {
  green: {
    dot: 'bg-green-500',
    ping: 'bg-green-400',
    panel: 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200',
    ring: 'ring-green-500/20',
  },
  blue: {
    dot: 'bg-blue-500',
    ping: 'bg-blue-400',
    panel: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200',
    ring: 'ring-blue-500/20',
  },
  amber: {
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
    panel: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    ring: 'ring-amber-500/20',
  },
  red: {
    dot: 'bg-red-500',
    ping: 'bg-red-400',
    panel: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
    ring: 'ring-red-500/20',
  },
  gray: {
    dot: 'bg-gray-400',
    ping: 'bg-gray-300',
    panel: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200',
    ring: 'ring-gray-500/10',
  },
};

const compactText = (value: string, maxLength = 220) => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
};

const getLatestFinalUserAnswer = (transcript: TranscriptEntry[]) =>
  [...getFinalTranscriptTurns(transcript, 'user')].reverse()[0]?.text || '';

const hasMetricSignal = (value: string) => /\b(\d+|percent|revenue|users|customers|hours|weeks|months|%|x)\b/i.test(value);

const hasImpactSignal = (value: string) => /\b(impact|result|improved|reduced|increased|launched|delivered|owned|led|built|shipped|collaborated)\b/i.test(value);

const getLiveStatusCopy = (status: InterviewStatus) => {
  if (status === 'listening') return 'Listening';
  if (status === 'speaking') return 'Vivid speaking';
  if (status === 'connecting') return 'Connecting';
  if (status === 'analyzing') return 'Debriefing';
  if (status === 'ended') return 'Ended';
  if (status === 'error') return 'Needs attention';
  return 'Ready';
};

const getStatusMeta = (
  status: InterviewStatus,
  preparation?: { isPreparingAgent?: boolean; isAgentPrepared?: boolean },
): { label: string; description: string; tone: StatusTone } => {
  if (status === 'idle' && preparation?.isPreparingAgent) {
    return { label: 'Warming up', description: 'The live agent is warming in the background. You can start anytime.', tone: 'amber' };
  }
  if (status === 'idle' && preparation?.isAgentPrepared) {
    return { label: 'Ready', description: 'Agent is warmed up. Start when you are ready.', tone: 'green' };
  }

  switch (status) {
    case 'connecting':
      return { label: 'Connecting', description: 'Preparing the live interview session.', tone: 'amber' };
    case 'listening':
      return { label: 'Listening', description: 'Your microphone is active. Vivid is listening.', tone: 'green' };
    case 'speaking':
      return { label: 'Speaking', description: 'Vivid is responding. Your microphone is muted while audio plays.', tone: 'blue' };
    case 'analyzing':
      return { label: 'Analyzing', description: 'Generating your feedback report.', tone: 'amber' };
    case 'ended':
      return { label: 'Interview Ended', description: 'The live session has ended.', tone: 'red' };
    case 'error':
      return { label: 'Error', description: 'The interview needs attention before it can continue.', tone: 'red' };
    default:
      return { label: 'Ready', description: 'Start when you are ready to begin.', tone: 'gray' };
  }
};

export const InterviewHeader: React.FC<{
  interviewPrompt: string;
  jobTitle?: string;
  jobCompany?: string;
  onClose: () => void;
}> = ({ interviewPrompt, jobTitle, jobCompany, onClose }) => (
  <header className="flex items-start justify-between gap-4 border-b border-[#e7d8c5] bg-[#fffaf1] px-5 py-4 dark:border-[#3b3730] dark:bg-[#24231f] sm:px-6">
    <div className="min-w-0 space-y-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d5bc] bg-white px-2.5 py-1 text-[11px] font-bold text-[#8a642f] dark:border-[#51483c] dark:bg-[#302e2a] dark:text-[#d6b57f]">
        <Radio size={13} aria-hidden="true" />
        Live interview encounter
      </div>
      <div>
        <h2 id="ai-interview-modal-title" className="text-xl font-extrabold leading-tight tracking-tight text-[#211b16] dark:text-[#f4f1e9] sm:text-2xl">
          {jobTitle || 'Mock interview'}
        </h2>
        <p id="ai-interview-modal-description" className="mt-1 max-w-3xl truncate text-sm font-medium text-[#665a4a] dark:text-[#aaa39a]">
          {jobCompany && jobCompany !== 'Custom Practice'
            ? `${jobCompany} · Live voice session — answer naturally, the interviewer adapts to you.`
            : 'Live voice session — answer naturally, the interviewer adapts to you.'}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Close AI interview agent"
      className="rounded-full p-2 text-[#665a4a] transition-colors hover:bg-[#f0e3d2] hover:text-[#211b16] focus:outline-none focus:ring-2 focus:ring-[#8d88e6] dark:text-[#aaa39a] dark:hover:bg-[#302e2a] dark:hover:text-[#f4f1e9]"
    >
      <X size={20} aria-hidden="true" />
    </button>
  </header>
);

/**
 * Doorway brief — medkit-style case card. The learner reads WHO they're
 * meeting and gets a concrete YOUR TASK checklist whose items tick LIVE as
 * the transcript shows them happening (answer coverage, metrics, impact).
 */
export const EncounterBriefPanel: React.FC<{
  jobTitle: string;
  jobCompany: string;
  interviewPrompt: string;
  questions: string[];
  transcript: TranscriptEntry[];
}> = ({ jobTitle, jobCompany, interviewPrompt, questions, transcript }) => {
  const userTurns = getFinalTranscriptTurns(transcript, 'user');
  const coveredCount = getQuestionFlowStates(questions, transcript).filter((state) => state === 'covered').length;
  const usedMetric = userTurns.some((turn) => hasMetricSignal(turn.text));
  const usedImpact = userTurns.some((turn) => hasImpactSignal(turn.text));

  const tasks = [
    {
      label: questions.length
        ? `Answer all ${questions.length} interviewer questions`
        : 'Answer every interviewer question',
      done: questions.length > 0 && coveredCount >= questions.length,
      progress: questions.length ? `${coveredCount}/${questions.length}` : undefined,
    },
    { label: 'Back up an answer with a concrete number', done: usedMetric },
    { label: 'Show impact — results you owned or shipped', done: usedImpact },
  ];

  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border-2 border-[#211b16]/10 bg-white p-4 shadow-sm dark:border-[#3b3730] dark:bg-[#262522]">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#f9e8b8] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#8a642f] dark:bg-[#51483c] dark:text-[#f0d9a8]">
            Doorway brief
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#9a6b2f] dark:text-[#d6b57f]">
            <Briefcase size={12} aria-hidden="true" /> Realtime voice
          </span>
        </div>
        <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-tight text-[#211b16] dark:text-[#f4f1e9]">{jobTitle || 'Mock interview'}</h3>
        <p className="mt-0.5 text-xs font-bold text-[#665a4a] dark:text-[#aaa39a]">{jobCompany || 'Custom Practice'}</p>

        <div className="mt-3 rounded-xl border border-[#efe1ce] bg-[#fffaf1] p-3 dark:border-[#3b3730] dark:bg-[#1f1f1d]">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#9a6b2f] dark:text-[#d6b57f]">The setup</p>
          <p className="mt-1 text-xs leading-relaxed text-[#665a4a] dark:text-[#aaa39a]">{compactText(interviewPrompt)}</p>
        </div>

        {/* YOUR TASK — the medkit yellow card, items tick live */}
        <div className="mt-3 rounded-xl border border-[#eeddc0] bg-[#fdf3d7] p-3 dark:border-[#51483c] dark:bg-[#39332a]">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8a642f] dark:text-[#f0d9a8]">Your task</p>
          <ul className="mt-2 space-y-2">
            {tasks.map((task, index) => (
              <li key={task.label} className="flex items-start gap-2">
                {task.done ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                ) : (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-[#8a642f] ring-1 ring-[#e0c893] dark:bg-[#51483c] dark:text-[#f0d9a8] dark:ring-[#6b5f4c]">
                    {index + 1}
                  </span>
                )}
                <span className={`text-xs font-semibold leading-snug ${task.done ? 'text-emerald-800 line-through decoration-emerald-500/60 dark:text-emerald-300' : 'text-[#211b16] dark:text-[#f4f1e9]'}`}>
                  {task.label}
                  {task.progress && !task.done && (
                    <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-[#8a642f] ring-1 ring-[#e0c893] dark:bg-[#51483c] dark:text-[#f0d9a8] dark:ring-[#6b5f4c]">
                      {task.progress}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </aside>
  );
};

/**
 * Countdown timer — medkit's "YOUR TIME" pressure bar. Starts on the first
 * live turn, drains segment by segment, and shifts amber → red as time runs
 * out. Purely motivational: the session doesn't hard-stop at zero.
 */
export const SessionTimerPanel: React.FC<{
  status: InterviewStatus;
  totalMinutes?: number;
}> = ({ status, totalMinutes = 15 }) => {
  const totalSeconds = totalMinutes * 60;
  const [elapsed, setElapsed] = React.useState(0);
  const startedRef = React.useRef(false);

  const isLive = status === 'listening' || status === 'speaking';
  if (isLive) startedRef.current = true;
  const running = startedRef.current && status !== 'ended' && status !== 'analyzing' && status !== 'error';

  React.useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const remaining = Math.max(totalSeconds - elapsed, 0);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const fraction = remaining / totalSeconds;
  const SEGMENTS = 10;
  const litSegments = Math.ceil(fraction * SEGMENTS);
  const toneClass = fraction <= 0.1 ? 'text-rose-600 dark:text-rose-400' : fraction <= 0.25 ? 'text-amber-600 dark:text-amber-400' : 'text-[#211b16] dark:text-[#f4f1e9]';
  const barClass = fraction <= 0.1 ? 'bg-rose-500' : fraction <= 0.25 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <section className="rounded-2xl border-2 border-[#211b16]/10 bg-white p-4 shadow-sm dark:border-[#3b3730] dark:bg-[#262522]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#9a6b2f] dark:text-[#d6b57f]">Your time</p>
          <p className={`text-2xl font-black tabular-nums tracking-tight ${toneClass} ${fraction <= 0.1 && running ? 'motion-safe:animate-pulse' : ''}`}>
            {startedRef.current ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${totalMinutes}:00`}
          </p>
        </div>
        <div className="flex items-end gap-1" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, index) => (
            <span
              key={index}
              className={`w-1.5 rounded-full transition-colors duration-500 ${index < litSegments ? barClass : 'bg-[#e7d8c5] dark:bg-[#3b3730]'}`}
              style={{ height: `${14 + index * 2}px` }}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-[#665a4a] dark:text-[#aaa39a]">
        {startedRef.current ? 'Clock runs while the session is live — pace yourself.' : 'Starts with your first exchange.'}
      </p>
    </section>
  );
};

export const QuestionQueuePanel: React.FC<{
  questions: string[];
  transcript: TranscriptEntry[];
}> = ({ questions, transcript }) => {
  const questionFlowStates = getQuestionFlowStates(questions, transcript);
  const coveredCount = questionFlowStates.filter(state => state === 'covered').length;

  return (
    <section className="rounded-xl border border-[#e7d8c5] bg-white p-4 shadow-sm dark:border-[#3b3730] dark:bg-[#262522]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#9a6b2f] dark:text-[#d6b57f]">
          <ClipboardList size={14} aria-hidden="true" />
          Question flow
        </div>
        <span className="rounded-full bg-[#f3f2ff] px-2 py-0.5 text-[10px] font-bold text-[#4a4392] dark:bg-[#34314e] dark:text-[#b7b2ff]">
          {coveredCount}/{questions.length || 0}
        </span>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {questions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#e6d5bc] bg-[#fffaf1] p-3 text-xs text-[#665a4a] dark:border-[#3b3730] dark:bg-[#1f1f1d] dark:text-[#aaa39a]">
            Vivid will build the flow from the live prompt.
          </p>
        ) : questions.map((question, index) => {
          const questionState = questionFlowStates[index] || 'queued';
          const isDone = questionState === 'covered';
          const isActive = questionState === 'current';

          return (
            <div
              key={`${question}-${index}`}
              className={`rounded-lg border p-3 transition-colors ${isActive
                ? 'border-[#8d88e6] bg-[#f3f2ff] dark:border-[#5b5599] dark:bg-[#302f48]'
                : isDone
                  ? 'border-[#cfe8dc] bg-[#f4fbf7] dark:border-[#315443] dark:bg-[#1e2b26]'
                  : 'border-[#efe1ce] bg-[#fffaf1] dark:border-[#3b3730] dark:bg-[#1f1f1d]'
                }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                ) : (
                  <Circle size={12} className={isActive ? 'text-[#4a4392]' : 'text-[#b79a72] dark:text-[#7c7063]'} aria-hidden="true" />
                )}
                <span className="text-[10px] font-bold text-[#665a4a] dark:text-[#aaa39a]">
                  {isDone ? 'Covered' : isActive ? 'Current' : 'Queued'}
                </span>
              </div>
              <p className="text-xs font-semibold leading-snug text-[#211b16] dark:text-[#f4f1e9]">{question}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/**
 * Live vitals — medkit's triage-vitals treatment for interview signals.
 * Colorful tiles with big cumulative numbers that tick up as the transcript
 * shows metrics, impact language, and substantial answers.
 */
export const LiveObserverPanel: React.FC<{
  status: InterviewStatus;
  transcript: TranscriptEntry[];
}> = ({ status, transcript }) => {
  const userTurns = getFinalTranscriptTurns(transcript, 'user');
  const metricAnswers = userTurns.filter((turn) => hasMetricSignal(turn.text)).length;
  const impactAnswers = userTurns.filter((turn) => hasImpactSignal(turn.text)).length;
  const totalWords = userTurns.reduce((sum, turn) => sum + turn.text.split(/\s+/).filter(Boolean).length, 0);
  const avgWords = userTurns.length ? Math.round(totalWords / userTurns.length) : 0;
  const latestAnswer = getLatestFinalUserAnswer(transcript);
  const latestDepth = latestAnswer.length >= 160;

  const vitals = [
    { label: 'Turns', value: String(userTurns.length), cls: 'border-[#f4b8c5] bg-[#fdeef1] text-[#b03a54] dark:border-[#7c3f50] dark:bg-[#3c2229] dark:text-[#f4a5b8]' },
    { label: 'Metrics', value: String(metricAnswers), cls: 'border-[#f3cba5] bg-[#fdf1e3] text-[#a35410] dark:border-[#7c5a33] dark:bg-[#3a2c1c] dark:text-[#f0c08a]' },
    { label: 'Impact', value: String(impactAnswers), cls: 'border-[#b9e3c8] bg-[#eef9f2] text-[#15803d] dark:border-[#336044] dark:bg-[#1d3226] dark:text-[#86e0a8]' },
    { label: 'Words/ans', value: String(avgWords), cls: 'border-[#b8d8f4] bg-[#ecf4fd] text-[#1861a8] dark:border-[#33517c] dark:bg-[#1c2a3a] dark:text-[#8fc4f0]' },
    { label: 'Depth', value: latestDepth ? '✓' : '—', cls: 'border-[#eeddc0] bg-[#fdf3d7] text-[#8a642f] dark:border-[#6b5f4c] dark:bg-[#39332a] dark:text-[#f0d9a8]' },
  ];

  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border-2 border-[#211b16]/10 bg-white p-4 shadow-sm dark:border-[#3b3730] dark:bg-[#262522]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#9a6b2f] dark:text-[#d6b57f]">
            <Sparkles size={14} aria-hidden="true" />
            Interview vitals
          </div>
          <span className="rounded-full bg-[#eef8f2] px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-[#213629] dark:text-emerald-300">
            {getLiveStatusCopy(status)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {vitals.map((vital) => (
            <div key={vital.label} className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${vital.cls}`}>
              <p className="text-xl font-black tabular-nums leading-none">{vital.value}</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wide opacity-80">{vital.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#665a4a] dark:text-[#aaa39a]">
          Metrics and impact tick up when your answers include them. Final scoring uses the full transcript.
        </p>
      </section>
    </aside>
  );
};

export const SessionMapPanel: React.FC<{ status: InterviewStatus; hasTranscript: boolean }> = ({ status, hasTranscript }) => {
  const steps = [
    { label: 'Brief', active: status === 'idle' || status === 'connecting', done: status !== 'idle' && status !== 'connecting' },
    { label: 'Live interview', active: status === 'listening' || status === 'speaking', done: status === 'ended' || status === 'analyzing' },
    { label: 'Debrief', active: status === 'ended' || status === 'analyzing', done: false },
  ];

  return (
    <section className="rounded-xl border border-[#e7d8c5] bg-white p-4 shadow-sm dark:border-[#3b3730] dark:bg-[#262522]">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-[#9a6b2f] dark:text-[#d6b57f]">
        <BarChart size={14} aria-hidden="true" />
        Session path
      </div>
      <div className="space-y-2">
        {steps.map(step => (
          <div key={step.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${step.done ? 'bg-emerald-500' : step.active ? 'bg-[#4a4392]' : 'bg-[#d9c9b4] dark:bg-[#5a5147]'}`} />
            <span className={`text-xs font-semibold ${step.active ? 'text-[#211b16] dark:text-[#f4f1e9]' : 'text-[#665a4a] dark:text-[#aaa39a]'}`}>{step.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#665a4a] dark:text-[#aaa39a]">
        {hasTranscript ? 'Transcript is being captured.' : 'Start when ready.'}
      </p>
    </section>
  );
};

const AudioActivityVisual: React.FC<{ status: InterviewStatus }> = ({ status }) => {
  const meta = getStatusMeta(status);
  const tone = statusToneClasses[meta.tone];
  const isActive = status === 'listening' || status === 'speaking' || status === 'connecting' || status === 'analyzing';
  const bars = status === 'speaking' ? ['h-5', 'h-8', 'h-4', 'h-7', 'h-6'] : ['h-3', 'h-5', 'h-4', 'h-6', 'h-3'];

  return (
    <div className={`flex h-12 w-16 items-center justify-center gap-1 rounded-xl bg-white/70 ring-4 ${tone.ring} dark:bg-gray-950/30`} aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={`${status}-${index}`}
          className={`w-1.5 rounded-full ${height} ${tone.dot} ${isActive ? 'motion-safe:animate-pulse motion-reduce:animate-none' : 'opacity-45'}`}
          style={isActive ? { animationDelay: `${index * 120}ms` } : undefined}
        />
      ))}
    </div>
  );
};

export const StatusPanel: React.FC<{
  status: InterviewStatus;
  error: string | null;
  isPreparingAgent?: boolean;
  isAgentPrepared?: boolean;
}> = ({ status, error, isPreparingAgent, isAgentPrepared }) => {
  const meta = getStatusMeta(status, { isPreparingAgent, isAgentPrepared });
  const tone = statusToneClasses[meta.tone];
  const visualStatus = status === 'idle' && isPreparingAgent ? 'connecting' : status;
  const shouldSpin = status === 'connecting' || status === 'analyzing' || (status === 'idle' && isPreparingAgent);
  const isLive = status === 'listening' || status === 'speaking';

  return (
    <section className={`border px-5 py-4 ${tone.panel}`} aria-labelledby="ai-interview-status-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
            {isLive && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping motion-reduce:animate-none ${tone.ping}`} />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${tone.dot}`} />
          </span>
          <div>
            <h3 id="ai-interview-status-heading" className="text-sm font-semibold uppercase tracking-wide">
              Session status
            </h3>
            <p className="mt-0.5 flex items-center gap-2 text-base font-bold" aria-live="polite" aria-atomic="true">
              {shouldSpin && <Loader2 className="h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {meta.label}
            </p>
            <p className="mt-1 text-sm opacity-85">{error || meta.description}</p>
          </div>
        </div>
        <AudioActivityVisual status={visualStatus} />
      </div>
    </section>
  );
};

const MessageBubble: React.FC<{ entry: TranscriptEntry }> = ({ entry }) => {
  const isUser = entry.speaker === 'user';
  const speakerLabel = isUser ? 'You' : 'Vivid';

  return (
    <article className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex max-w-full items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${isUser ? 'bg-gray-600' : 'bg-blue-600'}`} aria-hidden="true">
          {isUser ? <User size={17} /> : <Bot size={17} />}
        </div>
        <div className={`max-w-[min(34rem,80vw)] rounded-2xl px-4 py-3 text-sm shadow-sm ${isUser ? 'rounded-tr-sm bg-blue-600 text-white' : 'rounded-tl-sm bg-white text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700'}`}>
          <p className="mb-1 text-xs font-semibold opacity-75">{speakerLabel}</p>
          <p className="whitespace-pre-wrap leading-relaxed">{entry.text}</p>
        </div>
      </div>
      {entry.isFinal && entry.timestamp && (
        <time className="mt-1 px-11 text-xs text-gray-400 dark:text-gray-500" dateTime={new Date(entry.timestamp).toISOString()}>
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </time>
      )}
    </article>
  );
};

export const TranscriptLog: React.FC<{
  transcript: TranscriptEntry[];
  showGreetingPrompt: boolean;
  error: string | null;
  chatEndRef: React.RefObject<HTMLDivElement>;
}> = ({ transcript, showGreetingPrompt, error, chatEndRef }) => (
  <section className="flex-1 overflow-y-auto bg-gray-50 px-5 py-5 dark:bg-gray-950/60" aria-labelledby="ai-interview-transcript-heading">
    <h3 id="ai-interview-transcript-heading" className="sr-only">
      Interview transcript
    </h3>
    <div role="log" aria-live="polite" aria-relevant="additions text" className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {showGreetingPrompt && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-green-200 bg-white p-5 text-center shadow-sm motion-safe:animate-pulse motion-reduce:animate-none dark:border-green-900/60 dark:bg-gray-900">
          <Mic className="mb-3 h-10 w-10 text-green-500" aria-hidden="true" />
          <p className="font-semibold text-gray-800 dark:text-gray-100">The AI is ready.</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Say "Hello" or "Hi" to begin.</p>
        </div>
      )}

      {transcript.length === 0 && !showGreetingPrompt && !error && (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Your live transcript will appear here.
        </div>
      )}

      {transcript.map((entry, index) => (
        <MessageBubble key={`${entry.speaker}-${entry.timestamp ?? index}-${index}`} entry={entry} />
      ))}
      <div ref={chatEndRef} />
    </div>
  </section>
);

export const AnalyzingPanel: React.FC<{ message: string }> = ({ message }) => (
  <section className="flex flex-1 items-center justify-center bg-gray-50 px-5 py-10 text-center dark:bg-gray-950/60" aria-labelledby="ai-interview-analyzing-heading">
    <div className="max-w-md">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-500/10 dark:bg-amber-950/30">
        <Loader2 className="h-10 w-10 text-amber-500 motion-safe:animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
      <h3 id="ai-interview-analyzing-heading" className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
        Generating your feedback report
      </h3>
      <p key={message} className="mt-2 text-sm text-gray-500 motion-safe:animate-pulse motion-reduce:animate-none dark:text-gray-400" aria-live="polite">
        {message}
      </p>
    </div>
  </section>
);

export const InterviewControls: React.FC<{
  status: InterviewStatus;
  hasTranscript: boolean;
  hasAnalysisResult: boolean;
  isPreparingAgent?: boolean;
  isAgentPrepared?: boolean;
  onClose: () => void;
  onStart: () => void;
  onEnd: () => void;
  onGetFeedback: () => void;
}> = ({
  status,
  hasTranscript,
  hasAnalysisResult,
  isPreparingAgent,
  isAgentPrepared,
  onClose,
  onStart,
  onEnd,
  onGetFeedback,
}) => {
  const isLive = status !== 'idle' && status !== 'ended' && status !== 'error';
  const statusLabel = status === 'ended'
    ? 'Session complete'
    : status === 'idle' && isPreparingAgent
      ? 'Agent warming in background'
      : status === 'idle' && isAgentPrepared
        ? 'Agent ready'
        : status === 'idle' || status === 'error'
          ? 'Ready to begin'
          : 'Live interview in progress';
  const actionCopy = status === 'ended'
    ? 'Get feedback creates the report. Close returns to the interview list.'
    : isLive
      ? 'Save & close keeps a resumable draft. End interview stops this attempt.'
      : 'Close returns to the interview list. Start interview begins a live microphone session.';

  return (
    <footer className="flex flex-col gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-center sm:max-w-md sm:text-left">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{statusLabel}</p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500 dark:text-gray-400">{actionCopy}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {(status === 'idle' || status === 'error' || status === 'ended' || isLive) && (
          <button
            type="button"
            onClick={onClose}
            title={isLive ? 'Close this modal and keep a resumable draft.' : 'Close this modal and return to the interview list.'}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
          >
            <X size={18} aria-hidden="true" /> {isLive ? 'Save & close' : 'Close'}
          </button>
        )}
        {status !== 'idle' && status !== 'ended' && status !== 'error' && (
          <button
            type="button"
            onClick={onEnd}
            title="Stop this attempt. You can request feedback from the captured transcript after it ends."
            disabled={status === 'analyzing'}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-400 dark:focus:ring-offset-gray-900"
          >
            <StopCircle size={18} aria-hidden="true" /> End interview
          </button>
        )}
        {(status === 'idle' || status === 'error') && (
          <button
            type="button"
            onClick={onStart}
            title="Start or restart the live microphone session."
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-base font-bold text-white shadow-[0_6px_18px_rgba(22,163,74,0.35)] transition-all hover:-translate-y-0.5 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <Mic size={19} aria-hidden="true" /> Start Interview
          </button>
        )}
        {status === 'ended' && hasTranscript && !hasAnalysisResult && (
          <button
            type="button"
            onClick={onGetFeedback}
            title="Create a scored report from this attempt."
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <BarChart size={18} aria-hidden="true" /> Get Feedback
          </button>
        )}
      </div>
    </footer>
  );
};
