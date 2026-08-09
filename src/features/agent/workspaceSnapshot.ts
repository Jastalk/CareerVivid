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
/** Which publisher owns the slot. Last writer wins; only the owner may clear. */
let owner: string | null = null;

/**
 * Claim the slot and publish.
 *
 * Ownership matters because rounds overlap during a switch: React mounts the
 * new one before unmounting the old, and the whiteboard republishes on a 3s
 * interval. Without an owner the departing round kept overwriting the arriving
 * one, and the agent went on coaching the round the user had just left.
 *
 * `ownerId` identifies the publisher, not the round — two whiteboards on
 * different questions are different owners.
 */
export function publishWorkspace(
    snapshot: Omit<WorkspaceSnapshot, 'updatedAt'>,
    ownerId?: string,
): void {
    owner = ownerId ?? `${snapshot.kind}:${snapshot.problem.slice(0, 40)}`;
    current = { ...snapshot, updatedAt: Date.now() };
}

/**
 * Release the slot, but only if you still hold it.
 *
 * An unmounting round must not wipe the snapshot its replacement already
 * published — that would leave the agent blind on a round that is open.
 */
export function clearWorkspace(ownerId?: string): void {
    if (ownerId && owner !== ownerId) return;
    current = null;
    owner = null;
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
