import { useState, useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { sendToExtension } from '../vscodeApi';
import { getTheme } from '../util/theme';
import type { LayoutDirection } from '../util/autoLayout';
import type { DiagramModel } from '@shared/DiagramModel';

export function Sidebar() {
  const addTable        = useDiagramStore((s) => s.addTable);
  const addRegion       = useDiagramStore((s) => s.addRegion);
  const addComment      = useDiagramStore((s) => s.addComment);
  const applyAutoLayout = useDiagramStore((s) => s.applyAutoLayout);
  const viewport        = useDiagramStore((s) => s.model.layout.viewport);
  const tableCount      = useDiagramStore((s) => s.model.layout.tables.length);
  const model           = useDiagramStore((s) => s.model);

  const lastCommentStyle = useUiStore((s) => s.lastCommentStyle);
  const openDictionary   = useUiStore((s) => s.openDictionary);
  const openCsvImport    = useUiStore((s) => s.openCsvImport);
  const openVersions     = useUiStore((s) => s.openVersions);
  const theme            = useUiStore((s) => s.theme);

  const t = getTheme(theme);

  const [layoutOpen, setLayoutOpen] = useState(false);
  const [flyoutTop,  setFlyoutTop]  = useState(0);
  const layoutBtnRef = useRef<HTMLButtonElement>(null);
  const flyoutRef    = useRef<HTMLDivElement>(null);

  // Close flyout when clicking outside
  useEffect(() => {
    if (!layoutOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        !layoutBtnRef.current?.contains(e.target as Node) &&
        !flyoutRef.current?.contains(e.target as Node)
      ) setLayoutOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [layoutOpen]);

  const canvasCenter = () => {
    const cx = (window.innerWidth  / 2 - viewport.x) / viewport.zoom;
    const cy = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
    return { cx, cy };
  };

  const handleAddTable = () => {
    const { cx, cy } = canvasCenter();
    const offset = tableCount * 20;
    addTable(cx - 120 + offset, cy - 60 + offset);
  };

  const handleAddRegion = () => {
    const { cx, cy } = canvasCenter();
    addRegion(cx - 200, cy - 150);
    setTimeout(() => window.dispatchEvent(new CustomEvent('er:centerOn', { detail: { x: cx, y: cy } })), 50);
  };

  const handleAddComment = () => {
    const { cx, cy } = canvasCenter();
    // If the stored color would be invisible on the current theme bg, use a safe default
    const safeColor = theme === 'dark'
      ? (lastCommentStyle.textColor === '#333333' || lastCommentStyle.textColor === '#000000' ? '#ffffff' : lastCommentStyle.textColor)
      : (lastCommentStyle.textColor === '#ffffff' || lastCommentStyle.textColor === '#eeeeee' ? '#333333' : lastCommentStyle.textColor);
    addComment(cx, cy, { ...lastCommentStyle, textColor: safeColor });
    setTimeout(() => window.dispatchEvent(new CustomEvent('er:centerOn', { detail: { x: cx, y: cy } })), 50);
  };

  const handleLayout = (direction: LayoutDirection) => {
    applyAutoLayout(direction);
    setTimeout(() => window.dispatchEvent(new CustomEvent('er:fitView')), 50);
  };

  const sideBtnStyle: React.CSSProperties = {
    background: t.btnBg,
    color: t.btnText,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: t.btnBorder,
    borderRadius: 6,
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: t.textFaint,
    letterSpacing: 0.4,
    userSelect: 'none',
    marginTop: 4,
    fontWeight: 600,
  };

  const dividerStyle: React.CSSProperties = {
    width: 26,
    height: 1,
    background: t.borderSubtle,
    margin: '5px 0',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '6px 3px 6px 3px',
      background: t.bgSubtle,
      borderRight: `1px solid ${t.border}`,
      width: 44,
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* Add section */}
      <span style={labelStyle}>ADD</span>
      <button onClick={handleAddTable} title="Add table" style={sideBtnStyle}>
        <TableIcon color={t.btnText} />
      </button>
      <button onClick={handleAddRegion} title="Add region group box" style={sideBtnStyle}>
        <RegionIcon color={t.btnText} />
      </button>
      <button onClick={handleAddComment} title="Add text comment" style={sideBtnStyle}>
        <CommentIcon color={t.btnText} />
      </button>

      <div style={dividerStyle} />

      {/* Layout section — one button, flyout to the right */}
      <span style={labelStyle}>LAYOUT</span>
      <div style={{ position: 'relative' }}>
        <button
          ref={layoutBtnRef}
          onClick={() => {
            const rect = layoutBtnRef.current?.getBoundingClientRect();
            if (rect) setFlyoutTop(rect.top);
            setLayoutOpen((o) => !o);
          }}
          title="Layout options"
          style={{ ...sideBtnStyle, ...(layoutOpen ? { background: t.activeBg, borderColor: t.activeBorder } : {}) }}
        >
          <LayoutAutoIcon color={layoutOpen ? t.activeText : t.btnText} />
        </button>

        {layoutOpen && (
          <div
            ref={flyoutRef}
            style={{
              position: 'fixed',
              top: flyoutTop,
              left: 50,
              display: 'flex',
              flexDirection: 'row',
              gap: 4,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: 4,
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              zIndex: 1000,
            }}
          >
            <FlyoutBtn onClick={() => { handleLayout('vertical');   setLayoutOpen(false); }} title="Vertical layout"   t={t}><LayoutVertIcon  color={t.btnText} /></FlyoutBtn>
            <FlyoutBtn onClick={() => { handleLayout('horizontal'); setLayoutOpen(false); }} title="Horizontal layout" t={t}><LayoutHorizIcon color={t.btnText} /></FlyoutBtn>
            <FlyoutBtn onClick={() => { handleLayout('auto');       setLayoutOpen(false); }} title="Best fit — picks vertical or horizontal based on diagram shape" t={t}><LayoutAutoIcon  color={t.btnText} /></FlyoutBtn>
          </div>
        )}
      </div>

      <div style={dividerStyle} />

      {/* Data section */}
      <span style={labelStyle}>DATA</span>
      <button onClick={openCsvImport} title="Import from CSV" style={sideBtnStyle}>
        <CsvIcon color={t.btnText} />
      </button>
      <button onClick={openDictionary} title="Column type dictionary" style={sideBtnStyle}>
        <DictIcon color={t.btnText} />
      </button>
      <div style={dividerStyle} />

      {/* Versions section */}
      <span style={labelStyle}>SAVE</span>
      <button
        onClick={() => sendToExtension({ type: 'saveVersion', payload: { model: model as DiagramModel } })}
        title="Save schema version snapshot"
        style={sideBtnStyle}
      >
        <SaveVersionIcon color={t.btnText} />
      </button>
      <button onClick={openVersions} title="View saved versions" style={sideBtnStyle}>
        <VersionsIcon color={t.btnText} />
      </button>
    </div>
  );
}

function FlyoutBtn({ onClick, title, children, t }: { onClick: () => void; title: string; children: React.ReactNode; t: ReturnType<typeof getTheme> }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: t.btnBg,
        color: t.btnText,
        border: `1px solid ${t.btnBorder}`,
        borderRadius: 5,
        width: 34,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >{children}</button>
  );
}

