import { useRef, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { ColumnRow } from './ColumnRow';
import { SeedDataEditor } from './SeedDataEditor';
import type { ConstraintType } from '@shared/DiagramModel';

type TabId = 'definition' | 'indexes' | 'seed';

const PRESET_COLORS = ['#4a7c9e', '#6a9e4a', '#9e6a4a', '#9e4a7c', '#4a6a9e', '#7c4a9e'];

export function TableEditPanel() {
  const [noteOpen, setNoteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('definition');
  const selectedTableId = useUiStore((s) => s.selectedTableId);
  const selectTable = useUiStore((s) => s.selectTable);

  const table      = useDiagramStore((s) => s.model.tables.find((t) => t.id === selectedTableId));
  const dictionary = useDiagramStore((s) => s.model.dictionary);
  const updateTable      = useDiagramStore((s) => s.updateTable);
  const deleteTable      = useDiagramStore((s) => s.deleteTable);
  const addColumn        = useDiagramStore((s) => s.addColumn);
  const deleteColumn     = useDiagramStore((s) => s.deleteColumn);
  const reorderColumns   = useDiagramStore((s) => s.reorderColumns);
  const updateSeedData   = useDiagramStore((s) => s.updateSeedData);
  const addIndex         = useDiagramStore((s) => s.addIndex);
  const updateIndex      = useDiagramStore((s) => s.updateIndex);
  const deleteIndex      = useDiagramStore((s) => s.deleteIndex);
  const addConstraint    = useDiagramStore((s) => s.addConstraint);
  const updateConstraint = useDiagramStore((s) => s.updateConstraint);
  const deleteConstraint = useDiagramStore((s) => s.deleteConstraint);

  const dragIndexRef = useRef<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (!selectedTableId || !table) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 700 }}>Edit Table</span>
        <button onClick={() => selectTable(null)} style={closeBtnStyle}>✕</button>
      </div>

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {(['definition', 'indexes', 'seed'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={tabBtnStyle(tab === activeTab)}
          >
            {tab === 'definition' ? 'Definition' : tab === 'indexes' ? 'Indexes' : 'Seed Data'}
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 12px' }}>
        {activeTab === 'seed' ? (
          <SeedDataEditor
            table={table}
            onUpdate={(data) => updateSeedData(selectedTableId, data)}
          />
        ) : activeTab === 'indexes' ? (
          <IndexesTab
            table={table}
            tableId={selectedTableId}
            addIndex={() => addIndex(selectedTableId)}
            updateIndex={(id, p) => updateIndex(selectedTableId, id, p)}
            deleteIndex={(id) => deleteIndex(selectedTableId, id)}
            addConstraint={(t) => addConstraint(selectedTableId, t)}
            updateConstraint={(id, p) => updateConstraint(selectedTableId, id, p)}
            deleteConstraint={(id) => deleteConstraint(selectedTableId, id)}
          />
        ) : (
          <>
        {/* Table names */}
        <div style={rowStyle}>
          <label style={labelStyle}>Logical name</label>
          <input
            style={inputStyle}
            value={table.logicalName}
            onChange={(e) => updateTable(selectedTableId, { logicalName: e.target.value })}
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Physical name</label>
          <input
            style={inputStyle}
            value={table.physicalName}
            onChange={(e) => updateTable(selectedTableId, { physicalName: e.target.value })}
          />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Comment</label>
          <input
            style={inputStyle}
            value={table.comment}
            onChange={(e) => updateTable(selectedTableId, { comment: e.target.value })}
          />
        </div>

        {/* Status */}
        <div style={rowStyle}>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['implemented', 'planned', 'proposed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateTable(selectedTableId, { status: s === 'implemented' ? undefined : s })}
                style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 4, cursor: 'pointer', border: '1px solid',
                  fontWeight: (table.status ?? 'implemented') === s ? 700 : 400,
                  background: (table.status ?? 'implemented') === s
                    ? s === 'implemented' ? '#4a7c9e' : s === 'planned' ? '#6a8fbf' : '#f0a020'
                    : '#f5f5f5',
                  color: (table.status ?? 'implemented') === s ? '#fff' : '#555',
                  borderColor: (table.status ?? 'implemented') === s ? 'transparent' : '#ccc',
                }}
              >
                {s === 'implemented' ? '✓ Implemented' : s === 'planned' ? '… Planned' : '? Proposed'}
              </button>
            ))}
          </div>
        </div>

        {/* Header color */}
        <div style={rowStyle}>
          <label style={labelStyle}>Header color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => updateTable(selectedTableId, { headerColor: color })}
                style={{
                  width: 20, height: 20, borderRadius: 3, border: '2px solid',
                  borderColor: table.headerColor === color ? '#333' : 'transparent',
                  background: color, cursor: 'pointer', padding: 0,
                }}
                title={color}
              />
            ))}
            <input
              type="color"
              value={table.headerColor ?? '#4a7c9e'}
              onChange={(e) => updateTable(selectedTableId, { headerColor: e.target.value })}
              style={{ width: 28, height: 24, padding: 1, border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer' }}
              title="Custom color"
            />
            {table.headerColor && (
              <button
                onClick={() => updateTable(selectedTableId, { headerColor: undefined })}
                style={{ fontSize: 10, color: '#888', background: 'none', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', padding: '1px 5px' }}
                title="Reset to default"
              >reset</button>
            )}
          </div>
        </div>

        {/* Design Note */}
        <div style={{ marginBottom: 6 }}>
          <button
            onClick={() => setNoteOpen((o) => !o)}
            style={noteToggleStyle}
          >
            Design Note {noteOpen ? '▲' : '▼'}
          </button>
          {noteOpen && (
            <textarea
              style={noteAreaStyle}
              placeholder="Record design decisions, rationale, trade-offs…"
              value={table.designNote ?? ''}
              onChange={(e) => updateTable(selectedTableId, { designNote: e.target.value || undefined })}
            />
          )}
        </div>

        {/* Columns */}
        <div style={{ marginTop: 12, marginBottom: 4, fontWeight: 600, fontSize: 12, color: '#555' }}>
          Columns
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '16px 28px 1fr 1fr 1fr 50px 28px 28px 36px',
            gap: 4,
            fontSize: 11,
            color: '#888',
            padding: '2px 0',
          }}
        >
          <span />
          <span title="Primary Key" style={{ textAlign: 'center' }}>PK</span>
          <span>Logical</span>
          <span>Physical</span>
          <span>Type</span>
          <span>Null</span>
          <span title="Design note" style={{ textAlign: 'center' }}>Note</span>
          <span title="Status" style={{ textAlign: 'center' }}>St.</span>
          <span />
        </div>

        {table.columns.map((col, index) => {
          const isDragging = dragIndexRef.current === index;
          const isDropTarget = dropIndex === index;
          const dragSrc = dragIndexRef.current;
          const shift = dragSrc !== null && dropIndex !== null && !isDragging
            ? (index >= Math.min(dragSrc, dropIndex) && index <= Math.max(dragSrc, dropIndex))
              ? (dragSrc < dropIndex ? -1 : 1)
              : 0
            : 0;

          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setDropIndex(index); }}
              style={{
                position: 'relative',
                transform: shift !== 0 ? `translateY(${shift * 4}px)` : undefined,
                transition: 'transform 0.15s ease',
                opacity: isDragging ? 0.35 : 1,
                zIndex: isDragging ? 0 : 1,
              }}
            >
              {/* Drop indicator line above */}
              {isDropTarget && dragSrc !== null && dragSrc > index && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#4a7c9e', borderRadius: 1, zIndex: 10 }} />
              )}

              <ColumnRow
                tableId={selectedTableId}
                column={col}
                dictionary={dictionary}
                onDelete={() => deleteColumn(selectedTableId, col.id)}
                dragHandleProps={{
                  style: { cursor: 'grab' },
                  draggable: true,
                  onDragStart: (e: React.DragEvent) => {
                    e.stopPropagation();
                    dragIndexRef.current = index;
                    setDropIndex(index);
                  },
                  onDragEnd: () => {
                    if (dragIndexRef.current !== null && dropIndex !== null && dragIndexRef.current !== dropIndex) {
                      reorderColumns(selectedTableId, dragIndexRef.current, dropIndex);
                    }
                    dragIndexRef.current = null;
                    setDropIndex(null);
                  },
                }}
              />

              {/* Drop indicator line below */}
              {isDropTarget && dragSrc !== null && dragSrc < index && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#4a7c9e', borderRadius: 1, zIndex: 10 }} />
              )}
            </div>
          );
        })}

        <button
          onClick={() => addColumn(selectedTableId)}
          style={{ ...actionBtnStyle, marginTop: 8 }}
        >
          + Add Column
        </button>

        {/* Danger zone */}
        <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 10 }}>
          <button
            onClick={() => {
              deleteTable(selectedTableId);
              selectTable(null);
            }}
            style={{ ...actionBtnStyle, background: '#c33', color: '#fff' }}
          >
            Delete Table
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 25,
  right: 12,
  width: 520,
  maxHeight: 'calc(100vh - 120px)',
  overflowY: 'auto',
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 6,
  boxShadow: '0 4px 16px #0003',
  zIndex: 10,
};

