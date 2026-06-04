import { memo, useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { readableColor } from '../util/colorUtils';
import type { RegionNodeType } from '../util/xyflowAdapters';

// Shared set of region IDs currently being resized — used to suppress
// position-change saves in DiagramCanvas during a resize drag
export const resizingRegions = new Set<string>();

const DEFAULT_TEXT_COLOR   = '#aaaaaa';
const DEFAULT_BG_COLOR     = 'rgba(120,120,180,0.06)';
const DEFAULT_BORDER_COLOR = '#888888';
const DEFAULT_FONT_SIZE    = 13;
const DEFAULT_FONT_FAMILY  = 'inherit';

const TEXT_COLORS = [
  '#aaaaaa', '#ffffff', '#333333',
  '#c0392b', '#e67e22', '#f1c40f',
  '#27ae60', '#2980b9', '#8e44ad',
];

const BG_COLORS = [
  { value: 'rgba(120,120,180,0.06)' },
  { value: 'rgba(74,144,217,0.10)' },
  { value: 'rgba(255,255,255,0.08)' },
  { value: 'rgba(255,200,100,0.12)' },
  { value: 'rgba(100,200,100,0.10)' },
  { value: 'rgba(200,100,100,0.10)' },
  { value: 'rgba(200,100,200,0.10)' },
  { value: '#1a2a3a' },
  { value: '#2a1a1a' },
];

const BORDER_COLORS = [
  '#888888', '#4a90d9', '#ffffff',
  '#c0392b', '#e67e22', '#f1c40f',
  '#27ae60', '#8e44ad', '#555555',
];

const FONT_SIZES = [11, 13, 16, 20, 26];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Default', value: 'inherit' },
  { label: 'Sans',    value: 'Arial, sans-serif' },
  { label: 'Serif',   value: 'Georgia, serif' },
  { label: 'Mono',    value: 'monospace' },
];

