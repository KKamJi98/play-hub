package com.playhub.room

import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class RoomService {

    companion object {
        private const val GOMOKU_GAME_ID = "gomoku"
    }

    private val rooms = ConcurrentHashMap<String, Room>()

    // WebSocket sessionId → (roomId, playerSessionId)
    private val sessionMap = ConcurrentHashMap<String, Pair<String, String>>()

    fun registerSession(wsSessionId: String, roomId: String, playerSessionId: String) {
        sessionMap[wsSessionId] = Pair(roomId, playerSessionId)
    }

    fun unregisterSession(wsSessionId: String) {
        sessionMap.remove(wsSessionId)
    }

    fun getSessionInfo(wsSessionId: String): Pair<String, String>? = sessionMap[wsSessionId]

    fun createRoom(gameId: String, settings: Map<String, Any> = emptyMap()): Room {
        val room = Room(
            id = UUID.randomUUID().toString().substring(0, 8),
            gameId = gameId,
            settings = normalizeSettings(gameId, settings)
        )
        rooms[room.id] = room
        return room
    }

    fun joinRoom(roomId: String, player: Player): Room? {
        val room = rooms[roomId] ?: return null
        if (room.state != RoomState.WAITING) return null
        room.players.add(player)
        return room
    }

    fun leaveRoom(roomId: String, sessionId: String) {
        val room = rooms[roomId] ?: return
        room.players.removeIf { it.sessionId == sessionId }
        if (room.players.isEmpty()) {
            rooms.remove(roomId)
        }
    }

    @Synchronized
    fun startGame(roomId: String): Room? {
        val room = rooms[roomId] ?: return null
        if (room.state != RoomState.WAITING) return null
        if (room.players.size < 2) return null
        room.state = RoomState.PLAYING
        return room
    }

    fun getRoom(roomId: String): Room? = rooms[roomId]

    fun getRoomsByGame(gameId: String): List<Room> =
        rooms.values.filter { it.gameId == gameId }

    private fun normalizeSettings(gameId: String, settings: Map<String, Any>): MutableMap<String, Any> {
        val normalized = settings.toMutableMap()
        if (gameId == GOMOKU_GAME_ID) {
            normalized["renjuRule"] = true
        }
        return normalized
    }
}
