/**
 * Renju Validator — International Gomoku Renju Rules
 *
 * Forbidden moves apply only to BLACK (player 1):
 *  - Overline:      6 or more consecutive BLACK stones
 *  - Double-four:   2 or more distinct fours in different directions
 *  - Double-three:  2 or more distinct open-threes in different directions
 *
 * A winning 5-in-a-row is NEVER forbidden, even if it would also form an
 * overline for WHITE — but BLACK's exact-5 wins while 6+ is forbidden.
 */

const BOARD_SIZE = 15;
const EMPTY = 0 as const;
const BLACK = 1 as const;

type Stone = 0 | 1 | 2;

const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal ↘
  [1, -1],  // anti-diagonal ↙
];

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Count consecutive BLACK stones passing through (row, col) in direction (dr, dc).
 * The stone at (row, col) is assumed to already be BLACK on the board.
 */
function countConsecutive(
  board: Stone[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
): number {
  let count = 1;

  // Forward
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === BLACK) {
    count++;
    r += dr;
    c += dc;
  }

  // Backward
  r = row - dr;
  c = col - dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === BLACK) {
    count++;
    r -= dr;
    c -= dc;
  }

  return count;
}

/**
 * Returns true if placing BLACK at (row, col) creates exactly 5 in a row
 * in ANY direction (not 6+).
 */
function isExactlyFive(board: Stone[][], row: number, col: number): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    if (countConsecutive(board, row, col, dr, dc) === 5) return true;
  }
  return false;
}

/**
 * Returns true if placing BLACK at (row, col) creates 6 or more in a row
 * in ANY direction.
 */
function isOverline(board: Stone[][], row: number, col: number): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    if (countConsecutive(board, row, col, dr, dc) >= 6) return true;
  }
  return false;
}

// ─── Four detection ──────────────────────────────────────────────────────────

/**
 * Check if the given direction forms a "four" for BLACK at (row, col).
 *
 * Strategy: scan a window of 9 cells centred on (row, col) along (dr, dc).
 * For each sliding window of 5 cells: if there are exactly 4 BLACK and 1 EMPTY,
 * check whether filling that EMPTY would make exactly 5 (not 6+).
 * Each direction contributes at most 1 four.
 */
function hasFourInDirection(
  board: Stone[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
): boolean {
  // Collect the 9-cell window: positions offset -4 .. +4
  const cells: { r: number; c: number; stone: Stone }[] = [];
  for (let i = -4; i <= 4; i++) {
    const r = row + i * dr;
    const c = col + i * dc;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      cells.push({ r, c, stone: board[r]![c]! });
    }
  }

  // Sliding window of 5
  for (let start = 0; start <= cells.length - 5; start++) {
    const window = cells.slice(start, start + 5);

    let blackCount = 0;
    let emptyIndex = -1;
    let blocked = false;

    for (let i = 0; i < 5; i++) {
      const s = window[i]!.stone;
      if (s === BLACK) {
        blackCount++;
      } else if (s === EMPTY) {
        if (emptyIndex === -1) {
          emptyIndex = i;
        } else {
          // More than one empty in window — not a four pattern
          blocked = true;
          break;
        }
      } else {
        // WHITE stone blocks — not a four pattern
        blocked = true;
        break;
      }
    }

    if (blocked || blackCount !== 4 || emptyIndex === -1) continue;

    // Tentatively fill the empty cell and verify it creates exactly 5
    const { r: er, c: ec } = window[emptyIndex]!;
    const prev = board[er]![ec]!;
    board[er]![ec] = BLACK;
    const exact5 = isExactlyFive(board, er, ec);
    board[er]![ec] = prev;

    if (exact5) return true;
  }

  return false;
}

/**
 * Count distinct directions that form a "four" for BLACK at (row, col).
 * (row, col) must already hold BLACK on the board.
 */
function countFours(board: Stone[][], row: number, col: number): number {
  let count = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (hasFourInDirection(board, row, col, dr, dc)) count++;
  }
  return count;
}

// ─── Open-three detection ─────────────────────────────────────────────────────

/**
 * Check if a four formed in direction (dr, dc) when BLACK placed at (er, ec)
 * is "open" — both ends of the run of 4 have empty cells so it can become 5.
 *
 * (er, ec) is already BLACK on the board at call time.
 */
