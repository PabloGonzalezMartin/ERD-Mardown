import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
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
  const updateComment    = useDiagramStore((s) => s.updateComment);
  const deleteComment    = useDiagramStore((s) => s.deleteComment);
  const setLastCommentStyle = useUiStore((s) => s.setLastCommentStyle);

  const [editing, setEditing] = useState(() => !comment?.text);
  const [draft, setDraft] = useState('');
  const [colorBarOpen, setColorBarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoFocusRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) { (textareaRef as React.MutableRefObject<HTMLTextAreaElement>).current = el; el.focus(); }
  }, []);
  const nodeRef = useRef<HTMLDivElement>(null);
  const colorBarRef = useRef<HTMLDivElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);

  // Close color bar when clicking outside the picker panel and its toggle button
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

  useEffect(() => {
    if (editing) setTimeout(() => textareaRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textColor  = comment?.textColor  ?? DEFAULT_TEXT_COLOR;
  const bgColor    = comment?.bgColor    ?? DEFAULT_BG_COLOR;
  const fontSize   = comment?.fontSize   ?? DEFAULT_FONT_SIZE;
  const fontFamily = comment?.fontFamily ?? DEFAULT_FONT_FAMILY;

  const applyStyle = useCallback((patch: Parameters<typeof updateComment>[1]) => {
    updateComment(commentId, patch);
    setLastCommentStyle({
      ...(patch.textColor  !== undefined && { textColor:  patch.textColor }),
      ...(patch.bgColor    !== undefined && { bgColor:    patch.bgColor }),
      ...(patch.fontSize   !== undefined && { fontSize:   patch.fontSize }),
      ...(patch.fontFamily !== undefined && { fontFamily: patch.fontFamily }),
    });
  }, [commentId, updateComment, setLastCommentStyle]);

  const startEdit = useCallback(() => {
    if (!comment) return;
    setDraft(comment.text);
    setEditing(true);
    setTimeout(() => { textareaRef.current?.focus(); }, 0);
  }, [comment]);

  const commitEdit = useCallback(() => {
    updateComment(commentId, { text: draft.trim() });
    setEditing(false);
  }, [draft, commentId, updateComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') { setEditing(false); }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
    },
    [commitEdit]
  );

  if (!comment) return null;

  const hasBackground = bgColor !== 'transparent' && bgColor !== '';
  const sharedTextStyle: React.CSSProperties = { fontSize, fontFamily };

  return (
    <div
      ref={nodeRef}
      style={{
        position: 'relative',
        padding: hasBackground ? '6px 8px' : '4px 8px',
        minWidth: 80,
        maxWidth: 320,
        cursor: 'default',
        outline: selected ? '1px dashed #4a90d9' : 'none',
        borderRadius: 4,
        background: bgColor || 'transparent',
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setColorBarOpen(false); startEdit(); }}
    >
      {editing ? (
        <textarea
          ref={comment.text === '' ? autoFocusRef : textareaRef}
          className="nodrag nopan nowheel"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          rows={Math.max(2, draft.split('\n').length)}
          style={{
            ...sharedTextStyle,
            background: 'transparent',
            color: textColor,
            border: '1px dashed #4a90d9',
            borderRadius: 3,
            padding: '2px 4px',
            resize: 'none',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            cursor: 'text',
            userSelect: 'text',
          }}
        />
      ) : (
        <span
          style={{
            ...sharedTextStyle,
            color: comment.text ? textColor : '#bbb',
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
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
                background: colorBarOpen ? '#4a90d9' : '#f0f0f0',
                color: colorBarOpen ? '#fff' : '#555',
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

      {colorBarOpen && !editing && (
            <div
              ref={colorBarRef}
              className="nodrag nopan nowheel"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: '6px 8px',
                boxShadow: '0 2px 8px rgba(0,0,0,.18)',
                zIndex: 10,
                minWidth: 200,
              }}
            >
              {/* Font size */}
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Font size</div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                {FONT_SIZES.map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontSize: s }); }}
                    style={{
                      minWidth: 26, height: 22, padding: '0 3px',
                      border: fontSize === s ? '2px solid #4a90d9' : '1px solid #ccc',
                      borderRadius: 3, cursor: 'pointer',
                      background: fontSize === s ? '#e8f0fe' : '#fafafa',
                      fontSize: 10, fontWeight: fontSize === s ? 700 : 400,
                      color: '#333',
                    }}
                  >{s}</button>
                ))}
              </div>

              {/* Font family */}
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Font</div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
                {FONT_FAMILIES.map(({ label, value }) => (
                  <button
                    key={value}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); applyStyle({ fontFamily: value }); }}
                    style={{
                      padding: '1px 6px', height: 22,
                      border: fontFamily === value ? '2px solid #4a90d9' : '1px solid #ccc',
                      borderRadius: 3, cursor: 'pointer',
                      background: fontFamily === value ? '#e8f0fe' : '#fafafa',
                      fontFamily: value, fontSize: 11,
                      color: '#333',
                    }}
                  >{label}</button>
                ))}
              </div>

              {/* Text color */}
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Text color</div>
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

              {/* Background color */}
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Background</div>
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
            </div>
          )}
    </div>
  );
});

CommentNode.displayName = 'CommentNode';
