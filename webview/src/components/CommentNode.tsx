import { memo, useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeResizer, type NodeProps, type ResizeParams } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { readableColor } from '../util/colorUtils';
import type { CommentNodeType } from '../util/xyflowAdapters';

const DEFAULT_TEXT_COLOR = '#333333';
const DEFAULT_BG_COLOR = 'transparent';
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_FONT_FAMILY = 'inherit';

const TEXT_COLORS = [
  '#333333', '#888888', '#ffffff',
  '#c0392b', '#e67e22', '#f1c40f',
  '#27ae60', '#2980b9', '#8e44ad',
];

const BG_COLORS = [
  { value: 'transparent' },
  { value: '#fffde7' },
  { value: '#fff3e0' },
  { value: '#fce4ec' },
  { value: '#e8f5e9' },
  { value: '#e3f2fd' },
  { value: '#f3e5f5' },
  { value: '#37474f' },
  { value: '#1a237e' },
];

const FONT_SIZES = [11, 13, 16, 20, 26, 32];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Default',  value: 'inherit' },
  { label: 'Sans',     value: 'Arial, sans-serif' },
  { label: 'Serif',    value: 'Georgia, serif' },
  { label: 'Mono',     value: 'monospace' },
];

export const CommentNode = memo(({ data, selected }: NodeProps<CommentNodeType>) => {
  const commentId = data.commentId;
  const comment = useDiagramStore((s) =>
    (s.model.layout.comments ?? []).find((c) => c.id === commentId)
  );
  const updateComment       = useDiagramStore((s) => s.updateComment);
  const deleteComment       = useDiagramStore((s) => s.deleteComment);
  const updateCommentLayout = useDiagramStore((s) => s.updateCommentLayout);
  const setLastCommentStyle = useUiStore((s) => s.setLastCommentStyle);
  const theme               = useUiStore((s) => s.theme);
  const isDark              = theme === 'dark';

  const [editing, setEditing]           = useState(() => !comment?.text);
  const [draft, setDraft]               = useState('');
  const [colorBarOpen, setColorBarOpen] = useState(false);
  const [pickerPos, setPickerPos]       = useState({ x: 0, y: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorBarRef = useRef<HTMLDivElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  const resizeTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const autoFocusRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement>).current = el;
      el.focus();
      resizeTextarea(el);
    }
  }, [resizeTextarea]);

  useEffect(() => {
    if (!colorBarOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        !colorBarRef.current?.contains(e.target as Node) &&
        !colorBtnRef.current?.contains(e.target as Node)
      ) setColorBarOpen(false);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [colorBarOpen]);

  // Auto-focus on mount for new (empty) comments
  useEffect(() => {
    if (editing) setTimeout(() => {
      textareaRef.current?.focus();
      resizeTextarea(textareaRef.current);
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-resize textarea on every draft change
  useEffect(() => {
    if (editing) resizeTextarea(textareaRef.current);
  }, [editing, draft, resizeTextarea]);

  // Position picker below the 🎨 button
  useLayoutEffect(() => {
    if (!colorBarOpen || !colorBtnRef.current) return;
    const r = colorBtnRef.current.getBoundingClientRect();
    setPickerPos({ x: r.left, y: r.bottom + 4 });
  }, [colorBarOpen]);

  const textColor  = comment?.textColor  ?? DEFAULT_TEXT_COLOR;
  const bgColor    = comment?.bgColor    ?? DEFAULT_BG_COLOR;
  const fontSize   = comment?.fontSize   ?? DEFAULT_FONT_SIZE;
  const fontFamily = comment?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const hasWidth   = !!(comment?.width);
  const solidBg    = /^#[0-9a-fA-F]{6}$/.test(bgColor) ? bgColor : undefined;
  const displayTextColor = readableColor(textColor, isDark, solidBg);

  const applyStyle = useCallback((patch: Parameters<typeof updateComment>[1]) => {
    updateComment(commentId, patch);
    setLastCommentStyle({
      ...(patch.textColor  !== undefined && { textColor:  patch.textColor }),
      ...(patch.bgColor    !== undefined && { bgColor:    patch.bgColor }),
      ...(patch.fontSize   !== undefined && { fontSize:   patch.fontSize }),
      ...(patch.fontFamily !== undefined && { fontFamily: patch.fontFamily }),
    });
  }, [commentId, updateComment, setLastCommentStyle]);

  const handleResizeEnd = useCallback(
    (_: unknown, params: ResizeParams) => {
      updateCommentLayout(commentId, params.x, params.y, params.width);
    },
    [commentId, updateCommentLayout]
  );

  const startEdit = useCallback(() => {
    if (!comment) return;
    setDraft(comment.text);
    setEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      resizeTextarea(textareaRef.current);
    }, 0);
  }, [comment, resizeTextarea]);

  const commitEdit = useCallback(() => {
    updateComment(commentId, { text: draft.trim() });
    setEditing(false);
  }, [draft, commentId, updateComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      // Enter always inserts a newline — only Escape or blur commits
      if (e.key === 'Escape') { setEditing(false); }
    },
    []
  );

  if (!comment) return null;

  const hasBackground = bgColor !== 'transparent' && bgColor !== '';
  const sharedTextStyle: React.CSSProperties = { fontSize, fontFamily };

  return (
    <div
      style={{
        position: 'relative',
        padding: hasBackground ? '6px 8px' : '4px 8px',
        // No maxWidth: comment expands freely. When the user resizes, the ReactFlow
        // wrapper gets an explicit width and text wraps inside via wordBreak.
        minWidth: 60,
        width: hasWidth ? '100%' : undefined,
        cursor: 'default',
        border: selected ? '1px dashed #4a90d9' : '1px solid transparent',
        borderRadius: 4,
        background: bgColor || 'transparent',
        boxSizing: 'border-box',
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setColorBarOpen(false); startEdit(); }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={24}
        onResizeEnd={handleResizeEnd}
      />

      {editing ? (
        <textarea
          ref={comment.text === '' ? autoFocusRef : textareaRef}
          className="nodrag nopan nowheel"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); resizeTextarea(e.target); }}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{
            ...sharedTextStyle,
            background: 'transparent',
            color: displayTextColor,
            border: '1px dashed #4a90d9',
            borderRadius: 3,
            padding: '2px 4px',
            resize: 'none',
            overflow: 'hidden',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            cursor: 'text',
            userSelect: 'text',
            display: 'block',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
      ) : (
        <span
          style={{
            ...sharedTextStyle,
            color: comment.text ? displayTextColor : '#bbb',
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: 'block',
            fontStyle: comment.text ? 'normal' : 'italic',
          }}
        >
          {comment.text || 'Double-click to edit…'}
        </span>
      )}

      {selected && !editing && (
        <div
          className="nodrag nopan"
          style={{ position: 'absolute', top: -30, right: 0, display: 'flex', gap: 4 }}
        >
          <button
            ref={colorBtnRef}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setColorBarOpen((o) => !o); }}
            style={{
              fontSize: 13, padding: '2px 8px', cursor: 'pointer',
              border: '1px solid #bbb', borderRadius: 4,
              background: colorBarOpen ? '#4a90d9' : (isDark ? '#3a3a3a' : '#f0f0f0'),
              color: colorBarOpen ? '#fff' : (isDark ? '#ccc' : '#555'),
              lineHeight: 1.4,
            }}
            title="Style options"
          >🎨</button>
          <button
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteComment(commentId); }}
            style={{
              fontSize: 13, padding: '2px 7px', cursor: 'pointer',
              border: 'none', borderRadius: 4,
              background: '#e55', color: '#fff',
              lineHeight: 1.4,
            }}
            title="Delete comment"
          >✕</button>
        </div>
      )}

      {colorBarOpen && !editing && createPortal(
        <div
          ref={colorBarRef}
          className="nodrag nopan nowheel"
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
              <button
                key={s}
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontSize: s }); }}
                style={{
                  minWidth: 26, height: 22, padding: '0 3px',
                  border: fontSize === s ? '2px solid #4a90d9' : '1px solid #ccc',
                  borderRadius: 3, cursor: 'pointer',
                  background: fontSize === s ? '#e8f0fe' : (isDark ? '#3a3a3a' : '#fafafa'),
                  fontSize: 10, fontWeight: fontSize === s ? 700 : 400,
                  color: isDark ? '#eee' : '#333',
                }}
              >{s}</button>
            ))}
          </div>

          <div style={pickerLabel}>Font</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
            {FONT_FAMILIES.map(({ label, value }) => (
              <button
                key={value}
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontFamily: value }); }}
                style={{
                  padding: '1px 6px', height: 22,
                  border: fontFamily === value ? '2px solid #4a90d9' : '1px solid #ccc',
                  borderRadius: 3, cursor: 'pointer',
                  background: fontFamily === value ? '#e8f0fe' : (isDark ? '#3a3a3a' : '#fafafa'),
                  fontFamily: value, fontSize: 11,
                  color: isDark ? '#eee' : '#333',
                }}
              >{label}</button>
            ))}
          </div>

          <div style={pickerLabel}>Text color</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ textColor: c }); }}
                style={{
                  width: 20, height: 20,
                  background: c,
                  border: textColor === c ? '2px solid #4a90d9' : '1px solid #ccc',
                  borderRadius: 3, cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
                title={c}
              />
            ))}
          </div>

          <div style={pickerLabel}>Background</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {BG_COLORS.map(({ value }) => (
              <button
                key={value}
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ bgColor: value }); }}
                style={{
                  width: 20, height: 20,
                  background: value === 'transparent'
                    ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px'
                    : value,
                  border: bgColor === value ? '2px solid #4a90d9' : '1px solid #ccc',
                  borderRadius: 3, cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
                title={value === 'transparent' ? 'No background' : value}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

CommentNode.displayName = 'CommentNode';

const pickerLabel: React.CSSProperties = { fontSize: 10, color: '#888', marginBottom: 4 };
