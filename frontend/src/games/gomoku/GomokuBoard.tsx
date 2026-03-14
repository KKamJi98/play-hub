import { useState, useMemo } from "react";
import { BOARD_SIZE, EMPTY, BLACK, type Stone, type Player } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import { useCoarsePointer } from "../../hooks/useCoarsePointer";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

interface GomokuBoardProps {
  board: Stone[][];
  currentPlayer: Player;
  lastMove: { row: number; col: number } | null;
  winningLine: { row: number; col: number }[] | null;
  gameStatus: "waiting" | "playing" | "finished";
  aiThinking: boolean;
  onPlaceStone: (row: number, col: number) => void;
  forbiddenPositions?: Set<string>;
}

export default function GomokuBoard({
  board,
  currentPlayer,
  lastMove,
  winningLine,
  gameStatus,
  aiThinking,
  onPlaceStone,
  forbiddenPositions,
}: GomokuBoardProps) {
  const { theme } = useTheme();
  const { displayScale } = useDisplaySettings();
  const isCoarsePointer = useCoarsePointer();
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null);

  const winningSet = useMemo(() => {
    if (!winningLine) return new Set<string>();
    return new Set(winningLine.map((p) => `${p.row},${p.col}`));
  }, [winningLine]);

  const isInteractive = gameStatus === "playing" && !aiThinking;
  const isDark = theme === "dark";
  const boardMaxSize = Math.round(1200 * Math.min(displayScale, 1.15));

  // Board dimensions: CSS Grid based on intersection count
  const cellCount = BOARD_SIZE - 1;

  const activateCell = (row: number, col: number, cell: Stone) => {
    if (!isInteractive || cell !== EMPTY) return;

    // Don't allow placing on forbidden positions
    if (forbiddenPositions?.has(`${row},${col}`)) return;

    if (isCoarsePointer) {
      if (hoverPos?.row === row && hoverPos?.col === col) {
        onPlaceStone(row, col);
        setHoverPos(null);
        return;
      }

      setHoverPos({ row, col });
      return;
    }

    onPlaceStone(row, col);
  };

  return (
    <div className="flex w-full items-center justify-center p-2 sm:p-4">
      <div
        className="touch-manipulation relative select-none"
        style={{
          width: `min(100%, 95vw, 95dvh, ${boardMaxSize}px)`,
          aspectRatio: "1 / 1",
        }}
      >
        {/* Wood background */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: isDark
              ? `linear-gradient(135deg, #a0824a 0%, #b8965c 25%, #a07840 50%, #c4a060 75%, #a0824a 100%)`
              : `linear-gradient(135deg, #DEB887 0%, #D2B48C 25%, #DEB887 50%, #F5DEB3 75%, #DEB887 100%)`,
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        />

        {/* Subtle wood grain texture overlay */}
        <div
          className="absolute inset-0 rounded-lg opacity-10"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 3px,
              rgba(0,0,0,0.05) 3px,
              rgba(0,0,0,0.05) 4px
            )`,
          }}
        />

        {/* Grid area with padding */}
        <div
          className="absolute"
          style={{
            top: "5%",
            left: "5%",
            right: "5%",
            bottom: "5%",
          }}
        >
          {/* SVG grid lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${cellCount} ${cellCount}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal lines */}
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i}
                x2={cellCount}
                y2={i}
                stroke={isDark ? "#3d2b0f" : "#5c4a2a"}
                strokeWidth={i === 0 || i === cellCount ? 0.08 : 0.04}
              />
            ))}
            {/* Vertical lines */}
            {Array.from({ length: BOARD_SIZE }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i}
                y1={0}
                x2={i}
                y2={cellCount}
                stroke={isDark ? "#3d2b0f" : "#5c4a2a"}
                strokeWidth={i === 0 || i === cellCount ? 0.08 : 0.04}
              />
            ))}
            {/* Star points (hoshi) */}
            {[
              [3, 3],
              [3, 7],
              [3, 11],
              [7, 3],
              [7, 7],
              [7, 11],
              [11, 3],
              [11, 7],
              [11, 11],
            ].map(([r, c]) => (
              <circle
                key={`star-${r}-${c}`}
                cx={c}
                cy={r}
                r={0.12}
                fill={isDark ? "#3d2b0f" : "#5c4a2a"}
              />
            ))}
          </svg>

          {/* Intersection click targets & stones */}
          <div className="absolute inset-0">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isLastMove = lastMove?.row === r && lastMove?.col === c;
                const isWinning = winningSet.has(`${r},${c}`);
                const isForbidden = cell === EMPTY && forbiddenPositions?.has(`${r},${c}`);
                const isHovered =
                  isInteractive && hoverPos?.row === r && hoverPos?.col === c && cell === EMPTY;
                // Don't show hover preview on forbidden cells
                const showHoverPreview = isHovered && !isForbidden;

                const leftPct = (c / cellCount) * 100;
                const topPct = (r / cellCount) * 100;
                const cellSizePct = 100 / cellCount;

                return (
                  <div
                    key={`${r}-${c}`}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${cellSizePct}%`,
                      height: `${cellSizePct}%`,
                      transform: "translate(-50%, -50%)",
                      cursor:
                        isInteractive && cell === EMPTY && !isForbidden
                          ? "pointer"
                          : isInteractive && isForbidden
                            ? "not-allowed"
                            : "default",
                    }}
                    onClick={() => {
                      activateCell(r, c, cell);
                    }}
                    onMouseEnter={() => {
                      if (!isCoarsePointer && isInteractive && cell === EMPTY) {
                        setHoverPos({ row: r, col: c });
                      }
                    }}
                    onMouseLeave={() => {
                      if (!isCoarsePointer) {
                        setHoverPos(null);
                      }
                    }}
                  >
                    {/* Placed stone */}
                    {cell !== EMPTY && (
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: "85%",
                          height: "85%",
                          background:
                            cell === BLACK
                              ? "radial-gradient(circle at 35% 35%, #555, #111 60%, #000)"
                              : "radial-gradient(circle at 35% 35%, #fff, #e8e8e8 50%, #ccc)",
                          boxShadow:
                            cell === BLACK
                              ? "2px 2px 4px rgba(0,0,0,0.6)"
                              : "2px 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.1)",
                          animation: isWinning ? "pulse-stone 1s ease-in-out infinite" : undefined,
                          zIndex: 10,
                        }}
                      >
                        {/* Last move indicator */}
                        {isLastMove && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div
                              className="rounded-full"
                              style={{
                                width: "25%",
                                height: "25%",
                                background: cell === BLACK ? "#ff4444" : "#ff4444",
                                boxShadow: "0 0 4px rgba(255,68,68,0.6)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Forbidden position marker (red X) */}
                    {isForbidden && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{
                          width: "40%",
                          height: "40%",
                          opacity: 0.45,
                          zIndex: 4,
                        }}
                        viewBox="0 0 10 10"
                      >
                        <line x1="1" y1="1" x2="9" y2="9" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                        <line x1="9" y1="1" x2="1" y2="9" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}

                    {/* Hover preview */}
                    {showHoverPreview && (
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "85%",
                          height: "85%",
                          background:
                            currentPlayer === BLACK
                              ? "radial-gradient(circle at 35% 35%, #555, #111 60%, #000)"
                              : "radial-gradient(circle at 35% 35%, #fff, #e8e8e8 50%, #ccc)",
                          opacity: 0.4,
                          zIndex: 5,
                        }}
                      />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Inline keyframes for winning animation */}
      <style>{`
        @keyframes pulse-stone {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
