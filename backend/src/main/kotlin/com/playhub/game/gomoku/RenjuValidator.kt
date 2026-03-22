package com.playhub.game.gomoku

/**
 * Renju rule validator for the BLACK player.
 *
 * In Renju (international Gomoku rules), BLACK is subject to three forbidden move types:
 *   1. Overline  - 6 or more consecutive BLACK stones in any direction
 *   2. Double-four - two or more fours formed simultaneously
 *   3. Double-three - two or more open threes formed simultaneously
 *
 * A winning move (exactly 5) always overrides any forbidden-move classification.
 * WHITE has no restrictions.
 */
object RenjuValidator {

    const val BOARD_SIZE = 15
    const val EMPTY = 0
    const val BLACK = 1
    const val WHITE = 2

    private val DIRECTIONS = arrayOf(
        intArrayOf(0, 1),   // horizontal
        intArrayOf(1, 0),   // vertical
        intArrayOf(1, 1),   // diagonal (top-left to bottom-right)
        intArrayOf(1, -1)   // anti-diagonal (top-right to bottom-left)
    )

    /**
     * Returns true if placing BLACK at (row, col) on the given board would be a forbidden move.
     * The cell must currently be EMPTY.
     */
    fun isForbiddenMove(board: Array<IntArray>, row: Int, col: Int): Boolean {
        if (row !in 0 until BOARD_SIZE || col !in 0 until BOARD_SIZE) return false
        if (board[row][col] != EMPTY) return false

        // Temporarily place BLACK
        board[row][col] = BLACK

        val forbidden = try {
            // Winning move (exactly 5) is never forbidden
            if (isExactlyFive(board, row, col)) {
                false
            } else if (isOverline(board, row, col)) {
                true
            } else if (countFours(board, row, col) >= 2) {
                true
            } else if (countOpenThrees(board, row, col) >= 2) {
                true
            } else {
                false
            }
        } finally {
            // Always restore board regardless of exception
            board[row][col] = EMPTY
        }

        return forbidden
    }