export const RegionNode = memo(({ data, selected }: NodeProps<RegionNodeType>) => {
  const regionId = data.regionId;
  const region = useDiagramStore((s) =>
    s.model.layout.regions.find((r) => r.id === regionId)
  );
  const updateRegion       = useDiagramStore((s) => s.updateRegion);
  const updateRegionLayout = useDiagramStore((s) => s.updateRegionLayout);
  const deleteRegion       = useDiagramStore((s) => s.deleteRegion);
  const theme              = useUiStore((s) => s.theme);

  const isDark     = theme === 'dark';
  const titleBg    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const iconColor  = isDark ? '#cccccc' : '#555555';
  const mutedColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

  const [editing, setEditing]           = useState(false);
  const [draft, setDraft]               = useState('');
  const [styleBarOpen, setStyleBarOpen] = useState(false);
  const [titleHovered, setTitleHovered] = useState(false);
  const [pickerPos, setPickerPos]       = useState({ x: 0, y: 0 });
  const inputRef    = useRef<HTMLInputElement>(null);
  const nodeRef     = useRef<HTMLDivElement>(null);
  const styleBarRef = useRef<HTMLDivElement>(null);
  const styleBtnRef = useRef<HTMLButtonElement>(null);

  // Recompute picker position whenever it opens or the node moves
  useLayoutEffect(() => {
    if (!styleBarOpen || !styleBtnRef.current) return;
    const r = styleBtnRef.current.getBoundingClientRect();
    setPickerPos({ x: r.left, y: r.bottom + 4 });
  }, [styleBarOpen]);

  useEffect(() => {
    if (!styleBarOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        !styleBarRef.current?.contains(e.target as Node) &&
        !styleBtnRef.current?.contains(e.target as Node)
      ) setStyleBarOpen(false);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [styleBarOpen]);

  const startEdit = useCallback(() => {
    if (!region) return;
    setDraft(region.label);
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, [region]);

  const commitEdit = useCallback(() => {
    updateRegion(regionId, { label: draft.trim() || 'Region' });
    setEditing(false);
  }, [draft, regionId, updateRegion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') setEditing(false);
    },
    [commitEdit]
  );

  const applyStyle = useCallback(
    (patch: Parameters<typeof updateRegion>[1]) => updateRegion(regionId, patch),
    [regionId, updateRegion]
  );

  const handleResizeStart = useCallback(() => {
    resizingRegions.add(regionId);
  }, [regionId]);

  const handleResizeEnd = useCallback(
    (_: unknown, params: ResizeParams) => {
      resizingRegions.delete(regionId);
      updateRegionLayout(regionId, params.x, params.y, params.width, params.height);
    },
    [regionId, updateRegionLayout]
  );

  if (!region) return null;

  const textColor        = region.textColor ?? DEFAULT_TEXT_COLOR;
  const displayTextColor = selected ? '#4a90d9' : readableColor(textColor, isDark);
  const bgColor     = region.bgColor     ?? DEFAULT_BG_COLOR;
  const borderColor = region.borderColor ?? DEFAULT_BORDER_COLOR;
  const fontSize    = region.fontSize    ?? DEFAULT_FONT_SIZE;
  const fontFamily  = region.fontFamily  ?? DEFAULT_FONT_FAMILY;

  const borderStyle = selected ? `2px solid #4a90d9` : `2px dashed ${borderColor}`;
  const titlebarH   = Math.max(28, fontSize + 14); // padding 7px top+bottom

  return (
    <div
      ref={nodeRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={titlebarH + 40}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />

      {/* Outer border + background — pointer events off so interior stays clickable */}
      <div style={{
        position: 'absolute', inset: 0,
        border: borderStyle,
        borderRadius: 6,
        background: bgColor,
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }} />

      {/* ── Title bar ── drag handle + label + actions ── */}
      <div
        className="region-interactive"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: titlebarH,
          borderRadius: '4px 4px 0 0',
          background: titleBg,
          borderBottom: `1px solid ${selected ? '#4a90d9' : borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 6px',
          cursor: 'grab',
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
        onMouseEnter={() => setTitleHovered(true)}
        onMouseLeave={() => setTitleHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('er:selectRegion', { detail: { regionId } }));
        }}
      >
        {/* Drag hint dots */}
        <span style={{ color: mutedColor, fontSize: 12, letterSpacing: 1, flexShrink: 0, userSelect: 'none' }}>
          ⠿
        </span>

        {/* Label / edit input */}
        {editing ? (
          <input
            ref={inputRef}
            className="nodrag nopan"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, minWidth: 0,
              background: 'rgba(0,0,0,0.5)',
              color: '#eee',
              border: '1px solid #4a90d9',
              borderRadius: 3,
              padding: '1px 5px',
              fontSize,
              fontFamily,
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span
            onDoubleClick={(e) => { e.stopPropagation(); startEdit(); }}
            style={{
              flex: 1, minWidth: 0,
              fontSize,
              fontFamily,
              fontWeight: 600,
              color: displayTextColor,
              userSelect: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'grab',
            }}
          >
            {region.label}
          </span>
        )}

        {/* Action buttons — visible on hover or when style picker is open */}
        {!editing && (titleHovered || styleBarOpen) && (
          <div className="nodrag nopan" style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {/* Style picker toggle */}
            <button
              ref={styleBtnRef}
              title="Style options"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setStyleBarOpen((o) => !o); }}
              style={{ ...iconBtn, background: styleBarOpen ? '#4a90d9' : (iconBtn.background as string) }}
            >
              <span style={{ fontSize: 12, lineHeight: 1, color: styleBarOpen ? '#fff' : iconColor }}>🎨</span>
            </button>

            {/* Delete */}
            <button
              title="Delete region"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteRegion(regionId); }}
              style={{ ...iconBtn, background: '#e55' }}
            >
              <span style={{ fontSize: 11, lineHeight: 1, color: '#fff' }}>✕</span>
            </button>
          </div>
        )}
      </div>

      {/* Style picker panel — rendered via portal so it escapes ReactFlow's stacking context */}
      {styleBarOpen && !editing && createPortal(
        <div
          ref={styleBarRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: pickerPos.x,
            top: pickerPos.y,
            background: isDark ? '#2a2a2a' : '#fff',
            border: `1px solid ${isDark ? '#444' : '#ddd'}`,
            borderRadius: 4,
            padding: '8px 10px',
            boxShadow: '0 4px 20px rgba(0,0,0,.35)',
            zIndex: 99999,
            minWidth: 220,
            color: isDark ? '#eee' : '#333',
          }}
        >
          <div style={pickerLabel}>Font size</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
            {FONT_SIZES.map((s) => (
              <button key={s} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontSize: s }); }}
                style={{ ...swatchBtn, border: fontSize === s ? '2px solid #4a90d9' : '1px solid #ccc', background: fontSize === s ? '#e8f0fe' : (isDark ? '#3a3a3a' : '#fafafa'), minWidth: 28, color: isDark ? '#eee' : '#333' }}
              >{s}</button>
            ))}
          </div>

          <div style={pickerLabel}>Font</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
            {FONT_FAMILIES.map(({ label, value }) => (
              <button key={value} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontFamily: value }); }}
                style={{ ...swatchBtn, border: fontFamily === value ? '2px solid #4a90d9' : '1px solid #ccc', background: fontFamily === value ? '#e8f0fe' : (isDark ? '#3a3a3a' : '#fafafa'), fontFamily: value, color: isDark ? '#eee' : '#333' }}
              >{label}</button>
            ))}
          </div>

          <div style={pickerLabel}>Text color</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {TEXT_COLORS.map((c) => (
              <button key={c} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ textColor: c }); }}
                style={{ ...colorSwatch, background: c, border: textColor === c ? '2px solid #4a90d9' : '1px solid #ccc' }}
                title={c}
              />
            ))}
          </div>

          <div style={pickerLabel}>Border color</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {BORDER_COLORS.map((c) => (
              <button key={c} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ borderColor: c }); }}
                style={{ ...colorSwatch, background: c, border: borderColor === c ? '2px solid #4a90d9' : '1px solid #ccc' }}
                title={c}
              />
            ))}
          </div>

          <div style={pickerLabel}>Background</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {BG_COLORS.map(({ value }) => (
              <button key={value} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ bgColor: value }); }}
                style={{ ...colorSwatch, background: value, border: bgColor === value ? '2px solid #4a90d9' : '1px solid #ccc' }}
                title={value}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

RegionNode.displayName = 'RegionNode';

const pickerLabel: React.CSSProperties = { fontSize: 10, color: '#888', marginBottom: 4 };

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 20, height: 20, padding: 0, cursor: 'pointer',
  border: 'none', borderRadius: 3,
  background: 'transparent',
  flexShrink: 0,
};

const swatchBtn: React.CSSProperties = {
  height: 22, padding: '0 4px',
  borderRadius: 3, cursor: 'pointer',
  fontSize: 10,
};

const colorSwatch: React.CSSProperties = {
  width: 20, height: 20,
  borderRadius: 3, cursor: 'pointer',
  padding: 0, flexShrink: 0,
};
