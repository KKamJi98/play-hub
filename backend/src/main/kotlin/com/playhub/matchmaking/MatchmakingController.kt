package com.playhub.matchmaking

import org.springframework.http.ResponseEntity
import org.springframework.messaging.handler.annotation.Header
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/matchmaking")
class MatchmakingRestController(
    private val matchmakingService: MatchmakingService
) {
    @GetMapping("/queue")
    fun getQueueStatus(@RequestParam gameId: String): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.ok(
            mapOf(
                "gameId" to gameId,
                "queueSize" to matchmakingService.getQueueSize(gameId)
            )
        )
    }
}

@Controller
class MatchmakingMessageController(
    private val matchmakingService: MatchmakingService
) {
    @MessageMapping("/matchmaking/join")
    fun handleJoinQueue(
        @Payload payload: Map<String, Any>,
        @Header("simpSessionId") wsSessionId: String
    ) {
        val gameId = payload["gameId"] as? String ?: return
        val nickname = payload["nickname"] as? String ?: return
        val matchTicketId = payload["matchTicketId"] as? String ?: return

        val entry = QueueEntry(
            nickname = nickname,
            gameId = gameId,
            matchTicketId = matchTicketId,
            wsSessionId = wsSessionId
        )
        matchmakingService.enqueue(entry)
    }

    @MessageMapping("/matchmaking/cancel")
    fun handleCancelQueue(
        @Header("simpSessionId") wsSessionId: String
    ) {
        matchmakingService.dequeue(wsSessionId)
    }
}