    /**
     * Returns all EMPTY positions on the board where BLACK's move would be forbidden.
     */
    fun getAllForbiddenPositions(board: Array<IntArray>): List<Pair<Int, Int>> {
        val result = mutableListOf<Pair<Int, Int>>()
        for (r in 0 until BOARD_SIZE) {
            for (c in 0 until BOARD_SIZE) {
                if (board[r][c] == EMPTY && isForbiddenMove(board, r, c)) {
                    result.add(Pair(r, c))
                }
            }
        }
        return result
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * Returns true if the stone at (row, col) forms exactly 5 consecutive BLACK stones
     * in any direction. The stone at (row, col) must already be placed on the board.
     */
    private fun isExactlyFive(board: Array<IntArray>, row: Int, col: Int): Boolean {
        for (dir in DIRECTIONS) {
            val count = countConsecutive(board, row, col, dir[0], dir[1])
            if (count == 5) return true
        }
        return false
    }

    /**
     * Returns true if the stone at (row, col) forms 6 or more consecutive BLACK stones
     * in any direction. The stone at (row, col) must already be placed on the board.
     */
    private fun isOverline(board: Array<IntArray>, row: Int, col: Int): Boolean {
        for (dir in DIRECTIONS) {
            val count = countConsecutive(board, row, col, dir[0], dir[1])
            if (count >= 6) return true
        }
        return false
    }

    /**
     * Counts consecutive BLACK stones through (row, col) in the axis defined by (dr, dc).
     * Counts in both the (dr, dc) and (-dr, -dc) directions, including the stone at (row, col).
     * The stone at (row, col) must already be BLACK.
     */
    private fun countConsecutive(board: Array<IntArray>, row: Int, col: Int, dr: Int, dc: Int): Int {
        var count = 1 // include (row, col) itself
        // Forward direction
        var r = row + dr
        var c = col + dc
        while (r in 0 until BOARD_SIZE && c in 0 until BOARD_SIZE && board[r][c] == BLACK) {
            count++
            r += dr
            c += dc
        }
        // Backward direction
        r = row - dr
        c = col - dc
        while (r in 0 until BOARD_SIZE && c in 0 until BOARD_SIZE && board[r][c] == BLACK) {
            count++
            r -= dr
            c -= dc
        }
        return count
    }

    /**
     * Counts how many distinct directions form a "four" through (row, col).
     * A four means: there exists exactly one empty cell along the line such that filling it
     * would create exactly 5 consecutive BLACK stones (not overline).
     *
     * For each direction, a window of 5 cells is scanned. A window is a "four" if it contains
     * exactly 4 BLACK and 1 EMPTY cell. Each direction contributes at most 1 four.
     *
     * The stone at (row, col) must already be BLACK on the board.
     */
    private fun countFours(board: Array<IntArray>, row: Int, col: Int): Int {
        var fourCount = 0
        for (dir in DIRECTIONS) {
            if (hasOpenFourInDirection(board, row, col, dir[0], dir[1])) {
                fourCount++
            }
        }
        return fourCount
    }

    /**
     * Checks whether the given direction has a "four" pattern through (row, col).
     *
     * Approach: extract 9 cells centered on (row, col) along the direction, then
     * slide a window of 5 cells. A window is a candidate four if it has exactly 4 BLACK
     * and 1 EMPTY. For each such window, filling the empty cell must produce a sequence
     * of exactly 5 (not 6+) to confirm it is a genuine four (not an overline fragment).
     * Once any valid four is found in this direction, return true.
     */
    private fun hasOpenFourInDirection(
        board: Array<IntArray>,
        row: Int,
        col: Int,
        dr: Int,
        dc: Int
    ): Boolean {
        // Collect cells from offset -4 to +4 along the direction
        val cells = Array(9) { i ->
            val offset = i - 4
            val r = row + dr * offset
            val c = col + dc * offset
            if (r in 0 until BOARD_SIZE && c in 0 until BOARD_SIZE) board[r][c] else -1 // -1 = wall
        }

        // Slide a window of 5 through the 9-cell array
        for (start in 0..4) {
            val window = cells.slice(start until start + 5)
            val blackCount = window.count { it == BLACK }
            val emptyCount = window.count { it == EMPTY }

            if (blackCount == 4 && emptyCount == 1) {
                // Candidate four window — verify filling the empty cell gives exactly 5
                val emptyIdx = window.indexOfFirst { it == EMPTY } + start
                val offset = emptyIdx - 4
                val er = row + dr * offset
                val ec = col + dc * offset
                if (er !in 0 until BOARD_SIZE || ec !in 0 until BOARD_SIZE) continue

                board[er][ec] = BLACK
                val consecutive = countConsecutive(board, er, ec, dr, dc)
                board[er][ec] = EMPTY

                if (consecutive == 5) return true
            }
        }
        return false
    }

    /**
     * Counts how many directions form an "open three" through (row, col).
     *
     * An open three in a direction means: there exists an empty cell along that direction
     * where placing BLACK would create a "straight four" (open four — a four that has both
     * ends open so the opponent cannot block it with a single move), and that empty cell
     * itself is not a forbidden move (checked recursively, up to depth limit).
     *
     * The stone at (row, col) must already be BLACK on the board.
     *
     * @param depth used to limit recursion; forbidden-move check stops recursing at depth >= 5
     */
    private fun countOpenThrees(board: Array<IntArray>, row: Int, col: Int, depth: Int = 0): Int {
        var threeCount = 0
        for (dir in DIRECTIONS) {
            if (hasOpenThreeInDirection(board, row, col, dir[0], dir[1], depth)) {
                threeCount++
            }
        }
        return threeCount
    }

    /**
     * Returns true if the given direction has an "open three" through (row, col).
     *
     * For each empty neighbor along the direction, temporarily place BLACK and check:
     *   1. Is the resulting position a straight (open) four — a four with both endpoints empty?
     *   2. Is the candidate empty cell not itself a forbidden move (recursion guard)?
     */
    private fun hasOpenThreeInDirection(
        board: Array<IntArray>,
        row: Int,
        col: Int,
        dr: Int,
        dc: Int,
        depth: Int
    ): Boolean {
        // If this direction already has 4+ consecutive, it's a four — not a three
        val existingCount = countConsecutive(board, row, col, dr, dc)
        if (existingCount >= 4) return false

        // Collect cell coordinates from -4 to +4 along the direction
        val coords = ((-4)..4).map { offset ->
            Pair(row + dr * offset, col + dc * offset)
        }

        for ((r, c) in coords) {
            if (r !in 0 until BOARD_SIZE || c !in 0 until BOARD_SIZE) continue
            if (board[r][c] != EMPTY) continue
            if (r == row && c == col) continue // already occupied (the stone itself)

            // Temporarily place BLACK at (r, c)
            board[r][c] = BLACK
            val isStraightFour = isStraightFourInDirection(board, row, col, r, c, dr, dc)
            board[r][c] = EMPTY

            if (!isStraightFour) continue

            // Verify the candidate cell is not itself a forbidden move (recursive check)
            val candidateIsForbidden = if (depth < 5) {
                isForbiddenMoveInternal(board, r, c, depth + 1)
            } else {
                false
            }

            if (!candidateIsForbidden) return true
        }
        return false
    }

    /**
     * Returns true if, with stones already placed at both (row, col) and (candR, candC),
     * the four formed in direction (dr, dc) through (row, col) is "open" (both ends free).
     *
     * An open/straight four: exactly 4 consecutive BLACK stones with both sides open (EMPTY or board edge counts as blocked — only truly EMPTY neighbor counts as open).
     */
    private fun isStraightFourInDirection(
        board: Array<IntArray>,
        row: Int,
        col: Int,
        candR: Int,
        candC: Int,
        dr: Int,
        dc: Int
    ): Boolean {
        // With candidate already placed, count consecutive through (row, col)
        val count = countConsecutive(board, row, col, dr, dc)
        if (count != 4) return false

        // Find the two endpoints just outside the run
        // Walk forward from (row, col) until the run ends
        var r = row
        var c = col
        while (true) {
            val nr = r + dr
            val nc = c + dc
            if (nr !in 0 until BOARD_SIZE || nc !in 0 until BOARD_SIZE || board[nr][nc] != BLACK) break
            r = nr; c = nc
        }
        val fwdEndR = r + dr
        val fwdEndC = c + dc
        val fwdOpen = fwdEndR in 0 until BOARD_SIZE && fwdEndC in 0 until BOARD_SIZE &&
            board[fwdEndR][fwdEndC] == EMPTY

        // Walk backward from (row, col) until the run ends
        r = row; c = col
        while (true) {
            val nr = r - dr
            val nc = c - dc
            if (nr !in 0 until BOARD_SIZE || nc !in 0 until BOARD_SIZE || board[nr][nc] != BLACK) break
            r = nr; c = nc
        }
        val bwdEndR = r - dr
        val bwdEndC = c - dc
        val bwdOpen = bwdEndR in 0 until BOARD_SIZE && bwdEndC in 0 until BOARD_SIZE &&
            board[bwdEndR][bwdEndC] == EMPTY

        if (!fwdOpen || !bwdOpen) return false

        // Both completions must create exactly 5 (not an overline / 장목).
        // If one end leads to 6+, BLACK cannot use it, making the four effectively half-open.
        board[fwdEndR][fwdEndC] = BLACK
        val fwdCount = countConsecutive(board, fwdEndR, fwdEndC, dr, dc)
        board[fwdEndR][fwdEndC] = EMPTY
        if (fwdCount != 5) return false

        board[bwdEndR][bwdEndC] = BLACK
        val bwdCount = countConsecutive(board, bwdEndR, bwdEndC, dr, dc)
        board[bwdEndR][bwdEndC] = EMPTY

        return bwdCount == 5
    }

    /**
     * Internal variant of isForbiddenMove that accepts a recursion depth to prevent infinite loops.
     * Used by countOpenThrees recursion.
     */
    private fun isForbiddenMoveInternal(board: Array<IntArray>, row: Int, col: Int, depth: Int): Boolean {
        if (board[row][col] != EMPTY) return false

        board[row][col] = BLACK
        val forbidden = try {
            if (isExactlyFive(board, row, col)) {
                false
            } else if (isOverline(board, row, col)) {
                true
            } else if (countFours(board, row, col) >= 2) {
                true
            } else if (countOpenThrees(board, row, col, depth) >= 2) {
                true
            } else {
                false
            }
        } finally {
            board[row][col] = EMPTY
        }
        return forbidden
    }
}
