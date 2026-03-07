package com.playhub.common.dto

data class CreateRoomRequest(
    val gameId: String,
    val settings: Map<String, Any> = emptyMap()
)
