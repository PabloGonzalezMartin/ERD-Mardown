import { useUiStore } from '../store/uiStore';
import { getTheme } from '../util/theme';

export function LegendPanel() {
  const theme = useUiStore((s) => s.theme);
  const t = getTheme(theme);

  const isOpen      = useUiStore((s) => s.isLegendOpen);
  const closeLegend = useUiStore((s) => s.closeLegend);

  if (!isOpen) return null;

  const panelBg     = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const headerBg    = theme === 'dark' ? '#252525' : '#f5f5f5';
  const sectionBg   = theme === 'dark' ? '#2a2a2a' : '#f8f8f8';
  const ruleBg      = theme === 'dark' ? '#333' : '#e8e8e8';

  return (
    <div style={{
      position: 'absolute', top: 8, right: 8, width: 320, zIndex: 500,
      background: panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
      fontFamily: 'inherit', fontSize: 12,
      maxHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: headerBg, borderBottom: `1px solid ${t.border}`,
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderRadius: '8px 8px 0 0', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: t.text }}>Diagram Legend</span>
        <button onClick={closeLegend} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Key types ── */}
        <Section title="Key Types" bg={sectionBg} border={t.borderSubtle} text={t.text} muted={t.textMuted}>
          <LegendRow icon={<PKIcon />}         label="Primary Key"              desc="Uniquely identifies each row" muted={t.textMuted} text={t.text} />
          <LegendRow icon={<RefPKIcon />}       label="Referenced Primary Key"   desc="PK used as FK source in another table" muted={t.textMuted} text={t.text} />
          <LegendRow icon={<FKIdentIcon />}     label="Identifying FK"           desc="Column references a PK — solid relation" muted={t.textMuted} text={t.text} />
          <LegendRow icon={<FKNonIdentIcon />}  label="Non-identifying FK"       desc="Column references a PK — dashed relation" muted={t.textMuted} text={t.text} />
        </Section>

        {/* ── Relation line styles ── */}
        <Section title="Relation Lines" bg={sectionBg} border={t.borderSubtle} text={t.text} muted={t.textMuted}>
          <LegendRow
            icon={<LineSample dashed={false} color={t.textMuted} />}
            label="Identifying (solid)"
            desc="Child cannot exist without parent"
            muted={t.textMuted} text={t.text}
          />
          <LegendRow
            icon={<LineSample dashed={true} color={t.textMuted} />}
            label="Non-identifying (dashed)"
            desc="Child can exist independently"
            muted={t.textMuted} text={t.text}
          />
        </Section>

        {/* ── Cardinality endings ── */}
        <Section title="Cardinality Endings" bg={sectionBg} border={t.borderSubtle} text={t.text} muted={t.textMuted}>
          <LegendRow icon={<CardSample type="EXACTLY_ONE"  color={t.textMuted} />} label="Exactly one (||)"   desc="Must have exactly 1" muted={t.textMuted} text={t.text} />
          <LegendRow icon={<CardSample type="ZERO_OR_ONE"  color={t.textMuted} />} label="Zero or one (o|)"  desc="Optional, at most 1" muted={t.textMuted} text={t.text} />
          <LegendRow icon={<CardSample type="ZERO_OR_MANY" color={t.textMuted} />} label="Zero or many (o{)" desc="Optional, unlimited" muted={t.textMuted} text={t.text} />
          <LegendRow icon={<CardSample type="ONE_OR_MANY"  color={t.textMuted} />} label="One or many (|{)"  desc="At least 1, unlimited" muted={t.textMuted} text={t.text} />
        </Section>

        {/* ── DB Types ── */}
        <Section title="DB Types" bg={sectionBg} border={t.borderSubtle} text={t.text} muted={t.textMuted}>
          {DB_TYPE_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{group.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.types.map((type) => (
                  <span key={type.name} style={{
                    background: ruleBg, border: `1px solid ${t.borderSubtle}`,
                    borderRadius: 3, padding: '1px 6px', fontSize: 11,
                    color: t.text, cursor: 'default',
                  }} title={type.desc}>{type.name}</span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: t.textFaint, marginTop: 4 }}>Hover a type badge to see description.</div>
        </Section>

        {/* ── Keyboard shortcuts ── */}
        <Section title="Keyboard Shortcuts" bg={sectionBg} border={t.borderSubtle} text={t.text} muted={t.textMuted}>
          {SHORTCUTS.map((s) => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: t.textMuted, fontSize: 12 }}>{s.action}</span>
              <kbd style={{
                background: ruleBg, border: `1px solid ${t.border}`, borderRadius: 3,
                padding: '1px 6px', fontSize: 11, color: t.text, fontFamily: 'monospace',
              }}>{s.key}</kbd>
            </div>
          ))}
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, bg, border, text, muted, children }: {
  title: string; bg: string; border: string; text: string; muted: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{title}</div>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 5, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {children}
      </div>
    </div>
  );
}