function isFourOpen(
  board: Stone[][],
  er: number,
  ec: number,
  dr: number,
  dc: number,
): boolean {
  // Find the extent of the consecutive BLACK run through (er, ec) in this direction
  let minOffset = 0;
  let maxOffset = 0;

  let r = er + dr;
  let c = ec + dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === BLACK) {
    maxOffset++;
    r += dr;
    c += dc;
  }

  r = er - dr;
  c = ec - dc;
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === BLACK) {
    minOffset--;
    r -= dr;
    c -= dc;
  }

  // Check both ends
  const frontR = er + (maxOffset + 1) * dr;
  const frontC = ec + (maxOffset + 1) * dc;
  const backR = er + (minOffset - 1) * dr;
  const backC = ec + (minOffset - 1) * dc;

  const frontOpen =
    frontR >= 0 && frontR < BOARD_SIZE && frontC >= 0 && frontC < BOARD_SIZE &&
    board[frontR]![frontC] === EMPTY;
  const backOpen =
    backR >= 0 && backR < BOARD_SIZE && backC >= 0 && backC < BOARD_SIZE &&
    board[backR]![backC] === EMPTY;

  return frontOpen && backOpen;
}

/**
 * Check if direction (dr, dc) forms an "open three" for BLACK at (row, col).
 *
 * An open three exists when there is an empty cell E in the direction such that:
 *   1. Placing BLACK at E creates a four in that direction.
 *   2. That four is open (both ends empty).
 *   3. E is not itself a forbidden move (recursive check, depth limited).
 *
 * (row, col) already holds BLACK on the board.
 */
function hasOpenThreeInDirection(
  board: Stone[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  depth: number,
): boolean {
  // Scan cells in the range -4 .. +4 for EMPTY candidates
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue; // (row, col) itself is already BLACK
    const er = row + i * dr;
    const ec = col + i * dc;
    if (er < 0 || er >= BOARD_SIZE || ec < 0 || ec >= BOARD_SIZE) continue;
    if (board[er]![ec] !== EMPTY) continue;

    // Tentatively place BLACK at (er, ec)
    board[er]![ec] = BLACK;

    // Does this create a four in the same direction?
    const makesFour = hasFourInDirection(board, er, ec, dr, dc);

    if (makesFour) {
      // Is that four open?
      const open = isFourOpen(board, er, ec, dr, dc);

      if (open) {
        // Is (er, ec) itself NOT a forbidden move? (recursive, capped)
        let selfForbidden = false;
        if (depth > 0) {
          selfForbidden = isForbiddenMoveInternal(board, er, ec, depth - 1);
        }

        board[er]![ec] = EMPTY;

        if (!selfForbidden) return true;
        // else keep scanning
        continue;
      }
    }

    board[er]![ec] = EMPTY;
  }

  return false;
}

/**
 * Count distinct directions that form an "open three" for BLACK at (row, col).
 * (row, col) must already hold BLACK on the board.
 */
function countOpenThrees(
  board: Stone[][],
  row: number,
  col: number,
  depth: number,
): number {
  let count = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (hasOpenThreeInDirection(board, row, col, dr, dc, depth)) count++;
  }
  return count;
}

// ─── Main validator ───────────────────────────────────────────────────────────

const MAX_DEPTH = 5;

/**
 * Internal implementation — receives a `depth` argument for recursive calls.
 * (row, col) is assumed EMPTY before this call; the function temporarily
 * places BLACK there.
 */
function isForbiddenMoveInternal(
  board: Stone[][],
  row: number,
  col: number,
  depth: number,
): boolean {
  // Temporarily place BLACK
  board[row]![col] = BLACK;

  // Winning move (exactly 5) is never forbidden
  if (isExactlyFive(board, row, col)) {
    board[row]![col] = EMPTY;
    return false;
  }

  // Overline (6+) → forbidden
  if (isOverline(board, row, col)) {
    board[row]![col] = EMPTY;
    return true;
  }

  // Double-four → forbidden
  if (countFours(board, row, col) >= 2) {
    board[row]![col] = EMPTY;
    return true;
  }

  // Double-three → forbidden
  if (countOpenThrees(board, row, col, depth) >= 2) {
    board[row]![col] = EMPTY;
    return true;
  }

  board[row]![col] = EMPTY;
  return false;
}

/**
 * Returns true when placing BLACK at (row, col) is a forbidden move under
 * Renju rules.
 *
 * Preconditions:
 *  - (row, col) must be within bounds.
 *  - (row, col) must be empty on the board.
 */
export function isForbiddenMove(board: Stone[][], row: number, col: number): boolean {
  if (board[row]![col] !== EMPTY) return false;
  // Work on a shallow copy of each row so we can restore safely
  const copy: Stone[][] = board.map((r) => [...r]);
  return isForbiddenMoveInternal(copy, row, col, MAX_DEPTH);
}

/**
 * Returns a Set of "row,col" strings representing all currently forbidden
 * positions for BLACK.
 */
export function getAllForbiddenPositions(board: Stone[][]): Set<string> {
  const forbidden = new Set<string>();
  // Pre-clone board once; isForbiddenMoveInternal restores state via EMPTY write-back
  const copy: Stone[][] = board.map((r) => [...r]);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (copy[r]![c] === EMPTY) {
        if (isForbiddenMoveInternal(copy, r, c, MAX_DEPTH)) {
          forbidden.add(`${r},${c}`);
        }
      }
    }
  }
  return forbidden;
}
