import { BOARD_SIZE, EMPTY, type Stone, type Player } from "../constants";
import { getValidMoves } from "../logic";

/**
 * Positional weight table for Othello.
 * Corners are most valuable; X-squares and C-squares are dangerous when the corner is empty.
 */
const POSITION_WEIGHTS = [
  [120, -20,  20,   5,   5,  20, -20, 120],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [120, -20,  20,   5,   5,  20, -20, 120],
];

/** Corner positions */
const CORNERS: [number, number][] = [
  [0, 0],
  [0, 7],
  [7, 0],
  [7, 7],
];

/** X-squares (diagonal to corners) */
const X_SQUARES: [number, number, number, number][] = [
  // [x-row, x-col, corner-row, corner-col]
  [1, 1, 0, 0],
  [1, 6, 0, 7],
  [6, 1, 7, 0],
  [6, 6, 7, 7],
];

/** C-squares (adjacent to corners along edges) */
const C_SQUARES: [number, number, number, number][] = [
  // [c-row, c-col, corner-row, corner-col]
  [0, 1, 0, 0],
  [1, 0, 0, 0],
  [0, 6, 0, 7],
  [1, 7, 0, 7],
  [6, 0, 7, 0],
  [7, 1, 7, 0],
  [6, 7, 7, 7],
  [7, 6, 7, 7],
];

/**
 * Count discs on the board.
 */
function countDiscs(board: Stone[][]): { black: number; white: number; empty: number } {
  let black = 0;
  let white = 0;
  let empty = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r]![c]!;
      if (cell === 1) black++;
      else if (cell === 2) white++;
      else empty++;
    }
  }
  return { black, white, empty };
}

/**
 * Evaluate the board from the perspective of `aiPlayer`.
 * Positive = advantage for AI, negative = advantage for opponent.
 *
 * Combines multiple heuristics with phase-dependent weighting:
 * - Corner control
 * - Positional weights (with X/C-square danger penalty)
 * - Mobility (available moves)
 * - Disc parity (more important in endgame)
 * - Stability (edges adjacent to owned corners)
 */
export function evaluate(board: Stone[][], aiPlayer: Player): number {
  const opponent: Player = aiPlayer === 1 ? 2 : 1;
  const { black, white, empty } = countDiscs(board);

  const aiDiscs = aiPlayer === 1 ? black : white;
  const oppDiscs = aiPlayer === 1 ? white : black;
  const totalDiscs = aiDiscs + oppDiscs;

  // Game phase: 0.0 (opening) to 1.0 (endgame)
  const phase = totalDiscs / 64;

  let score = 0;

  // ── Corner control: +25 per corner ──
  for (const [cr, cc] of CORNERS) {
    const cell = board[cr]![cc]!;
    if (cell === aiPlayer) score += 25;
    else if (cell === opponent) score -= 25;
  }

  // ── X-square and C-square danger penalty ──
  for (const [xr, xc, cr, cc] of X_SQUARES) {
    if (board[cr]![cc] === EMPTY) {
      const cell = board[xr]![xc]!;
      if (cell === aiPlayer) score -= 15;
      else if (cell === opponent) score += 15;
    }
  }

  for (const [sr, sc, cr, cc] of C_SQUARES) {
    if (board[cr]![cc] === EMPTY) {
      const cell = board[sr]![sc]!;
      if (cell === aiPlayer) score -= 10;
      else if (cell === opponent) score += 10;
    }
  }

  // ── Positional weight (more important early/mid game) ──
  const posWeight = 1 - phase * 0.5; // fades from 1.0 to 0.5
  let posScore = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r]![c]!;
      if (cell === aiPlayer) posScore += POSITION_WEIGHTS[r]![c]!;
      else if (cell === opponent) posScore -= POSITION_WEIGHTS[r]![c]!;
    }
  }
  score += posScore * posWeight;

  // ── Mobility: +3 per available move ──
  const aiMoves = getValidMoves(board, aiPlayer).length;
  const oppMoves = getValidMoves(board, opponent).length;
  const mobilityWeight = 3 * (1 - phase * 0.5); // fades slightly in endgame
  score += (aiMoves - oppMoves) * mobilityWeight;

  // ── Edge control: +5 per edge piece ──
  for (let i = 0; i < BOARD_SIZE; i++) {
    // Top edge
    if (board[0]![i] === aiPlayer) score += 5;
    else if (board[0]![i] === opponent) score -= 5;
    // Bottom edge
    if (board[7]![i] === aiPlayer) score += 5;
    else if (board[7]![i] === opponent) score -= 5;
    // Left edge (skip corners already counted)
    if (i > 0 && i < 7) {
      if (board[i]![0] === aiPlayer) score += 5;
      else if (board[i]![0] === opponent) score -= 5;
    }
    // Right edge
    if (i > 0 && i < 7) {
      if (board[i]![7] === aiPlayer) score += 5;
      else if (board[i]![7] === opponent) score -= 5;
    }
  }

  // ── Stability: stable discs adjacent to owned corners along edges ──
  for (const [cr, cc] of CORNERS) {
    const cornerOwner = board[cr]![cc]!;
    if (cornerOwner === EMPTY) continue;

    const sign = cornerOwner === aiPlayer ? 10 : -10;
    const dr = cr === 0 ? 1 : -1;
    const dc = cc === 0 ? 1 : -1;

    // Scan along row from corner
    for (let c = cc + dc; c >= 0 && c < BOARD_SIZE; c += dc) {
      if (board[cr]![c] !== cornerOwner) break;
      score += sign;
    }
    // Scan along column from corner
    for (let r = cr + dr; r >= 0 && r < BOARD_SIZE; r += dr) {
      if (board[r]![cc] !== cornerOwner) break;
      score += sign;
    }
  }

  // ── Disc parity (more important in endgame) ──
  const parityWeight = phase * 2; // grows from 0 to 2
  score += (aiDiscs - oppDiscs) * parityWeight;

  // ── Endgame: if game is over, decisive score ──
  if (empty === 0 || (aiMoves === 0 && oppMoves === 0)) {
    if (aiDiscs > oppDiscs) return 100_000 + (aiDiscs - oppDiscs);
    if (oppDiscs > aiDiscs) return -100_000 - (oppDiscs - aiDiscs);
    return 0;
  }

  return score;
}
