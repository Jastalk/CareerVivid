/**
 * What the user is currently working on, for the agent to read on request.
 *
 * The agent was coaching blind: in a system-design round it would ask "what
 * goes after the load balancer?" while the user already had one drawn. It could
 * see the conversation and nothing else.
 *
 * A module-level store rather than React context, because the publisher
 * (CodingBattle / SystemDesignBattle, rendered as an overlay deep in the quest
 * page) and the reader (the agent panel, mounted above the router) are on
 * unrelated branches of the tree. Threading context through everything between
 * them would touch a dozen components that have no stake in this.
 *
 * The snapshot is attached only while a work surface is open. It is deliberately
 * compact so text and Live tools can always resolve natural phrases such as
 * "what is my current question?" without asking the user to repeat context.
 */

export interface WorkspaceSnapshot {
    kind: 'system_design' | 'coding';
    company: string;
    stageTitle: string;
    problem: string;
    questionId?: string;
    requirements?: string[];
    /** Component labels on the canvas, for system design. */
    components?: string[];
    nodes?: Array<{ id: string; label: string; shape: string }>;
    connections?: Array<{ id: string; from: string; to: string; label?: string }>;
    /** Current buffer, for coding. Capped — the agent needs the shape, not a file dump. */
    code?: string;
    language?: string;
    /** Latest run, when the user has executed their tests. */
    testSummary?: { passed: number; total: number };
    updatedAt: number;
}

let current: WorkspaceSnapshot | null = null;

/** Called by a battle as its state changes. Cheap: a plain assignment. */
export function publishWorkspace(snapshot: Omit<WorkspaceSnapshot, 'updatedAt'>): void {
    current = { ...snapshot, updatedAt: Date.now() };
}

/** Called when a battle closes, so the agent stops referring to a finished round. */
export function clearWorkspace(): void {
    current = null;
}

/**
 * The current snapshot, trimmed for a prompt.
 *
 * Returns null when nothing is open or the data is stale — a snapshot from a
 * round the user closed ten minutes ago is worse than none, because the agent
 * would confidently discuss a diagram that is no longer on screen.
 */
export function readWorkspace(maxAgeMs = 5 * 60_000): WorkspaceSnapshot | null {
    if (!current) return null;
    if (Date.now() - current.updatedAt > maxAgeMs) return null;
    return {
        ...current,
        code: current.code?.slice(0, 6_000),
        components: current.components?.slice(0, 40),
        requirements: current.requirements?.slice(0, 12).map((item) => item.slice(0, 500)),
        nodes: current.nodes?.slice(0, 60),
        connections: current.connections?.slice(0, 100),
        problem: current.problem.slice(0, 1_000),
    };
}
