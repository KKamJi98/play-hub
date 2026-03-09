import { useState, useMemo, useRef, useEffect } from "react";
import { BOARD_SIZE, EMPTY, BLACK, type Stone, type Player } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import { useCoarsePointer } from "../../hooks/useCoarsePointer";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

interface OthelloBoardProps {
  board: Stone[][];
  currentPlayer: Player;
  lastMove: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  flippedStones: { row: number; col: number }[];
  gameStatus: "waiting" | "playing" | "finished";
  aiThinking: boolean;
  onPlaceStone: (row: number, col: number) => void;
}

export default function OthelloBoard({
  board,
  currentPlayer,
  lastMove,
  validMoves,
  flippedStones,
  gameStatus,
  aiThinking,
  onPlaceStone,
}: OthelloBoardProps) {
  const { theme } = useTheme();
  const { displayScale } = useDisplaySettings();
  const isCoarsePointer = useCoarsePointer();
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null);

  // Track flipped stones for animation
  const flippedSetRef = useRef(new Set<string>());
  const [animatingFlips, setAnimatingFlips] = useState(new Set<string>());

  useEffect(() => {
    if (flippedStones.length > 0) {
      const newSet = new Set(flippedStones.map((s) => `${s.row},${s.col}`));
      flippedSetRef.current = newSet;
      setAnimatingFlips(newSet);

      // Clear animation after it completes
      const timer = setTimeout(() => {
        setAnimatingFlips(new Set());
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [flippedStones]);

  const validMoveSet = useMemo(
    () => new Set(validMoves.map((m) => `${m.row},${m.col}`)),
    [validMoves],
  );

  const isInteractive = gameStatus === "playing" && !aiThinking;
  const isDark = theme === "dark";
  const boardMaxSize = Math.round(1100 * Math.min(displayScale, 1.15));

  const activateCell = (row: number, col: number, canClick: boolean) => {
    if (!canClick) return;

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
        {/* Green felt background */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #1a5c2e 0%, #2d6b3f 25%, #1e6332 50%, #2d7a45 75%, #1a5c2e 100%)"
              : "linear-gradient(135deg, #2d8b4e 0%, #3a9d5e 25%, #2d8b4e 50%, #4aad6e 75%, #2d8b4e 100%)",
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
              : "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        />

        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 rounded-lg opacity-5"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.1) 2px,
              rgba(0,0,0,0.1) 3px
            )`,
          }}
        />

        {/* Board grid area */}
        <div
          className="absolute"
          style={{
            top: "3%",
            left: "3%",
            right: "3%",
            bottom: "3%",
          }}
        >
          {/* Grid with cells */}
          <div
            className="absolute inset-0"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
              gap: "1px",
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const key = `${r},${c}`;
                const isLastMove = lastMove?.row === r && lastMove?.col === c;
                const isValidMove = validMoveSet.has(key);
                const isFlipping = animatingFlips.has(key);
                const isHovered =
                  isInteractive && hoverPos?.row === r && hoverPos?.col === c && isValidMove;
                const canClick = isInteractive && isValidMove;

                return (
                  <div
                    key={key}
                    className="relative flex items-center justify-center"
                    style={{
                      background: isDark
                        ? "rgba(0,0,0,0.15)"
                        : "rgba(0,0,0,0.08)",
                      border: `1px solid ${isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)"}`,
                      cursor: canClick ? "pointer" : "default",
                    }}
                    onClick={() => {
                      activateCell(r, c, canClick);
                    }}
                    onMouseEnter={() => {
                      if (!isCoarsePointer && canClick) {
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
                        className="absolute rounded-full othello-stone"
                        style={{
                          width: "82%",
                          height: "82%",
                          background:
                            cell === BLACK
                              ? "radial-gradient(circle at 35% 35%, #444, #111 55%, #000)"
                              : "radial-gradient(circle at 35% 35%, #fff, #f0f0f0 40%, #ddd 70%, #ccc)",
                          boxShadow:
                            cell === BLACK
                              ? "2px 2px 4px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.1)"
                              : "2px 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.1)",
                          zIndex: 10,
                          animation: isFlipping ? "othello-flip 0.5s ease-in-out" : undefined,
                          transition: "background 0.3s ease",
                        }}
                      >
                        {/* Last move indicator */}
                        {isLastMove && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className="rounded-full"
                              style={{
                                width: "22%",
                                height: "22%",
                                background: "#ff4444",
                                boxShadow: "0 0 4px rgba(255,68,68,0.6)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Valid move indicator (small dot) */}
                    {cell === EMPTY && isValidMove && !isHovered && gameStatus === "playing" && (
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "22%",
                          height: "22%",
                          background: isDark
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(0,0,0,0.2)",
                          zIndex: 5,
                        }}
                      />
                    )}

                    {/* Hover preview */}
                    {isHovered && cell === EMPTY && (
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                          width: "82%",
                          height: "82%",
                          background:
                            currentPlayer === BLACK
                              ? "radial-gradient(circle at 35% 35%, #444, #111 55%, #000)"
                              : "radial-gradient(circle at 35% 35%, #fff, #f0f0f0 40%, #ddd 70%, #ccc)",
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

      {/* Inline keyframes */}
      <style>{`
        @keyframes othello-flip {
          0% { transform: scaleX(1); }
          50% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
