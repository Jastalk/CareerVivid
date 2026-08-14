import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type {
  SystemDesignDiagramNode,
  SystemDesignDiagramPlan,
  SystemDesignDiagramStyle,
} from './systemDesignDiagram';

const LAYERS: SystemDesignDiagramNode['layer'][] = ['client', 'edge', 'service', 'event', 'data'];
const NODE_WIDTH = 220;
const NODE_HEIGHT = 84;
const COLUMN_GAP = 110;
const ROW_GAP = 100;

const LAYER_COLORS: Record<SystemDesignDiagramNode['layer'], { fill: string; stroke: string }> = {
  client: { fill: '#eff6ff', stroke: '#2563eb' },
  edge: { fill: '#f3f2ff', stroke: '#4a4392' },
  service: { fill: '#eef9f2', stroke: '#15803d' },
  event: { fill: '#fff7e8', stroke: '#d97706' },
  data: { fill: '#fffbeb', stroke: '#b45309' },
};

const resolveStyle = (plan: SystemDesignDiagramPlan, style: SystemDesignDiagramStyle) => {
  if (style !== 'auto') return style;
  if (plan.recommendedStyle === 'sequence') return 'sequence';
  return new Set(plan.nodes.map((node) => node.layer)).size >= 3 ? 'layered' : plan.recommendedStyle ?? 'flow';
};

type PositionedNode = SystemDesignDiagramNode & { x: number; y: number };

const positionNodes = (plan: SystemDesignDiagramPlan, style: Exclude<SystemDesignDiagramStyle, 'auto'>): PositionedNode[] => {
  if (style === 'layered') {
    const layerIndex = new Map(LAYERS.map((layer, index) => [layer, index]));
    const layerCounts = new Map<SystemDesignDiagramNode['layer'], number>();
    return plan.nodes.map((node) => {
      const indexInLayer = layerCounts.get(node.layer) ?? 0;
      layerCounts.set(node.layer, indexInLayer + 1);
      return {
        ...node,
        x: 40 + indexInLayer * (NODE_WIDTH + COLUMN_GAP),
        y: 50 + (layerIndex.get(node.layer) ?? 2) * (NODE_HEIGHT + ROW_GAP),
      };
    });
  }

  if (style === 'sequence') {
    return plan.nodes.slice(0, 5).map((node, index) => ({
      ...node,
      x: 60 + index * (NODE_WIDTH + 70),
      y: 40,
    }));
  }

  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(plan.nodes.length))));
  return plan.nodes.map((node, index) => ({
    ...node,
    x: 40 + (index % columns) * (NODE_WIDTH + COLUMN_GAP),
    y: 40 + Math.floor(index / columns) * (NODE_HEIGHT + ROW_GAP),
  }));
};

const wrapLabel = (label: string, maxLineLength = 18) => {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxLineLength) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
};

const labelPosition = (node: PositionedNode, text: string) => {
  const lines = text.split('\n');
  const estimatedWidth = Math.min(NODE_WIDTH - 28, Math.max(48, Math.max(...lines.map((line) => line.length)) * 8.25));
  const estimatedHeight = lines.length * 19;
  return {
    x: node.x + (NODE_WIDTH - estimatedWidth) / 2,
    y: node.y + (NODE_HEIGHT - estimatedHeight) / 2,
  };
};

/** Builds clean, editable Excalidraw elements from a safe architecture plan. */
export const buildSystemDesignDiagramElements = (
  plan: SystemDesignDiagramPlan,
  requestedStyle: SystemDesignDiagramStyle,
) => {
  const style = resolveStyle(plan, requestedStyle);
  const positionedNodes = positionNodes(plan, style);
  const positions = new Map(positionedNodes.map((node) => [node.id, node]));

  const nodeElements = positionedNodes.flatMap((node) => {
    const colors = LAYER_COLORS[node.layer];
    const groupId = `system-component-${node.id}`;
    const label = wrapLabel(node.label);
    const position = labelPosition(node, label);
    return [
      {
        type: 'rectangle' as const,
        id: `system-node-${node.id}`,
        x: node.x,
        y: node.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        fillStyle: 'solid' as const,
        backgroundColor: colors.fill,
        strokeColor: colors.stroke,
        strokeWidth: 2,
        roughness: 0,
        roundness: { type: 3 as const },
        groupIds: [groupId],
      },
      {
        type: 'text' as const,
        id: `system-label-${node.id}`,
        x: position.x,
        y: position.y,
        text: label,
        fontSize: 15,
        fontFamily: 2,
        textAlign: 'center' as const,
        verticalAlign: 'middle' as const,
        strokeColor: '#1f2937',
        groupIds: [groupId],
      },
    ];
  });

  const edgeElements = plan.connections
    .map((connection, index) => {
      const from = positions.get(connection.from);
      const to = positions.get(connection.to);
      if (!from || !to) return null;
      const startX = from.x + NODE_WIDTH / 2;
      const startY = from.y + NODE_HEIGHT / 2;
      const endX = to.x + NODE_WIDTH / 2;
      const endY = to.y + NODE_HEIGHT / 2;
      return {
        type: 'arrow' as const,
        id: `system-edge-${index + 1}`,
        x: startX,
        y: startY,
        points: [[0, 0], [endX - startX, endY - startY]],
        strokeColor: '#64748b',
        strokeWidth: 2,
        roughness: 0,
        endArrowhead: 'arrow' as const,
        label: {
          text: connection.label,
          fontSize: 12,
          textAlign: 'center' as const,
          verticalAlign: 'middle' as const,
        },
      };
    })
    .filter(Boolean);

  return convertToExcalidrawElements([...nodeElements, ...edgeElements] as any, { regenerateIds: false });
};
