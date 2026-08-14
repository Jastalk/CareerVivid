import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LiveWhiteboard, { DesignSpec } from './LiveWhiteboard';

const SPEC: DesignSpec = {
    nodes: [
        { id: 'client', label: 'client', x: 20, y: 30 },
        { id: 'api', label: 'api', x: 140, y: 30 },
        { id: 'store', label: 'store', x: 140, y: 130 },
    ],
    edges: [
        { from: 'client', to: 'api', label: 'read' },
        { from: 'api', to: 'store' },
    ],
};

describe('LiveWhiteboard', () => {
    it('gives every board its own arrowhead, so none of them borrow a hidden one', () => {
        // The hero renders a board inside a `display:none` desktop-only column
        // on small screens. A shared marker id resolves to that first, unpainted
        // copy, and every arrow on the page loses its head.
        const { container } = render(
            <>
                <LiveWhiteboard spec={SPEC} playing replayKey="a" />
                <LiveWhiteboard spec={SPEC} playing replayKey="b" />
            </>,
        );

        const markerIds = [...container.querySelectorAll('marker')].map((marker) => marker.id);
        expect(markerIds).toHaveLength(2);
        expect(new Set(markerIds).size).toBe(2);

        // Each board must point at the marker it declared, not at its sibling's.
        const boards = [...container.querySelectorAll('svg')];
        boards.forEach((board, index) => {
            const line = board.querySelector('line');
            expect(line?.getAttribute('marker-end')).toBe(`url(#${markerIds[index]})`);
        });
    });

    it('keeps an arrow in the gap between two boxes', () => {
        const { container } = render(<LiveWhiteboard spec={SPEC} playing replayKey="a" />);
        const [horizontal] = [...container.querySelectorAll('line')];

        // client ends at x=94, api starts at x=140. An arrow that starts before
        // 94 or ends after 140 is drawn underneath a box instead of between them.
        const x1 = Number(horizontal.getAttribute('x1'));
        const x2 = Number(horizontal.getAttribute('x2'));
        expect(x1).toBeGreaterThan(94);
        expect(x2).toBeLessThan(140);
        expect(x2).toBeGreaterThan(x1);
    });

    it('holds the whole drawing back until the board is on screen', () => {
        const { container } = render(<LiveWhiteboard spec={SPEC} playing={false} replayKey="a" />);
        const drawn = [...container.querySelectorAll('rect, line')];

        expect(drawn.length).toBeGreaterThan(0);
        drawn.forEach((element) => {
            expect(element).not.toHaveClass('cvl-stroke');
            expect((element as SVGElement).style.opacity).toBe('0');
        });
    });
});
