import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { useDiagramStore } from '../store/diagramStore';
import { useUiStore } from '../store/uiStore';
import { markerIds } from './CardinalityMarkers';
import type { RelationEdgeType } from '../util/xyflowAdapters';

function NoteIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="10" rx="1.5" stroke={color} strokeWidth="1.4" />
      <line x1="3.5" y1="4.5" x2="10.5" y2="4.5" stroke={color} strokeWidth="1.1" />
      <line x1="3.5" y1="7"   x2="10.5" y2="7"   stroke={color} strokeWidth="1.1" />
      <line x1="3.5" y1="9.5" x2="7.5"  y2="9.5" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}

export function RelationEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
}: EdgeProps<RelationEdgeType>) {
  const relationId   = data?.relationId;
  const relation           = useDiagramStore((s) => s.model.relations.find((r) => r.id === relationId));
  const headersOnly        = useUiStore((s) => s.headersOnly);
  const theme              = useUiStore((s) => s.theme);
  const searchQuery        = useUiStore((s) => s.searchQuery);
  const selectedRelationId = useUiStore((s) => s.selectedRelationId);
  const relationFocusActive = Boolean(selectedRelationId);
  const isThisSelected      = selectedRelationId === relationId;
  const [commentOpen, setCommentOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  useLayoutEffect(() => {
    if (!commentOpen || !badgeRef.current) return;
    const r = badgeRef.current.getBoundingClientRect();
    setPopoverPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
  }, [commentOpen, labelX, labelY]);

  const color    = selected ? '#4a90d9' : theme === 'dark' ? '#cccccc' : '#555';
  const isDashed = relation ? !relation.identifying : false;

  // In headers-only mode: same line style, just no markers
  const markers = (!headersOnly && relation)
    ? markerIds(relation.fromCardinality, relation.toCardinality)
    : { start: '', end: '' };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: isDashed ? '6 3' : undefined,
          opacity: (relationFocusActive && !isThisSelected) || searchQuery.trim() ? 0.12 : 1,
        }}
        markerStart={markers.start}
        markerEnd={markers.end}
      />
      <EdgeLabelRenderer>
        {/* FK badge — visible even in headers-only mode */}
        {relation?.hasForeignKey && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 9,
              background: '#e8f4e8',
              padding: '1px 4px',
              borderRadius: 3,
              border: '1px solid #6c9',
              color: '#396',
              pointerEvents: 'none',
            }}
          >
            FK
          </div>
        )}

        {/* Comment badge — visible even in headers-only mode */}
        {relation?.comment && (
          <div
            ref={badgeRef}
            className="nodrag nopan"
            onClick={(e) => { e.stopPropagation(); setCommentOpen((o) => !o); }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + (relation.hasForeignKey ? 18 : 0)}px)`,
              cursor: 'pointer',
              pointerEvents: 'all',
              userSelect: 'none',
              background: commentOpen ? '#fff9e6' : 'rgba(255,255,255,0.85)',
              border: `1px solid ${commentOpen ? '#f0c040' : '#ccc'}`,
              borderRadius: 4,
              padding: '2px 4px',
              lineHeight: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            title={commentOpen ? 'Hide comment' : relation.comment}
          >
            <NoteIcon color={commentOpen ? '#c8860a' : '#888'} />
          </div>
        )}
        {/* Popover rendered via portal so it escapes EdgeLabelRenderer's stacking context */}
        {commentOpen && relation?.comment && createPortal(
          <div style={{
            position: 'fixed',
            left: popoverPos.x,
            top: popoverPos.y,
            transform: 'translateX(-50%)',
            background: '#fffde7',
            border: '1px solid #f0c040',
            borderRadius: 4,
            padding: '7px 10px',
            fontSize: 12,
            color: '#555',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            minWidth: 160,
            maxWidth: 280,
            boxShadow: '0 2px 10px #0003',
            zIndex: 99999,
            pointerEvents: 'none',
            lineHeight: 1.5,
          }}>
            {relation.comment}
          </div>,
          document.body
        )}
      </EdgeLabelRenderer>
    </>
  );
}
