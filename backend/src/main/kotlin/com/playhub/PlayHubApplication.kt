package com.playhub

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class PlayHubApplication

fun main(args: Array<String>) {
    runApplication<PlayHubApplication>(*args)
}
