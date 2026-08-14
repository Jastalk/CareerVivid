import React, { useId } from 'react';

export interface DesignNode {
    id: string;
    label: string;
    /** Grid position in the 320x200 viewBox. */
    x: number;
    y: number;
    w?: number;
}

export interface DesignEdge {
    from: string;
    to: string;
    label?: string;
}

export interface DesignSpec {
    nodes: DesignNode[];
    edges: DesignEdge[];
}

const NODE_H = 30;
const DEFAULT_W = 74;

/** A stable per-node tilt, so the boxes look drawn by a hand and not a printer. */
const tiltFor = (id: string): number => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return ((Math.abs(hash) % 24) - 12) / 10;
};

const centerOf = (node: DesignNode) => ({
    cx: node.x + (node.w ?? DEFAULT_W) / 2,
    cy: node.y + NODE_H / 2,
});

/**
 * Trims an edge back to the box borders so the arrow starts and ends in the gap
 * between two boxes instead of disappearing underneath them.
 */
const edgePoints = (from: DesignNode, to: DesignNode) => {
    const a = centerOf(from);
    const b = centerOf(to);
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;

    const inset = (node: DesignNode) => {
        const halfW = (node.w ?? DEFAULT_W) / 2;
        const halfH = NODE_H / 2;
        // How far along the line the box border sits, in each axis.
        const tx = Math.abs(ux) < 1e-3 ? Infinity : halfW / Math.abs(ux);
        const ty = Math.abs(uy) < 1e-3 ? Infinity : halfH / Math.abs(uy);
        return Math.min(tx, ty) + 5;
    };

    const startAt = inset(from);
    const endAt = inset(to);
    return {
        x1: a.cx + ux * startAt,
        y1: a.cy + uy * startAt,
        x2: b.cx - ux * endAt,
        y2: b.cy - uy * endAt,
    };
};

interface LiveWhiteboardProps {
    spec: DesignSpec;
    /** Held false until the demo is on screen, so nothing draws off-screen. */
    playing: boolean;
    /** Changing this restarts the drawing — one company's design at a time. */
    replayKey: string;
}

/**
 * Draws a system-design diagram the way a candidate would: box, box, arrow,
 * arrow — in order, on a timer, in front of you.
 */
const LiveWhiteboard: React.FC<LiveWhiteboardProps> = ({ spec, playing, replayKey }) => {
    /*
     * Every board on the page needs its own arrowhead id. A shared one resolves
     * to whichever copy comes first in the document — and on small screens that
     * is the `display:none` desktop desk, which renders no marker at all, so
     * every arrow below `lg` lost its head.
     */
    const arrowId = `cvl-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const byId = new Map(spec.nodes.map((node) => [node.id, node]));
    const nodeStep = 300;
    const edgeStart = spec.nodes.length * nodeStep;

    return (
        <svg
            key={replayKey}
            viewBox="0 0 320 200"
            className="block h-full w-full"
            style={{ background: 'var(--cvl-paper)' }}
            role="img"
            aria-label={`System design diagram: ${spec.nodes.map((node) => node.label).join(', ')}`}
        >
            <defs>
                <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="var(--cvl-ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
            </defs>

            {spec.edges.map((edge, index) => {
                const from = byId.get(edge.from);
                const to = byId.get(edge.to);
                if (!from || !to) return null;
                const { x1, y1, x2, y2 } = edgePoints(from, to);
                const delay = edgeStart + index * 230;
                return (
                    <g key={`${edge.from}-${edge.to}`}>
                        <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="var(--cvl-ink)"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            markerEnd={`url(#${arrowId})`}
                            pathLength={1}
                            className={playing ? 'cvl-stroke' : undefined}
                            style={playing
                                ? { '--cvl-draw-delay': `${delay}ms`, '--cvl-draw-dur': '380ms' } as React.CSSProperties
                                : { opacity: 0 }}
                        />
                        {edge.label && (
                            <text
                                x={(x1 + x2) / 2}
                                y={(y1 + y2) / 2 - 4}
                                textAnchor="middle"
                                fontSize="7.5"
                                fill="var(--cvl-faint)"
                                className={playing ? 'cvl-fade' : undefined}
                                style={playing
                                    ? { '--cvl-draw-delay': `${delay + 200}ms` } as React.CSSProperties
                                    : { opacity: 0 }}
                            >
                                {edge.label}
                            </text>
                        )}
                    </g>
                );
            })}

            {spec.nodes.map((node, index) => {
                const width = node.w ?? DEFAULT_W;
                const { cx, cy } = centerOf(node);
                const delay = index * nodeStep;
                return (
                    <g key={node.id} transform={`rotate(${tiltFor(node.id)} ${cx} ${cy})`}>
                        <rect
                            x={node.x}
                            y={node.y}
                            width={width}
                            height={NODE_H}
                            rx="6"
                            fill="var(--cvl-paper)"
                            stroke="var(--cvl-ink)"
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                            pathLength={1}
                            className={playing ? 'cvl-stroke' : undefined}
                            style={playing
                                ? { '--cvl-draw-delay': `${delay}ms`, '--cvl-draw-dur': '620ms' } as React.CSSProperties
                                : { opacity: 0 }}
                        />
                        <text
                            x={cx}
                            y={cy + 3.2}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="600"
                            fill="var(--cvl-ink)"
                            className={playing ? 'cvl-fade' : undefined}
                            style={playing
                                ? { '--cvl-draw-delay': `${delay + 380}ms` } as React.CSSProperties
                                : { opacity: 0 }}
                        >
                            {node.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export default LiveWhiteboard;
