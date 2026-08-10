import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InterviewStudio from './InterviewStudio';
import { PracticeHistoryEntry } from '../types';

/*
 * This file needs more than the default 5s per test.
 *
 * Rendering InterviewStudio pulls in `interviewGuideSummaries.generated` — a
 * 136 KB dataset covering 301 companies — and every render walks it. Alone the
 * five tests pass comfortably; sharing CPU with the rest of the suite they ran
 * about 7s each and four of them tripped the default timeout. The failures were
 * contention, not a hang: the same tests are green when the file runs on its own.
 *
 * Raised here rather than globally, so a genuine hang anywhere else still fails
 * fast.
 */
vi.setConfig({ testTimeout: 30_000 });

const {
  mockAddJob,
  mockDeletePracticeHistory,
  mockGenerateInterviewQuestions,
  mockCheckCredit,
  mockSaveInterviewDraft,
  mockNavigate,
  mockPracticeHistory,
} = vi.hoisted(() => ({
  mockAddJob: vi.fn(),
  mockDeletePracticeHistory: vi.fn(),
  mockGenerateInterviewQuestions: vi.fn(),
  mockCheckCredit: vi.fn(),
  mockSaveInterviewDraft: vi.fn(),
  mockNavigate: vi.fn(),
  mockPracticeHistory: [] as PracticeHistoryEntry[],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const copy: Record<string, string> = {
        'interview_studio.title': 'Technical Interview Simulator',
        'interview_studio.subtitle': 'Prepare for your next interview with an AI-powered mock session.',
        'interview_studio.start_title': 'Start your mock interview',
        'interview_studio.start_btn': 'Start Interview',
        'interview_studio.select_career': 'Or, select a career path',
        'interview_studio.select_role': `Select a ${params?.industry} role`,
        'interview_studio.back_to_industries': 'Back to industries',
        'interview_studio.preparing': 'Preparing',
      };
      return copy[key] || key;
    },
  }),
}));

vi.mock('../components/Layout/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('../components/AIInterviewAgentModal', () => ({
  default: ({
    interviewPrompt,
    initialTranscript,
    resumeFromQuestionIndex,
  }: {
    interviewPrompt: string;
    initialTranscript?: { text: string }[];
    resumeFromQuestionIndex?: number;
  }) => (
    <div role="dialog" aria-label="AI Interview Agent">
      {interviewPrompt}
      {initialTranscript?.[0]?.text && <span>{initialTranscript[0].text}</span>}
      {resumeFromQuestionIndex !== undefined && <span>resume-index-{resumeFromQuestionIndex}</span>}
    </div>
  ),
}));

vi.mock('../components/InterviewReportModal', () => ({
  default: ({ jobHistoryEntry }: { jobHistoryEntry: PracticeHistoryEntry }) => (
    <div role="dialog" aria-label="Interview Report">
      {jobHistoryEntry.job.title}
    </div>
  ),
}));

vi.mock('../components/Dashboard/InterviewHistoryCard', () => ({
  default: ({ entry, onShowReport, onDelete, onPracticeAgain }: any) => (
    <article>
      <h3>{entry.job.title}</h3>
      <button onClick={() => onShowReport(entry)}>Report</button>
      <button onClick={() => onPracticeAgain(entry)}>Practice Again</button>
      <button onClick={() => onDelete(entry.id)}>Delete session</button>
    </article>
  ),
}));

vi.mock('../components/Dashboard/DashboardSkeletons', () => ({
  InterviewHistoryCardSkeleton: () => <div>Loading session</div>,
}));

vi.mock('../hooks/useJobHistory', () => ({
  usePracticeHistory: () => ({
    practiceHistory: mockPracticeHistory,
    addJob: mockAddJob,
    isLoading: false,
    deletePracticeHistory: mockDeletePracticeHistory,
    saveInterviewDraft: mockSaveInterviewDraft,
  }),
}));

vi.mock('../hooks/useResumes', () => ({
  useResumes: () => ({ resumes: [] }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'user-1', email: 'user@example.com' } }),
}));

vi.mock('../hooks/useAICreditCheck', () => ({
  useAICreditCheck: () => ({
    checkCredit: mockCheckCredit,
    CreditLimitModal: () => null,
  }),
}));

vi.mock('../services/geminiService', () => ({
  generateInterviewQuestions: mockGenerateInterviewQuestions,
}));

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('../utils/navigation', () => ({
  navigate: mockNavigate,
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ app: 'firebase-functions' })),
  httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { prewarmed: true } })),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

