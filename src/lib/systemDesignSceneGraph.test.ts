import { describe, expect, it } from 'vitest';
import { extractSystemDesignSceneGraph } from './systemDesignSceneGraph';

describe('extractSystemDesignSceneGraph', () => {
    it('reads bound labels and bound arrow endpoints', () => {
        const graph = extractSystemDesignSceneGraph([
            { id: 'client', type: 'rectangle', x: 0, y: 0, width: 120, height: 60 },
            { id: 'client-label', type: 'text', text: 'Client app', containerId: 'client' },
            { id: 'api', type: 'rectangle', x: 260, y: 0, width: 120, height: 60 },
            { id: 'api-label', type: 'text', text: 'API gateway', containerId: 'api' },
            {
                id: 'request',
                type: 'arrow',
                startBinding: { elementId: 'client' },
                endBinding: { elementId: 'api' },
                label: { text: 'HTTPS' },
            },
        ]);

        expect(graph.nodes.map((node) => node.label)).toEqual(['Client app', 'API gateway']);
        expect(graph.connections).toEqual([
            { id: 'request', from: 'Client app', to: 'API gateway', label: 'HTTPS' },
        ]);
    });

    it('infers generated-diagram connections from arrow coordinates', () => {
        const graph = extractSystemDesignSceneGraph([
            { id: 'service', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, groupIds: ['g1'] },
            { id: 'service-text', type: 'text', x: 15, y: 15, width: 70, height: 20, text: 'App service', groupIds: ['g1'] },
            { id: 'cache', type: 'rectangle', x: 240, y: 0, width: 100, height: 50, groupIds: ['g2'] },
            { id: 'cache-text', type: 'text', x: 260, y: 15, width: 60, height: 20, text: 'Redis', groupIds: ['g2'] },
            { id: 'cache-arrow', type: 'arrow', x: 100, y: 25, points: [[0, 0], [140, 0]] },
        ]);

        expect(graph.connections[0]).toMatchObject({ from: 'App service', to: 'Redis' });
    });

    it('ignores deleted elements and dangling arrows', () => {
        const graph = extractSystemDesignSceneGraph([
            { id: 'gone', type: 'rectangle', isDeleted: true },
            { id: 'dangling', type: 'arrow', x: 0, y: 0, points: [[0, 0], [20, 20]] },
        ]);

        expect(graph).toEqual({ nodes: [], connections: [] });
    });
});
