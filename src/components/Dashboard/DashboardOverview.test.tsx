import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobApplicationData, PracticeHistoryEntry, ResumeData, WhiteboardData } from '../../types';
import type { PortfolioData } from '../../features/portfolio/types/portfolio';
import DashboardOverview from './DashboardOverview';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('../../utils/navigation', () => ({ navigate: mockNavigate }));

const resume = {
    id: 'resume-1',
    title: 'Frontend resume',
    updatedAt: new Date().toISOString(),
    personalDetails: { jobTitle: 'Frontend Engineer' },
    professionalSummary: 'A complete summary',
    skills: [],
    employmentHistory: [],
    websites: [],
} as ResumeData;

const job = {
    id: 'job-1',
    userId: 'user-1',
    jobTitle: 'Frontend Engineer',
    companyName: 'CareerVivid',
    jobPostURL: 'https://example.com/jobs/1',
    applicationStatus: 'To Apply',
    nextAction: 'Tailor resume',
    createdAt: Date.now(),
    updatedAt: Date.now(),
} as JobApplicationData;

const practice = {
    id: 'practice-1',
    job: { id: 'practice-job', title: 'Frontend Engineer', company: 'CareerVivid' },
    timestamp: Date.now(),
    questions: [],
    interviewHistory: [],
} as PracticeHistoryEntry;

const whiteboard = {
    id: 'board-1',
    userId: 'user-1',
    title: 'Rate limiter design',
    excalidrawData: { type: 'excalidraw', version: 2, source: 'test', elements: [], appState: {}, files: {} },
    createdAt: Date.now(),
    updatedAt: Date.now(),
} as unknown as WhiteboardData;

const renderOverview = (props: Partial<React.ComponentProps<typeof DashboardOverview>> = {}) => render(
    <DashboardOverview
        resumes={[]}
        portfolios={[] as PortfolioData[]}
        practiceHistory={[]}
        jobApplications={[]}
        communityPostCount={0}
        onInterviewSelect={vi.fn()}
        {...props}
    />,
);

describe('DashboardOverview', () => {
    beforeEach(() => mockNavigate.mockClear());

    it('leads with the three things the product sells, before the numbers', () => {
        renderOverview({
            resumes: [resume],
            practiceHistory: [practice],
            jobApplications: [job],
            whiteboards: [whiteboard],
            communityPostCount: 2,
        });

        // The quest, the resume and the round come first, each showing real state.
        const questBoard = screen.getByText('Rate limiter design');
        const resumeFile = screen.getByText('Frontend resume');
        const lastRound = screen.getByRole('heading', { name: 'your last round' });

        expect(screen.getByRole('heading', { name: 'continue a quest' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'your resume' })).toBeInTheDocument();
        expect(questBoard).toBeInTheDocument();
        expect(resumeFile).toBeInTheDocument();

        // ...and the aggregate numbers are still on the page, below them.
        const numbers = screen.getByText('Your numbers');
        expect(lastRound.compareDocumentPosition(numbers) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('gives each primary window one obvious action', () => {
        renderOverview({ resumes: [resume], whiteboards: [whiteboard] });

        fireEvent.click(screen.getByRole('button', { name: /Open the board/ }));
        expect(mockNavigate).toHaveBeenCalledWith('/whiteboard/board-1');

        fireEvent.click(screen.getByRole('button', { name: /Open the editor/ }));
        expect(mockNavigate).toHaveBeenCalledWith('/edit/resume-1');

        fireEvent.click(screen.getByRole('button', { name: /Start a round/ }));
        expect(mockNavigate).toHaveBeenCalledWith('/interview-studio');
    });

    it('invites a brand new account into all three, with nothing faked', () => {
        renderOverview();

        expect(screen.getByRole('heading', { name: 'draw it, get told what is wrong' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'rewritten against the job you want' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'talk it through, it talks back' })).toBeInTheDocument();

        // No borrowed numbers and no fake progress on an account with nothing in it.
        expect(screen.getAllByText('Choose a target role').length).toBeGreaterThan(0);
        expect(screen.getByText('No interview sessions yet')).toBeInTheDocument();
    });

    it('shows only real aggregate counts and routes the recommended next step to its existing job action', () => {
        renderOverview({
            resumes: [resume],
            practiceHistory: [practice],
            jobApplications: [job],
            communityPostCount: 2,
        });

        expect(screen.getByText("Today's next step")).toBeInTheDocument();
        expect(screen.getByText('Active jobs')).toBeInTheDocument();
        expect(screen.getByText('Community posts')).toBeInTheDocument();
        expect(screen.getAllByText('Frontend Engineer').length).toBeGreaterThan(0);

        fireEvent.click(screen.getAllByRole('button', { name: 'Run match' })[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/job-tracker?job=job-1');
    });
});
