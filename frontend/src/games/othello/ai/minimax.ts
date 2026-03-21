import {
  BOARD_SIZE,
  DIFFICULTY_DEPTH,
  type Stone,
  type Player,
  type Difficulty,
} from "../constants";
import { evaluate } from "./evaluate";
import { getValidMoves, applyMoveToBoard } from "../logic";

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
 * Check if the game is over (neither player can move).
 */
function isGameOver(board: Stone[][]): boolean {
  return (
    getValidMoves(board, 1 as Player).length === 0 &&
    getValidMoves(board, 2 as Player).length === 0
  );
}

/**
 * Count discs for final scoring.
 */
function countDiscs(board: Stone[][], player: Player): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c] === player) count++;
    }
  }
  return count;
}

/**
 * Quick heuristic for move ordering (higher = try first).
 * Prioritizes corners, edges, and avoids X/C-squares.
 */
const MOVE_ORDER_WEIGHTS = [
  [100, -20,  10,   5,   5,  10, -20, 100],
  [-20, -30,  -5,  -5,  -5,  -5, -30, -20],
  [ 10,  -5,   5,   1,   1,   5,  -5,  10],
  [  5,  -5,   1,   1,   1,   1,  -5,   5],
  [  5,  -5,   1,   1,   1,   1,  -5,   5],
  [ 10,  -5,   5,   1,   1,   5,  -5,  10],
  [-20, -30,  -5,  -5,  -5,  -5, -30, -20],
  [100, -20,  10,   5,   5,  10, -20, 100],
];

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
  const currentPlayer = isMaximizing ? aiPlayer : opponent;

  // Terminal checks
  if (isGameOver(board)) {
    const aiCount = countDiscs(board, aiPlayer);
    const oppCount = countDiscs(board, opponent);
    if (aiCount > oppCount) return 100_000 + aiCount - oppCount + depth;
    if (oppCount > aiCount) return -100_000 - (oppCount - aiCount) - depth;
    return 0;
  }

  if (depth === 0 || Date.now() - startTime > TIME_LIMIT_MS) {
    return evaluate(board, aiPlayer);
  }

  const moves = getValidMoves(board, currentPlayer);

  // If current player has no moves, pass turn (don't consume depth — pass isn't a real move)
  if (moves.length === 0) {
    return minimax(board, depth, alpha, beta, !isMaximizing, aiPlayer, startTime, stats);
  }

  // Move ordering
  moves.sort(
    (a, b) => MOVE_ORDER_WEIGHTS[b.row]![b.col]! - MOVE_ORDER_WEIGHTS[a.row]![a.col]!,
  );

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const { row, col } of moves) {
      const newBoard = applyMoveToBoard(board, row, col, currentPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer, startTime, stats);

      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha || Date.now() - startTime > TIME_LIMIT_MS) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { row, col } of moves) {
      const newBoard = applyMoveToBoard(board, row, col, currentPlayer);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer, startTime, stats);

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

  const moves = getValidMoves(boardInput, aiPlayer);

  if (moves.length === 0) {
    // Should not happen if called properly; fallback
    return {
      move: { row: -1, col: -1 },
      stats: { nodesSearched: 0, timeMs: 0 },
    };
  }

  // If only one move, skip search
  if (moves.length === 1) {
    return {
      move: moves[0]!,
      stats: { nodesSearched: 1, timeMs: Date.now() - startTime },
    };
  }

  // Move ordering for root
  moves.sort(
    (a, b) => MOVE_ORDER_WEIGHTS[b.row]![b.col]! - MOVE_ORDER_WEIGHTS[a.row]![a.col]!,
  );

  let bestMove = moves[0]!;
  let bestScore = -Infinity;

  for (const { row, col } of moves) {
    const newBoard = applyMoveToBoard(boardInput, row, col, aiPlayer);
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiPlayer, startTime, stats);

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
