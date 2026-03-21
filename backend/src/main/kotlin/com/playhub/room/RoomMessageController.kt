package com.playhub.room

import com.playhub.game.GameHandler
import com.playhub.game.GameMessageController
import org.slf4j.LoggerFactory
import org.springframework.messaging.handler.annotation.Header
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller

@Controller
class RoomMessageController(
    private val messagingTemplate: SimpMessagingTemplate,
    private val roomService: RoomService,
    private val gameMessageController: GameMessageController,
    gameHandlers: List<GameHandler<*, *>>
) {

    private val log = LoggerFactory.getLogger(RoomMessageController::class.java)

    private val handlerMap: Map<String, GameHandler<*, *>> =
        gameHandlers.associateBy { it.gameId }

    @MessageMapping("/room/join")
    fun handleJoin(@Payload payload: Map<String, Any>, @Header("simpSessionId") wsSessionId: String) {
        val roomId = payload["roomId"] as? String ?: return
        val playerSessionId = payload["sessionId"] as? String
        val room = roomService.getRoom(roomId) ?: return

        // Register WebSocket session → (roomId, playerSessionId) mapping for disconnect cleanup
        if (playerSessionId != null) {
            roomService.registerSession(wsSessionId, roomId, playerSessionId)
        }

        messagingTemplate.convertAndSend(
            "/topic/room/$roomId",
            mapOf(
                "type" to "PLAYER_JOINED",
                "players" to room.players.map {
                    mapOf("sessionId" to it.sessionId, "nickname" to it.nickname, "index" to it.index)
                }
            )
        )
    }

    @MessageMapping("/room/leave")
    fun handleLeave(@Payload payload: Map<String, Any>, @Header("simpSessionId") wsSessionId: String) {
        val roomId = payload["roomId"] as? String ?: return
        // Fall back to session mapping if sessionId is not in the message body
        val sessionId = payload["sessionId"] as? String
            ?: roomService.getSessionInfo(wsSessionId)?.second
            ?: return

        roomService.leaveRoom(roomId, sessionId)
        roomService.unregisterSession(wsSessionId)
        val room = roomService.getRoom(roomId)

        if (room != null) {
            messagingTemplate.convertAndSend(
                "/topic/room/$roomId",
                mapOf(
                    "type" to "PLAYER_LEFT",
                    "players" to room.players.map {
                        mapOf("sessionId" to it.sessionId, "nickname" to it.nickname, "index" to it.index)
                    }
                )
            )
        }
    }

    @MessageMapping("/room/start")
    fun handleStart(@Payload payload: Map<String, Any>) {
        val roomId = payload["roomId"] as? String ?: return
        val room = roomService.startGame(roomId)
        if (room == null) {
            log.warn("Cannot start game for room: {}", roomId)
            return
        }

        // Create initial game state via the handler and register with GameMessageController
        val handler = handlerMap[room.gameId]
        var initialState: Any? = null
        if (handler != null) {
            @Suppress("UNCHECKED_CAST")
            val typedHandler = handler as GameHandler<Any, Any>
            initialState = typedHandler.createInitialState(room.settings)
            gameMessageController.registerInitialState(roomId, initialState)
        }

        messagingTemplate.convertAndSend(
            "/topic/room/$roomId",
            mapOf(
                "type" to "GAME_STARTED",
                "initialState" to initialState
            )
        )
    }
}
