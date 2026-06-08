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
import { modelToNodes, modelToEdges, computeTableWidth } from '../util/xyflowAdapters';
import { genId } from '../util/idgen';
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
function ReactFlowControls({
  setNodes,
  selectRegion,
}: {
  setNodes: (updater: (nodes: any[]) => any[]) => void;
  selectRegion: (id: string | null) => void;
}) {
  const { fitView, zoomIn, zoomOut, setCenter, getNodes } = useReactFlow();

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
      const SIDEBAR_W   = 44;
      const PANEL_W     = 520;
      const viewportW   = window.innerWidth - SIDEBAR_W - PANEL_W;
      const viewportH   = window.innerHeight - 44;
      const padding     = 20;
      const maxZoom     = 1.3;
      const zoomX       = (viewportW - padding * 2) / Math.max(width,  1);
      const zoomY       = (viewportH - padding * 2) / Math.max(height, 1);
      const zoom        = Math.min(zoomX, zoomY, maxZoom);
      const cx = x + width  / 2;
      const cy = y + height / 2;
      const panelOffsetCanvas = (PANEL_W / 2) / zoom;
      setCenter(cx + panelOffsetCanvas, cy, { zoom, duration: 400 });
    };
    const onSelectRegionContents = (e: Event) => {
      const { regionId } = (e as CustomEvent<{ regionId: string }>).detail;
      const allNodes = getNodes();
      const region = allNodes.find((n) => n.id === regionId);
      if (!region) return;
      const rx = region.position.x;
      const ry = region.position.y;
      const rw = (region.style?.width as number) ?? 400;
      const rh = (region.style?.height as number) ?? 300;
      setNodes((nodes) =>
        nodes.map((n) => {
          // Include the region itself so it moves with its contents
          if (n.id === regionId) return { ...n, selected: true };
          if (n.type === 'regionNode') return { ...n, selected: false };
          const nx = n.position.x;
          const ny = n.position.y;
          const inside = nx >= rx && ny >= ry && nx <= rx + rw && ny <= ry + rh;
          return { ...n, selected: inside };
        })
      );
    };
    const onCenterOnTable = (e: Event) => {
      const { x, y, width, height } = (e as CustomEvent<{ x: number; y: number; width: number; height: number }>).detail;
      const SIDEBAR_W = 44;
      const PANEL_W   = 520;
      const viewportW = window.innerWidth - SIDEBAR_W - PANEL_W;
      const viewportH = window.innerHeight - 44;
      const padding   = 60;
      const maxZoom   = 1.3;
      const zoomX     = (viewportW - padding * 2) / Math.max(width,  1);
      const zoomY     = (viewportH - padding * 2) / Math.max(height, 1);
      const zoom      = Math.min(zoomX, zoomY, maxZoom);
      const cx = x + width  / 2;
      const cy = y + height / 2;
      const panelOffsetCanvas = (PANEL_W / 2) / zoom;
      setCenter(cx + panelOffsetCanvas, cy, { zoom, duration: 350 });
    };
    const onSelectRegion = (e: Event) => {
      const { regionId } = (e as CustomEvent<{ regionId: string }>).detail;
      selectRegion(regionId);
      setNodes((nodes) => nodes.map((n) => ({ ...n, selected: n.id === regionId })));
    };
    window.addEventListener('er:fitView',                onFit);
    window.addEventListener('er:zoomIn',                 onIn);
    window.addEventListener('er:zoomOut',                onOut);
    window.addEventListener('er:centerOn',               onCenter);
    window.addEventListener('er:centerOnRelation',       onCenterRelation);
    window.addEventListener('er:centerOnTable',          onCenterOnTable);
    window.addEventListener('er:selectRegionContents',   onSelectRegionContents);
    window.addEventListener('er:selectRegion',           onSelectRegion);
    return () => {
      window.removeEventListener('er:fitView',                onFit);
      window.removeEventListener('er:zoomIn',                 onIn);
      window.removeEventListener('er:zoomOut',                onOut);
      window.removeEventListener('er:centerOn',               onCenter);
      window.removeEventListener('er:centerOnRelation',       onCenterRelation);
      window.removeEventListener('er:centerOnTable',          onCenterOnTable);
      window.removeEventListener('er:selectRegionContents',   onSelectRegionContents);
      window.removeEventListener('er:selectRegion',           onSelectRegion);
    };
  }, [fitView, zoomIn, zoomOut, setCenter, getNodes, setNodes, selectRegion]);

  return null;
}

