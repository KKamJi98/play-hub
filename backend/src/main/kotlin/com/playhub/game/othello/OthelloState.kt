package com.playhub.game.othello

data class OthelloState(
    val board: Array<IntArray>,
    val currentPlayer: Int,
    val gameStatus: OthelloGameStatus,
    val winner: Int,
    val lastMove: OthelloMove?,
    val scores: OthelloScores,
    val validMoves: List<OthelloMove>
) {
    companion object {
        const val BOARD_SIZE = 8
        const val EMPTY = 0
        const val BLACK = 1
        const val WHITE = 2
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is OthelloState) return false
        if (!board.contentDeepEquals(other.board)) return false
        if (currentPlayer != other.currentPlayer) return false
        if (gameStatus != other.gameStatus) return false
        if (winner != other.winner) return false
        if (lastMove != other.lastMove) return false
        if (scores != other.scores) return false
        if (validMoves != other.validMoves) return false
        return true
    }

    override fun hashCode(): Int {
        var result = board.contentDeepHashCode()
        result = 31 * result + currentPlayer
        result = 31 * result + gameStatus.hashCode()
        result = 31 * result + winner
        result = 31 * result + (lastMove?.hashCode() ?: 0)
        result = 31 * result + scores.hashCode()
        result = 31 * result + validMoves.hashCode()
        return result
    }
}

data class OthelloMove(val row: Int, val col: Int)

data class OthelloScores(val black: Int, val white: Int)

enum class OthelloGameStatus { WAITING, PLAYING, FINISHED }
