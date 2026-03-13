package com.playhub.matchmaking

import com.playhub.game.GameHandler
import com.playhub.room.Player
import com.playhub.room.RoomService
import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue

data class QueueEntry(
    val nickname: String,
    val gameId: String,
    val matchTicketId: String,
    val wsSessionId: String,
    val enqueuedAt: Instant = Instant.now()
)

@Service
class MatchmakingService(
    private val roomService: RoomService,
    private val messagingTemplate: SimpMessagingTemplate,
    gameHandlers: List<GameHandler<*, *>>
) {

    private val log = LoggerFactory.getLogger(MatchmakingService::class.java)

    private val handlerMap: Map<String, GameHandler<*, *>> =
        gameHandlers.associateBy { it.gameId }

    // gameId -> queue of waiting players
    private val queues = ConcurrentHashMap<String, ConcurrentLinkedQueue<QueueEntry>>()

    // wsSessionId -> QueueEntry (for disconnect cleanup)
    private val sessionToEntry = ConcurrentHashMap<String, QueueEntry>()

    @Synchronized
    fun enqueue(entry: QueueEntry): Boolean {
        if (sessionToEntry.containsKey(entry.wsSessionId)) {
            log.debug("Duplicate enqueue rejected for session: {}", entry.wsSessionId)
            return false
        }
        val queue = queues.computeIfAbsent(entry.gameId) { ConcurrentLinkedQueue() }
        queue.add(entry)
        sessionToEntry[entry.wsSessionId] = entry
        log.info("Player '{}' joined queue for {} (ticket: {})", entry.nickname, entry.gameId, entry.matchTicketId)
        broadcastQueueSize(entry.gameId)
        return true
    }

    @Synchronized
    fun dequeue(wsSessionId: String): Boolean {
        val entry = sessionToEntry.remove(wsSessionId) ?: return false
        val queue = queues[entry.gameId] ?: return false
        queue.remove(entry)
        log.info("Player '{}' left queue for {}", entry.nickname, entry.gameId)
        broadcastQueueSize(entry.gameId)
        return true
    }

    fun getQueueSize(gameId: String): Int = queues[gameId]?.size ?: 0

    @Synchronized
    private fun tryMatch(gameId: String): Boolean {
        val queue = queues[gameId] ?: return false
        if (queue.size < 2) return false

        val entry1 = queue.poll() ?: return false
        val entry2 = queue.poll()
        if (entry2 == null) {
            queue.add(entry1)
            return false
        }

        sessionToEntry.remove(entry1.wsSessionId)
        sessionToEntry.remove(entry2.wsSessionId)

        // Create room using existing RoomService
        val room = roomService.createRoom(gameId)
        val player1 = Player(
            sessionId = UUID.randomUUID().toString().substring(0, 8),
            nickname = entry1.nickname,
            index = 0
        )
        val player2 = Player(
            sessionId = UUID.randomUUID().toString().substring(0, 8),
            nickname = entry2.nickname,
            index = 1
        )
        roomService.joinRoom(room.id, player1)
        roomService.joinRoom(room.id, player2)
        roomService.startGame(room.id)

        // Create initial game state
        val handler = handlerMap[gameId]
        val initialState = handler?.let {
            @Suppress("UNCHECKED_CAST")
            (it as GameHandler<Any, Any>).createInitialState(room.settings)
        }

        log.info("Matched '{}' vs '{}' for {} in room {}", entry1.nickname, entry2.nickname, gameId, room.id)

        val players = listOf(
            mapOf("sessionId" to player1.sessionId, "nickname" to player1.nickname, "index" to 0),
            mapOf("sessionId" to player2.sessionId, "nickname" to player2.nickname, "index" to 1)
        )

        // Notify player 1
        messagingTemplate.convertAndSend(
            "/topic/matchmaking/result/${entry1.matchTicketId}",
            mapOf(
                "type" to "MATCHED",
                "roomId" to room.id,
                "gameId" to gameId,
                "sessionId" to player1.sessionId,
                "playerIndex" to 0,
                "players" to players,
                "initialState" to initialState
            )
        )

        // Notify player 2
        messagingTemplate.convertAndSend(
            "/topic/matchmaking/result/${entry2.matchTicketId}",
            mapOf(
                "type" to "MATCHED",
                "roomId" to room.id,
                "gameId" to gameId,
                "sessionId" to player2.sessionId,
                "playerIndex" to 1,
                "players" to players,
                "initialState" to initialState
            )
        )

        broadcastQueueSize(gameId)
        return true
    }

    @Scheduled(fixedDelay = 100)
    fun processQueues() {
        for (gameId in queues.keys) {
            tryMatch(gameId)
        }
    }

    @Scheduled(fixedDelay = 30_000)
    fun cleanupExpiredEntries() {
        val cutoff = Instant.now().minusSeconds(60)
        for ((gameId, queue) in queues) {
            val expired = queue.filter { it.enqueuedAt.isBefore(cutoff) }
            for (entry in expired) {
                queue.remove(entry)
                sessionToEntry.remove(entry.wsSessionId)
                log.info("Queue timeout for player '{}' in {}", entry.nickname, gameId)
                messagingTemplate.convertAndSend(
                    "/topic/matchmaking/result/${entry.matchTicketId}",
                    mapOf("type" to "QUEUE_TIMEOUT")
                )
            }
            if (expired.isNotEmpty()) {
                broadcastQueueSize(gameId)
            }
        }
    }

    private fun broadcastQueueSize(gameId: String) {
        messagingTemplate.convertAndSend(
            "/topic/matchmaking/queue/$gameId",
            mapOf("gameId" to gameId, "queueSize" to getQueueSize(gameId))
        )
    }
}
