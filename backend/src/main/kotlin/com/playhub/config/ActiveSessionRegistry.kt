package com.playhub.config

import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class ActiveSessionRegistry {

    private val activeSessions = ConcurrentHashMap.newKeySet<String>()

    fun register(wsSessionId: String) {
        activeSessions.add(wsSessionId)
    }

    fun unregister(wsSessionId: String) {
        activeSessions.remove(wsSessionId)
    }

    fun isActive(wsSessionId: String): Boolean = activeSessions.contains(wsSessionId)
}