// ── SVG icons (18×18) ──────────────────────────────────────────────────────

function TableIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke={color} strokeWidth="1.5" />
      <line x1="1" y1="5" x2="15" y2="5" stroke={color} strokeWidth="1.2" />
      <line x1="1" y1="9" x2="15" y2="9" stroke={color} strokeWidth="1.2" />
      <line x1="6" y1="5" x2="6" y2="15" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function RegionIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="10" rx="1.5" stroke={color} strokeWidth="1.5" />
      <path d="M4 14l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="6" x2="12" y2="6" stroke={color} strokeWidth="1.2" />
      <line x1="4" y1="9" x2="9" y2="9" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function LayoutVertIcon({ color }: { color: string }) {
  // Top-to-bottom flow: one node on top, arrow down, two nodes below
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      {/* top node */}
      <rect x="4" y="1" width="8" height="3.5" rx="1" stroke={color} strokeWidth="1.3" />
      {/* arrow down */}
      <line x1="8" y1="4.5" x2="8" y2="7.5" stroke={color} strokeWidth="1.2" />
      <polyline points="6.5,6.5 8,8 9.5,6.5" stroke={color} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* bottom-left node */}
      <rect x="1" y="8" width="6" height="3.5" rx="1" stroke={color} strokeWidth="1.3" />
      {/* bottom-right node */}
      <rect x="9" y="8" width="6" height="3.5" rx="1" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

function LayoutHorizIcon({ color }: { color: string }) {
  // Left-to-right flow: one node on left, arrow right, two nodes stacked on right
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      {/* left node */}
      <rect x="1" y="4" width="4" height="8" rx="1" stroke={color} strokeWidth="1.3" />
      {/* arrow right */}
      <line x1="5" y1="8" x2="8" y2="8" stroke={color} strokeWidth="1.2" />
      <polyline points="7,6.5 8.5,8 7,9.5" stroke={color} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
      {/* top-right node */}
      <rect x="9" y="2" width="6" height="3.5" rx="1" stroke={color} strokeWidth="1.3" />
      {/* bottom-right node */}
      <rect x="9" y="10" width="6" height="3.5" rx="1" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

function LayoutAutoIcon({ color }: { color: string }) {
  // Sparkle / magic wand — represents "smart auto pick"
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      {/* wand stick */}
      <line x1="3" y1="13" x2="10" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="1.5" y="11.5" width="3" height="3" rx="0.5" stroke={color} strokeWidth="1.2" />
      {/* sparkle rays around tip */}
      <line x1="11" y1="5" x2="11" y2="2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="5" x2="13.5" y2="5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="5" x2="13" y2="3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="5" x2="9" y2="3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DictIcon({ color }: { color: string }) {
  // Type catalog: small tag/label shapes representing named types
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      {/* top tag */}
      <path d="M2 2h7l3 3-3 3H2V2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      {/* dot inside top tag */}
      <circle cx="10.5" cy="5" r="0.9" fill={color} />
      {/* bottom tag */}
      <path d="M2 9h6l3 3-3 3H2v-6z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      {/* dot inside bottom tag */}
      <circle cx="9.5" cy="12" r="0.9" fill={color} />
    </svg>
  );
}

function CsvIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M3 1h7l4 4v10H3V1z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 1v4h4" stroke={color} strokeWidth="1.2" />
      <line x1="5" y1="9" x2="11" y2="9" stroke={color} strokeWidth="1.2" />
      <line x1="5" y1="12" x2="11" y2="12" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function SaveVersionIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h9l3 3v9H2V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="5" y="9" width="6" height="5" rx="0.5" stroke={color} strokeWidth="1.2" />
      <rect x="4" y="2" width="5" height="4" rx="0.5" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function VersionsIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
      <path d="M8 4v4l3 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
