import { useEffect, useRef, useCallback } from "react";
import type { LadderData, Waypoint } from "./generator";
import { PLAYER_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";

interface LadderCanvasProps {
  data: LadderData;
  revealedPaths: Set<number>;
  animatingPath: number | null;
  animationProgress: number;
  players: string[];
  prizes: string[];
}

const PADDING_X = 60;
const PADDING_TOP = 50;
const PADDING_BOTTOM = 50;
const COL_GAP = 80;
const MARKER_RADIUS = 8;

function getCanvasSize(columns: number) {
  const width = PADDING_X * 2 + (columns - 1) * COL_GAP;
  const height = PADDING_TOP + 400 + PADDING_BOTTOM;
  return { width, height };
}

function colX(col: number): number {
  return PADDING_X + col * COL_GAP;
}

function rowY(row: number, rows: number): number {
  return PADDING_TOP + (row / rows) * 400;
}

function waypointToSvg(wp: Waypoint, rows: number): { x: number; y: number } {
  return { x: colX(wp.x), y: rowY(wp.y, rows) };
}

export default function LadderCanvas({
  data,
  revealedPaths,
  animatingPath,
  animationProgress,
  players,
  prizes,
}: LadderCanvasProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { width, height } = getCanvasSize(data.columns);

  const lineColor = isDark ? "#334155" : "#cbd5e1";
  const bridgeColor = isDark ? "#475569" : "#94a3b8";
  const textColor = isDark ? "#e8ecf1" : "#1a1a2e";
  const subTextColor = isDark ? "#8892a4" : "#64748b";

  // Get the interpolated position along a path for animation
  const getAnimatedPosition = useCallback(
    (path: Waypoint[], progress: number) => {
      if (path.length < 2) {
        const wp = path[0];
        if (!wp) return { x: colX(0), y: rowY(0, data.rows) };
        return waypointToSvg(wp, data.rows);
      }

      // Calculate total path length
      const segments: { from: Waypoint; to: Waypoint; length: number }[] = [];
      let totalLength = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i]!;
        const to = path[i + 1]!;
        const fromSvg = waypointToSvg(from, data.rows);
        const toSvg = waypointToSvg(to, data.rows);
        const dx = toSvg.x - fromSvg.x;
        const dy = toSvg.y - fromSvg.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        segments.push({ from, to, length });
        totalLength += length;
      }

      const targetDist = progress * totalLength;
      let accumulated = 0;
      for (const seg of segments) {
        if (accumulated + seg.length >= targetDist) {
          const t = seg.length === 0 ? 0 : (targetDist - accumulated) / seg.length;
          const fromSvg = waypointToSvg(seg.from, data.rows);
          const toSvg = waypointToSvg(seg.to, data.rows);
          return {
            x: fromSvg.x + (toSvg.x - fromSvg.x) * t,
            y: fromSvg.y + (toSvg.y - fromSvg.y) * t,
          };
        }
        accumulated += seg.length;
      }

      const last = path[path.length - 1]!;
      return waypointToSvg(last, data.rows);
    },
    [data.rows],
  );

  // Build path SVG d string
  const buildPathD = useCallback(
    (path: Waypoint[]) => {
      if (path.length === 0) return "";
      const first = path[0]!;
      const start = waypointToSvg(first, data.rows);
      let d = `M ${start.x} ${start.y}`;
      for (let i = 1; i < path.length; i++) {
        const wp = path[i]!;
        const pt = waypointToSvg(wp, data.rows);
        d += ` L ${pt.x} ${pt.y}`;
      }
      return d;
    },
    [data.rows],
  );

  // Animating marker ref for smooth rAF-based glow
  const markerRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (animatingPath === null || !markerRef.current) return;
    const path = data.paths[animatingPath];
    if (!path) return;
    const pos = getAnimatedPosition(path, animationProgress);
    markerRef.current.setAttribute("cx", String(pos.x));
    markerRef.current.setAttribute("cy", String(pos.y));
  }, [animatingPath, animationProgress, data.paths, getAnimatedPosition]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 40}`}
      className="w-full max-w-2xl"
      style={{ maxHeight: "70vh" }}
    >
      {/* Player names at top */}
      {players.map((name, i) => (
        <text
          key={`name-${i}`}
          x={colX(i)}
          y={PADDING_TOP - 20}
          textAnchor="middle"
          fill={PLAYER_COLORS[i % PLAYER_COLORS.length]}
          fontSize="13"
          fontWeight="bold"
        >
          {name}
        </text>
      ))}

      {/* Vertical lines */}
      {Array.from({ length: data.columns }, (_, i) => (
        <line
          key={`vline-${i}`}
          x1={colX(i)}
          y1={rowY(0, data.rows)}
          x2={colX(i)}
          y2={rowY(data.rows, data.rows)}
          stroke={lineColor}
          strokeWidth={2}
        />
      ))}

      {/* Horizontal bridges */}
      {data.bridges.map((b, i) => (
        <line
          key={`bridge-${i}`}
          x1={colX(b.fromCol)}
          y1={rowY(b.row, data.rows)}
          x2={colX(b.toCol)}
          y2={rowY(b.row, data.rows)}
          stroke={bridgeColor}
          strokeWidth={2}
        />
      ))}

      {/* Revealed paths */}
      {Array.from(revealedPaths).map((colIdx) => {
        const path = data.paths[colIdx];
        if (!path) return null;
        const color = PLAYER_COLORS[colIdx % PLAYER_COLORS.length]!;
        return (
          <path
            key={`path-${colIdx}`}
            d={buildPathD(path)}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        );
      })}

      {/* Animating path (partial) */}
      {animatingPath !== null && data.paths[animatingPath] && (
        <>
          <path
            d={buildPathD(data.paths[animatingPath]!)}
            fill="none"
            stroke={PLAYER_COLORS[animatingPath % PLAYER_COLORS.length]}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - animationProgress)}
          />
          <circle
            ref={markerRef}
            r={MARKER_RADIUS}
            fill={PLAYER_COLORS[animatingPath % PLAYER_COLORS.length]}
            opacity={0.9}
          >
            <animate
              attributeName="r"
              values={`${MARKER_RADIUS};${MARKER_RADIUS + 3};${MARKER_RADIUS}`}
              dur="0.8s"
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}

      {/* Start markers */}
      {Array.from({ length: data.columns }, (_, i) => (
        <circle
          key={`start-${i}`}
          cx={colX(i)}
          cy={rowY(0, data.rows)}
          r={6}
          fill={PLAYER_COLORS[i % PLAYER_COLORS.length]}
        />
      ))}

      {/* End markers */}
      {Array.from({ length: data.columns }, (_, i) => (
        <circle
          key={`end-${i}`}
          cx={colX(i)}
          cy={rowY(data.rows, data.rows)}
          r={6}
          fill={isDark ? "#334155" : "#94a3b8"}
        />
      ))}

      {/* Prize labels at bottom */}
      {prizes.map((prize, i) => {
        // Check if any revealed path ends at this column
        const revealedForThis = Array.from(revealedPaths).find((startCol) => {
          return data.results[startCol] === i;
        });
        const highlightColor =
          revealedForThis !== undefined
            ? PLAYER_COLORS[revealedForThis % PLAYER_COLORS.length]
            : subTextColor;

        return (
          <text
            key={`prize-${i}`}
            x={colX(i)}
            y={rowY(data.rows, data.rows) + 25}
            textAnchor="middle"
            fill={highlightColor}
            fontSize="12"
            fontWeight={revealedForThis !== undefined ? "bold" : "normal"}
          >
            {prize}
          </text>
        );
      })}

      {/* Result connections for revealed */}
      {Array.from(revealedPaths).map((startCol) => {
        const endCol = data.results[startCol];
        if (endCol === undefined) return null;
        const color = PLAYER_COLORS[startCol % PLAYER_COLORS.length]!;
        return (
          <circle
            key={`result-${startCol}`}
            cx={colX(endCol)}
            cy={rowY(data.rows, data.rows)}
            r={6}
            fill={color}
          />
        );
      })}

      {/* Column numbers for reference */}
      {Array.from({ length: data.columns }, (_, i) => (
        <text
          key={`col-num-${i}`}
          x={colX(i)}
          y={PADDING_TOP - 35}
          textAnchor="middle"
          fill={textColor}
          fontSize="11"
          opacity={0.5}
        >
          {i + 1}
        </text>
      ))}
    </svg>
  );
}
