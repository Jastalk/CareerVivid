import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentMessageText } from './AgentMessageText';

describe('AgentMessageText', () => {
    it('renders solution concepts as restrained semantic highlights', () => {
        render(
            <AgentMessageText
                text="Add GPU inference worker nodes and response streaming."
                technicalContext="system_design"
            />,
        );

        const gpu = screen.getByText('GPU inference worker nodes');
        expect(gpu.tagName).toBe('MARK');
        expect(gpu).toHaveAttribute('title', 'Key solution concept');
        expect(gpu).toHaveClass('bg-[#f3f2ff]', 'text-[#4a4392]');
        expect(screen.getByText('response streaming').tagName).toBe('MARK');
    });

    it('leaves normal Agent replies visually unchanged outside technical workspaces', () => {
        render(
            <AgentMessageText
                text="Let's update your resume and job tracker."
                technicalContext={null}
            />,
        );

        expect(screen.getByText("Let's update your resume and job tracker.")).not.toHaveAttribute(
            'title',
            'Key solution concept',
        );
    });
});
