import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { getTheme } from '../util/theme';
import { modelToNodes, modelToEdges } from '../util/xyflowAdapters';
import { TableNode } from './TableNode';
import { RelationEdge } from './RelationEdge';
import { CardinalityMarkers } from './CardinalityMarkers';
import { RegionNode, resizingRegions } from './RegionNode';
import { CommentNode } from './CommentNode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { tableNode: TableNode, regionNode: RegionNode, commentNode: CommentNode };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: any = { relationEdge: RelationEdge };

// Inner component that has access to the ReactFlow context (useReactFlow)
function ReactFlowControls() {
  const { fitView, zoomIn, zoomOut, setCenter, fitBounds } = useReactFlow();

  useEffect(() => {
    const onFit    = () => fitView({ duration: 300, padding: 0.1 });
    const onIn     = () => zoomIn({ duration: 200 });
    const onOut    = () => zoomOut({ duration: 200 });
    const onCenter = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail;
      setCenter(x, y, { duration: 350, zoom: 1 });
    };
    const onCenterRelation = (e: Event) => {
      const { x, y, width, height } = (e as CustomEvent<{ x: number; y: number; width: number; height: number }>).detail;
      // Fit the bounding box of the two tables into the left ~65% of the viewport
      // (right ~35% is the edit panel). Add generous padding so tables aren't edge-to-edge.
      const SIDEBAR_W   = 44;
      const PANEL_W     = 520;
      const viewportW   = window.innerWidth - SIDEBAR_W - PANEL_W;
      const viewportH   = window.innerHeight - 44; // subtract toolbar
      const padding     = 20;
      const maxZoom     = 0.9;
      const zoomX       = (viewportW - padding * 2) / Math.max(width,  1);
      const zoomY       = (viewportH - padding * 2) / Math.max(height, 1);
      const zoom        = Math.min(zoomX, zoomY, maxZoom);
      // Center of the bounding box in canvas coords
      const cx = x + width  / 2;
      const cy = y + height / 2;
      // Shift left in canvas units so the bounding box sits in the left portion.
      // The edit panel takes PANEL_W screen pixels → PANEL_W/zoom canvas units.
      // Offset by half that to move the center left of the panel.
      const panelOffsetCanvas = (PANEL_W / 2) / zoom;
      setCenter(cx + panelOffsetCanvas, cy, { zoom, duration: 400 });
    };
    window.addEventListener('er:fitView',          onFit);
    window.addEventListener('er:zoomIn',           onIn);
    window.addEventListener('er:zoomOut',          onOut);
    window.addEventListener('er:centerOn',         onCenter);
    window.addEventListener('er:centerOnRelation', onCenterRelation);
    return () => {
      window.removeEventListener('er:fitView',          onFit);
      window.removeEventListener('er:zoomIn',           onIn);
      window.removeEventListener('er:zoomOut',          onOut);
      window.removeEventListener('er:centerOn',         onCenter);
      window.removeEventListener('er:centerOnRelation', onCenterRelation);
    };
  }, [fitView, zoomIn, zoomOut, setCenter]);

  return null;
}

