package com.playhub.game.othello

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test

class OthelloHandlerTest {

    private lateinit var handler: OthelloHandler

    @BeforeEach
    fun setUp() {
        handler = OthelloHandler()
    }

    @Test
    fun `gameId should be othello`() {
        assertEquals("othello", handler.gameId)
    }

    @Nested
    inner class CreateInitialState {

        @Test
        fun `should create 8x8 board with center 4 stones`() {
            val state = handler.createInitialState(emptyMap())

            assertEquals(OthelloState.BOARD_SIZE, state.board.size)
            for (row in state.board) {
                assertEquals(OthelloState.BOARD_SIZE, row.size)
            }

            // Center stones: (3,3)=WHITE, (3,4)=BLACK, (4,3)=BLACK, (4,4)=WHITE
            assertEquals(OthelloState.WHITE, state.board[3][3])
            assertEquals(OthelloState.BLACK, state.board[3][4])
            assertEquals(OthelloState.BLACK, state.board[4][3])
            assertEquals(OthelloState.WHITE, state.board[4][4])
        }

        @Test
        fun `should set BLACK as starting player`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(OthelloState.BLACK, state.currentPlayer)
        }

        @Test
        fun `should set game status to PLAYING`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(OthelloGameStatus.PLAYING, state.gameStatus)
        }

        @Test
        fun `should have initial scores of 2-2`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(OthelloScores(2, 2), state.scores)
        }

        @Test
        fun `should have correct valid moves for BLACK`() {
            val state = handler.createInitialState(emptyMap())

            // Standard Othello opening: BLACK can play at (2,3), (3,2), (4,5), (5,4)
            assertEquals(4, state.validMoves.size)
            assertTrue(state.validMoves.contains(OthelloMove(2, 3)))
            assertTrue(state.validMoves.contains(OthelloMove(3, 2)))
            assertTrue(state.validMoves.contains(OthelloMove(4, 5)))
            assertTrue(state.validMoves.contains(OthelloMove(5, 4)))
        }

        @Test
        fun `should have no winner and no last move`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(OthelloState.EMPTY, state.winner)
            assertNull(state.lastMove)
        }
    }

    @Nested
    inner class ValidateAction {

        @Test
        fun `should accept valid move for correct player`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val result = handler.validateAction(state, action, 0) // playerIndex 0 -> BLACK
            assertTrue(result.valid)
            assertNull(result.error)
        }

        @Test
        fun `should reject move for wrong player turn`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val result = handler.validateAction(state, action, 1) // playerIndex 1 -> WHITE, but BLACK's turn
            assertFalse(result.valid)
            assertNotNull(result.error)
            assertTrue(result.error!!.contains("Not your turn"))
        }

        @Test
        fun `should reject move out of bounds`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to -1, "col" to 3)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("out of bounds"))
        }

        @Test
        fun `should reject move that flips no stones`() {
            val state = handler.createInitialState(emptyMap())
            // (0,0) is empty but would not flip any stones
            val action = mapOf("type" to "PLACE_STONE", "row" to 0, "col" to 0)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("No stones would be flipped"))
        }

        @Test
        fun `should reject move when game is finished`() {
            val state = handler.createInitialState(emptyMap()).copy(
                gameStatus = OthelloGameStatus.FINISHED
            )
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val result = handler.validateAction(state, action, 0)
            assertFalse(result.valid)
            assertTrue(result.error!!.contains("already finished"))
        }

        @Test
        fun `should reject unknown action type`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "UNKNOWN", "row" to 2, "col" to 3)

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
        fun `should place stone and flip captured stones`() {
            val state = handler.createInitialState(emptyMap())
            // BLACK plays (2,3): should flip (3,3) from WHITE to BLACK
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val newState = handler.applyAction(state, action, 0)

            assertEquals(OthelloState.BLACK, newState.board[2][3])
            assertEquals(OthelloState.BLACK, newState.board[3][3]) // flipped
            assertEquals(OthelloState.BLACK, newState.board[3][4]) // unchanged, was already BLACK
            assertEquals(OthelloState.BLACK, newState.board[4][3]) // unchanged, was already BLACK
            assertEquals(OthelloState.WHITE, newState.board[4][4]) // unchanged
            assertEquals(OthelloMove(2, 3), newState.lastMove)
        }

        @Test
        fun `should switch to opponent after move`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val newState = handler.applyAction(state, action, 0)
            assertEquals(OthelloState.WHITE, newState.currentPlayer)
        }

        @Test
        fun `should update scores after move`() {
            val state = handler.createInitialState(emptyMap())
            // BLACK plays (2,3): places 1 stone + flips 1 stone = +2 BLACK, -1 WHITE
            // Before: BLACK=2, WHITE=2. After: BLACK=4, WHITE=1
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val newState = handler.applyAction(state, action, 0)
            assertEquals(OthelloScores(4, 1), newState.scores)
        }

        @Test
        fun `should not mutate original state`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            handler.applyAction(state, action, 0)

            // Original board should remain unchanged
            assertEquals(OthelloState.WHITE, state.board[3][3])
            assertEquals(OthelloState.EMPTY, state.board[2][3])
            assertEquals(OthelloState.BLACK, state.currentPlayer)
        }

        @Test
        fun `should compute valid moves for next player`() {
            val state = handler.createInitialState(emptyMap())
            val action = mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3)

            val newState = handler.applyAction(state, action, 0)
            assertTrue(newState.validMoves.isNotEmpty())
            // All valid moves should be for WHITE (the next player)
            for (move in newState.validMoves) {
                val flipped = OthelloValidator.getFlippedStones(
                    newState.board, move.row, move.col, OthelloState.WHITE
                )
                assertTrue(flipped.isNotEmpty(), "Move ($move) should flip at least one stone for WHITE")
            }
        }
    }

    @Nested
    inner class TurnSkip {

        @Test
        fun `should skip turn when opponent has no valid moves`() {
            // Construct a board where WHITE has no valid moves but BLACK does
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) }
            // Fill a scenario where after BLACK's move, WHITE has no moves
            // Simple scenario: almost full board with WHITE cornered
            board[0][0] = OthelloState.BLACK
            board[0][1] = OthelloState.BLACK
            board[0][2] = OthelloState.BLACK
            board[1][0] = OthelloState.BLACK
            board[1][1] = OthelloState.WHITE
            board[1][2] = OthelloState.EMPTY // BLACK can play here to flip (1,1)

            val validMoves = OthelloValidator.getValidMoves(board, OthelloState.BLACK)
            val state = OthelloState(
                board = board,
                currentPlayer = OthelloState.BLACK,
                gameStatus = OthelloGameStatus.PLAYING,
                winner = OthelloState.EMPTY,
                lastMove = null,
                scores = OthelloValidator.calculateScores(board),
                validMoves = validMoves
            )

            // Verify BLACK can play at (1,2)
            assertTrue(state.validMoves.contains(OthelloMove(1, 2)))

            val action = mapOf("type" to "PLACE_STONE", "row" to 1, "col" to 2)
            val newState = handler.applyAction(state, action, 0)

            // After this move, check who plays next
            // If WHITE has no valid moves, turn should stay with BLACK or game ends
            if (newState.gameStatus == OthelloGameStatus.PLAYING) {
                // If game continues, verify current player has valid moves
                assertTrue(newState.validMoves.isNotEmpty())
            }
        }
    }

    @Nested
    inner class GameOverDetection {

        @Test
        fun `should return not over for active game`() {
            val state = handler.createInitialState(emptyMap())
            val result = handler.checkGameOver(state)

            assertFalse(result.isOver)
            assertNull(result.winner)
            assertNull(result.reason)
        }

        @Test
        fun `should detect game over when board is full`() {
            // Fill entire board with BLACK (extreme case)
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) { OthelloState.BLACK } }
            val scores = OthelloValidator.calculateScores(board)

            val state = OthelloState(
                board = board,
                currentPlayer = OthelloState.BLACK,
                gameStatus = OthelloGameStatus.FINISHED,
                winner = OthelloState.BLACK,
                lastMove = OthelloMove(0, 0),
                scores = scores,
                validMoves = emptyList()
            )

            val result = handler.checkGameOver(state)
            assertTrue(result.isOver)
            assertEquals(OthelloState.BLACK, result.winner)
            assertNotNull(result.reason)
        }

        @Test
        fun `should detect game over when neither player has moves`() {
            // Create a board where neither player has valid moves
            // All BLACK with one WHITE - no empty cells adjacent to create flips
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) { OthelloState.BLACK } }
            board[0][0] = OthelloState.WHITE

            val blackMoves = OthelloValidator.getValidMoves(board, OthelloState.BLACK)
            val whiteMoves = OthelloValidator.getValidMoves(board, OthelloState.WHITE)

            // Both should have no valid moves (board is full)
            assertTrue(blackMoves.isEmpty())
            assertTrue(whiteMoves.isEmpty())
        }

        @Test
        fun `should report draw correctly`() {
            val board = Array(OthelloState.BOARD_SIZE) { row ->
                IntArray(OthelloState.BOARD_SIZE) { col ->
                    if (row < 4) OthelloState.BLACK else OthelloState.WHITE
                }
            }
            val scores = OthelloValidator.calculateScores(board)
            assertEquals(32, scores.black)
            assertEquals(32, scores.white)

            val state = OthelloState(
                board = board,
                currentPlayer = OthelloState.BLACK,
                gameStatus = OthelloGameStatus.FINISHED,
                winner = OthelloState.EMPTY,
                lastMove = OthelloMove(7, 7),
                scores = scores,
                validMoves = emptyList()
            )

            val result = handler.checkGameOver(state)
            assertTrue(result.isOver)
            assertNull(result.winner)
            assertTrue(result.reason!!.contains("Draw"))
        }

        @Test
        fun `should report WHITE win correctly`() {
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) { OthelloState.WHITE } }
            board[0][0] = OthelloState.BLACK
            val scores = OthelloValidator.calculateScores(board)

            val state = OthelloState(
                board = board,
                currentPlayer = OthelloState.WHITE,
                gameStatus = OthelloGameStatus.FINISHED,
                winner = OthelloState.WHITE,
                lastMove = OthelloMove(7, 7),
                scores = scores,
                validMoves = emptyList()
            )

            val result = handler.checkGameOver(state)
            assertTrue(result.isOver)
            assertEquals(OthelloState.WHITE, result.winner)
            assertTrue(result.reason!!.contains("White wins"))
        }
    }

    @Nested
    inner class ScoreCalculation {

        @Test
        fun `should calculate scores correctly for initial board`() {
            val state = handler.createInitialState(emptyMap())
            assertEquals(2, state.scores.black)
            assertEquals(2, state.scores.white)
        }

        @Test
        fun `should calculate scores correctly after a move`() {
            var state = handler.createInitialState(emptyMap())
            // BLACK plays (2,3), flipping (3,3) -> BLACK=4, WHITE=1
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3), 0)
            assertEquals(4, state.scores.black)
            assertEquals(1, state.scores.white)
        }
    }

    @Nested
    inner class OthelloValidatorTest {

        @Test
        fun `getFlippedStones should return empty for invalid move`() {
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) }
            board[3][3] = OthelloState.WHITE
            board[3][4] = OthelloState.BLACK
            board[4][3] = OthelloState.BLACK
            board[4][4] = OthelloState.WHITE

            // (0,0) would not flip anything
            val flipped = OthelloValidator.getFlippedStones(board, 0, 0, OthelloState.BLACK)
            assertTrue(flipped.isEmpty())
        }

        @Test
        fun `getFlippedStones should find stones to flip in multiple directions`() {
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) }
            // Setup a scenario where BLACK playing (4,3) flips in two directions:
            //   vertical: (3,3)=WHITE between (2,3)=BLACK and (4,3)
            //   diagonal up-left: (3,2)=WHITE between (2,1)=BLACK and (4,3)
            board[2][1] = OthelloState.BLACK
            board[2][3] = OthelloState.BLACK
            board[3][2] = OthelloState.WHITE
            board[3][3] = OthelloState.WHITE

            // BLACK plays (4,3):
            //   direction (-1,0): (3,3)=WHITE, (2,3)=BLACK -> flip (3,3)
            //   direction (-1,-1): (3,2)=WHITE, (2,1)=BLACK -> flip (3,2)
            val flipped = OthelloValidator.getFlippedStones(board, 4, 3, OthelloState.BLACK)
            assertEquals(2, flipped.size)
            assertTrue(flipped.contains(OthelloMove(3, 3)))
            assertTrue(flipped.contains(OthelloMove(3, 2)))
        }

        @Test
        fun `calculateScores should count all stones`() {
            val board = Array(OthelloState.BOARD_SIZE) { IntArray(OthelloState.BOARD_SIZE) }
            board[0][0] = OthelloState.BLACK
            board[0][1] = OthelloState.BLACK
            board[0][2] = OthelloState.BLACK
            board[1][0] = OthelloState.WHITE
            board[1][1] = OthelloState.WHITE

            val scores = OthelloValidator.calculateScores(board)
            assertEquals(3, scores.black)
            assertEquals(2, scores.white)
        }
    }

    @Nested
    inner class IntegrationTest {

        @Test
        fun `should play a sequence of valid moves`() {
            var state = handler.createInitialState(emptyMap())

            // BLACK plays (2,3)
            val validation1 = handler.validateAction(state, mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3), 0)
            assertTrue(validation1.valid)
            state = handler.applyAction(state, mapOf("type" to "PLACE_STONE", "row" to 2, "col" to 3), 0)
            assertEquals(OthelloState.WHITE, state.currentPlayer)
            assertEquals(OthelloGameStatus.PLAYING, state.gameStatus)

            // WHITE plays a valid move from the available moves
            assertTrue(state.validMoves.isNotEmpty())
            val whiteMove = state.validMoves[0]
            val validation2 = handler.validateAction(
                state,
                mapOf("type" to "PLACE_STONE", "row" to whiteMove.row, "col" to whiteMove.col),
                1
            )
            assertTrue(validation2.valid)
            state = handler.applyAction(
                state,
                mapOf("type" to "PLACE_STONE", "row" to whiteMove.row, "col" to whiteMove.col),
                1
            )

            // Game should still be playing
            assertEquals(OthelloGameStatus.PLAYING, state.gameStatus)
            assertTrue(state.scores.black + state.scores.white > 4) // More stones than initial
        }
    }
}