export function DiagramCanvas() {
  const model = useDiagramStore((s) => s.model);
  const updateLayout        = useDiagramStore((s) => s.updateLayout);
  const updateRegionLayout  = useDiagramStore((s) => s.updateRegionLayout);
  const updateCommentLayout = useDiagramStore((s) => s.updateCommentLayout);
  const updateViewport      = useDiagramStore((s) => s.updateViewport);
  const addRelation         = useDiagramStore((s) => s.addRelation);
  const selectTable         = useUiStore((s) => s.selectTable);
  const selectRelation      = useUiStore((s) => s.selectRelation);
  const setPendingRelation  = useUiStore((s) => s.setPendingRelation);
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

  // When relations change: wait 30ms for ReactFlow to register the new per-relation handles
  // that TableNode renders for each relation. The two deps are intentionally separate so that
  // a model.layout.tables update (e.g. from a dimension change after addRelation) cannot
  // cancel/restart this timer and indefinitely delay the edge appearing.
  useEffect(() => {
    const id = setTimeout(() => setEdges(modelToEdges(modelRef.current, headersOnly)), 30);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.relations, headersOnly]);

  // When table positions change: re-route edges. Use 30ms to match the relations effect so both
  // fire after ReactFlow's rAF-based handle registration (~16ms). Kept separate so layout changes
  // don't cancel/restart the relations timer.
  useEffect(() => {
    const id = setTimeout(() => setEdges(modelToEdges(modelRef.current, headersOnly)), 30);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.layout.tables]);

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
            const table = m.tables.find((t) => t.id === change.id);
            const tableW = table ? computeTableWidth(table, m.dictionary) : tableLayout.width;
            // Immediately re-route edges using the new position before model update cycle
            const overrides = new Map([[change.id, { x: change.position.x, width: tableW }]]);
            setEdges(modelToEdges(m, headersOnly, overrides));
            updateLayout(change.id, change.position.x, change.position.y, tableW);
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
      const fromCenter = !fromColId || !toColId;
      // Pre-generate the ID so we can select the relation immediately after adding it
      const newId = fromCenter ? genId('rel') : undefined;
      addRelation({
        id:               newId,
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
      // Connection from a center handle → open edit panel immediately and mark as pending
      // so the panel auto-deletes the relation if closed without column assignment.
      if (fromCenter && newId) {
        selectRelation(newId);
        setPendingRelation(newId);
      }
    },
    [addRelation, selectRelation, setPendingRelation]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      // Close popovers on all OTHER nodes/edges; the clicked node handles its own toggle
      window.dispatchEvent(new CustomEvent('er:closePopovers', { detail: { exceptNodeId: node.id } }));
      if (node.type === 'regionNode') {
        selectRegion(node.id);
      } else if (node.type === 'commentNode') {
        selectComment(node.id);
      } else {
        selectTable(node.id);
        const m = modelRef.current;
        const layout = m.layout.tables.find((l) => l.tableId === node.id);
        const table  = m.tables.find((t) => t.id === node.id);
        if (layout && table) {
          const h = 42 + table.columns.length * 26;
          window.dispatchEvent(new CustomEvent('er:centerOnTable', {
            detail: { x: layout.x, y: layout.y, width: computeTableWidth(table, m.dictionary), height: h },
          }));
        }
      }
    },
    [selectTable, selectRelation, selectRegion, selectComment, setEdges]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: any) => {
      // Close popovers on all nodes and all other edges
      window.dispatchEvent(new CustomEvent('er:closePopovers', { detail: { exceptEdgeId: edge.id } }));
      selectRelation(edge.id);
      // Mark the clicked edge as selected in ReactFlow state so RelationEdge receives selected=true
      setEdges((eds) =>
        eds.map((e) => ({ ...e, selected: e.id === edge.id }))
      );
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
      const fromW = fromTable ? computeTableWidth(fromTable, m.dictionary) : (fromLayout.width ?? 240);
      const toW   = toTable   ? computeTableWidth(toTable,   m.dictionary) : (toLayout.width   ?? 240);
      const maxX = Math.max(fromLayout.x + fromW, toLayout.x + toW);
      const maxY = Math.max(fromLayout.y + fromH, toLayout.y + toH);
      window.dispatchEvent(new CustomEvent('er:centerOnRelation', {
        detail: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      }));
    },
    [selectRelation, setEdges]
  );

  const handlePaneClick = useCallback(() => {
    selectTable(null);
    selectRelation(null);
    selectRegion(null);
    selectComment(null);
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
    // Close all comment popovers when clicking the canvas background
    window.dispatchEvent(new CustomEvent('er:closePopovers'));
  }, [selectTable, selectRelation, selectRegion, selectComment, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Make the ReactFlow attribution readable in dark theme */}
      {/* region-node-wrapper: disable pointer events on the RF wrapper so edges/tables inside remain clickable */}
      <style>{`
        .react-flow__attribution { color: ${t.textFaint} !important; }
        .react-flow__attribution a { color: ${t.textMuted} !important; }
        .region-node-wrapper { pointer-events: none !important; }
        .region-node-wrapper .region-interactive { pointer-events: all; }
        .region-node-wrapper .react-flow__resize-control { pointer-events: all; }
      `}</style>
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
        <ReactFlowControls setNodes={setNodes} selectRegion={selectRegion} />
        <Background />
        <Controls />
        {showMinimap && <MiniMap zoomable pannable style={{ bottom: 8, right: 8 }} />}
      </ReactFlow>
    </div>
  );
}
