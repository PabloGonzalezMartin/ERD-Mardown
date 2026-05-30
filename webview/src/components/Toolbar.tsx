import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { sendToExtension } from '../vscodeApi';
import { getTheme } from '../util/theme';

export function Toolbar() {
  const nameMode    = useDiagramStore((s) => s.model.layout.nameMode);
  const setNameMode = useDiagramStore((s) => s.setNameMode);

  const headersOnly       = useUiStore((s) => s.headersOnly);
  const toggleHeadersOnly = useUiStore((s) => s.toggleHeadersOnly);
  const dialect           = useUiStore((s) => s.dialect);
  const showMinimap       = useUiStore((s) => s.showMinimap);
  const toggleMinimap     = useUiStore((s) => s.toggleMinimap);
  const searchQuery       = useUiStore((s) => s.searchQuery);
  const setSearchQuery    = useUiStore((s) => s.setSearchQuery);
  const statusFilter      = useUiStore((s) => s.statusFilter);
  const setStatusFilter   = useUiStore((s) => s.setStatusFilter);
  const theme             = useUiStore((s) => s.theme);
  const toggleTheme       = useUiStore((s) => s.toggleTheme);
  const isLegendOpen      = useUiStore((s) => s.isLegendOpen);
  const openLegend        = useUiStore((s) => s.openLegend);
  const closeLegend       = useUiStore((s) => s.closeLegend);

  const t = getTheme(theme);

  const undo = () => useDiagramStore.temporal.getState().undo();
  const redo = () => useDiagramStore.temporal.getState().redo();

  // Base button — small icon-style
  const iconBtn = (active = false, extra?: React.CSSProperties): React.CSSProperties => ({
    background: active ? t.activeBg : 'transparent',
    color: active ? t.activeText : t.textMuted,
    border: 'none',
    borderRadius: 5,
    padding: '4px 7px',
    cursor: 'pointer',
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.1s',
    ...extra,
  });

  // Grouped pill container
  const group: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    background: t.bgSubtle,
    border: `1px solid ${t.borderSubtle}`,
    borderRadius: 6,
    padding: '2px',
    gap: 1,
  };

  // Segment button inside a pill group
  const seg = (active = false): React.CSSProperties => ({
    background: active ? t.surface : 'transparent',
    color: active ? t.text : t.textMuted,
    border: active ? `1px solid ${t.border}` : '1px solid transparent',
    borderRadius: 4,
    padding: '3px 9px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    whiteSpace: 'nowrap' as const,
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 10px',
      background: t.bg,
      height: 44,
      borderBottom: `1px solid ${t.border}`,
      flexShrink: 0,
    }}>

      {/* ── History ── */}
      <div style={group}>
        <button onClick={undo} style={iconBtn()} title="Undo (Ctrl+Z)">
          <UndoIcon color={t.textMuted} /> <span style={{ fontSize: 11 }}>Undo</span>
        </button>
        <button onClick={redo} style={iconBtn()} title="Redo (Ctrl+Y)">
          <RedoIcon color={t.textMuted} /> <span style={{ fontSize: 11 }}>Redo</span>
        </button>
      </div>

      {/* ── Zoom ── */}
      <div style={group}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('er:zoomOut'))} style={iconBtn()} title="Zoom out">−</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('er:fitView'))}  style={iconBtn()} title="Fit view">
          <FitIcon color={t.textMuted} />
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('er:zoomIn'))}  style={iconBtn()} title="Zoom in">+</button>
      </div>

      {/* ── View mode ── */}
      <div style={group}>
        <button onClick={() => setNameMode('logical')}  style={seg(nameMode === 'logical')}  title="Show logical names">Logical</button>
        <button onClick={() => setNameMode('physical')} style={seg(nameMode === 'physical')} title="Show physical names">Physical</button>
      </div>

      <button
        onClick={toggleHeadersOnly}
        style={{
          ...iconBtn(headersOnly),
          background: headersOnly ? t.activeBg : t.bgSubtle,
          color: headersOnly ? t.activeText : t.textMuted,
          border: `1px solid ${headersOnly ? t.activeBorder : t.borderSubtle}`,
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
        }}
        title="Headers only"
      >Headers</button>

      {/* ── Status filter ── */}
      <div style={group}>
        <button onClick={() => setStatusFilter('all')}      style={seg(statusFilter === 'all')}      title="Show all tables">All</button>
        <button onClick={() => setStatusFilter('planned')}  style={seg(statusFilter === 'planned')}  title="Focus planned tables & columns">Planned</button>
        <button onClick={() => setStatusFilter('proposed')} style={seg(statusFilter === 'proposed')} title="Focus proposed tables & columns">Proposed</button>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 8, fontSize: 12, color: t.textFaint, pointerEvents: 'none' }}>⌕</span>
        <input
          type="text"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: t.bgSubtle,
            color: t.text,
            border: `1px solid ${t.borderSubtle}`,
            borderRadius: 6,
            padding: '4px 22px 4px 24px',
            fontSize: 12,
            width: 150,
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: 6, background: 'none', border: 'none', color: t.textFaint, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
            title="Clear"
          >✕</button>
        )}
      </div>

      {/* ── Minimap ── */}
      <button
        onClick={toggleMinimap}
        style={{
          ...iconBtn(showMinimap),
          background: showMinimap ? t.activeBg : t.bgSubtle,
          color: showMinimap ? t.activeText : t.textFaint,
          border: `1px solid ${showMinimap ? t.activeBorder : t.borderSubtle}`,
          borderRadius: 6,
          padding: '4px 8px',
        }}
        title={showMinimap ? 'Hide minimap' : 'Show minimap'}
      >
        <MapIcon color={showMinimap ? t.activeText : t.textFaint} />
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Export DDL ── */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('er:requestDdl', { detail: { mode: 'full' } }))}
        style={{
          background: t.greenBg,
          color: t.greenText,
          border: `1px solid ${t.greenBorder}`,
          borderRadius: 6,
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
        title="Export DDL"
      >
        <ExportIcon color={t.greenText} /> DDL
      </button>

      {/* Dialect badge */}
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: t.textMuted,
        background: t.bgSubtle,
        border: `1px solid ${t.borderSubtle}`,
        borderRadius: 4,
        padding: '3px 7px',
        letterSpacing: 0.5,
        userSelect: 'none',
        textTransform: 'uppercase',
      }} title="Active DDL dialect (change in Settings)">{dialect}</span>

      {/* ── Utility icons ── */}
      <div style={group}>
        {/* Theme */}
        <button
          onClick={toggleTheme}
          style={iconBtn(false, { padding: '4px 6px' })}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {theme === 'dark' ? <SunIcon color={t.textMuted} /> : <MoonIcon color={t.textMuted} />}
        </button>

        {/* Legend */}
        <button
          onClick={() => isLegendOpen ? closeLegend() : openLegend()}
          style={iconBtn(isLegendOpen, { padding: '4px 7px', fontSize: 13, fontWeight: 700 })}
          title="Legend & help"
        >?</button>

        {/* Settings */}
        <button
          onClick={() => sendToExtension({ type: 'openSettings' })}
          style={iconBtn(false, { padding: '4px 6px' })}
          title="Extension settings"
        >
          <SettingsIcon color={t.textMuted} />
        </button>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function UndoIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 6 C2 3 5 1 8 2 C11 3 13 6 11 9 C9 12 5 12 3 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <polyline points="2,3 2,7 6,7" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function RedoIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M12 6 C12 3 9 1 6 2 C3 3 1 6 3 9 C5 12 9 12 11 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <polyline points="12,3 12,7 8,7" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function FitIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1" stroke={color} strokeWidth="1.4"/>
      <line x1="1" y1="3" x2="1" y2="1" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="1" y1="1" x2="3" y2="1" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="3" x2="13" y2="1" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="1" x2="11" y2="1" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="1" y1="11" x2="1" y2="13" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="1" y1="13" x2="3" y2="13" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="11" x2="13" y2="13" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="13" x2="11" y2="13" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function MapIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="10" rx="1.5" stroke={color} strokeWidth="1.3"/>
      <rect x="9" y="7" width="3" height="3" rx="0.5" stroke={color} strokeWidth="1"/>
    </svg>
  );
}

function ExportIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M2 10 L2 12 L12 12 L12 10" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="7" y1="1" x2="7" y2="9" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <polyline points="4,6 7,9 10,6" stroke={color} strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  // Gear: outer teeth path + inner hole
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.5 1h3l.5 1.8a5 5 0 0 1 1.4.8l1.8-.6 1.5 2.6-1.4 1.2a5 5 0 0 1 0 1.6l1.4 1.2-1.5 2.6-1.8-.6a5 5 0 0 1-1.4.8L9.5 15h-3l-.5-1.8a5 5 0 0 1-1.4-.8l-1.8.6L1.3 10.4l1.4-1.2a5 5 0 0 1 0-1.6L1.3 6.4l1.5-2.6 1.8.6a5 5 0 0 1 1.4-.8L6.5 1z"
        stroke={color} strokeWidth="1.2" fill="none" strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function SunIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke={color} strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="3"   stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="8" x2="3" y2="8"   stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="8" x2="15" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3.1" y1="3.1" x2="4.5" y2="4.5"     stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.5" y1="11.5" x2="12.9" y2="12.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.9" y1="3.1" x2="11.5" y2="4.5"   stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.5" y1="11.5" x2="3.1" y2="12.9"   stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M13 10.5A6 6 0 0 1 5.5 3a6 6 0 1 0 7.5 7.5z" fill={color} />
    </svg>
  );
}
