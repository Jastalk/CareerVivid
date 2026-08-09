import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentActivityIndicator } from './AgentActivityIndicator';

describe('AgentActivityIndicator', () => {
    it('announces when the agent is thinking', () => {
        render(<AgentActivityIndicator activity="thinking" />);

        expect(screen.getByRole('status')).toHaveAccessibleName(
            'Thinking… Reviewing your request and current workspace.',
        );
        expect(screen.getByText('Thinking…')).toBeInTheDocument();
    });

    it('announces when the agent is working with tools', () => {
        render(<AgentActivityIndicator activity="working" />);

        expect(screen.getByRole('status')).toHaveAccessibleName(
            'Working… Using CareerVivid tools to get your result.',
        );
        expect(screen.getByText('Working…')).toBeInTheDocument();
    });
});
