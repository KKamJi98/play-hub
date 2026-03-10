package com.playhub.game.billiards

import com.playhub.game.GameHandler
import com.playhub.game.GameResult
import com.playhub.game.ValidationResult
import org.springframework.stereotype.Component

/**
 * Passthrough handler for billiards.
 * Physics runs client-side; the server only manages turns and relays actions.
 *
 * The handler embeds the last action into the state so that when
 * [com.playhub.game.GameMessageController] broadcasts the state,
 * the opponent client receives the physics data (SHOOT), score updates
 * (SCORE_UPDATE), and turn changes (TURN_CHANGE) needed to stay in sync.
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
        // The server acts as a passthrough — it relays actions to both clients
        // by embedding action data into the state that gets broadcast.
        val actionMap = action as? Map<*, *> ?: return state
        val type = actionMap["type"] as? String ?: return state

        return when (type) {
            "SHOOT" -> {
                // Extract physics data and embed into state for relay.
                // The opponent client uses these parameters to replay the shot.
                val shot = actionMap["shot"] as? Map<*, *>
                val direction = actionMap["direction"] as? Map<*, *>
                val speedMps = (actionMap["speedMps"] as? Number)?.toDouble()
                val tipOffset = actionMap["tipOffset"] as? Map<*, *>
                val elevationDeg = (actionMap["elevationDeg"] as? Number)?.toDouble()
                val power = (actionMap["power"] as? Number)?.toDouble()
                val spin = actionMap["spin"] as? Map<*, *>

                val shootData = mutableMapOf<String, Any>()
                shootData["type"] = "SHOOT"
                shootData["playerIndex"] = playerIndex
                if (shot != null) shootData["shot"] = shot
                if (direction != null) shootData["direction"] = direction
                if (speedMps != null) shootData["speedMps"] = speedMps
                if (tipOffset != null) shootData["tipOffset"] = tipOffset
                if (elevationDeg != null) shootData["elevationDeg"] = elevationDeg
                if (power != null) shootData["power"] = power
                if (spin != null) shootData["spin"] = spin

                state.copy(
                    phase = "shooting",
                    lastAction = shootData
                )
            }
            "SCORE_UPDATE" -> {
                val scores = (actionMap["scores"] as? List<*>)?.map { (it as Number).toInt() }
                    ?: return state
                val nextPlayer = (actionMap["nextPlayer"] as? Number)?.toInt() ?: state.currentPlayer
                val phase = actionMap["phase"] as? String ?: state.phase
                val winner = (actionMap["winner"] as? Number)?.toInt() ?: -1

                val scoreData = mutableMapOf<String, Any>(
                    "type" to "SCORE_UPDATE",
                    "scores" to scores,
                    "nextPlayer" to nextPlayer,
                    "phase" to phase,
                    "winner" to winner
                )

                BilliardsState(
                    currentPlayer = nextPlayer,
                    scores = scores.toIntArray(),
                    targetScore = state.targetScore,
                    phase = phase,
                    winner = winner,
                    lastAction = scoreData
                )
            }
            "TURN_CHANGE" -> {
                val nextPlayer = (actionMap["nextPlayer"] as? Number)?.toInt() ?: state.currentPlayer
                val phase = actionMap["phase"] as? String ?: "aiming"

                val turnData = mutableMapOf<String, Any>(
                    "type" to "TURN_CHANGE",
                    "nextPlayer" to nextPlayer,
                    "phase" to phase
                )

                state.copy(
                    currentPlayer = nextPlayer,
                    phase = phase,
                    lastAction = turnData
                )
            }
            else -> state
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
    val winner: Int,
    /** Embedded last action data relayed to all clients via state broadcast. */
    val lastAction: Map<String, Any>? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is BilliardsState) return false
        return currentPlayer == other.currentPlayer &&
            scores.contentEquals(other.scores) &&
            targetScore == other.targetScore &&
            phase == other.phase &&
            winner == other.winner &&
            lastAction == other.lastAction
    }

    override fun hashCode(): Int {
        var result = currentPlayer
        result = 31 * result + scores.contentHashCode()
        result = 31 * result + targetScore
        result = 31 * result + phase.hashCode()
        result = 31 * result + winner
        result = 31 * result + (lastAction?.hashCode() ?: 0)
        return result
    }
}
