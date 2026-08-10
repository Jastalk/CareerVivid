export interface SystemDesignNode {
    id: string;
    label: string;
    shape: string;
}

export interface SystemDesignConnection {
    id: string;
    from: string;
    to: string;
    label?: string;
}

export interface SystemDesignSceneGraph {
    nodes: SystemDesignNode[];
    connections: SystemDesignConnection[];
}

interface SceneElement {
    id: string;
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    text?: string;
    containerId?: string | null;
    groupIds?: string[];
    startBinding?: { elementId?: string | null } | null;
    endBinding?: { elementId?: string | null } | null;
    points?: Array<[number, number]>;
    label?: { text?: string } | string;
    isDeleted?: boolean;
}

const NODE_TYPES = new Set(['rectangle', 'ellipse', 'diamond', 'frame']);

const clean = (value: unknown, max = 160): string =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const center = (element: SceneElement): [number, number] => [
    (element.x ?? 0) + (element.width ?? 0) / 2,
    (element.y ?? 0) + (element.height ?? 0) / 2,
];

const pointToBoundsDistance = (x: number, y: number, element: SceneElement): number => {
    const left = element.x ?? 0;
    const top = element.y ?? 0;
    const right = left + (element.width ?? 0);
    const bottom = top + (element.height ?? 0);
    const dx = Math.max(left - x, 0, x - right);
    const dy = Math.max(top - y, 0, y - bottom);
    return Math.hypot(dx, dy);
};

const labelForShape = (shape: SceneElement, texts: SceneElement[]): string => {
    const bound = texts.find((text) => text.containerId === shape.id);
    if (bound) return clean(bound.text);

    const shapeGroups = new Set(shape.groupIds ?? []);
    const grouped = texts.find((text) => (text.groupIds ?? []).some((id) => shapeGroups.has(id)));
    if (grouped) return clean(grouped.text);

    const [cx, cy] = center(shape);
    const contained = texts
        .filter((text) => pointToBoundsDistance(...center(text), shape) === 0)
        .sort((a, b) => {
            const [ax, ay] = center(a);
            const [bx, by] = center(b);
            return Math.hypot(ax - cx, ay - cy) - Math.hypot(bx - cx, by - cy);
        })[0];
    return clean(contained?.text);
};

const connectionEndpoint = (
    arrow: SceneElement,
    end: 'start' | 'end',
    shapes: SceneElement[],
): string | undefined => {
    const bindingId = (end === 'start' ? arrow.startBinding : arrow.endBinding)?.elementId;
    if (bindingId && shapes.some((shape) => shape.id === bindingId)) return bindingId;

    const points = arrow.points ?? [];
    const relative = end === 'start' ? points[0] : points[points.length - 1];
    if (!relative) return undefined;
    const x = (arrow.x ?? 0) + relative[0];
    const y = (arrow.y ?? 0) + relative[1];
    const nearest = shapes
        .map((shape) => ({ id: shape.id, distance: pointToBoundsDistance(x, y, shape) }))
        .sort((a, b) => a.distance - b.distance)[0];
    return nearest && nearest.distance <= 120 ? nearest.id : undefined;
};

const labelForArrow = (arrow: SceneElement, texts: SceneElement[]): string => {
    const direct = typeof arrow.label === 'string' ? arrow.label : arrow.label?.text;
    if (clean(direct)) return clean(direct);
    const bound = texts.find((text) => text.containerId === arrow.id);
    if (bound) return clean(bound.text);
    const groups = new Set(arrow.groupIds ?? []);
    return clean(texts.find((text) => (text.groupIds ?? []).some((id) => groups.has(id)))?.text);
};

/** Convert Excalidraw's visual elements into the compact graph the agent reasons over. */
export function extractSystemDesignSceneGraph(rawElements: readonly unknown[]): SystemDesignSceneGraph {
    const elements = (rawElements as SceneElement[]).filter((element) => element && !element.isDeleted && element.id);
    const shapes = elements.filter((element) => NODE_TYPES.has(element.type));
    const texts = elements.filter((element) => element.type === 'text' && clean(element.text));
    const arrows = elements.filter((element) => element.type === 'arrow');

    const nodes = shapes.map((shape) => ({
        id: shape.id,
        label: labelForShape(shape, texts) || `${shape.type} component`,
        shape: shape.type,
    }));
    const labelById = new Map(nodes.map((node) => [node.id, node.label]));

    const connections = arrows.flatMap((arrow): SystemDesignConnection[] => {
        const fromId = connectionEndpoint(arrow, 'start', shapes);
        const toId = connectionEndpoint(arrow, 'end', shapes);
        if (!fromId || !toId || fromId === toId) return [];
        const label = labelForArrow(arrow, texts);
        return [{
            id: arrow.id,
            from: labelById.get(fromId) ?? fromId,
            to: labelById.get(toId) ?? toId,
            ...(label ? { label } : {}),
        }];
    });

    return { nodes: nodes.slice(0, 60), connections: connections.slice(0, 100) };
}
