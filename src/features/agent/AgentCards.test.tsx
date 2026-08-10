import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AgentCards } from './AgentCards';

describe('Agent technical-question cards', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/agent');
        localStorage.clear();
    });

    it('opens the route attached to the exact question', () => {
        render(<AgentCards cards={[{
            kind: 'interview_questions',
            company: 'Google',
            route: '/quest/google',
            questions: [{
                questionId: 'course-schedule',
                stage: 'coding',
                stageLabel: 'Coding',
                question: 'Course Schedule: Return whether the dependency graph has no cycle.',
                route: '/quest/google?stage=coding&codingChallenge=course-schedule',
            }],
        }]} />);

        fireEvent.click(screen.getByRole('button', { name: /practice this exact question/i }));

        expect(window.location.pathname).toBe('/quest/google');
        expect(window.location.search).toBe('?stage=coding&codingChallenge=course-schedule');
    });
});

describe('Agent interview-report card', () => {
    const report = {
        kind: 'interview_report',
        role: 'Forward Deployed Engineer',
        company: 'OpenAI',
        scores: { overall: 83, communication: 100, problemSolving: 75, roleAlignment: 58 },
        skills: ['System Design', 'Caching Strategies'],
        attempt: { number: 2, previousOverall: 78 },
    };

    it('shows the score breakdown and the change since the last attempt', () => {
        render(<AgentCards cards={[report]} />);

        expect(screen.getByText('Forward Deployed Engineer')).toBeInTheDocument();
        expect(screen.getByText('83')).toBeInTheDocument();
        expect(screen.getByText('+5')).toBeInTheDocument();
        expect(screen.getByText('Role fit')).toBeInTheDocument();
        expect(screen.getByText('System Design')).toBeInTheDocument();
    });

    /*
     * A single attempt has nothing to compare against. Rendering "+83" there
     * would read as improvement the user never made.
     */
    it('shows no delta on a first attempt', () => {
        render(<AgentCards cards={[{ ...report, attempt: { number: 1 } }]} />);

        expect(screen.getByText('83')).toBeInTheDocument();
        expect(screen.queryByText(/^[+-]\d+$/)).toBeNull();
    });

    it('renders nothing rather than an empty shell when the report has no scores', () => {
        const { container } = render(<AgentCards cards={[{ ...report, scores: {} }]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
