import { describe, expect, it } from 'vitest';
import { sanitizeWorkspace } from './workspace';

describe('sanitizeWorkspace', () => {
    it('keeps the current question and structured graph', () => {
        const workspace = sanitizeWorkspace({
            kind: 'system_design',
            company: 'OpenAI',
            problem: 'Design inference batching',
            requirements: ['Keep latency low'],
            nodes: [{ id: 'gpu', label: 'GPU workers', shape: 'rectangle' }],
            connections: [{ id: 'queue-gpu', from: 'Queue', to: 'GPU workers', label: 'batches' }],
        });

        expect(workspace).toMatchObject({
            company: 'OpenAI',
            problem: 'Design inference batching',
            nodes: [{ id: 'gpu', label: 'GPU workers', shape: 'rectangle' }],
            connections: [{ id: 'queue-gpu', from: 'Queue', to: 'GPU workers', label: 'batches' }],
        });
    });

    it('rejects unknown workspace kinds', () => {
        expect(sanitizeWorkspace({ kind: 'browser' })).toBeNull();
    });
});
