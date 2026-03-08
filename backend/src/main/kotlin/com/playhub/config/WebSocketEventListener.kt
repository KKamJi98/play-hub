package com.playhub.config

import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.web.socket.messaging.SessionDisconnectEvent

@Component
class WebSocketEventListener {

    private val log = LoggerFactory.getLogger(WebSocketEventListener::class.java)

    @EventListener
    fun handleSessionDisconnect(event: SessionDisconnectEvent) {
        val sessionId = event.sessionId
        log.info("WebSocket session disconnected: {}", sessionId)
        // Room cleanup can be extended here if sessions are tracked per room
    }
}
