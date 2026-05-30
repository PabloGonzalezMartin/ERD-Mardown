import dagre from 'dagre';
import type { DiagramModel } from '@shared/DiagramModel';

export type LayoutDirection = 'vertical' | 'horizontal' | 'auto';

export interface TablePosition {
  tableId: string;
  x: number;
  y: number;
  width: number;
}

const NODE_SEP = 60;   // gap between sibling nodes
const RANK_SEP = 80;   // gap between ranks (layers)
const ROW_HEIGHT = 32; // approximate px per column row for height estimation

function estimateHeight(model: DiagramModel, tableId: string): number {
  const table = model.tables.find((t) => t.id === tableId);
  const rows = table ? table.columns.length : 0;
  return 48 + rows * ROW_HEIGHT; // header + rows
}

function runDagre(model: DiagramModel, rankdir: 'TB' | 'LR'): { positions: TablePosition[]; bbox: { w: number; h: number } } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const table of model.tables) {
    const existingLayout = model.layout.tables.find((l) => l.tableId === table.id);
    const width  = existingLayout?.width ?? 240;
    const height = estimateHeight(model, table.id);
    g.setNode(table.id, { width, height, _origWidth: width });
  }
  for (const rel of model.relations) {
    if (g.hasNode(rel.fromTableId) && g.hasNode(rel.toTableId)) {
      g.setEdge(rel.fromTableId, rel.toTableId);
    }
  }
  dagre.layout(g);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const positions = model.tables.map((table) => {
    const node = g.node(table.id);
    const origWidth = (node as any)._origWidth as number;
    const x = Math.round(node.x - origWidth / 2);
    const y = Math.round(node.y - node.height / 2);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + origWidth); maxY = Math.max(maxY, y + node.height);
    return { tableId: table.id, x, y, width: origWidth };
  });
  return { positions, bbox: { w: maxX - minX, h: maxY - minY } };
}

export function computeAutoLayout(
  model: DiagramModel,
  direction: LayoutDirection,
): TablePosition[] {
  if (direction === 'vertical')   return runDagre(model, 'TB').positions;
  if (direction === 'horizontal') return runDagre(model, 'LR').positions;

  // Auto: pick the direction that produces the most balanced layout
  // by minimising the difference between width and height ranks.
  // Count max depth (ranks) vs max breadth to decide orientation.
  const tb = runDagre(model, 'TB');
  const lr = runDagre(model, 'LR');
  // Prefer the layout whose aspect ratio is closer to the viewport (16:9 ≈ 1.78)
  const target = 16 / 9;
  const tbRatio = tb.bbox.w / Math.max(tb.bbox.h, 1);
  const lrRatio = lr.bbox.w / Math.max(lr.bbox.h, 1);
  // If both are on the same side of target, pick the one that differs from LR
  // (i.e. TB) so auto is always visually distinct from the manual horizontal option
  if (Math.sign(tbRatio - target) === Math.sign(lrRatio - target)) {
    return tb.positions; // default to vertical when both are similar
  }
  return Math.abs(tbRatio - target) < Math.abs(lrRatio - target)
    ? tb.positions
    : lr.positions;
}
