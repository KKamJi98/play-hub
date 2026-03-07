package com.playhub.game.gomoku

object GomokuValidator {

    private val DIRECTIONS = arrayOf(
        intArrayOf(0, 1),   // horizontal
        intArrayOf(1, 0),   // vertical
        intArrayOf(1, 1),   // diagonal (top-left to bottom-right)
        intArrayOf(1, -1)   // diagonal (top-right to bottom-left)
    )

    /**
     * Check if the last move results in a win.
     * Counts consecutive stones of the same color in each of the 4 direction pairs
     * passing through the last placed stone.
     *
     * @return the winning player (BLACK or WHITE), or EMPTY if no winner yet
     */
    fun checkWinner(board: Array<IntArray>, lastMove: Move): Int {
        val row = lastMove.row
        val col = lastMove.col
        val player = board[row][col]

        if (player == GomokuState.EMPTY) return GomokuState.EMPTY

        for (dir in DIRECTIONS) {
            val count = 1 +
                countDirection(board, row, col, dir[0], dir[1], player) +
                countDirection(board, row, col, -dir[0], -dir[1], player)

            if (count >= 5) return player
        }

        return GomokuState.EMPTY
    }

    /**
     * Count consecutive stones of the given player in a single direction.
     */
    private fun countDirection(
        board: Array<IntArray>,
        row: Int,
        col: Int,
        dRow: Int,
        dCol: Int,
        player: Int
    ): Int {
        var count = 0
        var r = row + dRow
        var c = col + dCol

        while (r in 0 until GomokuState.BOARD_SIZE &&
            c in 0 until GomokuState.BOARD_SIZE &&
            board[r][c] == player
        ) {
            count++
            r += dRow
            c += dCol
        }

        return count
    }

    /**
     * Check if the board is completely full (draw condition).
     */
    fun isBoardFull(board: Array<IntArray>): Boolean {
        for (row in board) {
            for (cell in row) {
                if (cell == GomokuState.EMPTY) return false
            }
        }
        return true
    }
}
