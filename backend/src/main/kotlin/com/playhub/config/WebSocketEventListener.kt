package com.playhub.config

import com.playhub.matchmaking.MatchmakingService
import com.playhub.room.RoomService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import org.springframework.web.socket.messaging.SessionDisconnectEvent

@Component
class WebSocketEventListener(
    private val roomService: RoomService,
    private val matchmakingService: MatchmakingService,
    private val messagingTemplate: SimpMessagingTemplate
) {

    private val log = LoggerFactory.getLogger(WebSocketEventListener::class.java)

    @EventListener
    fun handleSessionDisconnect(event: SessionDisconnectEvent) {
        val wsSessionId = event.sessionId
        log.info("WebSocket session disconnected: {}", wsSessionId)

        val sessionInfo = roomService.getSessionInfo(wsSessionId) ?: return
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

        // Also remove from matchmaking queue if waiting
        matchmakingService.dequeue(wsSessionId)
    }
}