const headerStyle: React.CSSProperties = {
  background: '#f5f5f5',
  borderBottom: '1px solid #ccc',
  padding: '8px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 20,
  borderRadius: '6px 6px 0 0',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  color: '#666',
};

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 };
const labelStyle: React.CSSProperties = { width: 100, fontSize: 12, color: '#555', flexShrink: 0 };
const inputStyle: React.CSSProperties = {
  flex: 1, fontSize: 13, padding: '3px 6px',
  border: '1px solid #ccc', borderRadius: 3,
};

const actionBtnStyle: React.CSSProperties = {
  background: '#4a7c9e',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
};

const noteToggleStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #ccc',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 11,
  color: '#555',
  padding: '2px 8px',
  marginBottom: 4,
  width: '100%',
  textAlign: 'left',
};

const noteAreaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 80,
  fontSize: 12,
  padding: '4px 6px',
  border: '1px solid #ccc',
  borderRadius: 3,
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #ccc',
  background: '#fafafa',
  position: 'sticky',
  top: 37,
  zIndex: 19,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#fff' : 'transparent',
  border: 'none',
  borderBottom: active ? '2px solid #4a7c9e' : '2px solid transparent',
  cursor: 'pointer',
  fontSize: 12,
  color: active ? '#4a7c9e' : '#666',
  fontWeight: active ? 600 : 400,
  padding: '6px 14px',
  marginBottom: -1,
});

