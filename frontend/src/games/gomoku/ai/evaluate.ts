import { BOARD_SIZE, EMPTY, DIRECTIONS, type Stone, type Player } from "../constants";

interface PatternCount {
  five: number;
  openFour: number;
  halfOpenFour: number;
  openThree: number;
  halfOpenThree: number;
  openTwo: number;
}

function emptyPattern(): PatternCount {
  return {
    five: 0,
    openFour: 0,
    halfOpenFour: 0,
    openThree: 0,
    halfOpenThree: 0,
    openTwo: 0,
  };
}

/**
 * Count consecutive stones and openness in a given direction.
 */
function analyzeDirection(
  board: Stone[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player,
): { count: number; openEnds: number } {
  let count = 1;
  let openEnds = 0;

  // Forward direction
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === EMPTY) {
    openEnds++;
  }

  // Backward direction
  r = row - dr;
  c = col - dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === player) {
    count++;
    r -= dr;
    c -= dc;
  }
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === EMPTY) {
    openEnds++;
  }

  return { count, openEnds };
}

function countPatterns(board: Stone[][], player: Player): PatternCount {
  const patterns = emptyPattern();
  const visited = new Set<string>();

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row]![col] !== player) continue;

      for (const [dr, dc] of DIRECTIONS) {
        // Skip if we already counted this line from another starting position
        // Find the start of this consecutive group
        let sr = row;
        let sc = col;
        while (
          sr - dr >= 0 &&
          sr - dr < BOARD_SIZE &&
          sc - dc >= 0 &&
          sc - dc < BOARD_SIZE &&
          board[sr - dr]![sc - dc] === player
        ) {
          sr -= dr;
          sc -= dc;
        }

        const key = `${sr},${sc},${dr},${dc}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const { count, openEnds } = analyzeDirection(board, sr, sc, dr, dc, player);

        if (count >= 5) {
          patterns.five++;
        } else if (count === 4) {
          if (openEnds === 2) patterns.openFour++;
          else if (openEnds === 1) patterns.halfOpenFour++;
        } else if (count === 3) {
          if (openEnds === 2) patterns.openThree++;
          else if (openEnds === 1) patterns.halfOpenThree++;
        } else if (count === 2) {
          if (openEnds === 2) patterns.openTwo++;
        }
      }
    }
  }

  return patterns;
}

function patternScore(p: PatternCount): number {
  return (
    p.five * 1_000_000 +
    p.openFour * 100_000 +
    p.halfOpenFour * 10_000 +
    p.openThree * 5_000 +
    p.halfOpenThree * 500 +
    p.openTwo * 100
  );
}

/**
 * Evaluate the board from the perspective of `aiPlayer`.
 * Positive = advantage for AI, negative = advantage for opponent.
 */
export function evaluate(board: Stone[][], aiPlayer: Player): number {
  const opponent: Player = aiPlayer === 1 ? 2 : 1;
  const aiPatterns = countPatterns(board, aiPlayer);
  const oppPatterns = countPatterns(board, opponent);
  return patternScore(aiPatterns) - patternScore(oppPatterns);
}

/**
 * Quick check: does the given player have five-in-a-row?
 */
export function hasFive(board: Stone[][], player: Player): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row]![col] !== player) continue;

      for (const [dr, dc] of DIRECTIONS) {
        let count = 1;
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === player) {
          count++;
          r += dr;
          c += dc;
        }
        if (count >= 5) return true;
      }
    }
  }
  return false;
}
