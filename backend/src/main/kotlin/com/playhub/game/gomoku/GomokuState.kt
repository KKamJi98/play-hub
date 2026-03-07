package com.playhub.game.gomoku

data class GomokuState(
    val board: Array<IntArray>,
    val currentPlayer: Int,
    val gameStatus: GameStatus,
    val winner: Int,
    val lastMove: Move?,
    val moveHistory: MutableList<MoveRecord> = mutableListOf()
) {
    companion object {
        const val BOARD_SIZE = 15
        const val EMPTY = 0
        const val BLACK = 1
        const val WHITE = 2
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is GomokuState) return false
        if (!board.contentDeepEquals(other.board)) return false
        if (currentPlayer != other.currentPlayer) return false
        if (gameStatus != other.gameStatus) return false
        if (winner != other.winner) return false
        if (lastMove != other.lastMove) return false
        if (moveHistory != other.moveHistory) return false
        return true
    }

    override fun hashCode(): Int {
        var result = board.contentDeepHashCode()
        result = 31 * result + currentPlayer
        result = 31 * result + gameStatus.hashCode()
        result = 31 * result + winner
        result = 31 * result + (lastMove?.hashCode() ?: 0)
        result = 31 * result + moveHistory.hashCode()
        return result
    }
}

data class Move(val row: Int, val col: Int)

data class MoveRecord(val row: Int, val col: Int, val player: Int)

enum class GameStatus { WAITING, PLAYING, FINISHED }
