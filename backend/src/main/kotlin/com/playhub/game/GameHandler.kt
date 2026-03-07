package com.playhub.game

interface GameHandler<TState : Any, TAction : Any> {
    val gameId: String
    fun createInitialState(settings: Map<String, Any>): TState
    fun validateAction(state: TState, action: TAction, playerIndex: Int): ValidationResult
    fun applyAction(state: TState, action: TAction, playerIndex: Int): TState
    fun checkGameOver(state: TState): GameResult
}

data class ValidationResult(val valid: Boolean, val error: String? = null)

data class GameResult(val isOver: Boolean, val winner: Int? = null, val reason: String? = null)
