package com.playhub.room

import com.playhub.common.dto.CreateRoomRequest
import com.playhub.common.dto.RoomResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/rooms")
class RoomController(private val roomService: RoomService) {

    @PostMapping
    fun createRoom(@RequestBody request: CreateRoomRequest): ResponseEntity<RoomResponse> {
        val room = roomService.createRoom(request.gameId, request.settings)
        return ResponseEntity.status(HttpStatus.CREATED).body(RoomResponse.from(room))
    }

    @GetMapping
    fun getRooms(@RequestParam(required = false) gameId: String?): List<RoomResponse> {
        val rooms = if (gameId != null) {
            roomService.getRoomsByGame(gameId)
        } else {
            emptyList()
        }
        return rooms.map { RoomResponse.from(it) }
    }

    @GetMapping("/{id}")
    fun getRoom(@PathVariable id: String): ResponseEntity<RoomResponse> {
        val room = roomService.getRoom(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(RoomResponse.from(room))
    }
}
