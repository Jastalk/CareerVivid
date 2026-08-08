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
 * Read only when the user asks — "look at my diagram", "I'm stuck". Polling it
 * every turn would cost tokens continuously and let the agent interrupt while
 * someone is mid-thought.
 */

export interface WorkspaceSnapshot {
    kind: 'system_design' | 'coding';
    company: string;
    stageTitle: string;
    problem: string;
    /** Component labels on the canvas, for system design. */
    components?: string[];
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
        problem: current.problem.slice(0, 1_000),
    };
}
