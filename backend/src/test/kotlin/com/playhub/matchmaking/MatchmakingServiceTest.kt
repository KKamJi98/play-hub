package com.playhub.matchmaking

import com.playhub.config.ActiveSessionRegistry
import com.playhub.room.RoomService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.mockito.Mockito.mock

class MatchmakingServiceTest {

    private lateinit var roomService: RoomService
    private lateinit var messagingTemplate: SimpMessagingTemplate
    private lateinit var activeSessionRegistry: ActiveSessionRegistry
    private lateinit var matchmakingService: MatchmakingService

    @BeforeEach
    fun setUp() {
        roomService = RoomService()
        messagingTemplate = mock(SimpMessagingTemplate::class.java)
        activeSessionRegistry = ActiveSessionRegistry()
        matchmakingService = MatchmakingService(
            roomService = roomService,
            messagingTemplate = messagingTemplate,
            activeSessionRegistry = activeSessionRegistry,
            gameHandlers = emptyList()
        )
    }

    @Test
    fun `tryMatch registers session mapping immediately`() {
        val ws1 = "ws-session-1"
        val ws2 = "ws-session-2"

        activeSessionRegistry.register(ws1)
        activeSessionRegistry.register(ws2)

        matchmakingService.enqueue(QueueEntry("player1", "gomoku", "ticket1", ws1))
        matchmakingService.enqueue(QueueEntry("player2", "gomoku", "ticket2", ws2))

        // Trigger matching
        matchmakingService.processQueues()

        // Both sessions should have mapping registered
        assertNotNull(roomService.getSessionInfo(ws1), "Session mapping for ws1 should be registered")
        assertNotNull(roomService.getSessionInfo(ws2), "Session mapping for ws2 should be registered")
    }

    @Test
    fun `tryMatch re-queues alive player when opponent is dead`() {
        val ws1 = "ws-session-1"
        val ws2 = "ws-session-2"

        // Only register ws1 as active (ws2 is dead)
        activeSessionRegistry.register(ws1)

        matchmakingService.enqueue(QueueEntry("player1", "gomoku", "ticket1", ws1))
        matchmakingService.enqueue(QueueEntry("player2", "gomoku", "ticket2", ws2))

        matchmakingService.processQueues()

        // No session mapping should exist (match didn't happen)
        assertNull(roomService.getSessionInfo(ws1))
        assertNull(roomService.getSessionInfo(ws2))

        // Alive player (ws1) should still be in queue
        assertEquals(1, matchmakingService.getQueueSize("gomoku"))

        // Dequeue should succeed for ws1 (still in queue)
        assertTrue(matchmakingService.dequeue(ws1))
        // Dequeue should fail for ws2 (not in queue)
        assertFalse(matchmakingService.dequeue(ws2))
    }

    @Test
    fun `tryMatch skips when both players are dead`() {
        val ws1 = "ws-session-1"
        val ws2 = "ws-session-2"

        // Neither session is active
        matchmakingService.enqueue(QueueEntry("player1", "gomoku", "ticket1", ws1))
        matchmakingService.enqueue(QueueEntry("player2", "gomoku", "ticket2", ws2))

        matchmakingService.processQueues()

        // No session mapping, no room created
        assertNull(roomService.getSessionInfo(ws1))
        assertNull(roomService.getSessionInfo(ws2))

        // Queue should be empty (both removed)
        assertEquals(0, matchmakingService.getQueueSize("gomoku"))
    }

    @Test
    fun `disconnect after match triggers cleanup via session mapping`() {
        val ws1 = "ws-session-1"
        val ws2 = "ws-session-2"

        activeSessionRegistry.register(ws1)
        activeSessionRegistry.register(ws2)

        matchmakingService.enqueue(QueueEntry("player1", "gomoku", "ticket1", ws1))
        matchmakingService.enqueue(QueueEntry("player2", "gomoku", "ticket2", ws2))

        matchmakingService.processQueues()

        // Verify session mapping exists (prerequisite for disconnect handling)
        val info1 = roomService.getSessionInfo(ws1)
        val info2 = roomService.getSessionInfo(ws2)
        assertNotNull(info1)
        assertNotNull(info2)

        // Both should point to the same room
        assertEquals(info1!!.first, info2!!.first)

        // Simulate disconnect cleanup: unregister session and leave room
        val (roomId, playerSessionId) = info1
        roomService.leaveRoom(roomId, playerSessionId)
        roomService.unregisterSession(ws1)

        // Room should still exist with one player
        val room = roomService.getRoom(roomId)
        assertNotNull(room)
        assertEquals(1, room!!.players.size)
    }
}
