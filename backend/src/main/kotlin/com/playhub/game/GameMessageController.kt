package com.playhub.game

import com.playhub.common.dto.GameActionRequest
import com.playhub.room.RoomService
import com.playhub.room.RoomState
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller
import java.util.concurrent.ConcurrentHashMap

@Controller
class GameMessageController(
    private val messagingTemplate: SimpMessagingTemplate,
    private val roomService: RoomService,
    gameHandlers: List<GameHandler<*, *>>
) {

    private val log = LoggerFactory.getLogger(GameMessageController::class.java)

    private val handlerMap: Map<String, GameHandler<*, *>> =
        gameHandlers.associateBy { it.gameId }

    // In-memory game states keyed by roomId
    private val gameStates = ConcurrentHashMap<String, Any>()

    @MessageMapping("/game/action")
    fun handleAction(@Payload request: GameActionRequest) {
        val room = roomService.getRoom(request.roomId)
        if (room == null) {
            log.warn("Room not found: {}", request.roomId)
            return
        }

        val handler = handlerMap[room.gameId]
        if (handler == null) {
            log.warn("No handler registered for gameId: {}", room.gameId)
            return
        }

        // Initialize game state if not present
        if (!gameStates.containsKey(request.roomId)) {
            val initialState = handler.createInitialState(room.settings)
            gameStates[request.roomId] = initialState
            room.state = RoomState.PLAYING
        }

        @Suppress("UNCHECKED_CAST")
        val typedHandler = handler as GameHandler<Any, Any>
        val currentState = gameStates[request.roomId]!!

        val validation = typedHandler.validateAction(currentState, request.action, request.playerIndex)
        if (!validation.valid) {
            log.debug("Invalid action from player {}: {}", request.playerIndex, validation.error)
            return
        }

        val newState = typedHandler.applyAction(currentState, request.action, request.playerIndex)
        gameStates[request.roomId] = newState

        val gameResult = typedHandler.checkGameOver(newState)
        if (gameResult.isOver) {
            room.state = RoomState.FINISHED
            gameStates.remove(request.roomId)
        }

        // Broadcast the updated state to all subscribers
        messagingTemplate.convertAndSend(
            "/topic/game/${request.roomId}",
            mapOf(
                "state" to newState,
                "gameResult" to gameResult
            )
        )
    }
}