function LegendRow({ icon, label, desc, text, muted }: {
  icon: React.ReactNode; label: string; desc: string; text: string; muted: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flexShrink: 0, lineHeight: 0, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div>
        <span style={{ fontWeight: 600, color: text, fontSize: 12 }}>{label}</span>
        <span style={{ color: muted, fontSize: 11, marginLeft: 6 }}>{desc}</span>
      </div>
    </div>
  );
}

// ── Inline SVG icons (same as TableNode) ─────────────────────────────────────

function PKIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.8" fill="#e8a000" />
      <circle cx="5.5" cy="8" r="1.8" fill="#fff" />
      <rect x="9"    y="7.1" width="6"   height="1.8" rx="0.6" fill="#e8a000" />
      <rect x="12.2" y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
      <rect x="9.8"  y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
    </svg>
  );
}

function RefPKIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.8" fill="#e8a000" />
      <circle cx="5.5" cy="8" r="1.8" fill="#fff" />
      <rect x="9"    y="7.1" width="6"   height="1.8" rx="0.6" fill="#e8a000" />
      <rect x="12.2" y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
      <rect x="9.8"  y="8.9" width="1.8" height="1.6" rx="0.4" fill="#e8a000" />
      <polygon points="13,0 15.5,2.5 13,5 10.5,2.5" fill="#4a7c9e" />
    </svg>
  );
}

function FKIdentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="3.5" fill="#e8a000" opacity="0.55" />
      <circle cx="5.5" cy="8" r="1.7" fill="#fff" />
      <rect x="9"    y="7.2" width="5"   height="1.6" rx="0.5" fill="#e8a000" opacity="0.55" />
      <rect x="12"   y="8.8" width="1.6" height="1.4" rx="0.4" fill="#e8a000" opacity="0.55" />
      <rect x="9.8"  y="8.8" width="1.6" height="1.4" rx="0.4" fill="#e8a000" opacity="0.55" />
      <polyline points="1,8 3.2,6.2 3.2,9.8" stroke="#4a7c9e" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

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

function LineSample({ dashed, color }: { dashed: boolean; color: string }) {
  return (
    <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
      <line x1="2" y1="8" x2="34" y2="8" stroke={color} strokeWidth="1.8"
        strokeDasharray={dashed ? '5 3' : undefined} />
      <line x1="28" y1="3" x2="28" y2="13" stroke={color} strokeWidth="1.6" />
      {!dashed && <line x1="32" y1="3" x2="32" y2="13" stroke={color} strokeWidth="1.6" />}
      {dashed  && <circle cx="6" cy="8" r="3" fill="none" stroke={color} strokeWidth="1.4" />}
    </svg>
  );
}

