import {
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  DIRECTIONS,
  type Stone,
  type Player,
} from "./constants";

/**
 * Get all stones that would be flipped if `player` places at (row, col).
 */
export function getFlips(
  board: Stone[][],
  row: number,
  col: number,
  player: Player,
): { row: number; col: number }[] {
  if (board[row]![col] !== EMPTY) return [];

  const opponent: Player = player === BLACK ? WHITE : BLACK;
  const allFlips: { row: number; col: number }[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const dirFlips: { row: number; col: number }[] = [];
    let r = row + dr;
    let c = col + dc;

    // Walk along opponent stones
    while (
      r >= 0 &&
      r < BOARD_SIZE &&
      c >= 0 &&
      c < BOARD_SIZE &&
      board[r]![c] === opponent
    ) {
      dirFlips.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // Check if the line ends with our own stone
    if (
      dirFlips.length > 0 &&
      r >= 0 &&
      r < BOARD_SIZE &&
      c >= 0 &&
      c < BOARD_SIZE &&
      board[r]![c] === player
    ) {
      allFlips.push(...dirFlips);
    }
  }

  return allFlips;
}

/**
 * Get all valid moves for a player. A move is valid if it flips at least one stone.
 */
export function getValidMoves(
  board: Stone[][],
  player: Player,
): { row: number; col: number }[] {
  const moves: { row: number; col: number }[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c] === EMPTY && getFlips(board, r, c, player).length > 0) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

/**
 * Apply a move and return a new board (immutable).
 */
export function applyMoveToBoard(
  board: Stone[][],
  row: number,
  col: number,
  player: Player,
): Stone[][] {
  const flips = getFlips(board, row, col, player);
  const newBoard = board.map((r) => [...r]);
  newBoard[row]![col] = player;
  for (const { row: fr, col: fc } of flips) {
    newBoard[fr]![fc] = player;
  }
  return newBoard;
}

/**
 * Count stones for each player.
 */
export function countStones(board: Stone[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r]![c] === BLACK) black++;
      else if (board[r]![c] === WHITE) white++;
    }
  }
  return { black, white };
}
