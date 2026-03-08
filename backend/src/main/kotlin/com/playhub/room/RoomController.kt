package com.playhub.room

import com.playhub.common.dto.CreateRoomRequest
import com.playhub.common.dto.RoomResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/rooms")
class RoomController(
    private val roomService: RoomService,
    private val messagingTemplate: SimpMessagingTemplate
) {

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

    @PostMapping("/{id}/join")
    fun joinRoom(
        @PathVariable id: String,
        @RequestBody request: Map<String, String>
    ): ResponseEntity<Any> {
        val nickname = request["nickname"]
            ?: return ResponseEntity.badRequest().body(mapOf("error" to "nickname is required"))
        val room = roomService.getRoom(id)
            ?: return ResponseEntity.notFound().build()

        if (room.state != RoomState.WAITING) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(mapOf("error" to "Room is not accepting players"))
        }

        val playerIndex = room.players.size
        val player = Player(
            sessionId = java.util.UUID.randomUUID().toString().substring(0, 8),
            nickname = nickname,
            index = playerIndex
        )
        roomService.joinRoom(id, player)

        val playersList = room.players.map {
            mapOf("sessionId" to it.sessionId, "nickname" to it.nickname, "index" to it.index)
        }

        // WebSocket broadcast - notify host about new player
        messagingTemplate.convertAndSend(
            "/topic/room/$id",
            mapOf("type" to "PLAYER_JOINED", "players" to playersList)
        )

        return ResponseEntity.ok(mapOf(
            "playerIndex" to playerIndex,
            "sessionId" to player.sessionId,
            "players" to playersList
        ))
    }
}
