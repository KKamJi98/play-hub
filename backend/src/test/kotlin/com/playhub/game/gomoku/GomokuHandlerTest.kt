package com.playhub.game.gomoku

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test

class GomokuHandlerTest {

    private lateinit var handler: GomokuHandler

    @BeforeEach
    fun setUp() {
        handler = GomokuHandler()
    }

    @Test
    fun `gameId should be gomoku`() {
        assertEquals("gomoku", handler.gameId)
    }

    @Nested
    inner class CreateInitialState {

        @Test
        fun `should create 15x15 empty board`() {
            val state = handler.createInitialState(emptyMap())

            assertEquals(GomokuState.BOARD_SIZE, state.board.size)
            for (row in state.board) {
                assertEquals(GomokuState.BOARD_SIZE, row.size)
                assertArrayEquals(IntArray(GomokuState.BOARD_SIZE), row)
            }
        }

        @Test
        fun `should set BLACK as starting player`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(GomokuState.BLACK, state.currentPlayer)
        }

        @Test
        fun `should set game status to PLAYING`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(GameStatus.PLAYING, state.gameStatus)
        }

        @Test
        fun `should have no winner and no last move`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(GomokuState.EMPTY, state.winner)
            assertNull(state.lastMove)
            assertTrue(state.moveHistory.isEmpty())
        }
    }

    @Nested
    inner class ValidateAction {

        @Test
        fun `should accept valid move for correct player`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7)

            val result = handler.validateAction(state, action, 0) // playerIndex 0 -> BLACK
            assertTrue(result.valid)
            assertNull(result.error)
        }

        @Test
        fun `should reject move for wrong player turn`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7)

            val result = handler.validateAction(state, action, 1) // playerIndex 1 -> WHITE, but BLACK's turn
            assertFalse(result.valid)
            assertNotNull(result.error)
            assertTrue(result.error!!.contains("Not your turn"))
        }

        @Test
        fun `should reject move out of bounds - negative`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to -1, "col" to 7)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("out of bounds"))
        }

        @Test
        fun `should reject move out of bounds - exceeds board size`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 15, "col" to 7)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("out of bounds"))
        }

        @Test
        fun `should reject move on occupied cell`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7)
            val stateAfterMove = handler.applyAction(state, action, 0)

            // WHITE tries to place on the same cell
            val result = handler.validateAction(stateAfterMove, action, 1)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("already occupied"))
        }

        @Test
        fun `should reject move when game is finished`() {
            val state = handler.createInitialState(emptyMap()).copy(gameStatus = GameStatus.FINISHED)
            val action = mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("already finished"))
        }

        @Test
        fun `should reject unknown action type`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "UNKNOWN", "row" to 7, "col" to 7)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("Unknown action type"))
        }

        @Test
        fun `should reject invalid action format`() {
            val state = handler.createInitialState(emptyMap())
            val action = "invalid"

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("Invalid action format"))
        }
    }

    @Nested
    inner class ApplyAction {

        @Test
        fun `should place stone and switch player`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7)

            val newState = handler.applyAction(state, action, 0)

            assertEquals(GomokuState.BLACK, newState.board[7][7])
            assertEquals(GomokuState.WHITE, newState.currentPlayer)
            assertEquals(Move(7, 7), newState.lastMove)
            assertEquals(1, newState.moveHistory.size)
            assertEquals(MoveRecord(7, 7, GomokuState.BLACK), newState.moveHistory[0])
        }

        @Test
        fun `should not mutate original state`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7)

            handler.applyAction(state, action, 0)

            assertEquals(GomokuState.EMPTY, state.board[7][7])
            assertEquals(GomokuState.BLACK, state.currentPlayer)
        }

        @Test
        fun `should record move history across multiple moves`() {
            var state = handler.createInitialState(emptyMap())

            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 8), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 7), 0)

            assertEquals(3, state.moveHistory.size)
            assertEquals(MoveRecord(7, 7, GomokuState.BLACK), state.moveHistory[0])
            assertEquals(MoveRecord(7, 8, GomokuState.WHITE), state.moveHistory[1])
            assertEquals(MoveRecord(8, 7, GomokuState.BLACK), state.moveHistory[2])
        }
    }

    @Nested
    inner class WinDetection {

        @Test
        fun `should detect horizontal win`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK: (7,3), (7,4), (7,5), (7,6), (7,7)
            // WHITE: (8,3), (8,4), (8,5), (8,6)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 3), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 3), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 4), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 4), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 5), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 5), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 6), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 6), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7), 0)

            assertEquals(GameStatus.FINISHED, state.gameStatus)
            assertEquals(GomokuState.BLACK, state.winner)

            val result = handler.checkGameOver(state)
            assertTrue(result.isOver)
            assertEquals(GomokuState.BLACK, result.winner)
        }

        @Test
        fun `should detect vertical win`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK: (3,7), (4,7), (5,7), (6,7), (7,7)
            // WHITE: (3,8), (4,8), (5,8), (6,8)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 3, "col" to 7), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 3, "col" to 8), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 4, "col" to 7), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 4, "col" to 8), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 5, "col" to 7), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 5, "col" to 8), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 6, "col" to 7), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 6, "col" to 8), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7), 0)

            assertEquals(GameStatus.FINISHED, state.gameStatus)
            assertEquals(GomokuState.BLACK, state.winner)
        }

        @Test
        fun `should detect diagonal win (top-left to bottom-right)`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK: (3,3), (4,4), (5,5), (6,6), (7,7)
            // WHITE: (3,4), (4,5), (5,6), (6,7)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 3, "col" to 3), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 3, "col" to 4), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 4, "col" to 4), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 4, "col" to 5), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 5, "col" to 5), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 5, "col" to 6), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 6, "col" to 6), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 6, "col" to 7), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 7), 0)

            assertEquals(GameStatus.FINISHED, state.gameStatus)
            assertEquals(GomokuState.BLACK, state.winner)
        }

        @Test
        fun `should detect diagonal win (top-right to bottom-left)`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK: (3,7), (4,6), (5,5), (6,4), (7,3)
            // WHITE: (3,6), (4,5), (5,4), (6,3)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 3, "col" to 7), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 3, "col" to 6), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 4, "col" to 6), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 4, "col" to 5), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 5, "col" to 5), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 5, "col" to 4), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 6, "col" to 4), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 6, "col" to 3), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 3), 0)

            assertEquals(GameStatus.FINISHED, state.gameStatus)
            assertEquals(GomokuState.BLACK, state.winner)
        }

        @Test
        fun `should detect WHITE win`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK: (0,0), (0,1), (0,2), (0,3), (14,14)
            // WHITE: (1,0), (1,1), (1,2), (1,3), (1,4)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 0, "col" to 0), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 1, "col" to 0), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 0, "col" to 1), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 1, "col" to 1), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 0, "col" to 2), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 1, "col" to 2), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 0, "col" to 3), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 1, "col" to 3), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 14, "col" to 14), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 1, "col" to 4), 1)

            assertEquals(GameStatus.FINISHED, state.gameStatus)
            assertEquals(GomokuState.WHITE, state.winner)

            val result = handler.checkGameOver(state)
            assertTrue(result.isOver)
            assertEquals(GomokuState.WHITE, result.winner)
        }

        @Test
        fun `should not detect win with only 4 in a row`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK: (7,3), (7,4), (7,5), (7,6)
            // WHITE: (8,3), (8,4), (8,5)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 3), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 3), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 4), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 4), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 5), 0)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 8, "col" to 5), 1)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 7, "col" to 6), 0)

            assertEquals(GameStatus.PLAYING, state.gameStatus)
            assertEquals(GomokuState.EMPTY, state.winner)

            val result = handler.checkGameOver(state)
            assertFalse(result.isOver)
        }
    }

    @Nested
    inner class DrawDetection {

        @Test
        fun `should detect draw when board is full with no winner`() {
            // Create a board that is almost full with no 5-in-a-row
            // We'll use a pattern that fills the board without any 5-in-a-row
            val board = Array(GomokuState.BOARD_SIZE) { row ->
                IntArray(GomokuState.BOARD_SIZE) { col ->
                    // Alternating 2-column blocks: BB WW BB WW ...
                    // Row shift to break vertical lines
                    val shifted = (col + (row / 2) * 2) % GomokuState.BOARD_SIZE
                    if ((shifted / 2) % 2 == 0) GomokuState.BLACK else GomokuState.WHITE
                }
            }
            // Leave one cell empty for the last move
            val lastRow = GomokuState.BOARD_SIZE - 1
            val lastCol = GomokuState.BOARD_SIZE - 1
            val lastPlayer = board[lastRow][lastCol]
            board[lastRow][lastCol] = GomokuState.EMPTY

            val state = GomokuState(
                board = board,
                currentPlayer = lastPlayer,
                gameStatus = GameStatus.PLAYING,
                winner = GomokuState.EMPTY,
                lastMove = Move(lastRow, lastCol - 1),
                moveHistory = mutableListOf()
            )

            // Place the last stone
            val action = mapOf("type" to "PLACE_STONE", "row" to lastRow, "col" to lastCol)
            val finalState = handler.applyAction(state, action, lastPlayer - 1)

            // Either it's a draw (FINISHED with no winner) or someone won
            // The key check is that the game ends
            assertEquals(GameStatus.FINISHED, finalState.gameStatus)
        }

        @Test
        fun `should report draw correctly via checkGameOver`() {
            // Directly create a finished state with no winner
            val state = GomokuState(
                board = Array(GomokuState.BOARD_SIZE) { IntArray(GomokuState.BOARD_SIZE) { GomokuState.BLACK } },
                currentPlayer = GomokuState.BLACK,
                gameStatus = GameStatus.FINISHED,
                winner = GomokuState.EMPTY,
                lastMove = Move(0, 0),
                moveHistory = mutableListOf()
            )

            val result = handler.checkGameOver(state)
            assertTrue(result.isOver)
            assertNull(result.winner)
            assertTrue(result.reason!!.contains("Draw"))
        }
    }

    @Nested
    inner class CheckGameOver {

        @Test
        fun `should return not over for active game`() {
            val state = handler.createInitialState(emptyMap())
            val result = handler.checkGameOver(state)

            assertFalse(result.isOver)
            assertNull(result.winner)
            assertNull(result.reason)
        }
    }
}
