import { useRef, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import {
  CsvImportCategory,
  TABLE_CSV_HEADERS,
  TABLE_CSV_EXAMPLE,
  DICTIONARY_CSV_HEADERS,
  DICTIONARY_CSV_EXAMPLE,
  BUILTIN_PRESETS,
  parseTableCsv,
  parseDictionaryCsv,
} from '../util/csvImport';

type ImportStatus = { ok: true; message: string } | { ok: false; message: string } | null;

export function CsvImportPanel() {
  const isOpen = useUiStore((s) => s.isCsvImportOpen);
  const close  = useUiStore((s) => s.closeCsvImport);

  const dictionary     = useDiagramStore((s) => s.model.dictionary);
  const tables         = useDiagramStore((s) => s.model.tables);
  const relations      = useDiagramStore((s) => s.model.relations);
  const importTables      = useDiagramStore((s) => s.importTables);
  const importDictEntries = useDiagramStore((s) => s.importDictionaryEntries);
  const applyAutoLayout   = useDiagramStore((s) => s.applyAutoLayout);

  const [category, setCategory] = useState<CsvImportCategory>('table');
  const [status, setStatus] = useState<ImportStatus>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const importCsv = (csv: string) => {
    try {
      if (category === 'dictionary') {
        const parsed = parseDictionaryCsv(csv, dictionary);
        if (parsed.entries.length === 0 && parsed.skippedNames.length === 0) {
          setStatus({ ok: false, message: 'No valid rows found. Check that the CSV headers match the spec.' });
        } else {
          importDictEntries(parsed);
          const msg = [
            parsed.entries.length > 0 && `${parsed.entries.length} entr${parsed.entries.length === 1 ? 'y' : 'ies'} imported`,
            parsed.skippedNames.length > 0 && `${parsed.skippedNames.length} skipped (name already exists)`,
          ].filter(Boolean).join(', ');
          setStatus({ ok: true, message: msg });
        }
      } else {
        const existingPhysNames = new Set(tables.map((t) => t.physicalName));
        const parsed = parseTableCsv(csv, dictionary, existingPhysNames, relations, tables);
        if (parsed.tables.length === 0 && parsed.relations.length === 0 && parsed.skippedTableNames.length === 0) {
          setStatus({ ok: false, message: 'No valid rows found. Check that the CSV headers match the spec.' });
        } else {
          importTables(parsed);
          // Auto-layout after import so tables are arranged cleanly
          if (parsed.tables.length > 0) {
            setTimeout(() => {
              applyAutoLayout('auto');
              setTimeout(() => window.dispatchEvent(new CustomEvent('er:fitView')), 80);
            }, 50);
          } else {
            setTimeout(() => window.dispatchEvent(new CustomEvent('er:fitView')), 100);
          }
          const msg = [
            parsed.tables.length > 0 && `${parsed.tables.length} table${parsed.tables.length === 1 ? '' : 's'} imported`,
            parsed.relations.length > 0 && `${parsed.relations.length} relation${parsed.relations.length === 1 ? '' : 's'} imported`,
            parsed.autoCreatedDictEntries.length > 0 && `${parsed.autoCreatedDictEntries.length} dict entr${parsed.autoCreatedDictEntries.length === 1 ? 'y' : 'ies'} auto-created`,
            parsed.skippedTableNames.length > 0 && `${parsed.skippedTableNames.length} table${parsed.skippedTableNames.length === 1 ? '' : 's'} skipped (already exists)`,
            parsed.skippedRelationCount > 0 && `${parsed.skippedRelationCount} relation${parsed.skippedRelationCount === 1 ? '' : 's'} skipped (duplicate)`,
          ].filter(Boolean).join(', ');
          setStatus({ ok: true, message: msg });
        }
      }
    } catch (err) {
      setStatus({ ok: false, message: `Parse error: ${(err as Error).message}` });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      importCsv(ev.target?.result as string);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    setStatus(null);
    importCsv(pasteText);
    setPasteText('');
    setPasteMode(false);
  };

  const spec = category === 'table'
    ? { headers: TABLE_CSV_HEADERS, example: TABLE_CSV_EXAMPLE, fields: TABLE_FIELDS }
    : { headers: DICTIONARY_CSV_HEADERS, example: DICTIONARY_CSV_EXAMPLE, fields: DICT_FIELDS };

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Import from CSV</span>
          <button onClick={close} style={closeBtnStyle}>✕</button>
        </div>

        {/* Fixed top: tabs + upload zone */}
        <div style={topFixedStyle}>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e0e0e0', marginBottom: 14 }}>
            {(['table', 'dictionary'] as CsvImportCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setStatus(null); setPasteMode(false); setPasteText(''); }}
                style={{ ...tabStyle, ...(category === cat ? tabActiveStyle : {}) }}
              >
                {cat === 'table' ? 'Table' : 'Dictionary'}
              </button>
            ))}
          </div>

          {/* Upload zone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={uploadBtnStyle}>
              Choose CSV file
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
            <button
              onClick={() => { setPasteMode((o) => !o); setStatus(null); }}
              style={{ ...uploadBtnStyle, background: pasteMode ? '#555' : '#5a6272' }}
            >
              {pasteMode ? 'Cancel paste' : 'Paste CSV'}
            </button>
            <span style={{ fontSize: 12, color: '#888' }}>see spec below</span>
          </div>

          {pasteMode && (
            <div style={{ marginTop: 10 }}>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Paste CSV here — first line must be the header row:\n${spec.headers}`}
                rows={6}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: 'monospace', fontSize: 11,
                  border: '1px solid #bbb', borderRadius: 4,
                  padding: '6px 8px', resize: 'vertical',
                  background: '#fafafa',
                }}
              />
              <button
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
                style={{
                  marginTop: 6,
                  padding: '6px 18px',
                  background: pasteText.trim() ? '#1a73e8' : '#ccc',
                  color: '#fff', border: 'none', borderRadius: 4,
                  cursor: pasteText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                Import
              </button>
            </div>
          )}

          {status && (
            <div style={{
              marginTop: 10,
              padding: '7px 12px',
              borderRadius: 4,
              fontSize: 13,
              background: status.ok ? '#e8f5e9' : '#fdecea',
              color: status.ok ? '#2e7d32' : '#c62828',
              border: `1px solid ${status.ok ? '#a5d6a7' : '#ef9a9a'}`,
            }}>
              {status.ok ? '✓ ' : '✕ '}{status.message}
            </div>
          )}
        </div>

        {/* Spec pane — fixed height, internal scroll */}
        <div style={specPaneStyle}>
          <div style={{ marginBottom: 8 }}>
            <span style={labelStyle}>Required headers (in this order):</span>
            <code style={codeStyle}>{spec.headers}</code>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 10 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={th}>Column</th>
                <th style={th}>Required</th>
                <th style={th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {spec.fields.map((f) => (
                <tr key={f.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{f.name}</td>
                  <td style={{ ...td, textAlign: 'center', color: f.required ? '#c00' : '#888' }}>
                    {f.required ? 'Yes' : 'No'}
                  </td>
                  <td style={td}>{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginBottom: 8 }}>
            <span style={labelStyle}>Example:</span>
            <pre style={preStyle}>{spec.headers}{'\n'}{spec.example}</pre>
          </div>

          {category === 'table' && (
            <>
              <p style={{ fontSize: 11, color: '#666', margin: '0 0 10px' }}>
                Each row is one column. Rows sharing the same <code>tablePhysicalName</code> are
                grouped into one table. Tables whose <code>tablePhysicalName</code> already exists
                in the diagram are skipped.
                <br />
                <strong>Type resolution order:</strong> (1) <code>dictionaryName</code> matches an
                existing dictionary entry by name → (2) matches a built-in preset below →
                (3) falls back to <code>dbType</code>/<code>length</code>/<code>notNull</code>.
              </p>
              <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 700, color: '#555' }}>
                Built-in presets (usable as <code>dictionaryName</code>):
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f0f4ff' }}>
                    <th style={th}>Name</th>
                    <th style={th}>dbType</th>
                    <th style={th}>length</th>
                    <th style={th}>notNull</th>
                    <th style={th}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {BUILTIN_PRESETS.map((p) => (
                    <tr key={p.name} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{p.name}</td>
                      <td style={td}>{p.dbType}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{p.length ?? '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{p.notNull ? 'true' : 'false'}</td>
                      <td style={td}>{p.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {category === 'dictionary' && (
            <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
              Entries whose <code>name</code> already exists in the dictionary are skipped.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const TABLE_FIELDS: { name: string; required: boolean; desc: string }[] = [
  { name: 'tableLogicalName',   required: true,  desc: 'Logical (display) name of the table' },
  { name: 'tablePhysicalName',  required: true,  desc: 'Physical (DB) name — grouping key. Leave blank on relation-only rows.' },
  { name: 'tableComment',       required: false, desc: 'Comment for the table' },
  { name: 'columnLogicalName',  required: true,  desc: 'Logical name of the column' },
  { name: 'columnPhysicalName', required: true,  desc: 'Physical name of the column' },
  { name: 'dictionaryName',     required: false, desc: 'Preset or dict entry name. When matched, dbType/length/notNull are ignored.' },
  { name: 'dbType',             required: false, desc: 'DB type: INT, BIGINT, VARCHAR, TEXT, DATETIME, DECIMAL, BOOLEAN, JSON, …' },
  { name: 'length',             required: false, desc: 'Type length (e.g. 255 for VARCHAR)' },
  { name: 'notNull',            required: false, desc: 'true / false — NOT NULL constraint (default false)' },
  { name: 'isPrimaryKey',       required: false, desc: 'true / false — primary key (default false)' },
  { name: 'isNullable',         required: false, desc: 'true / false — allows NULL (default true)' },
  { name: 'defaultValue',       required: false, desc: 'Default value expression' },
  { name: 'columnComment',      required: false, desc: 'Comment for the column' },
  { name: 'columnDesignNote',   required: false, desc: 'Design note / rationale for the column' },
  { name: 'tableDesignNote',    required: false, desc: 'Design note for the table (applied once per table)' },
  { name: 'relFromTable',       required: false, desc: 'Relation: physical name of the source table' },
  { name: 'relFromColumn',      required: false, desc: 'Relation: physical name of the source column' },
  { name: 'relToTable',         required: false, desc: 'Relation: physical name of the target table' },
  { name: 'relToColumn',        required: false, desc: 'Relation: physical name of the target column' },
  { name: 'relCardinality',     required: false, desc: 'ONE_TO_ONE | ONE_TO_MANY | MANY_TO_ONE | MANY_TO_MANY (default ONE_TO_MANY)' },
  { name: 'relIdentifying',     required: false, desc: 'true = solid line (identifying), false = dashed (non-identifying). Default true.' },
  { name: 'relHasFk',           required: false, desc: 'true / false — adds FK badge on the relation' },
  { name: 'relConstraint',      required: false, desc: 'FK constraint name (e.g. fk_orders_user_id)' },
  { name: 'relComment',         required: false, desc: 'Comment shown on the relation line' },
];

const DICT_FIELDS: { name: string; required: boolean; desc: string }[] = [
  { name: 'name',    required: true,  desc: 'Logical name used in the column editor' },
  { name: 'dbType',  required: true,  desc: 'DB type: INT, BIGINT, VARCHAR, CHAR, TEXT, DATETIME, DATE, DECIMAL, FLOAT, DOUBLE, BOOLEAN, JSON, BLOB, …' },
  { name: 'length',  required: false, desc: 'Type length; leave blank for types without length' },
  { name: 'notNull', required: true,  desc: 'true / false — whether this type defaults to NOT NULL' },
  { name: 'comment', required: false, desc: 'Optional description' },
];

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: '#0005', zIndex: 50,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  paddingTop: 60,
};

const panelStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 6,
  width: 760, maxWidth: '95vw', maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 8px 32px #0006',
  border: '1px solid #ccc',
};

const headerStyle: React.CSSProperties = {
  background: '#f5f5f5', borderBottom: '1px solid #ccc',
  padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  borderRadius: '6px 6px 0 0',
  flexShrink: 0,
};

const topFixedStyle: React.CSSProperties = {
  padding: '14px 20px 12px',
  borderBottom: '1px solid #e0e0e0',
  flexShrink: 0,
};

const specPaneStyle: React.CSSProperties = {
  padding: '14px 20px',
  overflowY: 'auto',
  flex: 1,
  minHeight: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666',
};

const tabStyle: React.CSSProperties = {
  background: 'none', border: 'none', borderBottom: '2px solid transparent',
  padding: '6px 18px', cursor: 'pointer', fontSize: 13, color: '#555',
  marginBottom: -2,
};

const tabActiveStyle: React.CSSProperties = {
  color: '#1a73e8', borderBottomColor: '#1a73e8', fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: '#555', display: 'block', marginBottom: 4,
};

const codeStyle: React.CSSProperties = {
  display: 'block', background: '#f3f4f6', border: '1px solid #ddd',
  borderRadius: 3, padding: '5px 8px', fontSize: 11, fontFamily: 'monospace',
  wordBreak: 'break-all',
};

const preStyle: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #ddd', borderRadius: 3,
  padding: '8px 10px', fontSize: 11, fontFamily: 'monospace',
  whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0,
};

const uploadBtnStyle: React.CSSProperties = {
  display: 'inline-block', padding: '7px 16px',
  background: '#1a73e8', color: '#fff', borderRadius: 4,
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
  border: 'none',
};

const th: React.CSSProperties = { padding: '5px 8px', textAlign: 'left', fontSize: 11, color: '#555', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '4px 8px', fontSize: 12, verticalAlign: 'top' };
