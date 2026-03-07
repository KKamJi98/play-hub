package com.playhub

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class PlayHubApplication

fun main(args: Array<String>) {
    runApplication<PlayHubApplication>(*args)
}
