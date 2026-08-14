import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import InterviewReportModal from './InterviewReportModal';
import { PracticeHistoryEntry } from '../types';

vi.mock('./FeedbackModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Feedback dialog">Feedback dialog</div> : null),
}));

const jobHistoryEntry: PracticeHistoryEntry = {
  id: 'history-1',
  job: {
    id: 'job-1',
    title: 'Robotics Lab Technician',
    company: 'OpenAI',
    location: 'San Francisco',
    description: 'Maintain robotics lab equipment.',
    url: 'https://example.com/job',
  },
  questions: ['Tell me about your lab experience.'],
  timestamp: Date.now(),
  transcript: [
    { speaker: 'ai', text: 'Fallback prompt', isFinal: true, timestamp: 1 },
    { speaker: 'user', text: 'Fallback answer', isFinal: true, timestamp: 2 },
  ],
  interviewHistory: [
    {
      id: 'analysis-1',
      timestamp: 1716600000000,
      overallScore: 72,
      communicationScore: 80,
      confidenceScore: 64,
      relevanceScore: 70,
      strengths: '**Structured** answers with clear examples.',
      areasForImprovement: 'Practice deeper technical examples.',
      transcript: [
        { speaker: 'ai', text: 'Why this role?', isFinal: true, timestamp: 3 },
        { speaker: 'user', text: 'I enjoy hands-on systems work.', isFinal: true, timestamp: 4 },
      ],
    },
    {
      id: 'analysis-2',
      timestamp: 1716500000000,
      overallScore: 45,
      communicationScore: 50,
      confidenceScore: 40,
      relevanceScore: 45,
      strengths: 'Shows curiosity.',
      areasForImprovement: 'Use STAR stories.',
      transcript: [],
    },
  ],
};

describe('InterviewReportModal', () => {
  it('renders the coaching dashboard and switches to transcript view', () => {
    render(<InterviewReportModal jobHistoryEntry={jobHistoryEntry} onClose={vi.fn()} />);

    expect(screen.getAllByText('Top summary')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Metric breakdown')[0]).toBeInTheDocument();
    expect(screen.getAllByText('What went well')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Practice next')[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /transcript/i }));

    expect(screen.getAllByText('Why this role?')[0]).toBeInTheDocument();
    expect(screen.getAllByText('I enjoy hands-on systems work.')[0]).toBeInTheDocument();
  });

  it('uses shared transcript fallback when the selected analysis has no transcript', () => {
    render(<InterviewReportModal jobHistoryEntry={jobHistoryEntry} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Session'), { target: { value: 'analysis-2' } });
    fireEvent.click(screen.getByRole('button', { name: /transcript/i }));

    expect(screen.getAllByText(/Recovered from the practice session/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fallback prompt')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fallback answer')[0]).toBeInTheDocument();
  });

  /*
   * The reported bug, in the shape it was reported: submit a design, score it,
   * click improve, and the workspace came back on an OLDER submission — so the
   * next score belonged to work the user had already moved past.
   *
   * The modal's half of that is which analysis it hands back. It used to hand
   * back nothing at all, leaving the caller to guess, and the caller guessed
   * the newest.
   */
  it('improves the session on screen, not the newest one', () => {
    const onImprove = vi.fn();
    render(<InterviewReportModal jobHistoryEntry={jobHistoryEntry} onClose={vi.fn()} onImprove={onImprove} />);

    fireEvent.change(screen.getByLabelText('Session'), { target: { value: 'analysis-2' } });
    fireEvent.click(screen.getAllByRole('button', { name: /improve my solution/i })[0]);

    expect(onImprove).toHaveBeenCalledTimes(1);
    expect(onImprove.mock.calls[0][0].id).toBe('analysis-2');
  });

  it('improves the newest session when nothing else is selected', () => {
    const onImprove = vi.fn();
    render(<InterviewReportModal jobHistoryEntry={jobHistoryEntry} onClose={vi.fn()} onImprove={onImprove} />);

    fireEvent.click(screen.getAllByRole('button', { name: /improve my solution/i })[0]);

    expect(onImprove.mock.calls[0][0].id).toBe('analysis-1');
  });

  it('names the button whatever the workspace is', () => {
    render(
      <InterviewReportModal
        jobHistoryEntry={jobHistoryEntry}
        onClose={vi.fn()}
        onImprove={vi.fn()}
        improveLabel="Open this design"
      />,
    );

    expect(screen.getAllByRole('button', { name: /open this design/i })[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /improve my solution/i })).not.toBeInTheDocument();
  });

  /*
   * A quest's history mixes stages and only whiteboard rounds carry a diagram,
   * so the button has to disappear on the sessions that have nothing to open
   * rather than sit there doing nothing.
   */
  it('hides the button on a session with nothing to reopen', () => {
    const onImprove = vi.fn();
    render(
      <InterviewReportModal
        jobHistoryEntry={jobHistoryEntry}
        onClose={vi.fn()}
        onImprove={onImprove}
        improveLabel="Open this design"
        canImprove={(analysis) => analysis.id === 'analysis-1'}
      />,
    );

    expect(screen.getAllByRole('button', { name: /open this design/i })[0]).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Session'), { target: { value: 'analysis-2' } });
    expect(screen.queryByRole('button', { name: /open this design/i })).not.toBeInTheDocument();
  });

  it('opens feedback from the inline rate action and closes on Escape', () => {
    const onClose = vi.fn();
    render(<InterviewReportModal jobHistoryEntry={jobHistoryEntry} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /rate this report/i }));
    expect(screen.getByRole('dialog', { name: 'Feedback dialog' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
