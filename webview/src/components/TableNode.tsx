import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import type { TableNodeType } from '../util/xyflowAdapters';

const HEADER_BG = '#4a7c9e'; 
const HEADER_FG = '#fff';
const BORDER    = '#cdd';
const HEADER_H  = 42;
const ROW_H     = 26;

export const TableNode = memo(({ data, selected }: NodeProps<TableNodeType>) => {
  const tableId = data.tableId;
  const table     = useDiagramStore((s) => s.model.tables.find((t) => t.id === tableId));
  // Scoped selector: only re-render when relations touching THIS table change
  const relations = useDiagramStore((s) =>
    s.model.relations.filter((r) => r.fromTableId === tableId || r.toTableId === tableId),
    (a, b) => a.length === b.length && a.every((r, i) => r === b[i])
  );
  const selectedRelationId = useUiStore((s) => s.selectedRelationId);
  // For relation focus we also need the selected relation even if it doesn't touch this table
  const selectedRelation = useDiagramStore((s) =>
    selectedRelationId ? s.model.relations.find((r) => r.id === selectedRelationId) ?? null : null
  );
  const dict      = useDiagramStore((s) => s.model.dictionary);
  const nameMode  = useDiagramStore((s) => s.model.layout.nameMode);
  const selectTable  = useUiStore((s) => s.selectTable);
  const searchQuery  = useUiStore((s) => s.searchQuery);
  const headersOnly  = useUiStore((s) => s.headersOnly);
  const statusFilter = useUiStore((s) => s.statusFilter);

  const [openNote, setOpenNote] = useState<string | null>(null);
  const toggleNote = useCallback((id: string) => {
    setOpenNote((prev) => (prev === id ? null : id));
  }, []);

  if (!table) return null;

  // Derive FK role for each column from relations
  const referencedPKIds     = new Set(relations.map((r) => r.fromColumnId));
  const identifyingFKIds    = new Set(relations.filter((r) =>  r.identifying).map((r) => r.toColumnId));
  const nonIdentifyingFKIds = new Set(relations.filter((r) => !r.identifying).map((r) => r.toColumnId));

  // Count connections per column (source + target sides separately for handle placement)
  // srcRels[colId] = relations where this col is the source (fromColumnId)
  // tgtRels[colId] = relations where this col is the target (toColumnId)
  const srcRelsByCol = new Map<string, string[]>(); // colId → relationIds
  const tgtRelsByCol = new Map<string, string[]>();
  for (const rel of relations) {
    if (rel.fromColumnId) {
      if (!srcRelsByCol.has(rel.fromColumnId)) srcRelsByCol.set(rel.fromColumnId, []);
      srcRelsByCol.get(rel.fromColumnId)!.push(rel.id);
    }
    if (rel.toColumnId) {
      if (!tgtRelsByCol.has(rel.toColumnId)) tgtRelsByCol.set(rel.toColumnId, []);
      tgtRelsByCol.get(rel.toColumnId)!.push(rel.id);
    }
  }

  // Row height = (srcCount + tgtCount) slots, minimum 1.
  // Combined count ensures src and tgt handles never share a vertical position,
  // regardless of which physical side (left/right) each connection ends up on.
  const colRowH = (colId: string) => {
    const srcN = srcRelsByCol.get(colId)?.length ?? 0;
    const tgtN = tgtRelsByCol.get(colId)?.length ?? 0;
    return Math.max(srcN + tgtN, 1) * ROW_H;
  };

  // Cumulative top offset for each column
  const colTopOffset: number[] = [];
  let cumulative = 0;
  for (const col of table.columns) {
    colTopOffset.push(cumulative);
    cumulative += colRowH(col.id);
  }

  const q = searchQuery.trim().toLowerCase();

  // Relation focus: which columns in THIS table are part of the selected relation
  const relationFocusActive = Boolean(selectedRelation);
  const thisTableInRelation = selectedRelation
    ? selectedRelation.fromTableId === tableId || selectedRelation.toTableId === tableId
    : false;
  const focusedColIds = selectedRelation ? new Set([
    selectedRelation.fromTableId === tableId ? selectedRelation.fromColumnId : null,
    selectedRelation.toTableId   === tableId ? selectedRelation.toColumnId   : null,
  ].filter(Boolean) as string[]) : new Set<string>();

  // Search match
  const colMatchIds = q ? new Set(
    table.columns
      .filter((c) => c.logicalName.toLowerCase().includes(q) || c.physicalName.toLowerCase().includes(q))
      .map((c) => c.id)
  ) : null;
  const tableNameMatch = q && (
    table.logicalName.toLowerCase().includes(q) || table.physicalName.toLowerCase().includes(q)
  );
  const isMatch = !q || tableNameMatch || (colMatchIds !== null && colMatchIds.size > 0);

  // Status filter: a table is relevant if its own status matches OR any of its columns match
  const statusFilterActive = statusFilter !== 'all';
  const tableMatchesStatusFilter = !statusFilterActive || (
    (table.status ?? 'implemented') === statusFilter ||
    table.columns.some((c) => (c.status ?? 'implemented') === statusFilter)
  );

  // A column is "highlighted" if it matches the active filter (search, relation, or status)
  const isColHighlighted = (colId: string) => {
    if (relationFocusActive) return focusedColIds.has(colId);
    if (q) return colMatchIds?.has(colId) ?? false;
    if (statusFilterActive) {
      const col = table.columns.find((c) => c.id === colId);
      return (col?.status ?? 'implemented') === statusFilter;
    }
    return true;
  };

  // Table-level fade: not matching search, relation focus, or status filter
  const tableFaded = (!isMatch) || (relationFocusActive && !thisTableInRelation) || !tableMatchesStatusFilter;

  const tableName = nameMode === 'logical' ? table.logicalName : table.physicalName;
  const tableStatus = table.status ?? 'implemented';

  return (
    <div
      style={{
        border: selected
          ? '2px solid #4a90d9'
          : tableStatus === 'proposed'
            ? '2px dashed #f0a020'
            : tableStatus === 'planned'
              ? '2px dashed #7a9abf'
              : `2px solid ${BORDER}`,
        borderRadius: 4,
        background: tableStatus === 'proposed' ? '#fffcf0' : tableStatus === 'planned' ? '#f4f7fb' : '#fff',
        minWidth: 200,
        boxShadow: selected ? '0 0 0 2px #4a90d944' : '0 2px 4px #0002',
        fontSize: 13,
        opacity: tableFaded ? 0.2 : (tableStatus === 'proposed' ? 0.85 : 1),
        transition: 'opacity 0.15s',
        position: 'relative',
        zIndex: openNote ? 1000 : undefined,
      }}
      onDoubleClick={(e) => { e.stopPropagation(); selectTable(tableId); }}
      onClick={() => setOpenNote(null)}
    >
      <NodeResizer isVisible={selected} minWidth={160} minHeight={60} />

      {/* Center fallback handles — explicit IDs per side */}
      <Handle type="target" position={Position.Left}  id="center-left"  style={handleStyle} />
      <Handle type="target" position={Position.Right} id="center-right" style={{ ...handleStyle, opacity: 0 }} />
      <Handle type="source" position={Position.Left}  id="center-left"  style={{ ...handleStyle, opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="center-right" style={handleStyle} />

      {!headersOnly && table.columns.flatMap((col, idx) => {
        const rowTop = HEADER_H + colTopOffset[idx];
        const srcRels = srcRelsByCol.get(col.id) ?? [];
        const tgtRels = tgtRelsByCol.get(col.id) ?? [];

        // Per-relation handles: each relation gets its own vertical slot so edges don't overlap.
        // Fallback generic handles (no relId) cover newly dragged connections before a relId exists.
        const handles: React.ReactElement[] = [];

        // Generic fallback — used when dragging a new connection from this column
        const fallbackTop = rowTop + ROW_H / 2;
        const sf = { ...handleStyle, top: fallbackTop, opacity: 0 };
        handles.push(
          <Handle key={`cl-${col.id}`} id={`col-${col.id}-left`}  type="target" position={Position.Left}  style={sf} />,
          <Handle key={`cr-${col.id}`} id={`col-${col.id}-right`} type="target" position={Position.Right} style={sf} />,
          <Handle key={`sl-${col.id}`} id={`col-${col.id}-left`}  type="source" position={Position.Left}  style={sf} />,
          <Handle key={`sr-${col.id}`} id={`col-${col.id}-right`} type="source" position={Position.Right} style={sf} />,
        );

        // Per-relation source handles (left + right, one slot each)
        srcRels.forEach((relId, i) => {
          const top = rowTop + ROW_H * i + ROW_H / 2;
          const s = { ...handleStyle, top, opacity: 0 };
          handles.push(
            <Handle key={`sl-${col.id}-${relId}`} id={`col-${col.id}-rel-${relId}-left`}  type="source" position={Position.Left}  style={s} />,
            <Handle key={`sr-${col.id}-${relId}`} id={`col-${col.id}-rel-${relId}-right`} type="source" position={Position.Right} style={s} />,
          );
        });

        // Per-relation target handles — offset by srcRels.length so they occupy
        // distinct vertical slots and never collide with source handles on the same side.
        tgtRels.forEach((relId, i) => {
          const top = rowTop + ROW_H * (srcRels.length + i) + ROW_H / 2;
          const s = { ...handleStyle, top, opacity: 0 };
          handles.push(
            <Handle key={`tl-${col.id}-${relId}`} id={`col-${col.id}-rel-${relId}-left`}  type="target" position={Position.Left}  style={s} />,
            <Handle key={`tr-${col.id}-${relId}`} id={`col-${col.id}-rel-${relId}-right`} type="target" position={Position.Right} style={s} />,
          );
        });

        return handles;
      })}

      {/* Header */}
      <div style={{
        background: table.headerColor ?? HEADER_BG,
        color: HEADER_FG,
        padding: '6px 8px 6px 10px',
        borderRadius: '2px 2px 0 0',
        fontWeight: 700,
        fontFamily: "sans-serif",
        fontSize: 16,
        height: HEADER_H,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        position: 'relative',
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
            {tableStatus !== 'implemented' && (
              <span style={{
                fontSize: 9, padding: '1px 4px', borderRadius: 3, fontWeight: 700, flexShrink: 0,
                background: tableStatus === 'proposed' ? '#f0a020' : '#6a8fbf',
                color: '#fff', letterSpacing: 0.3,
              }}>
                {tableStatus === 'proposed' ? '?' : '…'}
              </span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tableName}</span>
          </div>
          {nameMode === 'logical' && table.physicalName && (
            <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.8 }}>{table.physicalName}</div>
          )}
        </div>
        {table.comment && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleNote('__table__'); }}
            title={openNote === '__table__' ? 'Hide table note' : table.comment}
            style={{ background: openNote === '__table__' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '2px 3px', lineHeight: 0, flexShrink: 0, display: 'flex', alignItems: 'center' }}
          >
            <NoteIcon color="#fff" active={openNote === '__table__'} />
          </button>
        )}
      </div>

      {openNote === '__table__' && table.comment && (
        <div style={notePopoverStyle}>{table.comment}</div>
      )}

      {/* Columns */}
      {!headersOnly && table.columns.length === 0 && (
        <div style={{ padding: '6px 10px', color: '#aaa', fontSize: 12, height: ROW_H, boxSizing: 'border-box' }}>
          (no columns)
        </div>
      )}
      {!headersOnly && table.columns.map((col, idx) => {
        const entry = dict.find((e) => e.id === col.dictionaryId);
        const typeName = entry
          ? entry.length ? `${entry.name}(${entry.length})` : entry.name
          : '—';
        const colName  = nameMode === 'logical' ? col.logicalName : col.physicalName;
        const hasNote  = Boolean(col.designNote);
        const rowH     = colRowH(col.id);

        // FK target always wins over PK — a column referenced by a relation
        // is an FK in this table regardless of its isPrimaryKey flag
        const isFKIdent = identifyingFKIds.has(col.id);
        const isFKNonId = !isFKIdent && nonIdentifyingFKIds.has(col.id);
        const isFK      = isFKIdent || isFKNonId;

        // PK roles only apply when this column is NOT a FK target
        const isRefPK  = !isFK && col.isPrimaryKey && referencedPKIds.has(col.id);
        const isPKOnly = !isFK && col.isPrimaryKey && !referencedPKIds.has(col.id);

        const colStatus    = col.status ?? 'implemented';
        const nameWeight   = (isPKOnly || isRefPK || isFK) ? 700 : 400;
        const nameStyle    = isFK ? 'italic' : 'normal';
        const colHighlight = isColHighlighted(col.id);
        // Dim when: relation focus active and not the connected col, OR search active and not a column match
        const colDimmed    = (relationFocusActive || Boolean(q) || statusFilterActive) && !colHighlight;

        return (
          <div key={col.id} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px 0 10px',
              borderTop: colStatus === 'proposed' ? '1px dashed #f0c060' : '1px solid #eee',
              gap: 5,
              height: rowH,
              boxSizing: 'border-box',
              background: colHighlight && relationFocusActive
                ? 'rgba(74,144,217,0.10)'
                : colStatus === 'proposed'
                  ? 'rgba(255,240,180,0.35)'
                  : colStatus === 'planned'
                    ? 'rgba(180,210,240,0.25)'
                    : undefined,
              opacity: colDimmed ? 0.25 : colStatus === 'proposed' ? 0.8 : 1,
              transition: 'opacity 0.15s, background 0.15s',
            }}>
              {/* Key icon */}
              <span style={{ flexShrink: 0, lineHeight: 0 }}>
                {isPKOnly  && <PKIcon />}
                {isRefPK   && <RefPKIcon />}
                {isFKIdent && <FKIdentIcon />}
                {isFKNonId && <FKNonIdentIcon />}
                {!isPKOnly && !isRefPK && !isFKIdent && !isFKNonId && <span style={{ display: 'inline-block', width: 16 }} />}
              </span>

              {/* Column name */}
              <span style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 3,
                overflow: 'hidden', minWidth: 0,
              }}>
                {colStatus !== 'implemented' && (
                  <span style={{
                    fontSize: 8, padding: '0 3px', borderRadius: 2, fontWeight: 700, flexShrink: 0,
                    background: colStatus === 'proposed' ? '#f0a020' : '#6a8fbf',
                    color: '#fff',
                  }}>
                    {colStatus === 'proposed' ? '?' : '…'}
                  </span>
                )}
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: nameWeight, fontStyle: nameStyle, fontSize: 12,
                }}>
                  {colName}
                </span>
              </span>

              {/* Note icon */}
              {hasNote && (
                <button
                  title={openNote === col.id ? 'Hide note' : col.designNote}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  onClick={(e) => { e.stopPropagation(); toggleNote(col.id); }}
                >
                  <NoteIcon color={openNote === col.id ? '#4a7c9e' : '#bbb'} active={openNote === col.id} />
                </button>
              )}

              {/* Type */}
              <span style={{ color: '#888', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {typeName}
              </span>
            </div>

            {openNote === col.id && col.designNote && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                background: '#fffde7', border: '1px solid #f0c040', borderRadius: 4,
                padding: '6px 8px', fontSize: 11, color: '#555',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
                boxShadow: '0 2px 8px #0002', pointerEvents: 'none',
              }}>
                {col.designNote}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

TableNode.displayName = 'TableNode';

// ── Key icons ────────────────────────────────────────────────────────────────

// Plain PK — larger solid yellow key
function PKIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.8" fill="#e8a000" />
      <circle cx="5.5" cy="8" r="1.8" fill="#fff" />
      <rect x="9"   y="7.1" width="6"   height="1.8" rx="0.6" fill="#e8a000" />
      <rect x="12.2" y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
      <rect x="9.8"  y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
    </svg>
  );
}

