package com.playhub.room

import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class RoomService {

    private val rooms = ConcurrentHashMap<String, Room>()

    fun createRoom(gameId: String, settings: Map<String, Any> = emptyMap()): Room {
        val room = Room(
            id = UUID.randomUUID().toString().substring(0, 8),
            gameId = gameId,
            settings = settings.toMutableMap()
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

    fun getRoom(roomId: String): Room? = rooms[roomId]

    fun getRoomsByGame(gameId: String): List<Room> =
        rooms.values.filter { it.gameId == gameId }
}
