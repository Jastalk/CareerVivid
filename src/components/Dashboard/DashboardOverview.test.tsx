import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import type { JobApplicationData, PracticeHistoryEntry, ResumeData } from '../../types';
import type { PortfolioData } from '../../features/portfolio/types/portfolio';
import DashboardOverview from './DashboardOverview';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('../../utils/navigation', () => ({ navigate: mockNavigate }));

const resume = {
    id: 'resume-1',
    title: 'Frontend resume',
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

describe('DashboardOverview', () => {
    it('shows only real aggregate counts and routes the recommended next step to its existing job action', () => {
        render(
            <DashboardOverview
                resumes={[resume]}
                portfolios={[] as PortfolioData[]}
                practiceHistory={[practice]}
                jobApplications={[job]}
                communityPostCount={2}
                onInterviewSelect={vi.fn()}
            />,
        );

        expect(screen.getByText("Today's next step")).toBeInTheDocument();
        expect(screen.getByText('Active jobs')).toBeInTheDocument();
        expect(screen.getByText('Community posts')).toBeInTheDocument();
        expect(screen.getAllByText('Frontend Engineer').length).toBeGreaterThan(0);

        fireEvent.click(screen.getAllByRole('button', { name: 'Run match' })[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/job-tracker?job=job-1');
    });
});