// Referenced PK — same yellow key as PKIcon + small blue diamond badge
function RefPKIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      {/* identical key shape to PKIcon */}
      <circle cx="5.5" cy="8" r="3.8" fill="#e8a000" />
      <circle cx="5.5" cy="8" r="1.8" fill="#fff" />
      <rect x="9"    y="7.1" width="6"   height="1.8" rx="0.6" fill="#e8a000" />
      <rect x="12.2" y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
      <rect x="9.8"  y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
      {/* small blue diamond badge top-right — explicit diamond polygon */}
      <polygon points="13,0 15.5,2.5 13,5 10.5,2.5" fill="#4a7c9e" />
    </svg>
  );
}

// Identifying FK — faded yellow key with blue arrow (solid relation)
function FKIdentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.5" fill="#e8a000" opacity="0.55" />
      <circle cx="5.5" cy="8" r="1.7" fill="#fff" />
      <rect x="9"    y="7.2" width="5"   height="1.6" rx="0.5" fill="#e8a000" opacity="0.55" />
      <rect x="12"   y="8.8" width="1.6" height="1.4" rx="0.4" fill="#e8a000" opacity="0.55" />
      <rect x="9.8"  y="8.8" width="1.6" height="1.4" rx="0.4" fill="#e8a000" opacity="0.55" />
      {/* blue arrow on the left pointing right — signals FK target */}
      <polyline points="1,8 3.2,6.2 3.2,9.8" stroke="#4a7c9e" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

