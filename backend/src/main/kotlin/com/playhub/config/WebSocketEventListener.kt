package com.playhub.config

import com.playhub.matchmaking.MatchmakingService
import com.playhub.room.RoomService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import org.springframework.web.socket.messaging.SessionConnectedEvent
import org.springframework.web.socket.messaging.SessionDisconnectEvent

@Component
class WebSocketEventListener(
    private val roomService: RoomService,
    private val matchmakingService: MatchmakingService,
    private val messagingTemplate: SimpMessagingTemplate,
    private val activeSessionRegistry: ActiveSessionRegistry
) {

    private val log = LoggerFactory.getLogger(WebSocketEventListener::class.java)

    @EventListener
    fun handleSessionConnected(event: SessionConnectedEvent) {
        val wsSessionId = event.message.headers["simpSessionId"] as? String ?: return
        activeSessionRegistry.register(wsSessionId)
        log.info("WebSocket session connected and registered: {}", wsSessionId)
    }

    @EventListener
    fun handleSessionDisconnect(event: SessionDisconnectEvent) {
        val wsSessionId = event.sessionId
        log.info("WebSocket session disconnected: {}", wsSessionId)

        activeSessionRegistry.unregister(wsSessionId)

        val sessionInfo = roomService.getSessionInfo(wsSessionId)
        if (sessionInfo != null) {
            val (roomId, playerSessionId) = sessionInfo

            log.info("Cleaning up player {} from room {} on disconnect", playerSessionId, roomId)
            roomService.leaveRoom(roomId, playerSessionId)
            roomService.unregisterSession(wsSessionId)

            val room = roomService.getRoom(roomId)
            if (room != null) {
                messagingTemplate.convertAndSend(
                    "/topic/room/$roomId",
                    mapOf(
                        "type" to "OPPONENT_DISCONNECTED",
                        "playerSessionId" to playerSessionId,
                        "players" to room.players.map {
                            mapOf("sessionId" to it.sessionId, "nickname" to it.nickname, "index" to it.index)
                        }
                    )
                )
            }
        }

        // Always remove from matchmaking queue (handles pre-session-mapping disconnect)
        matchmakingService.dequeue(wsSessionId)
    }
}
