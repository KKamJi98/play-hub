package com.playhub.game.billiards

import com.playhub.game.GameHandler
import com.playhub.game.GameResult
import com.playhub.game.ValidationResult
import org.springframework.stereotype.Component

/**
 * Passthrough handler for billiards.
 * Physics runs client-side; the server only manages turns and relays actions.
 */
@Component
class BilliardsHandler : GameHandler<BilliardsState, Any> {

    override val gameId: String = "billiards"

    override fun createInitialState(settings: Map<String, Any>): BilliardsState {
        val targetScore = (settings["targetScore"] as? Number)?.toInt() ?: 10
        return BilliardsState(
            currentPlayer = 0,
            scores = intArrayOf(0, 0),
            targetScore = targetScore,
            phase = "aiming",
            winner = -1
        )
    }

    override fun validateAction(state: BilliardsState, action: Any, playerIndex: Int): ValidationResult {
        val actionMap = action as? Map<*, *>
            ?: return ValidationResult(false, "Invalid action format")

        val type = actionMap["type"] as? String
            ?: return ValidationResult(false, "Missing action type")

        if (type == "SHOOT" && playerIndex != state.currentPlayer) {
            return ValidationResult(false, "Not your turn")
        }

        return ValidationResult(true)
    }

    override fun applyAction(state: BilliardsState, action: Any, playerIndex: Int): BilliardsState {
        // The server acts as a passthrough — it relays shoot actions to both clients.
        // Score updates come from the client that computed physics via SCORE_UPDATE action.
        val actionMap = action as? Map<*, *> ?: return state
        val type = actionMap["type"] as? String ?: return state

        return when (type) {
            "SCORE_UPDATE" -> {
                val scores = (actionMap["scores"] as? List<*>)?.map { (it as Number).toInt() }
                    ?: return state
                val nextPlayer = (actionMap["nextPlayer"] as? Number)?.toInt() ?: state.currentPlayer
                val phase = actionMap["phase"] as? String ?: state.phase
                val winner = (actionMap["winner"] as? Number)?.toInt() ?: -1

                BilliardsState(
                    currentPlayer = nextPlayer,
                    scores = scores.toIntArray(),
                    targetScore = state.targetScore,
                    phase = phase,
                    winner = winner
                )
            }
            else -> state // SHOOT actions are relayed as-is
        }
    }

    override fun checkGameOver(state: BilliardsState): GameResult {
        if (state.winner < 0) {
            return GameResult(isOver = false)
        }
        return GameResult(
            isOver = true,
            winner = state.winner,
            reason = "Player ${state.winner + 1} wins!"
        )
    }
}

data class BilliardsState(
    val currentPlayer: Int,
    val scores: IntArray,
    val targetScore: Int,
    val phase: String,
    val winner: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is BilliardsState) return false
        return currentPlayer == other.currentPlayer &&
            scores.contentEquals(other.scores) &&
            targetScore == other.targetScore &&
            phase == other.phase &&
            winner == other.winner
    }

    override fun hashCode(): Int {
        var result = currentPlayer
        result = 31 * result + scores.contentHashCode()
        result = 31 * result + targetScore
        result = 31 * result + phase.hashCode()
        result = 31 * result + winner
        return result
    }
}
