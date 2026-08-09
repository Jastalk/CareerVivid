export interface AgentWorkspace {
    kind: "system_design" | "coding";
    company?: string;
    stageTitle?: string;
    problem?: string;
    questionId?: string;
    requirements?: string[];
    components?: string[];
    nodes?: Array<{ id: string; label: string; shape: string }>;
    connections?: Array<{ id: string; from: string; to: string; label?: string }>;
    code?: string;
    language?: string;
    testSummary?: { passed: number; total: number };
}

const str = (value: unknown, max: number): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Bound and normalize the browser-reported state before it reaches a model. */
export function sanitizeWorkspace(raw: unknown): AgentWorkspace | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, any>;
    if (value.kind !== "system_design" && value.kind !== "coding") return null;

    const nodes = Array.isArray(value.nodes)
        ? value.nodes.slice(0, 60).flatMap((node: any) => {
            const id = str(node?.id, 100);
            const label = str(node?.label, 160);
            if (!id || !label) return [];
            return [{ id, label, shape: str(node?.shape, 40) ?? "component" }];
        })
        : undefined;
    const connections = Array.isArray(value.connections)
        ? value.connections.slice(0, 100).flatMap((edge: any) => {
            const id = str(edge?.id, 100);
            const from = str(edge?.from, 160);
            const to = str(edge?.to, 160);
            if (!id || !from || !to) return [];
            const label = str(edge?.label, 120);
            return [{ id, from, to, ...(label ? { label } : {}) }];
        })
        : undefined;

    return {
        kind: value.kind,
        company: str(value.company, 120),
        stageTitle: str(value.stageTitle, 120),
        problem: str(value.problem, 1_000),
        questionId: str(value.questionId, 120),
        requirements: Array.isArray(value.requirements)
            ? value.requirements.slice(0, 12).map((item: unknown) => String(item).slice(0, 500))
            : undefined,
        components: Array.isArray(value.components)
            ? value.components.slice(0, 40).map((item: unknown) => String(item).slice(0, 160))
            : undefined,
        nodes,
        connections,
        code: str(value.code, 6_000),
        language: str(value.language, 40),
        testSummary: value.testSummary && typeof value.testSummary === "object"
            ? {
                passed: Math.max(0, Number(value.testSummary.passed) || 0),
                total: Math.max(0, Number(value.testSummary.total) || 0),
            }
            : undefined,
    };
}
