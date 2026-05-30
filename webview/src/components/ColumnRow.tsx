import { useState } from 'react';
import { Column, DictionaryEntry, DbType, DB_TYPES } from '@shared/DiagramModel';
import { useDiagramStore } from '../store/diagramStore';

interface Props {
  tableId: string;
  column: Column;
  dictionary: DictionaryEntry[];
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; };
}

interface CustomTypeForm {
  name: string;
  dbType: DbType;
  length: string;
  notNull: boolean;
  comment: string;
}

const EMPTY_FORM: CustomTypeForm = { name: '', dbType: 'VARCHAR', length: '', notNull: true, comment: '' };

export function ColumnRow({ tableId, column, dictionary, onDelete, dragHandleProps }: Props) {
  const updateColumn  = useDiagramStore((s) => s.updateColumn);
  const addColumnType = useDiagramStore((s) => s.addColumnType);
  const [noteOpen, setNoteOpen]     = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [form, setForm]             = useState<CustomTypeForm>(EMPTY_FORM);
  // Free-form text the user is currently typing in the type field
  const [typeText, setTypeText]     = useState('');

  const currentEntry = dictionary.find((e) => e.id === column.dictionaryId);
  // Show typeText while the user is typing; otherwise show the current entry name
  const typeDisplayValue = typeText !== '' ? typeText : (currentEntry?.name ?? '');

  // Check if the typed value matches a raw DB type (INT, VARCHAR, etc.)
  const isRawDbType = (val: string): val is DbType =>
    (DB_TYPES as string[]).includes(val.trim().toUpperCase());

  // True when the user has typed something that doesn't match any dict entry OR raw DB type
  const unregistered = typeText.trim() !== '' &&
    !dictionary.find((e) => e.name.toLowerCase() === typeText.trim().toLowerCase()) &&
    !isRawDbType(typeText);

  const handleTypeChange = (value: string) => {
    setTypeText(value);
    if (!value.trim()) {
      updateColumn(tableId, column.id, { dictionaryId: '' });
      return;
    }
    // First try to match a dictionary entry by name
    const match = dictionary.find((e) => e.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      updateColumn(tableId, column.id, { dictionaryId: match.id });
      setTypeText('');
      setCustomOpen(false);
      return;
    }
    // If it's a raw DB type, auto-create a dict entry and assign it immediately
    if (isRawDbType(value)) {
      const dbType = value.trim().toUpperCase() as DbType;
      const existing = dictionary.find((e) => e.name.toUpperCase() === dbType);
      if (existing) {
        updateColumn(tableId, column.id, { dictionaryId: existing.id });
      } else {
        addColumnType(tableId, column.id, { name: dbType, dbType, length: null, notNull: true, comment: '' });
      }
      setTypeText('');
      setCustomOpen(false);
    }
  };

  const handleOpenCustom = () => {
    const next = !customOpen;
    setCustomOpen(next);
    if (next) {
      const trimmed = typeText.trim();
      if (trimmed) {
        const rawType = isRawDbType(trimmed) ? trimmed.toUpperCase() as DbType : 'VARCHAR';
        setForm({ ...EMPTY_FORM, name: trimmed, dbType: rawType });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  };

  const handleRegister = () => {
    if (!form.name.trim()) return;
    addColumnType(tableId, column.id, {
      name: form.name.trim(),
      dbType: form.dbType,
      length: form.length ? parseInt(form.length, 10) : null,
      notNull: form.notNull,
      comment: form.comment,
    });
    setCustomOpen(false);
    setForm(EMPTY_FORM);
    setTypeText('');
  };

  const datalistId = `dict-list-${column.id}`;

  return (
    <div style={{ borderBottom: '1px solid #eee' }}>
      {/* Main row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '16px 28px 1fr 1fr 1fr 50px 28px 28px 36px',
          gap: 4,
          alignItems: 'center',
          padding: '4px 0',
        }}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          style={{ cursor: 'grab', color: '#bbb', fontSize: 13, textAlign: 'center', userSelect: 'none', lineHeight: 1 }}
          title="Drag to reorder"
        >⠿</div>

        {/* PK toggle */}
        <label style={{ textAlign: 'center', cursor: 'pointer' }} title="Primary Key">
          <input
            type="checkbox"
            checked={column.isPrimaryKey}
            onChange={(e) => updateColumn(tableId, column.id, { isPrimaryKey: e.target.checked })}
          />
        </label>

        {/* Logical name */}
        <input
          style={inputStyle}
          value={column.logicalName}
          placeholder="Logical name"
          onChange={(e) => updateColumn(tableId, column.id, { logicalName: e.target.value })}
        />

        {/* Physical name */}
        <input
          style={inputStyle}
          value={column.physicalName}
          placeholder="Physical name"
          onChange={(e) => updateColumn(tableId, column.id, { physicalName: e.target.value })}
        />

        {/* Type combo: free-text input + datalist + register toggle */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <input
            list={datalistId}
            style={{
              ...inputStyle,
              flex: 1,
              borderColor: unregistered ? '#e8a000' : undefined,
              background: unregistered ? '#fffbe6' : undefined,
            }}
            value={typeDisplayValue}
            placeholder="Type…"
            onChange={(e) => handleTypeChange(e.target.value)}
            title={unregistered ? `"${typeText.trim()}" is not in the dictionary — click + to register` : 'Select or type a column type'}
          />
          <datalist id={datalistId}>
            {dictionary.map((e) => (
              <option key={e.id} value={e.name}>
                {e.dbType}{e.length ? `(${e.length})` : ''}
              </option>
            ))}
            {DB_TYPES.filter(
              (t) => !dictionary.find((e) => e.name.toUpperCase() === t)
            ).map((t) => (
              <option key={`raw-${t}`} value={t}>{t}</option>
            ))}
          </datalist>
          <button
            onClick={handleOpenCustom}
            style={customToggleBtnStyle(customOpen, unregistered)}
            title={
              unregistered
                ? `Register "${typeText.trim()}" to dictionary`
                : customOpen
                  ? 'Close custom type form'
                  : 'Define a new type and register it to the dictionary'
            }
          >
            {customOpen ? '▲' : '+'}
          </button>
        </div>

        {/* Nullable toggle */}
        <label style={{ textAlign: 'center', cursor: 'pointer', fontSize: 11 }} title="Nullable">
          <input
            type="checkbox"
            checked={column.isNullable}
            onChange={(e) => updateColumn(tableId, column.id, { isNullable: e.target.checked })}
          />
          {' '}NULL
        </label>

        {/* Note toggle */}
        <button
          onClick={() => setNoteOpen((o) => !o)}
          style={{ ...noteBtnStyle, ...(noteOpen ? { background: '#e8f0fe', borderColor: '#4a7c9e' } : {}) }}
          title="Design note"
        >
          <NoteIcon color={column.designNote ? '#4a7c9e' : '#bbb'} active={noteOpen} />
        </button>

        {/* Status cycle: implemented → planned → proposed → implemented */}
        <button
          onClick={() => {
            const cur = column.status ?? 'implemented';
            const next = cur === 'implemented' ? 'planned' : cur === 'planned' ? 'proposed' : undefined;
            updateColumn(tableId, column.id, { status: next });
          }}
          style={{
            ...noteBtnStyle,
            fontSize: 10, fontWeight: 700,
            background: (column.status ?? 'implemented') === 'proposed'
              ? '#fff3cd' : (column.status ?? 'implemented') === 'planned'
                ? '#dce8f5' : 'none',
            borderColor: (column.status ?? 'implemented') === 'proposed'
              ? '#f0a020' : (column.status ?? 'implemented') === 'planned'
                ? '#6a8fbf' : '#ddd',
            color: (column.status ?? 'implemented') === 'proposed'
              ? '#c07000' : (column.status ?? 'implemented') === 'planned'
                ? '#4a6fa0' : '#ccc',
          }}
          title={`Status: ${column.status ?? 'implemented'} (click to cycle)`}
        >
          {(column.status ?? 'implemented') === 'proposed' ? '?' : (column.status ?? 'implemented') === 'planned' ? '…' : '✓'}
        </button>

        {/* Delete */}
        <button onClick={onDelete} style={deleteBtnStyle} title="Delete column">
          −
        </button>
      </div>

      {/* Custom type form */}
      {customOpen && (
        <div style={customFormStyle}>
          <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>New type:</span>
          <input
            style={{ ...formInput, flex: 1, minWidth: 80 }}
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            style={{ ...formInput, width: 90 }}
            value={form.dbType}
            onChange={(e) => setForm({ ...form, dbType: e.target.value as DbType })}
          >
            {DB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            style={{ ...formInput, width: 44 }}
            type="number"
            placeholder="len"
            value={form.length}
            onChange={(e) => setForm({ ...form, length: e.target.value })}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, whiteSpace: 'nowrap', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.notNull}
              onChange={(e) => setForm({ ...form, notNull: e.target.checked })}
            />
            NOT NULL
          </label>
          <input
            style={{ ...formInput, flex: 1, minWidth: 60 }}
            placeholder="comment"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
          <button
            onClick={handleRegister}
            disabled={!form.name.trim()}
            style={registerBtnStyle(!form.name.trim())}
            title="Create dictionary entry and assign to this column"
          >
            Register &amp; use
          </button>
        </div>
      )}

      {/* Design note */}
      {noteOpen && (
        <textarea
          style={noteAreaStyle}
          placeholder="Record design decisions, rationale, trade-offs…"
          value={column.designNote ?? ''}
          onChange={(e) => updateColumn(tableId, column.id, { designNote: e.target.value || undefined })}
        />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '2px 4px',
  border: '1px solid #ccc',
  borderRadius: 3,
  width: '100%',
  boxSizing: 'border-box',
};

const customToggleBtnStyle = (active: boolean, warn: boolean): React.CSSProperties => ({
  background: warn ? '#e8a000' : active ? '#4a7c9e' : '#e8f0fe',
  color: warn || active ? '#fff' : '#4a7c9e',
  border: `1px solid ${warn ? '#e8a000' : '#4a7c9e'}`,
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  width: 22,
  height: 22,
  flexShrink: 0,
  padding: 0,
  lineHeight: '20px',
  textAlign: 'center',
});

const customFormStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 4px 6px 8px',
  background: '#f0f4ff',
  borderRadius: 4,
  marginBottom: 4,
  flexWrap: 'wrap',
};

const formInput: React.CSSProperties = {
  fontSize: 11,
  padding: '2px 4px',
  border: '1px solid #b0c4de',
  borderRadius: 3,
  boxSizing: 'border-box',
};

const registerBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? '#ccc' : '#4a7c9e',
  color: '#fff',
  border: 'none',
  borderRadius: 3,
  padding: '3px 9px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

const deleteBtnStyle: React.CSSProperties = {
  background: '#e55',
  color: '#fff',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
  lineHeight: '22px',
  width: 28,
  height: 26,
};

const noteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #ddd',
  borderRadius: 3,
  cursor: 'pointer',
  width: 28,
  height: 26,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

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

const noteAreaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 60,
  fontSize: 12,
  padding: '4px 6px',
  border: '1px solid #ccc',
  borderRadius: 3,
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  marginBottom: 4,
};
