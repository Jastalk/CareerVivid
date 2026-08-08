/**
 * Hand-drawn stick figure primitives for the CCA-F term animations.
 *
 * These exist so the Remotion clips sit inside the same film as the Gemini
 * backplates instead of looking like a different production. The house style is
 * copied deliberately: thick ink strokes, round caps, and a two-step "boiling
 * line" wobble — the same 0.66s step animation the main renderer applies to the
 * generated art.
 *
 * Everything is plain SVG. No image model can be trusted with a labelled
 * diagram (ours are prompted with "no text, no letters, no numbers" precisely
 * because they get type wrong), and these clips exist to label things.
 */

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const INK = '#111111';
export const PAPER = '#ffffff';
export const AMBER = '#f5871f';
export const TEAL = '#1d9e75';
export const RED = '#e5645f';
export const BLUE = '#38bdf8';

/**
 * The boiling line. Every hand-drawn frame of a cartoon is redrawn slightly
 * differently, and that tiny jitter is most of why it reads as drawn rather
 * than rendered. Two positions, swapped a few times a second — matching the
 * `steps(2)` wobble on the main film's backplates.
 */
export const useWobble = (seed = 0) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const step = Math.floor(frame / Math.max(1, Math.round(fps / 3))) + seed;
    const on = step % 2 === 0;
    return { dx: on ? 0 : 1.4, dy: on ? 0 : -1, rot: on ? 0.15 : -0.15 };
};

export const Wobble: React.FC<{ seed?: number; children: React.ReactNode }> = ({ seed = 0, children }) => {
    const w = useWobble(seed);
    return <g transform={`translate(${w.dx} ${w.dy}) rotate(${w.rot})`}>{children}</g>;
};

const stroke = { stroke: INK, strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

/**
 * A stick figure. `arm` swings both arms; `reach` extends the right arm toward
 * something, which is the pose the tool beat needs.
 */
export const Figure: React.FC<{
    x: number; y: number; scale?: number; seed?: number;
    arm?: number; reach?: boolean; face?: 'neutral' | 'happy' | 'worried';
}> = ({ x, y, scale = 1, seed = 0, arm = 0, reach = false, face = 'neutral' }) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <Wobble seed={seed}>
            <circle cx={0} cy={-58} r={22} {...stroke} fill={PAPER} />
            {face === 'happy' ? (
                <path d="M -9 -54 Q 0 -44 9 -54" {...stroke} strokeWidth={3} />
            ) : face === 'worried' ? (
                <path d="M -9 -48 Q 0 -56 9 -48" {...stroke} strokeWidth={3} />
            ) : (
                <line x1={-8} y1={-50} x2={8} y2={-50} {...stroke} strokeWidth={3} />
            )}
            <circle cx={-8} cy={-63} r={2.6} fill={INK} />
            <circle cx={8} cy={-63} r={2.6} fill={INK} />
            <line x1={0} y1={-36} x2={0} y2={12} {...stroke} />
            <line x1={0} y1={-24} x2={-22} y2={-4 + arm} {...stroke} />
            <line
                x1={0} y1={-24}
                x2={reach ? 34 : 22} y2={reach ? -26 : -4 - arm}
                {...stroke}
            />
            <line x1={0} y1={12} x2={-16} y2={48} {...stroke} />
            <line x1={0} y1={12} x2={16} y2={48} {...stroke} />
        </Wobble>
    </g>
);

/** A sheet of paper — the envelope body, a document, a note. */
export const Card: React.FC<{
    x: number; y: number; w: number; h: number; fill?: string; seed?: number; children?: React.ReactNode;
}> = ({ x, y, w, h, fill = PAPER, seed = 1, children }) => (
    <g transform={`translate(${x} ${y})`}>
        <Wobble seed={seed}>
            <rect x={0} y={0} width={w} height={h} rx={6} fill={fill} {...stroke} />
            {children}
        </Wobble>
    </g>
);

/** A label in the film's own typeface. Real text, rendered exactly. */
export const Label: React.FC<{
    x: number; y: number; text: string; size?: number; colour?: string; mono?: boolean; anchor?: 'start' | 'middle' | 'end';
}> = ({ x, y, text, size = 30, colour = INK, mono = false, anchor = 'middle' }) => (
    <text
        x={x} y={y} fontSize={size} fill={colour} textAnchor={anchor}
        fontWeight={800}
        fontFamily={mono
            ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
            : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}
    >
        {text}
    </text>
);

/** An arrow. `progress` 0→1 draws it, so motion reads as the arrow travelling. */
export const Arrow: React.FC<{
    x1: number; y1: number; x2: number; y2: number; progress?: number; colour?: string; seed?: number;
}> = ({ x1, y1, x2, y2, progress = 1, colour = INK, seed = 2 }) => {
    const tx = x1 + (x2 - x1) * progress;
    const ty = y1 + (y2 - y1) * progress;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 16;
    return (
        <Wobble seed={seed}>
            <line x1={x1} y1={y1} x2={tx} y2={ty} stroke={colour} strokeWidth={5} strokeLinecap="round" />
            {progress > 0.08 && (
                <polygon
                    points={[
                        `${tx},${ty}`,
                        `${tx - head * Math.cos(angle - 0.42)},${ty - head * Math.sin(angle - 0.42)}`,
                        `${tx - head * Math.cos(angle + 0.42)},${ty - head * Math.sin(angle + 0.42)}`,
                    ].join(' ')}
                    fill={colour}
                />
            )}
        </Wobble>
    );
};

/** Full-frame paper background, so clips cut cleanly against the backplates. */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ background: PAPER }}>
        {children}
    </svg>
);
