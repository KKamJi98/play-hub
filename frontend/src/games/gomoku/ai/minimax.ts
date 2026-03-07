import {
  BOARD_SIZE,
  EMPTY,
  DIFFICULTY_DEPTH,
  type Stone,
  type Player,
  type Difficulty,
} from "../constants";
import { evaluate, hasFive } from "./evaluate";

interface Move {
  row: number;
  col: number;
}

export interface AIResult {
  move: Move;
  stats: {
    nodesSearched: number;
    timeMs: number;
  };
}

const TIME_LIMIT_MS = 5000;

/**
 * Get candidate moves: only empty cells within 2 squares of any existing stone.
 * If the board is empty, return center.
 */
function getCandidateMoves(board: Stone[][]): Move[] {
  const candidates = new Set<string>();
  let hasStone = false;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c] !== EMPTY) {
        hasStone = true;
        // Add empty cells within radius 2
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (
              nr >= 0 &&
              nr < BOARD_SIZE &&
              nc >= 0 &&
              nc < BOARD_SIZE &&
              board[nr]![nc] === EMPTY
            ) {
              candidates.add(`${nr},${nc}`);
            }
          }
        }
      }
    }
  }

  if (!hasStone) {
    const center = Math.floor(BOARD_SIZE / 2);
    return [{ row: center, col: center }];
  }

  return Array.from(candidates).map((key) => {
    const [r, c] = key.split(",").map(Number);
    return { row: r!, col: c! };
  });
}

/**
 * Quick heuristic score for move ordering (higher = try first).
 */
function quickMoveScore(board: Stone[][], row: number, col: number, player: Player): number {
  const opponent: Player = player === 1 ? 2 : 1;
  let score = 0;

  // Prefer center
  const center = Math.floor(BOARD_SIZE / 2);
  const dist = Math.abs(row - center) + Math.abs(col - center);
  score -= dist;

  // Count adjacent friendly and enemy stones
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (board[nr]![nc] === player) score += 3;
        if (board[nr]![nc] === opponent) score += 2;
      }
    }
  }

  return score;
}

function minimax(
  board: Stone[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  startTime: number,
  stats: { nodesSearched: number },
): number {
  stats.nodesSearched++;

  const opponent: Player = aiPlayer === 1 ? 2 : 1;

  // Terminal checks
  if (hasFive(board, aiPlayer)) return 1_000_000 + depth;
  if (hasFive(board, opponent)) return -1_000_000 - depth;
  if (depth === 0 || Date.now() - startTime > TIME_LIMIT_MS) {
    return evaluate(board, aiPlayer);
  }

  const currentPlayer = isMaximizing ? aiPlayer : opponent;
  const candidates = getCandidateMoves(board);

  if (candidates.length === 0) return 0; // Draw

  // Move ordering: sort candidates by quick heuristic
  candidates.sort(
    (a, b) =>
      quickMoveScore(board, b.row, b.col, currentPlayer) -
      quickMoveScore(board, a.row, a.col, currentPlayer),
  );

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const { row, col } of candidates) {
      board[row]![col] = currentPlayer;
      const evalScore = minimax(board, depth - 1, alpha, beta, false, aiPlayer, startTime, stats);
      board[row]![col] = EMPTY;

      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha || Date.now() - startTime > TIME_LIMIT_MS) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { row, col } of candidates) {
      board[row]![col] = currentPlayer;
      const evalScore = minimax(board, depth - 1, alpha, beta, true, aiPlayer, startTime, stats);
      board[row]![col] = EMPTY;

      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha || Date.now() - startTime > TIME_LIMIT_MS) break;
    }
    return minEval;
  }
}

/**
 * Find the best move for the AI player using minimax with alpha-beta pruning.
 */
export function findBestMove(
  boardInput: Stone[][],
  difficulty: Difficulty,
  aiPlayer: Player,
): AIResult {
  const startTime = Date.now();
  const stats = { nodesSearched: 0 };
  const depth = DIFFICULTY_DEPTH[difficulty];

  // Clone board to avoid mutating the input
  const board: Stone[][] = boardInput.map((row) => [...row]);

  const candidates = getCandidateMoves(board);

  // Move ordering for root
  candidates.sort(
    (a, b) =>
      quickMoveScore(board, b.row, b.col, aiPlayer) -
      quickMoveScore(board, a.row, a.col, aiPlayer),
  );

  let bestMove = candidates[0]!;
  let bestScore = -Infinity;

  for (const { row, col } of candidates) {
    board[row]![col] = aiPlayer;
    const score = minimax(board, depth - 1, -Infinity, Infinity, false, aiPlayer, startTime, stats);
    board[row]![col] = EMPTY;

    if (score > bestScore) {
      bestScore = score;
      bestMove = { row, col };
    }

    if (Date.now() - startTime > TIME_LIMIT_MS) break;
  }

  return {
    move: bestMove,
    stats: {
      nodesSearched: stats.nodesSearched,
      timeMs: Date.now() - startTime,
    },
  };
}
