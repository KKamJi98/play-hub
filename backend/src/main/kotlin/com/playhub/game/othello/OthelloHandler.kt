package com.playhub.game.othello

import com.playhub.game.GameHandler
import com.playhub.game.GameResult
import com.playhub.game.ValidationResult
import org.springframework.stereotype.Component

@Component
class OthelloHandler : GameHandler<OthelloState, Any> {

    override val gameId: String = "othello"

    override fun createInitialState(settings: Map<String, Any>): OthelloState {
        val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) }

        // Standard Othello opening position: center 4 stones
        // (3,3)=WHITE, (3,4)=BLACK, (4,3)=BLACK, (4,4)=WHITE
        board[3][3] = OthelloState.WHITE
        board[3][4] = OthelloState.BLACK
        board[4][3] = OthelloState.BLACK
        board[4][4] = OthelloState.WHITE

        val scores = OthelloValidator.calculateScores(board)
        val validMoves = OthelloValidator.getValidMoves(board, OthelloState.BLACK)

        return OthelloState(
            board = board,
            currentPlayer = OthelloState.BLACK,
            gameStatus = OthelloGameStatus.PLAYING,
            winner = OthelloState.EMPTY,
            lastMove = null,
            scores = scores,
            validMoves = validMoves
        )
    }

    override fun validateAction(state: OthelloState, action: Any, playerIndex: Int): ValidationResult {
        val othelloAction = parseAction(action)
            ?: return ValidationResult(false, "Invalid action format. Expected type, row, col.")

        if (othelloAction.type != "PLACE_STONE") {
            return ValidationResult(false, "Unknown action type: ${othelloAction.type}")
        }

        if (state.gameStatus == OthelloGameStatus.FINISHED) {
            return ValidationResult(false, "Game is already finished.")
        }

        // playerIndex is 0-based from the room, map to 1-based (BLACK=1, WHITE=2)
        val expectedPlayer = playerIndex + 1
        if (expectedPlayer != state.currentPlayer) {
            return ValidationResult(false, "Not your turn. Current player: ${state.currentPlayer}")
        }

        val row = othelloAction.row
        val col = othelloAction.col

        if (row < 0 || row >= OthelloState.BOARD_SIZE || col < 0 || col >= OthelloState.BOARD_SIZE) {
            return ValidationResult(false, "Position out of bounds: ($row, $col)")
        }

        // Check that the move is in the list of valid moves
        if (OthelloMove(row, col) !in state.validMoves) {
            return ValidationResult(false, "Invalid move: ($row, $col). No stones would be flipped.")
        }

        return ValidationResult(true)
    }

    override fun applyAction(state: OthelloState, action: Any, playerIndex: Int): OthelloState {
        val othelloAction = parseAction(action)
            ?: throw IllegalArgumentException("Invalid action format")

        val row = othelloAction.row
        val col = othelloAction.col

        // Deep copy the board
        val newBoard = Array(OthelloState.BOARD_SIZE) { state.board[it].copyOf() }

        // Calculate flipped stones BEFORE placing (on the original board copy, before mutation)
        val flipped = OthelloValidator.getFlippedStones(newBoard, row, col, state.currentPlayer)

        // Place the stone
        newBoard[row][col] = state.currentPlayer

        // Flip captured stones
        for (stone in flipped) {
            newBoard[stone.row][stone.col] = state.currentPlayer
        }

        val move = OthelloMove(row, col)
        val scores = OthelloValidator.calculateScores(newBoard)

        // Determine next player, handling turn skip
        val opponent = if (state.currentPlayer == OthelloState.BLACK) OthelloState.WHITE else OthelloState.BLACK
        val opponentMoves = OthelloValidator.getValidMoves(newBoard, opponent)
        val currentPlayerMoves = OthelloValidator.getValidMoves(newBoard, state.currentPlayer)

        return if (opponentMoves.isNotEmpty()) {
            // Normal case: opponent has valid moves
            OthelloState(
                board = newBoard,
                currentPlayer = opponent,
                gameStatus = OthelloGameStatus.PLAYING,
                winner = OthelloState.EMPTY,
                lastMove = move,
                scores = scores,
                validMoves = opponentMoves
            )
        } else if (currentPlayerMoves.isNotEmpty()) {
            // Turn skip: opponent has no moves, current player plays again
            OthelloState(
                board = newBoard,
                currentPlayer = state.currentPlayer,
                gameStatus = OthelloGameStatus.PLAYING,
                winner = OthelloState.EMPTY,
                lastMove = move,
                scores = scores,
                validMoves = currentPlayerMoves
            )
        } else {
            // Game over: neither player has valid moves
            val winner = when {
                scores.black > scores.white -> OthelloState.BLACK
                scores.white > scores.black -> OthelloState.WHITE
                else -> OthelloState.EMPTY
            }
            OthelloState(
                board = newBoard,
                currentPlayer = state.currentPlayer,
                gameStatus = OthelloGameStatus.FINISHED,
                winner = winner,
                lastMove = move,
                scores = scores,
                validMoves = emptyList()
            )
        }
    }

    override fun checkGameOver(state: OthelloState): GameResult {
        if (state.gameStatus != OthelloGameStatus.FINISHED) {
            return GameResult(isOver = false)
        }

        return when {
            state.winner == OthelloState.BLACK -> GameResult(
                isOver = true,
                winner = OthelloState.BLACK,
                reason = "Black wins! Score: ${state.scores.black} - ${state.scores.white}"
            )
            state.winner == OthelloState.WHITE -> GameResult(
                isOver = true,
                winner = OthelloState.WHITE,
                reason = "White wins! Score: ${state.scores.black} - ${state.scores.white}"
            )
            else -> GameResult(
                isOver = true,
                winner = null,
                reason = "Draw! Score: ${state.scores.black} - ${state.scores.white}"
            )
        }
    }

    /**
     * Parse the incoming action (could be a Map from Jackson deserialization or an OthelloAction).
     */
    private fun parseAction(action: Any): OthelloAction? {
        return when (action) {
            is OthelloAction -> action
            is Map<*, *> -> {
                val type = action["type"] as? String ?: return null
                val row = (action["row"] as? Number)?.toInt() ?: return null
                val col = (action["col"] as? Number)?.toInt() ?: return null
                OthelloAction(type, row, col)
            }
            else -> null
        }
    }
}