const sampleEntry: PracticeHistoryEntry = {
  id: 'history-1',
  job: {
    id: 'job-1',
    title: 'Forward Deployed Engineer',
    company: 'OpenAI',
    location: 'New York',
    description: 'Deploy models with customers.',
    url: 'https://example.com/job',
  },
  questions: ['Tell me about yourself.'],
  timestamp: Date.now(),
  interviewHistory: [
    {
      id: 'analysis-1',
      timestamp: Date.now(),
      overallScore: 82,
      communicationScore: 80,
      confidenceScore: 78,
      relevanceScore: 88,
      strengths: 'Clear structure.',
      areasForImprovement: 'Add more metrics.',
      transcript: [],
    },
  ],
};

const draftEntry: PracticeHistoryEntry = {
  ...sampleEntry,
  id: 'draft-history-1',
  questions: ['Question one?', 'Question two?', 'Question three?'],
  interviewHistory: [],
  activeInterviewDraft: {
    status: 'in_progress',
    transcript: [
      {
        speaker: 'ai',
        text: 'Question one?',
        isFinal: true,
        timestamp: Date.now() - 60000,
      },
      {
        speaker: 'user',
        text: 'I answered the first question.',
        isFinal: true,
        timestamp: Date.now() - 50000,
      },
    ],
    questions: ['Question one?', 'Question two?', 'Question three?'],
    questionIndex: 1,
    startedAt: Date.now() - 60000,
    updatedAt: Date.now() - 50000,
  },
};

const questEntry: PracticeHistoryEntry = {
  ...sampleEntry,
  id: 'figma-quest-coding',
  job: {
    id: 'figma-quest-coding',
    title: 'Figma quest — Coding round',
    company: 'Figma',
    location: '',
    description: 'Coding challenge brief.',
    url: 'https://www.techinterview.org/companies/figma',
  },
  questions: [],
};

describe('InterviewStudio setup workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPracticeHistory.length = 0;
    mockAddJob.mockResolvedValue('new-job-1');
    mockGenerateInterviewQuestions.mockResolvedValue(['Question 1']);
    mockCheckCredit.mockReturnValue(true);
  });

  it('renders setup-first defaults and keeps start disabled until a prompt exists', () => {
    render(<InterviewStudio />);

    expect(screen.getByText('Technical Interview Simulator')).toBeInTheDocument();
    expect(screen.getByText('301')).toBeInTheDocument();
    expect(screen.getByText('22,611')).toBeInTheDocument();
    expect(screen.getByText('821')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Behavioral' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Standard' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '15 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /start interview/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Start your mock interview'), {
      target: { value: 'Practice for a platform engineer role' },
    });

    expect(screen.getByRole('button', { name: /start interview/i })).toBeEnabled();
  });

  it('passes selected local setup options into question generation', async () => {
    render(<InterviewStudio />);

    fireEvent.click(screen.getByRole('button', { name: 'Technical' }));
    fireEvent.click(screen.getByRole('button', { name: 'Senior' }));
    fireEvent.click(screen.getByRole('button', { name: '30 min' }));
    fireEvent.change(screen.getByLabelText('Start your mock interview'), {
      target: { value: 'Backend systems interview' },
    });
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));

    await waitFor(() => expect(mockGenerateInterviewQuestions).toHaveBeenCalled());
    const prompt = mockGenerateInterviewQuestions.mock.calls[0][1];
    expect(prompt).toContain('- Mode: Technical');
    expect(prompt).toContain('- Difficulty: Senior');
    expect(prompt).toContain('- Target duration: 30 min');
    expect(prompt).toContain('Backend systems interview');
  });

  it('renders recent sessions, opens reports, and confirms deletion', async () => {
    mockPracticeHistory.push(sampleEntry);
    render(<InterviewStudio />);

    expect(screen.getByText('Recent sessions')).toBeInTheDocument();
    expect(screen.getByText('Forward Deployed Engineer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    expect(await screen.findByRole('dialog', { name: 'Interview Report' })).toHaveTextContent('Forward Deployed Engineer');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Forward Deployed Engineer' }));
    expect(screen.getByText('Delete Session')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeletePracticeHistory).toHaveBeenCalledWith('history-1'));
  });

  it('resumes an unfinished draft without generating a new practice set', async () => {
    mockPracticeHistory.push(draftEntry);
    render(<InterviewStudio />);

    expect(screen.getByText('Saved draft')).toBeInTheDocument();
    expect(screen.getByText('Q2/3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /resume session/i }));

    expect(await screen.findByText('I answered the first question.')).toBeInTheDocument();
    expect(mockGenerateInterviewQuestions).not.toHaveBeenCalled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it('routes quest practice-again actions back to the company quest page', () => {
    mockPracticeHistory.push(questEntry);
    render(<InterviewStudio />);

    fireEvent.click(screen.getByRole('button', { name: /practice again/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/quest/figma');
    expect(mockGenerateInterviewQuestions).not.toHaveBeenCalled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });
});
