import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AIInterviewAgentModal from './AIInterviewAgentModal';

const { mockPrewarmCallable } = vi.hoisted(() => ({
  mockPrewarmCallable: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ app: 'firebase-functions' })),
  httpsCallable: vi.fn(() => mockPrewarmCallable),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'user-1', email: 'user@example.com' } }),
}));

vi.mock('../hooks/useJobHistory', () => ({
  usePracticeHistory: () => ({
    addAnalysisToJob: vi.fn(),
  }),
}));

vi.mock('../services/geminiService', () => ({
  analyzeInterviewTranscript: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
  Modality: { AUDIO: 'AUDIO' },
}));

const renderModal = () =>
  render(
    <AIInterviewAgentModal
      jobId="practice-1"
      interviewPrompt="Scheduled practice session for database migration"
      questions={['How would you migrate a database with zero downtime?']}
      isFirstTime={false}
      resumeContext=""
      jobTitle="Backend Engineer"
      jobCompany="Scheduled Practice"
      onClose={vi.fn()}
    />,
  );

describe('AIInterviewAgentModal prewarm', () => {
  beforeEach(() => {
    mockPrewarmCallable.mockReset();
  });

  /*
   * This asserted a visible "Warming up" state that the modal no longer has.
   * `prewarmInterviewAgent` sets the status straight to `ready` on purpose —
   * "the user should never wait on warm-up" — and lets the token prefetch run
   * silently, so `isPreparingAgent` is never true. The test was checking the
   * behaviour the change removed rather than the promise it replaced it with:
   * Start is live immediately, and prewarm happens anyway.
   */
  it('warms the interview agent on open without blocking start', async () => {
    let resolvePrewarm!: (value: unknown) => void;
    mockPrewarmCallable.mockReturnValue(
      new Promise((resolve) => {
        resolvePrewarm = resolve;
      }),
    );

    renderModal();

    await waitFor(() => {
      expect(mockPrewarmCallable).toHaveBeenCalledWith({ role: 'Backend Engineer', prewarm: true });
    });

    // The point of the prefetch: it is still in flight, and Start already works.
    expect(screen.getByRole('button', { name: /start interview/i })).toBeEnabled();
    expect(screen.getByText('Agent ready')).toBeInTheDocument();

    await act(async () => {
      resolvePrewarm({ data: { prewarmed: true } });
    });

    // Resolving changes nothing the user can see — which is the design.
    expect(screen.getByRole('button', { name: /start interview/i })).toBeEnabled();
    expect(screen.getByText('Agent ready')).toBeInTheDocument();
  });

  it('leaves start enabled when the prewarm request fails', async () => {
    mockPrewarmCallable.mockRejectedValue(new Error('token service unavailable'));

    renderModal();

    await waitFor(() => {
      expect(mockPrewarmCallable).toHaveBeenCalled();
    });

    // A failed head start must never cost the user the ability to begin;
    // `startInterview` performs the full live setup regardless.
    expect(screen.getByRole('button', { name: /start interview/i })).toBeEnabled();
  });
});
