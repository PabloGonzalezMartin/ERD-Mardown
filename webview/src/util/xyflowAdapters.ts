import { type Node, type Edge } from '@xyflow/react';
import { DiagramModel, type Table, type DictionaryEntry } from '@shared/DiagramModel';

// ReactFlow v12: generic param must be the full Node/Edge type

const MIN_TABLE_W = 180;
const MAX_TABLE_W = 480;

// Singleton canvas context for text measurement (browser only)
let _ctx: CanvasRenderingContext2D | null = null;
function measureText(text: string, font: string): number {
  if (!_ctx) {
    const canvas = document.createElement('canvas');
    _ctx = canvas.getContext('2d');
    if (!_ctx) return text.length * 8; // fallback if canvas unavailable
  }
  _ctx.font = font;
  return _ctx.measureText(text).width;
}

export function computeTableWidth(table: Table, dict: DictionaryEntry[]): number {
  const HEADER_FONT    = 'bold 16px sans-serif';
  const SUBTITLE_FONT  = '400 10px sans-serif'; // physical name subtitle in logical mode
  const COL_FONT       = '12px sans-serif';
  const TYPE_FONT      = '11px sans-serif';

  // Header chrome: left pad(10) + right pad(8) + gap(4)
  // + status badge (~22px) if not implemented + comment button (~28px) if has comment
  const statusBadgeW = (table.status && table.status !== 'implemented') ? 22 : 0;
  const commentBtnW  = table.comment ? 28 : 0;
  const HEADER_CHROME = 22 + statusBadgeW + commentBtnW;

  // Column chrome: left pad(10) + key icon(16) + gap after icon(5) + right pad(8) + gap before type(5)
  const COL_CHROME = 44;

  // Header: always fits fully — no upper cap applied here
  const headerW = Math.max(
    measureText(table.logicalName,  HEADER_FONT),
    measureText(table.physicalName, HEADER_FONT),
    measureText(table.physicalName, SUBTITLE_FONT),
  ) + HEADER_CHROME;

  // Column rows: name + type badge + optional note icon — capped at MAX_TABLE_W
  let colMaxW = MIN_TABLE_W;
  for (const col of table.columns) {
    const nameW = Math.max(
      measureText(col.logicalName,  COL_FONT),
      measureText(col.physicalName, COL_FONT),
    );
    const entry = dict.find((d) => d.id === col.dictionaryId);
    const typeText = entry ? (entry.length ? `${entry.name}(${entry.length})` : entry.name) : '';
    const typeW    = typeText ? measureText(typeText, TYPE_FONT) : 0;
    const noteW    = col.designNote ? 20 : 0;
    colMaxW = Math.max(colMaxW, nameW + typeW + noteW + COL_CHROME);
  }

  // Header is never truncated; columns are capped at MAX_TABLE_W
  return Math.round(Math.max(headerW, Math.min(MAX_TABLE_W, colMaxW)));
}
export type TableNodeType = Node<{ tableId: string }, 'tableNode'>;
export type RelationEdgeType = Edge<{ relationId: string }, 'relationEdge'>;
export type RegionNodeType = Node<{ regionId: string }, 'regionNode'>;
export type CommentNodeType = Node<{ commentId: string }, 'commentNode'>;

export function modelToNodes(model: DiagramModel): (TableNodeType | RegionNodeType | CommentNodeType)[] {
  const regionNodes: RegionNodeType[] = (model.layout.regions ?? []).map((r) => ({
    id: r.id,
    type: 'regionNode' as const,
    position: { x: r.x, y: r.y },
    style: { width: r.width, height: r.height },
    className: 'region-node-wrapper',
    zIndex: 0,
    data: { regionId: r.id },
  }));

  const tableNodes: TableNodeType[] = model.tables.map((table) => {
    const layoutEntry = model.layout.tables.find((l) => l.tableId === table.id);
    return {
      id: table.id,
      type: 'tableNode' as const,
      position: { x: layoutEntry?.x ?? 100, y: layoutEntry?.y ?? 100 },
      style: { width: computeTableWidth(table, model.dictionary) },
      zIndex: 1,
      data: { tableId: table.id },
    };
  });

  const commentNodes: CommentNodeType[] = (model.layout.comments ?? []).map((c) => ({
    id: c.id,
    type: 'commentNode' as const,
    position: { x: c.x, y: c.y },
    zIndex: 2,
    data: { commentId: c.id },
  }));

  // Regions first (behind), then tables, then comments (on top)
  return [...regionNodes, ...tableNodes, ...commentNodes];
}

export function modelToEdges(
  model: DiagramModel,
  headersOnly = false,
  positionOverrides: Map<string, { x: number; width: number }> = new Map(),
): RelationEdgeType[] {
  // Build O(1) lookup map for table layout, with optional position overrides
  // (used to immediately re-route edges when a node is dragged)
  const layoutMap = new Map(model.layout.tables.map((l) => [l.tableId, l]));
  for (const [id, override] of positionOverrides) {
    const existing = layoutMap.get(id);
    if (existing) layoutMap.set(id, { ...existing, ...override });
  }

  return model.relations.map((rel) => {
    const fromL = layoutMap.get(rel.fromTableId);
    const toL   = layoutMap.get(rel.toTableId);

    const fromX     = (fromL?.x ?? 0) + (fromL?.width ?? 240) / 2; // center X fallback
    const toX       = (toL?.x   ?? 0) + (toL?.width   ?? 240) / 2;
    const fromRight = (fromL?.x ?? 0) + (fromL?.width ?? 240);
    const fromLeft  =  fromL?.x ?? 0;
    const toRight   = (toL?.x   ?? 0) + (toL?.width   ?? 240);
    const toLeft    =  toL?.x   ?? 0;

    // Use bounding-box edges for clean routing:
    // if tables don't overlap horizontally, force the nearest sides
    let srcLeft: boolean;
    if (fromRight <= toLeft) {
      srcLeft = false; // source entirely left of target → exit right, enter left
    } else if (fromLeft >= toRight) {
      srcLeft = true;  // source entirely right of target → exit left, enter right
    } else {
      srcLeft = fromX > toX; // overlap → fall back to center comparison
    }

    // Handle IDs encode the side so ReactFlow picks the exact handle
    const srcSide = srcLeft ? 'left' : 'right';
    const tgtSide = srcLeft ? 'right' : 'left';
    const srcHandle = headersOnly
      ? `center-${srcSide}`
      : rel.fromColumnId ? `col-${rel.fromColumnId}-rel-${rel.id}-${srcSide}` : `center-${srcSide}`;
    const tgtHandle = headersOnly
      ? `center-${tgtSide}`
      : rel.toColumnId ? `col-${rel.toColumnId}-rel-${rel.id}-${tgtSide}` : `center-${tgtSide}`;

    return {
      id: rel.id,
      source:       rel.fromTableId,
      target:       rel.toTableId,
      sourceHandle: srcHandle,
      targetHandle: tgtHandle,
      // sourcePosition / targetPosition tell ReactFlow which side to draw from
      sourcePosition: srcLeft ? 'left'  : 'right',
      targetPosition: srcLeft ? 'right' : 'left',
      type: 'relationEdge' as const,
      data: { relationId: rel.id },
    } as RelationEdgeType;
  });
}
