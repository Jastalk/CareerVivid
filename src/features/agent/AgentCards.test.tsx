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
