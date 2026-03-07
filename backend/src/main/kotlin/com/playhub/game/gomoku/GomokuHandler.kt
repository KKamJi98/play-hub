package com.playhub.game.gomoku

import com.playhub.game.GameHandler
import com.playhub.game.GameResult
import com.playhub.game.ValidationResult
import org.springframework.stereotype.Component

@Component
class GomokuHandler : GameHandler<GomokuState, Any> {

    override val gameId: String = "gomoku"

    override fun createInitialState(settings: Map<String, Any>): GomokuState {
        val board = Array(GomokuState.BOARD_SIZE) { IntArray(GomokuState.BOARD_SIZE) }
        return GomokuState(
            board = board,
            currentPlayer = GomokuState.BLACK,
            gameStatus = GameStatus.PLAYING,
            winner = GomokuState.EMPTY,
            lastMove = null
        )
    }

    override fun validateAction(state: GomokuState, action: Any, playerIndex: Int): ValidationResult {
        val gomokuAction = parseAction(action)
            ?: return ValidationResult(false, "Invalid action format. Expected type, row, col.")

        if (gomokuAction.type != "PLACE_STONE") {
            return ValidationResult(false, "Unknown action type: ${gomokuAction.type}")
        }

        if (state.gameStatus == GameStatus.FINISHED) {
            return ValidationResult(false, "Game is already finished.")
        }

        // playerIndex is 0-based from the room, map to 1-based (BLACK=1, WHITE=2)
        val expectedPlayer = playerIndex + 1
        if (expectedPlayer != state.currentPlayer) {
            return ValidationResult(false, "Not your turn. Current player: ${state.currentPlayer}")
        }

        val row = gomokuAction.row
        val col = gomokuAction.col

        if (row < 0 || row >= GomokuState.BOARD_SIZE || col < 0 || col >= GomokuState.BOARD_SIZE) {
            return ValidationResult(false, "Position out of bounds: ($row, $col)")
        }

        if (state.board[row][col] != GomokuState.EMPTY) {
            return ValidationResult(false, "Cell ($row, $col) is already occupied.")
        }

        return ValidationResult(true)
    }

    override fun applyAction(state: GomokuState, action: Any, playerIndex: Int): GomokuState {
        val gomokuAction = parseAction(action)
            ?: throw IllegalArgumentException("Invalid action format")

        val row = gomokuAction.row
        val col = gomokuAction.col

        // Deep copy the board
        val newBoard = Array(GomokuState.BOARD_SIZE) { state.board[it].copyOf() }
        newBoard[row][col] = state.currentPlayer

        val move = Move(row, col)
        val newHistory = state.moveHistory.toMutableList()
        newHistory.add(MoveRecord(row, col, state.currentPlayer))

        // Check for winner
        val winner = GomokuValidator.checkWinner(newBoard, move)
        val isFull = winner == GomokuState.EMPTY && GomokuValidator.isBoardFull(newBoard)

        val newStatus = if (winner != GomokuState.EMPTY || isFull) {
            GameStatus.FINISHED
        } else {
            GameStatus.PLAYING
        }

        val nextPlayer = if (newStatus == GameStatus.FINISHED) {
            state.currentPlayer
        } else {
            if (state.currentPlayer == GomokuState.BLACK) GomokuState.WHITE else GomokuState.BLACK
        }

        return GomokuState(
            board = newBoard,
            currentPlayer = nextPlayer,
            gameStatus = newStatus,
            winner = winner,
            lastMove = move,
            moveHistory = newHistory
        )
    }

    override fun checkGameOver(state: GomokuState): GameResult {
        if (state.gameStatus != GameStatus.FINISHED) {
            return GameResult(isOver = false)
        }

        return if (state.winner != GomokuState.EMPTY) {
            GameResult(
                isOver = true,
                winner = state.winner,
                reason = "Player ${state.winner} wins with 5 in a row!"
            )
        } else {
            GameResult(
                isOver = true,
                winner = null,
                reason = "Draw - board is full."
            )
        }
    }

    /**
     * Parse the incoming action (could be a Map from Jackson deserialization or a GomokuAction).
     */
    private fun parseAction(action: Any): GomokuAction? {
        return when (action) {
            is GomokuAction -> action
            is Map<*, *> -> {
                val type = action["type"] as? String ?: return null
                val row = (action["row"] as? Number)?.toInt() ?: return null
                val col = (action["col"] as? Number)?.toInt() ?: return null
                GomokuAction(type, row, col)
            }
            else -> null
        }
    }
}
