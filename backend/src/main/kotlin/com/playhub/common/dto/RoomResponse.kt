package com.playhub.common.dto

import com.playhub.room.Room
import com.playhub.room.RoomState
import java.time.Instant

data class RoomResponse(
    val id: String,
    val gameId: String,
    val playerCount: Int,
    val state: RoomState,
    val createdAt: Instant
) {
    companion object {
        fun from(room: Room) = RoomResponse(
            id = room.id,
            gameId = room.gameId,
            playerCount = room.players.size,
            state = room.state,
            createdAt = room.createdAt
        )
    }
}
