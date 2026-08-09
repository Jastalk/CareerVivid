import type { WorkspaceSnapshot } from './workspaceSnapshot';
import { TECHNICAL_TERM_CLOSE, TECHNICAL_TERM_OPEN } from '../../utils/renderInlineMarkdown';

export type AgentTechnicalContext = 'coding' | 'system_design';

const MAX_HIGHLIGHTS = 5;

const COMMON_TERMS = [
    'API gateway',
    'rate limiter',
    'load balancer',
    'message queue',
    'event-driven architecture',
    'horizontal scaling',
    'autoscaling',
    'consistent hashing',
    'cache invalidation',
    'read replica',
    'write-ahead log',
    'eventual consistency',
    'strong consistency',
    'circuit breaker',
    'backpressure',
    'idempotency',
    'service mesh',
    'object storage',
    'Pub/Sub',
    'WebSocket',
    'PostgreSQL',
    'Bigtable',
    'Redis',
    'Kafka',
    'CDN',
] as const;

const SYSTEM_DESIGN_TERMS = [
    'GPU inference worker nodes',
    'GPU inference workers',
    'GPU inference cluster',
    'GPU inference clusters',
    'inference worker nodes',
    'inference workers',
    'GPU worker nodes',
    'model serving',
    'response streaming',
    'Server-Sent Events',
    'vector database',
    'transformer model inference',
    'model inference',
    'similarity search',
    'context embeddings',
    'long-context memory',
    'long context memory',
    'key generation service',
    'analytics pipeline',
    'stream processing',
    'database sharding',
    'data partitioning',
    'multi-region replication',
    'leader election',
    'distributed lock',
    'content delivery network',
    'retrieval-augmented generation',
    'embedding model',
    'token streaming',
    'SSE',
] as const;

const CODING_TERMS = [
    "Kahn's algorithm",
    'breadth-first search',
    'depth-first search',
    'topological sort',
    'dynamic programming',
    'sliding window',
    'two pointers',
    'binary search',
    'cycle detection',
    'time complexity',
    'space complexity',
    'priority queue',
    'monotonic stack',
    'monotonic queue',
    'prefix sum',
    'adjacency list',
    'union-find',
    'disjoint set',
    'min-heap',
    'max-heap',
    'memoization',
    'backtracking',
    'Dijkstra',
    'Fenwick tree',
    'segment tree',
    'trie',
] as const;

const GENERIC_WORKSPACE_LABELS = new Set([
    'application',
    'application service',
    'cache',
    'client',
    'client application',
    'database',
    'message queue',
    'queue',
    'service',
    'storage',
    'worker',
]);

interface MatchRange {
    start: number;
    end: number;
    priority: number;
}

const isWordCharacter = (value: string | undefined): boolean =>
    Boolean(value && /[\p{L}\p{N}_]/u.test(value));

const overlaps = (left: MatchRange, right: MatchRange): boolean =>
    left.start < right.end && right.start < left.end;

const markdownRanges = (text: string): MatchRange[] => {
    const ranges: MatchRange[] = [];
    const markdown = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/gs;
    let match: RegExpExecArray | null;

    while ((match = markdown.exec(text)) !== null) {
        ranges.push({ start: match.index, end: markdown.lastIndex, priority: 0 });
    }
    return ranges;
};

const meaningfulWorkspaceTerms = (workspace?: WorkspaceSnapshot | null): string[] => {
    if (!workspace) return [];

    const labels = [
        ...(workspace.components ?? []),
        ...(workspace.nodes?.map((node) => node.label) ?? []),
    ];

    return [...new Set(labels.map((label) => label.trim()).filter((label) => {
        if (label.length < 3 || label.length > 80) return false;
        const normalized = label.toLocaleLowerCase('en-US');
        if (GENERIC_WORKSPACE_LABELS.has(normalized)) return false;
        return label.includes(' ') || /[A-Z]{2,}|\d/.test(label);
    }))];
};

const phraseMatches = (text: string, phrase: string, priority: number): MatchRange[] => {
    const matches: MatchRange[] = [];
    const lowerText = text.toLocaleLowerCase('en-US');
    const lowerPhrase = phrase.toLocaleLowerCase('en-US');
    let fromIndex = 0;

    while (fromIndex < text.length) {
        const start = lowerText.indexOf(lowerPhrase, fromIndex);
        if (start === -1) break;
        const end = start + phrase.length;
        if (!isWordCharacter(text[start - 1]) && !isWordCharacter(text[end])) {
            matches.push({ start, end, priority });
        }
        fromIndex = Math.max(end, start + 1);
    }
    return matches;
};

export function getAgentTechnicalContext(
    route: string,
    search: string,
    workspace?: WorkspaceSnapshot | null,
): AgentTechnicalContext | null {
    if (workspace?.kind === 'coding' || workspace?.kind === 'system_design') return workspace.kind;
    if (!route.includes('/quest/')) return null;

    const stage = new URLSearchParams(search).get('stage');
    if (stage === 'coding' || stage === 'system_design') return stage;
    return null;
}

/**
 * Add private render tokens around solution-specific concepts.
 *
 * Text and voice share this path, so restored voice transcripts receive the
 * same treatment as streamed replies without another model call. Explicit
 * model-authored Markdown remains authoritative; the fallback only adds up to
 * five strong technical concepts and never rewrites the stored transcript.
 */
export function emphasizeTechnicalTerms(
    text: string,
    context: AgentTechnicalContext | null,
    workspace?: WorkspaceSnapshot | null,
): string {
    if (!text || !context) return text;

    const protectedRanges = markdownRanges(text);
    const available = MAX_HIGHLIGHTS;

    const contextTerms = context === 'coding' ? CODING_TERMS : SYSTEM_DESIGN_TERMS;
    const sortLongestFirst = (terms: readonly string[]) =>
        [...terms].sort((left, right) => right.length - left.length);
    const phrases = [...new Set([
        ...sortLongestFirst(meaningfulWorkspaceTerms(workspace)),
        ...contextTerms,
        ...COMMON_TERMS,
    ])].filter((phrase) => phrase.length >= 3);

    const candidates: MatchRange[] = [];
    phrases.forEach((phrase, priority) => {
        for (const candidate of phraseMatches(text, phrase, priority)) {
            if (protectedRanges.some((range) => overlaps(candidate, range))) continue;
            if (candidates.some((range) => overlaps(candidate, range))) continue;
            candidates.push(candidate);
            // One visual cue per concept keeps repeated terminology readable.
            break;
        }
    });

    if (context === 'coding') {
        const complexity = /O\([^\n)]{1,32}\)/g;
        let match: RegExpExecArray | null;
        while ((match = complexity.exec(text)) !== null) {
            const candidate = {
                start: match.index,
                end: match.index + match[0].length,
                priority: -1,
            };
            if (!protectedRanges.some((range) => overlaps(candidate, range))
                && !candidates.some((range) => overlaps(candidate, range))) {
                candidates.push(candidate);
            }
        }
    }

    const selected = candidates
        .sort((left, right) => left.priority - right.priority || (right.end - right.start) - (left.end - left.start))
        .slice(0, available)
        .sort((left, right) => left.start - right.start);

    if (selected.length === 0) return text;

    let emphasized = '';
    let cursor = 0;
    for (const range of selected) {
        emphasized += text.slice(cursor, range.start);
        emphasized += `${TECHNICAL_TERM_OPEN}${text.slice(range.start, range.end)}${TECHNICAL_TERM_CLOSE}`;
        cursor = range.end;
    }
    return emphasized + text.slice(cursor);
}
