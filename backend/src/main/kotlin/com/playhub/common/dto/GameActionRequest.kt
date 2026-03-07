package com.playhub.common.dto

data class GameActionRequest(
    val roomId: String,
    val playerIndex: Int,
    val action: Any
)
