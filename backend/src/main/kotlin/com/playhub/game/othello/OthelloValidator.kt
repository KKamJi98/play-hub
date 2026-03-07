package com.playhub.game.othello

object OthelloValidator {

    private val DIRECTIONS = arrayOf(
        intArrayOf(-1, -1), intArrayOf(-1, 0), intArrayOf(-1, 1),
        intArrayOf(0, -1),                     intArrayOf(0, 1),
        intArrayOf(1, -1),  intArrayOf(1, 0),  intArrayOf(1, 1)
    )

    /**
     * Get all valid moves for the given player on the current board.
     */
    fun getValidMoves(board: Array<IntArray>, player: Int): List<OthelloMove> {
        val moves = mutableListOf<OthelloMove>()
        for (row in 0 until OthelloState.BOARD_SIZE) {
            for (col in 0 until OthelloState.BOARD_SIZE) {
                if (board[row][col] == OthelloState.EMPTY &&
                    getFlippedStones(board, row, col, player).isNotEmpty()
                ) {
                    moves.add(OthelloMove(row, col))
                }
            }
        }
        return moves
    }

    /**
     * For a given move (row, col) by player, find all opponent stones that would be flipped.
     * Returns an empty list if the move is invalid (no stones would be flipped).
     */
    fun getFlippedStones(board: Array<IntArray>, row: Int, col: Int, player: Int): List<OthelloMove> {
        val opponent = if (player == OthelloState.BLACK) OthelloState.WHITE else OthelloState.BLACK
        val allFlipped = mutableListOf<OthelloMove>()

        for (dir in DIRECTIONS) {
            val flippedInDir = mutableListOf<OthelloMove>()
            var r = row + dir[0]
            var c = col + dir[1]

            // Walk in direction, collecting consecutive opponent stones
            while (r in 0 until OthelloState.BOARD_SIZE &&
                c in 0 until OthelloState.BOARD_SIZE &&
                board[r][c] == opponent
            ) {
                flippedInDir.add(OthelloMove(r, c))
                r += dir[0]
                c += dir[1]
            }

            // Valid only if the line of opponent stones is terminated by the player's own stone
            if (flippedInDir.isNotEmpty() &&
                r in 0 until OthelloState.BOARD_SIZE &&
                c in 0 until OthelloState.BOARD_SIZE &&
                board[r][c] == player
            ) {
                allFlipped.addAll(flippedInDir)
            }
        }

        return allFlipped
    }

    /**
     * Calculate the current scores (stone count) for both players.
     */
    fun calculateScores(board: Array<IntArray>): OthelloScores {
        var black = 0
        var white = 0
        for (row in board) {
            for (cell in row) {
                when (cell) {
                    OthelloState.BLACK -> black++
                    OthelloState.WHITE -> white++
                }
            }
        }
        return OthelloScores(black, white)
    }
}
