// Crow's foot SVG marker definitions.
//
// Convention: all markers are drawn LEFT→RIGHT with the symbol tip pointing RIGHT.
// "end" markers attach to the target node  → orient="auto"               refX near right edge
// "start" markers attach to source node    → orient="auto-start-reverse" refX near right edge
//   (auto-start-reverse flips 180° so the tip still points AWAY from the node)
//
// Symbol legend (tip at right, toward node):
//   EXACTLY_ONE  : ||   two vertical bars
//   ZERO_OR_ONE  : o|   circle then one bar
//   ZERO_OR_MANY : o{   circle then crow-foot
//   ONE_OR_MANY  : |{   one bar then crow-foot
//
// We use markerUnits="userSpaceOnUse" so sizes are in canvas px (not stroke-width multiples).
// W = total marker width in canvas px.  The tip (rightmost element) sits at x=W-2.
// refX = W-2 so the tip lands exactly on the node edge.

const H  = 16;   // marker height (viewBox height), midpoint at H/2
const MID = H / 2;

// ── helpers ──────────────────────────────────────────────────────────────────

// Two vertical bars: inner bar at x=right-3, outer bar at x=right-7
function TwoBars({ right, color }: { right: number; color: string }) {
  return <>
    <line x1={right - 3} y1={2} x2={right - 3} y2={H - 2} stroke={color} strokeWidth="1.6" />
    <line x1={right - 7} y1={2} x2={right - 7} y2={H - 2} stroke={color} strokeWidth="1.6" />
  </>;
}

// One vertical bar at x=right-3
function OneBar({ right, color }: { right: number; color: string }) {
  return <line x1={right - 3} y1={2} x2={right - 3} y2={H - 2} stroke={color} strokeWidth="1.6" />;
}

// Circle centered at cx — fill with canvas-neutral colour so it's visible on both light and dark
function Circle({ cx, color }: { cx: number; color: string }) {
  return <circle cx={cx} cy={MID} r={3.5} fill="#f0f0f0" stroke={color} strokeWidth="1.5" />;
}

// Crow foot: three lines fanning from pivot to right edge
function CrowFoot({ pivot, right, color }: { pivot: number; right: number; color: string }) {
  return <>
    <line x1={pivot} y1={MID} x2={right} y2={2}      stroke={color} strokeWidth="1.5" />
    <line x1={pivot} y1={MID} x2={right} y2={MID}    stroke={color} strokeWidth="1.5" />
    <line x1={pivot} y1={MID} x2={right} y2={H - 2}  stroke={color} strokeWidth="1.5" />
  </>;
}

// ── marker factory ────────────────────────────────────────────────────────────

function Marker({
  id, W, refX, orient, children,
}: {
  id: string; W: number; refX: number; orient: string; children: React.ReactNode;
}) {
  return (
    <marker
      id={id}
      markerWidth={W}
      markerHeight={H}
      refX={refX}
      refY={MID}
      orient={orient}
      markerUnits="userSpaceOnUse"
    >
      {children}
    </marker>
  );
}

import { useUiStore } from '../store/uiStore';

export function CardinalityMarkers() {
  const theme = useUiStore((s) => s.theme);
  const COLOR = theme === 'dark' ? '#cccccc' : '#555';

  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'visible' }}>
      <defs>

        {/* ── EXACTLY_ONE  || ── W=10, tip at x=8 */}
        <Marker id="cf-exactly-one-end"   W={10} refX={8}  orient="auto">
          <TwoBars right={9} color={COLOR} />
        </Marker>
        <Marker id="cf-exactly-one-start" W={10} refX={8}  orient="auto-start-reverse">
          <TwoBars right={9} color={COLOR} />
        </Marker>

        {/* ── ZERO_OR_ONE  o| ── W=18, circle at x=4.5, bar near tip */}
        <Marker id="cf-zero-or-one-end"   W={18} refX={16} orient="auto">
          <Circle cx={5} color={COLOR} />
          <OneBar right={17} color={COLOR} />
        </Marker>
        <Marker id="cf-zero-or-one-start" W={18} refX={16} orient="auto-start-reverse">
          <Circle cx={5} color={COLOR} />
          <OneBar right={17} color={COLOR} />
        </Marker>

        {/* ── ZERO_OR_MANY  o{ ── W=20, circle at x=4.5, crow foot pivot at x=11 */}
        <Marker id="cf-zero-or-many-end"   W={20} refX={18} orient="auto">
          <Circle cx={5} color={COLOR} />
          <CrowFoot pivot={11} right={19} color={COLOR} />
        </Marker>
        <Marker id="cf-zero-or-many-start" W={20} refX={18} orient="auto-start-reverse">
          <Circle cx={5} color={COLOR} />
          <CrowFoot pivot={11} right={19} color={COLOR} />
        </Marker>

        {/* ── ONE_OR_MANY  |{ ── W=16, bar at x=3, crow foot pivot at x=7 */}
        <Marker id="cf-one-or-many-end"   W={16} refX={14} orient="auto">
          <OneBar right={4} color={COLOR} />
          <CrowFoot pivot={7} right={15} color={COLOR} />
        </Marker>
        <Marker id="cf-one-or-many-start" W={16} refX={14} orient="auto-start-reverse">
          <OneBar right={4} color={COLOR} />
          <CrowFoot pivot={7} right={15} color={COLOR} />
        </Marker>

      </defs>
    </svg>
  );
}

export type MarkerColor = 'default' | 'selected';

export function markerIds(
  fromCardinality: string,
  toCardinality: string,
): { start: string; end: string } {
  const key = (c: string) => {
    switch (c) {
      case 'EXACTLY_ONE':  return 'exactly-one';
      case 'ZERO_OR_ONE':  return 'zero-or-one';
      case 'ZERO_OR_MANY': return 'zero-or-many';
      case 'ONE_OR_MANY':  return 'one-or-many';
      default:             return 'exactly-one';
    }
  };
  return {
    start: `url(#cf-${key(fromCardinality)}-start)`,
    end:   `url(#cf-${key(toCardinality)}-end)`,
  };
}
