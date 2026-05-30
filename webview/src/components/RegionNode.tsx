import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
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

  const [editing, setEditing]           = useState(false);
  const [draft, setDraft]               = useState('');
  const [styleBarOpen, setStyleBarOpen] = useState(false);
  const inputRef      = useRef<HTMLInputElement>(null);
  const nodeRef       = useRef<HTMLDivElement>(null);
  const styleBarRef   = useRef<HTMLDivElement>(null);
  const styleBtnRef   = useRef<HTMLButtonElement>(null);

  // Close style bar when clicking outside the picker panel and its toggle button
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

  const textColor   = region.textColor   ?? DEFAULT_TEXT_COLOR;
  const bgColor     = region.bgColor     ?? DEFAULT_BG_COLOR;
  const borderColor = region.borderColor ?? DEFAULT_BORDER_COLOR;
  const fontSize    = region.fontSize    ?? DEFAULT_FONT_SIZE;
  const fontFamily  = region.fontFamily  ?? DEFAULT_FONT_FAMILY;

  const borderStyle = selected ? `2px solid #4a90d9` : `2px dashed ${borderColor}`;

  return (
    <div
      ref={nodeRef}
      style={{
        width: '100%',
        height: '100%',
        border: borderStyle,
        borderRadius: 6,
        background: bgColor,
        boxSizing: 'border-box',
        pointerEvents: 'all',
        position: 'relative',
      }}
      onMouseDown={(e) => { if (styleBarOpen) e.stopPropagation(); }}
      onDoubleClick={(e) => { e.stopPropagation(); startEdit(); }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
      />

      {/* Style toolbar — show only when selected and not editing */}
      {selected && !editing && (
        <div
          className="nodrag nopan"
          style={{ position: 'absolute', top: -30, right: 0, display: 'flex', gap: 4, zIndex: 10 }}
        >
          <button
            ref={styleBtnRef}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setStyleBarOpen((o) => !o); }}
            style={{
              fontSize: 13, padding: '2px 8px', cursor: 'pointer',
              border: '1px solid #bbb', borderRadius: 4,
              background: styleBarOpen ? '#4a90d9' : '#f0f0f0',
              color: styleBarOpen ? '#fff' : '#555',
              lineHeight: 1.4,
            }}
            title="Style options"
          >🎨</button>
          <button
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteRegion(regionId); }}
            style={{
              fontSize: 13, padding: '2px 7px', cursor: 'pointer',
              border: 'none', borderRadius: 4,
              background: '#e55', color: '#fff',
              lineHeight: 1.4,
            }}
            title="Delete region"
          >✕</button>
        </div>
      )}

      {/* Style picker panel */}
      {styleBarOpen && !editing && (
        <div
          ref={styleBarRef}
          className="nodrag nopan nowheel"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 8,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 4,
            padding: '8px 10px',
            boxShadow: '0 2px 10px rgba(0,0,0,.2)',
            zIndex: 20,
            minWidth: 220,
          }}
        >
          {/* Font size */}
          <div style={pickerLabel}>Font size</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
            {FONT_SIZES.map((s) => (
              <button key={s} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontSize: s }); }}
                style={{ ...swatchBtn, border: fontSize === s ? '2px solid #4a90d9' : '1px solid #ccc', background: fontSize === s ? '#e8f0fe' : '#fafafa', minWidth: 28 }}
              >{s}</button>
            ))}
          </div>

          {/* Font family */}
          <div style={pickerLabel}>Font</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
            {FONT_FAMILIES.map(({ label, value }) => (
              <button key={value} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontFamily: value }); }}
                style={{ ...swatchBtn, border: fontFamily === value ? '2px solid #4a90d9' : '1px solid #ccc', background: fontFamily === value ? '#e8f0fe' : '#fafafa', fontFamily: value }}
              >{label}</button>
            ))}
          </div>

          {/* Text color */}
          <div style={pickerLabel}>Text color</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {TEXT_COLORS.map((c) => (
              <button key={c} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ textColor: c }); }}
                style={{ ...colorSwatch, background: c, border: textColor === c ? '2px solid #4a90d9' : '1px solid #ccc' }}
                title={c}
              />
            ))}
          </div>

          {/* Border color */}
          <div style={pickerLabel}>Border color</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {BORDER_COLORS.map((c) => (
              <button key={c} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ borderColor: c }); }}
                style={{ ...colorSwatch, background: c, border: borderColor === c ? '2px solid #4a90d9' : '1px solid #ccc' }}
                title={c}
              />
            ))}
          </div>

          {/* Background */}
          <div style={pickerLabel}>Background</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {BG_COLORS.map(({ value }) => (
              <button key={value} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ bgColor: value }); }}
                style={{ ...colorSwatch, background: value, border: bgColor === value ? '2px solid #4a90d9' : '1px solid #ccc' }}
                title={value}
              />
            ))}
          </div>
        </div>
      )}

      {/* Label */}
      <div style={{ position: 'absolute', top: 6, left: 10, right: 10 }}>
        {editing ? (
          <input
            ref={inputRef}
            className="nodrag nopan"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.6)',
              color: '#eee',
              border: '1px solid #4a90d9',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize,
              fontFamily,
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span
            style={{
              fontSize,
              fontFamily,
              fontWeight: 600,
              color: (selected && !styleBarOpen) ? '#4a90d9' : textColor,
              userSelect: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
          >
            {region.label}
          </span>
        )}
      </div>
    </div>
  );
});

RegionNode.displayName = 'RegionNode';

const pickerLabel: React.CSSProperties = { fontSize: 10, color: '#666', marginBottom: 4 };

const swatchBtn: React.CSSProperties = {
  height: 22, padding: '0 4px',
  borderRadius: 3, cursor: 'pointer',
  fontSize: 10, color: '#333',
};

const colorSwatch: React.CSSProperties = {
  width: 20, height: 20,
  borderRadius: 3, cursor: 'pointer',
  padding: 0, flexShrink: 0,
};