export function DiagramCanvas() {
  const model = useDiagramStore((s) => s.model);
  const updateLayout        = useDiagramStore((s) => s.updateLayout);
  const updateRegionLayout  = useDiagramStore((s) => s.updateRegionLayout);
  const updateCommentLayout = useDiagramStore((s) => s.updateCommentLayout);
  const updateViewport      = useDiagramStore((s) => s.updateViewport);
  const addRelation        = useDiagramStore((s) => s.addRelation);
  const selectTable    = useUiStore((s) => s.selectTable);
  const selectRelation = useUiStore((s) => s.selectRelation);
  const selectRegion   = useUiStore((s) => s.selectRegion);
  const selectComment  = useUiStore((s) => s.selectComment);
  const showMinimap    = useUiStore((s) => s.showMinimap);
  const headersOnly    = useUiStore((s) => s.headersOnly);
  const theme          = useUiStore((s) => s.theme);
  const t              = getTheme(theme);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Track whether a drag is in progress so we skip resync during drag
  const draggingRef = useRef(false);

  // Sync model → ReactFlow whenever the model changes
  // Use a ref for the model to avoid stale closure inside the effect
  const modelRef = useRef(model);
  modelRef.current = model;

  useEffect(() => {
    if (!draggingRef.current) {
      setNodes(modelToNodes(modelRef.current));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.tables, model.layout.tables, model.layout.regions, model.layout.comments]);

  useEffect(() => {
    // Small delay only on first mount / bulk import so handles are registered
    // For position changes (drag/layout) we re-run immediately after the delay
    const id = setTimeout(() => setEdges(modelToEdges(modelRef.current, headersOnly)), 30);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.relations, model.layout.tables, headersOnly]);

  const handleNodesChange = useCallback(
    (changes: any[]) => {
      let hasDragStart = false;
      let hasDragEnd   = false;

      for (const change of changes) {
        if (change.type === 'position') {
          if (change.dragging) hasDragStart = true;
          else                 hasDragEnd   = true;
        }
      }
      if (hasDragStart) draggingRef.current = true;

      onNodesChange(changes);

      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          draggingRef.current = false;
          const m = modelRef.current;
          const tableLayout = m.layout.tables.find((l) => l.tableId === change.id);
          if (tableLayout) {
            // Immediately re-route edges using the new position before model update cycle
            const overrides = new Map([[change.id, { x: change.position.x, width: tableLayout.width }]]);
            setEdges(modelToEdges(m, headersOnly, overrides));
            updateLayout(change.id, change.position.x, change.position.y, tableLayout.width);
          } else {
            const regionLayout = m.layout.regions.find((r) => r.id === change.id);
            if (regionLayout && !resizingRegions.has(change.id)) {
              updateRegionLayout(change.id, change.position.x, change.position.y, regionLayout.width, regionLayout.height);
            } else {
              const commentLayout = (m.layout.comments ?? []).find((c) => c.id === change.id);
              if (commentLayout) {
                updateCommentLayout(change.id, change.position.x, change.position.y);
              }
            }
          }
        }
        if (change.type === 'dimensions' && change.dimensions) {
          const m = modelRef.current;
          const tableLayout = m.layout.tables.find((l) => l.tableId === change.id);
          if (tableLayout) {
            if (Math.abs(tableLayout.width - change.dimensions.width) > 1) {
              updateLayout(change.id, tableLayout.x, tableLayout.y, change.dimensions.width);
            }
          }
          // Region dimensions are saved via onResizeEnd in RegionNode directly
        }
      }
    },
    [onNodesChange, updateLayout, updateRegionLayout, updateCommentLayout]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      // Extract column IDs from handle IDs.
      // Formats: "col-{colId}-left|right" (new drag) or "col-{colId}-rel-{relId}-left|right" (existing)
      const srcH = connection.sourceHandle ?? '';
      const tgtH = connection.targetHandle ?? '';
      const extractColId = (h: string) => {
        if (!h.startsWith('col-')) return '';
        return h.replace(/^col-/, '').replace(/-rel-[^-]+-(?:left|right)$/, '').replace(/-(?:left|right)$/, '');
      };
      const fromColId = extractColId(srcH);
      const toColId   = extractColId(tgtH);
      addRelation({
        fromTableId:      connection.source ?? '',
        fromColumnId:     fromColId,
        toTableId:        connection.target ?? '',
        toColumnId:       toColId,
        fromCardinality:  'EXACTLY_ONE',
        toCardinality:    'ZERO_OR_MANY',
        identifying:      true,
        hasForeignKey:    false,
        constraintName:   '',
        comment:          '',
      });
    },
    [addRelation]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'regionNode') {
        selectRegion(node.id);
      } else if (node.type === 'commentNode') {
        selectComment(node.id);
      } else {
        selectTable(node.id);
      }
    },
    [selectTable, selectRelation, selectRegion, selectComment]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: any) => {
      selectRelation(edge.id);
      // Find the midpoint between the two connected tables and center on it
      // offset left by ~200px so the edit panel (right side) doesn't cover the relation
      const m = modelRef.current;
      const rel = m.relations.find((r) => r.id === edge.id);
      if (!rel) return;
      const fromLayout = m.layout.tables.find((l) => l.tableId === rel.fromTableId);
      const toLayout   = m.layout.tables.find((l) => l.tableId === rel.toTableId);
      if (!fromLayout || !toLayout) return;
      // Estimate table heights (header + rows)
      const fromTable = m.tables.find((t) => t.id === rel.fromTableId);
      const toTable   = m.tables.find((t) => t.id === rel.toTableId);
      const fromH = 42 + (fromTable?.columns.length ?? 0) * 26;
      const toH   = 42 + (toTable?.columns.length   ?? 0) * 26;
      // Bounding box enclosing both tables
      const minX = Math.min(fromLayout.x, toLayout.x);
      const minY = Math.min(fromLayout.y, toLayout.y);
      const maxX = Math.max(fromLayout.x + (fromLayout.width ?? 240), toLayout.x + (toLayout.width ?? 240));
      const maxY = Math.max(fromLayout.y + fromH, toLayout.y + toH);
      window.dispatchEvent(new CustomEvent('er:centerOnRelation', {
        detail: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      }));
    },
    [selectRelation]
  );

  const handlePaneClick = useCallback(() => {
    selectTable(null);
    selectRelation(null);
    selectRegion(null);
    selectComment(null);
  }, [selectTable, selectRelation, selectRegion, selectComment]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Make the ReactFlow attribution readable in dark theme */}
      <style>{`.react-flow__attribution { color: ${t.textFaint} !important; } .react-flow__attribution a { color: ${t.textMuted} !important; }`}</style>
      <CardinalityMarkers />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onMoveEnd={(_, viewport) => {
          updateViewport(viewport.x, viewport.y, viewport.zoom);
        }}
        defaultViewport={model.layout.viewport}
        deleteKeyCode={null}
        minZoom={0.1}
        maxZoom={3}
      >
        <ReactFlowControls />
        <Background />
        <Controls />
        {showMinimap && <MiniMap zoomable pannable style={{ bottom: 8, right: 8 }} />}
      </ReactFlow>
    </div>
  );
}
