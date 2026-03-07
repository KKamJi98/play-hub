package com.playhub.room

import java.time.Instant

data class Room(
    val id: String,
    val gameId: String,
    val players: MutableList<Player> = mutableListOf(),
    var state: RoomState = RoomState.WAITING,
    val settings: MutableMap<String, Any> = mutableMapOf(),
    val createdAt: Instant = Instant.now()
)

data class Player(
    val sessionId: String,
    val nickname: String,
    val index: Int
)

enum class RoomState { WAITING, PLAYING, FINISHED }