function CardSample({ type, color }: { type: string; color: string }) {
  return (
    <svg width="36" height="16" viewBox="0 0 36 16" fill="none">
      <line x1="2" y1="8" x2="26" y2="8" stroke={color} strokeWidth="1.6" />
      {type === 'EXACTLY_ONE' && <>
        <line x1="28" y1="2" x2="28" y2="14" stroke={color} strokeWidth="1.6" />
        <line x1="33" y1="2" x2="33" y2="14" stroke={color} strokeWidth="1.6" />
      </>}
      {type === 'ZERO_OR_ONE' && <>
        <circle cx="29" cy="8" r="3" fill="none" stroke={color} strokeWidth="1.4" />
        <line x1="34" y1="2" x2="34" y2="14" stroke={color} strokeWidth="1.6" />
      </>}
      {type === 'ZERO_OR_MANY' && <>
        <circle cx="27" cy="8" r="3" fill="none" stroke={color} strokeWidth="1.4" />
        <line x1="32" y1="8" x2="36" y2="3"  stroke={color} strokeWidth="1.4" />
        <line x1="32" y1="8" x2="36" y2="8"  stroke={color} strokeWidth="1.4" />
        <line x1="32" y1="8" x2="36" y2="13" stroke={color} strokeWidth="1.4" />
      </>}
      {type === 'ONE_OR_MANY' && <>
        <line x1="27" y1="2" x2="27" y2="14" stroke={color} strokeWidth="1.6" />
        <line x1="30" y1="8" x2="34" y2="3"  stroke={color} strokeWidth="1.4" />
        <line x1="30" y1="8" x2="34" y2="8"  stroke={color} strokeWidth="1.4" />
        <line x1="30" y1="8" x2="34" y2="13" stroke={color} strokeWidth="1.4" />
      </>}
    </svg>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const DB_TYPE_GROUPS = [
  {
    label: 'Integer',
    types: [
      { name: 'INT',      desc: '32-bit integer (-2B to 2B)' },
      { name: 'BIGINT',   desc: '64-bit integer (very large numbers)' },
      { name: 'SMALLINT', desc: '16-bit integer (-32K to 32K)' },
      { name: 'TINYINT',  desc: '8-bit integer (0–255 or -128–127), often used for booleans' },
    ],
  },
  {
    label: 'Text',
    types: [
      { name: 'VARCHAR',  desc: 'Variable-length string, requires a max length (e.g. VARCHAR(255))' },
      { name: 'CHAR',     desc: 'Fixed-length string, padded with spaces' },
      { name: 'TEXT',     desc: 'Long text, no length limit' },
      { name: 'LONGTEXT', desc: 'Very long text (up to 4GB in MySQL)' },
    ],
  },
  {
    label: 'Date & Time',
    types: [
      { name: 'DATETIME',  desc: 'Date and time (no timezone)' },
      { name: 'TIMESTAMP', desc: 'Date and time, auto-updates on insert/update' },
      { name: 'DATE',      desc: 'Calendar date only (YYYY-MM-DD)' },
      { name: 'TIME',      desc: 'Time of day only (HH:MM:SS)' },
    ],
  },
  {
    label: 'Numeric',
    types: [
      { name: 'DECIMAL', desc: 'Exact fixed-point number, e.g. DECIMAL(10,2) for money' },
      { name: 'FLOAT',   desc: 'Approximate 32-bit floating-point number' },
      { name: 'DOUBLE',  desc: 'Approximate 64-bit floating-point number' },
    ],
  },
  {
    label: 'Other',
    types: [
      { name: 'BOOLEAN', desc: 'True/false (stored as TINYINT(1) in MySQL)' },
      { name: 'JSON',    desc: 'Native JSON document storage' },
      { name: 'BLOB',    desc: 'Binary large object (images, files, etc.)' },
    ],
  },
];

const SHORTCUTS = [
  { key: 'Ctrl+Z',         action: 'Undo' },
  { key: 'Ctrl+Y',         action: 'Redo' },
  { key: 'Delete',         action: 'Delete selected table / relation' },
  { key: 'Click',   action: 'Edit table, region or comment' },
  { key: 'Drag between columns', action: 'Create relation' },
];