// Non-identifying FK — grey hollow key with dashed circle
function FKNonIdentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.5" stroke="#999" strokeWidth="1.3" strokeDasharray="2.2 1.3" fill="none" />
      <circle cx="5.5" cy="8" r="1.5" fill="#bbb" />
      <rect x="9"    y="7.2" width="5.5" height="1.6" rx="0.5" fill="#bbb" />
      <rect x="12.2" y="8.8" width="1.5" height="1.4" rx="0.4" fill="#bbb" />
      <rect x="9.8"  y="8.8" width="1.5" height="1.4" rx="0.4" fill="#bbb" />
    </svg>
  );
}

function NoteIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="10" rx="1.5" stroke={color} strokeWidth="1.4"
        fill={active ? color : 'none'} fillOpacity={active ? 0.15 : 0} />
      <line x1="3.5" y1="4.5" x2="10.5" y2="4.5" stroke={color} strokeWidth="1.1" />
      <line x1="3.5" y1="7"   x2="10.5" y2="7"   stroke={color} strokeWidth="1.1" />
      <line x1="3.5" y1="9.5" x2="7.5"  y2="9.5" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}

const notePopoverStyle: React.CSSProperties = {
  position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4, zIndex: 1000,
  background: '#fffde7', border: '1px solid #f0c040', borderRadius: 4,
  padding: '6px 8px', fontSize: 11, color: '#555',
  whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
  boxShadow: '0 2px 8px #0002', pointerEvents: 'none',
};

const handleStyle: React.CSSProperties = {
  width: 10, height: 10, background: '#4a7c9e', border: '2px solid #fff',
};