// ── Indexes tab ────────────────────────────────────────────────────────────────

import type { Table, TableIndex, TableConstraint } from '@shared/DiagramModel';

interface IndexesTabProps {
  table: Table;
  tableId: string;
  addIndex: () => void;
  updateIndex: (id: string, patch: Partial<Omit<TableIndex, 'id'>>) => void;
  deleteIndex: (id: string) => void;
  addConstraint: (type: ConstraintType) => void;
  updateConstraint: (id: string, patch: Partial<Omit<TableConstraint, 'id'>>) => void;
  deleteConstraint: (id: string) => void;
}

function IndexesTab({ table, addIndex, updateIndex, deleteIndex, addConstraint, updateConstraint, deleteConstraint }: IndexesTabProps) {
  const colOptions = table.columns.map((c) => c.physicalName);

  return (
    <div>
      {/* Indexes section */}
      <div style={sectionHeaderStyle}>Indexes</div>
      {(table.indexes ?? []).map((idx) => (
        <div key={idx.id} style={idxRowStyle}>
          <input
            style={{ ...idxInputStyle, flex: 1 }}
            placeholder="Index name"
            value={idx.name}
            onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
          />
          <label style={idxLabelStyle}>
            <input type="checkbox" checked={idx.unique} onChange={(e) => updateIndex(idx.id, { unique: e.target.checked })} />
            UNIQUE
          </label>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Columns (check to include)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {colOptions.map((col) => (
                <label key={col} style={idxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={idx.columns.includes(col)}
                    onChange={(e) => {
                      const cols = e.target.checked
                        ? [...idx.columns, col]
                        : idx.columns.filter((c) => c !== col);
                      updateIndex(idx.id, { columns: cols });
                    }}
                  />
                  {col}
                </label>
              ))}
            </div>
          </div>
          <button onClick={() => deleteIndex(idx.id)} style={delBtnStyle}>−</button>
        </div>
      ))}
      <button onClick={addIndex} style={addSubBtnStyle}>+ Add Index</button>

      {/* Constraints section */}
      <div style={{ ...sectionHeaderStyle, marginTop: 14 }}>Constraints</div>
      {(table.constraints ?? []).map((c) => (
        <div key={c.id} style={idxRowStyle}>
          <select
            style={idxInputStyle}
            value={c.type}
            onChange={(e) => updateConstraint(c.id, { type: e.target.value as ConstraintType })}
          >
            <option value="UNIQUE">UNIQUE</option>
            <option value="CHECK">CHECK</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
          <input
            style={{ ...idxInputStyle, flex: 1 }}
            placeholder="Constraint name"
            value={c.name}
            onChange={(e) => updateConstraint(c.id, { name: e.target.value })}
          />
          <input
            style={{ ...idxInputStyle, flex: 2 }}
            placeholder={c.type === 'UNIQUE' ? 'col1, col2' : c.type === 'CHECK' ? 'age > 0' : 'Raw SQL'}
            value={c.expression}
            onChange={(e) => updateConstraint(c.id, { expression: e.target.value })}
          />
          <button onClick={() => deleteConstraint(c.id)} style={delBtnStyle}>−</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {(['UNIQUE', 'CHECK', 'CUSTOM'] as ConstraintType[]).map((t) => (
          <button key={t} onClick={() => addConstraint(t)} style={addSubBtnStyle}>+ {t}</button>
        ))}
      </div>
    </div>
  );
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#4a7c9e',
  borderBottom: '1px solid #e0e8f0', paddingBottom: 2, marginBottom: 6,
};
const idxRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6, flexWrap: 'wrap',
};
const idxInputStyle: React.CSSProperties = {
  fontSize: 12, padding: '2px 5px', border: '1px solid #ccc', borderRadius: 3, minWidth: 80,
};
const idxLabelStyle: React.CSSProperties = {
  fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
};
const delBtnStyle: React.CSSProperties = {
  background: '#e55', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', padding: '2px 7px', fontSize: 12,
};
const addSubBtnStyle: React.CSSProperties = {
  background: '#5a8a6a', color: '#fff', border: 'none', borderRadius: 3,
  padding: '3px 9px', cursor: 'pointer', fontSize: 11,
};
