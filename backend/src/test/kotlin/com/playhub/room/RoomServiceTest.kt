package com.playhub.room

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RoomServiceTest {

    private val roomService = RoomService()

    @Test
    fun `createRoom should force renju rule on for gomoku`() {
        val room = roomService.createRoom(
            "gomoku",
            mapOf("renjuRule" to false, "timeLimitSeconds" to 30)
        )

        assertTrue(room.settings["renjuRule"] as Boolean)
        assertEquals(30, room.settings["timeLimitSeconds"])
    }

    @Test
    fun `createRoom should preserve settings for non gomoku games`() {
        val room = roomService.createRoom("othello", mapOf("ranked" to true))

        assertEquals(true, room.settings["ranked"])
        assertFalse(room.settings.containsKey("renjuRule"))
    }
}
