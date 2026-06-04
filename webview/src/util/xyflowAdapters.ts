import { type Node, type Edge } from '@xyflow/react';
import { DiagramModel } from '@shared/DiagramModel';

// ReactFlow v12: generic param must be the full Node/Edge type
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
      style: { width: layoutEntry?.width ?? 240 },
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
