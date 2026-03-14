package com.playhub.game.gomoku

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test

/**
 * Tests for RenjuValidator — forbidden move detection for the BLACK player.
 *
 * Board notation used in helper [boardFrom]:
 *   '.' = EMPTY (0)
 *   'B' = BLACK (1)
 *   'W' = WHITE (2)
 *
 * Each test creates a minimal 15×15 board with only the relevant stones placed.
 */
class RenjuValidatorTest {

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Creates a 15×15 board from a map of (row, col) -> stone.
     * Unspecified cells are EMPTY.
     */
    private fun emptyBoard(): Array<IntArray> =
        Array(RenjuValidator.BOARD_SIZE) { IntArray(RenjuValidator.BOARD_SIZE) }

    private fun boardWith(vararg stones: Triple<Int, Int, Int>): Array<IntArray> {
        val board = emptyBoard()
        for ((r, c, v) in stones) {
            board[r][c] = v
        }
        return board
    }

    private fun B(row: Int, col: Int) = Triple(row, col, RenjuValidator.BLACK)
    private fun W(row: Int, col: Int) = Triple(row, col, RenjuValidator.WHITE)

    // -------------------------------------------------------------------------
    // Overline
    // -------------------------------------------------------------------------

    @Nested
    inner class Overline {

        @Test
        fun `six in a row is forbidden`() {
            // B B B B B _ (placing at col 5 makes 6)
            val board = boardWith(B(7, 0), B(7, 1), B(7, 2), B(7, 3), B(7, 4))
            assertTrue(RenjuValidator.isForbiddenMove(board, 7, 5), "Six in a row should be forbidden")
        }

        @Test
        fun `seven in a row is forbidden`() {
            val board = boardWith(B(7, 0), B(7, 1), B(7, 2), B(7, 3), B(7, 4), B(7, 6))
            assertTrue(RenjuValidator.isForbiddenMove(board, 7, 5), "Seven in a row should be forbidden")
        }

        @Test
        fun `exactly five is NOT forbidden - winning move`() {
            // B B B B _ (placing at col 4 makes exactly 5)
            val board = boardWith(B(7, 0), B(7, 1), B(7, 2), B(7, 3))
            assertFalse(RenjuValidator.isForbiddenMove(board, 7, 4), "Exactly 5 is a winning move, not forbidden")
        }

        @Test
        fun `white overline is not affected by renju rules`() {
            // Validator only checks BLACK; WHITE stones should not trigger forbidden
            val board = boardWith(W(7, 0), W(7, 1), W(7, 2), W(7, 3), W(7, 4))
            // The cell at (7,5) is EMPTY — placing BLACK there has no 6-in-a-row for BLACK
            assertFalse(RenjuValidator.isForbiddenMove(board, 7, 5))
        }
    }

    // -------------------------------------------------------------------------
    // Double-four
    // -------------------------------------------------------------------------

    @Nested
    inner class DoubleFour {

        @Test
        fun `two straight fours in different directions is forbidden`() {
            // Horizontal four: B B B _ B  (placing at col 7 joins with col 11 via gap? No — simpler setup)
            // Place 3 black horizontally and 3 vertically sharing the candidate cell
            //
            //    col: 5 6 7 8 9
            // row 5:    B B _ B   <- horizontal, placing at (5,7) completes to 4 (5,5..5,8 missing one)
            // Actually use a cleaner double-four pattern:
            //
            // Horizontal: (7,3)(7,4)(7,5)(7,6) placed; candidate (7,7) extends to 5 — wait that's 5, a win.
            //
            // Use gapped fours: (7,3)(7,4)(7,5)_ and (5,7)(6,7)(8,7) - placing at (7,7):
            //   horizontal: _ B B B [candidate] → would need something on right too
            //
            // Cleaner: use two independent four patterns intersecting at candidate
            //   Row 7, cols 3-6 (four blacks) + candidate at (7,7): horizontal four (need one gap)
            //   Actually simpler:
            //     Horizontal four: B B B _ B where gap is NOT candidate, and candidate fills elsewhere
            //
            // Simplest verified double-four:
            //   Board has: row7: cols 3,4,5,6 = BLACK (four in a row)
            //              col7: rows 3,4,5,6 = BLACK (four in a column)
            //   Candidate (7,7): adding it creates horizontal 5 (cols 3-7) AND vertical 5 (rows 3-7)
            //   But that's a 5-in-a-row win in two directions, so it's NOT forbidden (winning move wins).
            //
            // To get double-four without a 5-in-a-row win, we need gapped fours:
            //   Pattern: B B B _ B — the gap is NOT the candidate cell; candidate provides the 4th stone
            //   Horizontal: (7,2)(7,3)(7,4)=BLACK, candidate at (7,5), (7,7)=BLACK
            //     → placing at (7,5): row 7 has B B B [cand] _ B → window (7,2..7,6) = B B B X _ = 3+1 in window
            //     Hmm, let me use a well-known double-four position:
            //
            // Correct approach:
            //   Gapped horizontal four:  B _ B B B where candidate fills the gap
            //     stones: (7,3)(7,5)(7,6)(7,7) ; candidate (7,4)
            //     After placing (7,4): row has B B B B B at cols 3-7 → that's 5 (winning), not a four.
            //
            // Use non-contiguous arrangement:
            //   Horizontal: (7,2)(7,3)(7,4)(7,6) — candidate at (7,5) fills gap → BBBBB = 5, winning.
            //
            // The key insight: a double-four is forbidden because placing creates TWO fours simultaneously,
            // but neither is an immediate five-in-a-row. This can happen with gapped patterns that both
            // point to different completion squares.
            //
            // Example that truly gives double-four (no five):
            //   Horizontal: (7,1)(7,2)(7,3)(7,4) + candidate at (7,6) with (7,8) blocked
            //     Window (7,2..7,6): B B B B _ -> four in horizontal direction
            //   Vertical: (1,6)(2,6)(3,6)(4,6) + candidate at (7,6)
            //     Window (3,6..7,6): B B B B _ -> four in vertical direction  (only if rows 3-6 are BLACK at col6)
            //     But (7,6) connecting to (3-6,6) gives 5 vertical stones → 5 in a row, winning.
            //
            // It seems hard to get a double-four without accidentally getting a 5. The key is that
            // the candidate must extend TWO separate four-patterns but each in a way that leaves both
            // needing one more stone. This requires the existing stones to be 3+gap pattern:
            //
            //   Horizontal: _ B B B _ [candidate] _ = at candidate position, look left 4 cells: _BBB_ then candidate
            //     No that's only 3 black before candidate.
            //
            // Standard double-four pattern from Renju literature:
            //   Place: (7,3)(7,4)(7,5)(7,6) horizontal and (4,7)(5,7)(6,7)(7,7) vertical
            //   Candidate: (7,7)? No: col 7 has 4 stones above, placing at (7,7) gives vertical 5 = win.
            //
            //   Place: (7,3)(7,4)(7,5) horizontal + (5,7)(6,7) vertical + (7,7)
            //   Candidate (7,6): horizontal window (7,3..7,7) = B B B _ B = 4B+1E → four
            //                    vertical: col 6 has nothing → not a four
            //
            // After careful analysis, the simplest non-trivial double-four requires a gapped pattern.
            // Let me use the following verified setup:
            //   Row 7, cols 2,3,4,6: BLACK (gapped four - gap at col 5)
            //   Row 7, cols 8,9,10,12: BLACK (gapped four - gap at col 11)
            //   ... this puts them in the same row with candidate in between... not ideal.
            //
            // Best practical test: two directions with 3 stones each meeting at candidate,
            // where both sides have an empty cell beyond (so they form open fours, not fives):
            //
            //   col7: rows 4,5,6 = BLACK; candidate at (7,7); row7: cols 8,9,10 = BLACK
            //   candidate (7,7): vertical(col7): 4,5,6,7 = BBBB, row above (3,7)=empty, below (8,7)=empty → open four
            //                    horizontal: 7,8,9,10 = B B B B, left (7,6)=empty, right (7,11)=empty → open four
            //   But both fours have one end at (7,7) itself, and both are exactly 4-in-a-row through (7,7) → double-four!
            //   We need to verify neither is 5: vertical count = 4 (rows 4-7), horizontal = 4 (cols 7-10).
            //
            // This is the setup we use.
            val board = boardWith(
                B(4, 7), B(5, 7), B(6, 7), // vertical: 3 black above candidate
                B(7, 8), B(7, 9), B(7, 10)  // horizontal: 3 black right of candidate
            )
            // Candidate (7,7): vertical four (rows 4-7) + horizontal four (cols 7-10), both open
            assertTrue(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Two open fours in different directions should be double-four forbidden"
            )
        }

        @Test
        fun `gapped four pattern is recognized`() {
            // Gapped four: B B _ B B with candidate at center gap → after placing, we get 5 (win, not forbidden)
            // Instead test: B B B _ with candidate right of the gap making it B B B _ B → that's a gapped four
            // Here we need the gapped four not to immediately win.
            // Pattern: B _ B B B  where candidate is position 1 (the gap):
            //   (7,2)(7,3)(7,4)(7,5) placed; candidate at (7,0)?
            //   Actually: (7,1)(7,2)(7,3)(7,4) + candidate (7,6) with (7,7)=B:
            //   window cols 2-6: B B B B _ → four (candidate at col 6 fills right end → 5 = winning)
            //
            //   Gapped: (7,1)(7,3)(7,4)(7,5) + candidate (7,2):
            //   After placing (7,2): cols 1-5 = B B B B B → 5 = winning move, not forbidden.
            //
            // For a non-winning gapped four we need the window to be 4B+1E but filling E gives exactly 5:
            //   This by definition IS a winning move, so it's always "not forbidden."
            //
            // The gapped four test should verify the DETECTION works as part of double-four.
            // Setup: two gapped fours meeting at candidate:
            //   Row 7: (7,1)(7,3)(7,4)(7,5) → gapped at col 2; placing at (7,2) → 5 in a row = win
            //
            // More useful: gapped four in one direction + open four in another = double-four:
            //   Horizontal gapped: (7,1)(7,3)(7,4) + candidate (7,2) + (7,5)=B
            //     cols 1-5: after placing (7,2): B B B B B = 5 → win, not double-four forbidden.
            //
            // The forbidden double-four with gapped pattern that doesn't win:
            //   Diagonal gapped four: (5,5)(6,6)(8,8) + candidate (7,7) → diag: 4 black in BB_B pattern...
            //     after placing (7,7): (5,5)(6,6)(7,7)(8,8) = 4 with gap at where? No gap now. Count = 4 in diag.
            //     Is this a four? We need a 5th position to complete it. The four is (5,5)(6,6)(7,7)(8,8) and
            //     either (4,4) or (9,9) would be the completing stone. If both are empty → open four.
            //   Combine with a horizontal four through (7,7):
            //     (7,4)(7,5)(7,6) + candidate (7,7) + (7,8) would be 5 = win.
            //     (7,4)(7,5)(7,6) + candidate (7,7) without (7,8):
            //     horizontal: (7,4)(7,5)(7,6)(7,7) = 4; needs (7,8) or (7,3) to make 5; if both empty → open four
            //
            // Final setup that gives double-four via gapped diagonal + horizontal:
            val board = boardWith(
                B(5, 5), B(6, 6), B(8, 8),   // diagonal: placing at (7,7) gives diag four (5,5)(6,6)(7,7)(8,8)
                B(7, 4), B(7, 5), B(7, 6)     // horizontal: placing at (7,7) gives horiz four (7,4)(7,5)(7,6)(7,7)
            )
            // candidate (7,7): diag four + horizontal four (both open since neighbors are empty) → double-four
            assertTrue(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Gapped diagonal four + horizontal four should be double-four forbidden"
            )
        }

        @Test
        fun `single four with open three is allowed (4-3 is not forbidden)`() {
            // 4-3: one four + one open three → allowed (only double-four and double-three are forbidden)
            // Horizontal four through candidate: (7,4)(7,5)(7,6)(7,7) open → four
            // Vertical open three: but we must make sure there's only one four and one three
            //
            // Use: 3 black in a column above candidate (rows 4,5,6 at col 7) = one open three candidate
            //       3 black horizontal (cols 8,9,10 at row 7) = one horizontal four when combined with (7,7)
            // Wait: (7,8)(7,9)(7,10) + candidate (7,7): horizontal four (7,7)(7,8)(7,9)(7,10) with (7,6)=empty and (7,11)=empty → open four (four, not three)
            // (4,7)(5,7)(6,7) + candidate (7,7): vertical = (4,7)(5,7)(6,7)(7,7) = open four in vertical direction
            // So that's two open fours → double-four forbidden.
            //
            // For 4-3: need exactly one four and one three.
            // Three: placing at candidate + 2 existing blacks = 3 in a row with both ends open
            // Four: placing at candidate + 3 existing blacks = 4 in a row
            //
            // Horizontal four: (7,8)(7,9)(7,10) + candidate (7,7) → col 7-10, needs (7,11) or (7,6) → four
            // Vertical three: (5,7)(6,7) + candidate (7,7) → rows 5-7 at col 7: 3 in a row (only 2 existing + candidate = 3)
            //   Is this an open three? We need the 3 to lead to an open four somewhere. The three is (5,7)(6,7)(7,7).
            //   To make it an open four, we'd place at (4,7) or (8,7) — both empty.
            //   (4,7): window (4,7)(5,7)(6,7)(7,7) = 4 black; (3,7)=empty, (8,7)=empty → open four ✓
            //   So vertical is an open three (can extend to open four).
            // Horizontal: (7,8)(7,9)(7,10) + (7,7) = 4 black. This is a four, not a three.
            //
            // 4-3 setup: one four (horizontal) + one open three (vertical) → ALLOWED
            val board = boardWith(
                B(7, 8), B(7, 9), B(7, 10),   // horizontal: with candidate (7,7) → four (7,7..7,10)
                B(5, 7), B(6, 7)               // vertical: with candidate (7,7) → three (5,7..7,7), open both ends
            )
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "4-3 combination (one four + one open three) should be allowed"
            )
        }
    }

    // -------------------------------------------------------------------------
    // Double-three
    // -------------------------------------------------------------------------

    @Nested
    inner class DoubleThree {

        @Test
        fun `two open threes in different directions is forbidden`() {
            // Open three in each direction: each consists of 2 existing BLACK + candidate,
            // both ends open, and the potential four is also open.
            //
            // Horizontal open three: (7,8)(7,9) + candidate (7,7) → (7,7)(7,8)(7,9)
            //   needs (7,6)=empty and (7,10)=empty (for the three itself to be open to form a four)
            //   → placing at (7,6) or (7,10) would create an open four → this is an open three
            //
            // Vertical open three: (5,7)(6,7) + candidate (7,7) → (5,7)(6,7)(7,7)
            //   needs (4,7)=empty and (8,7)=empty → open three in vertical
            //
            // Both must be open threes (not fours). Check: each direction has 2 existing + 1 candidate = 3 in a row.
            // In horizontal: (7,7)(7,8)(7,9) = 3 consecutive. Is there an empty cell that creates a STRAIGHT four?
            //   (7,6): window (7,6)(7,7)(7,8)(7,9) = B B B B, ends (7,5)=empty, (7,10)=empty → open four ✓
            //   (7,10): window (7,7)(7,8)(7,9)(7,10) = B B B B, ends (7,6)=empty, (7,11)=empty → open four ✓
            //   So horizontal IS an open three.
            // Vertical: (5,7)(6,7)(7,7) = 3 consecutive.
            //   (4,7): (4,7)(5,7)(6,7)(7,7) = B B B B, (3,7)=empty, (8,7)=empty → open four ✓
            //   So vertical IS an open three.
            //
            // Total: 2 open threes → double-three → forbidden
            val board = boardWith(
                B(7, 8), B(7, 9),  // horizontal three partner
                B(5, 7), B(6, 7)   // vertical three partner
            )
            assertTrue(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Two open threes should be double-three forbidden"
            )
        }

        @Test
        fun `single open three is allowed`() {
            val board = boardWith(B(7, 8), B(7, 9))
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Single open three should be allowed"
            )
        }

        @Test
        fun `three blocked at one end is not open and does not count`() {
            // White stone blocking one end of the three → not open three
            // Horizontal: W(7,10) blocks the right end of (7,7)(7,8)(7,9)
            // Vertical: only 1 stone → no three
            val board = boardWith(
                B(7, 8), B(7, 9), W(7, 10), // right end blocked by white
                B(5, 7)                       // only one vertical neighbor, not an open three
            )
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Three blocked at one end + single stone should not be double-three"
            )
        }

        @Test
        fun `blocked open three - both extension ends blocked means three is not open`() {
            // An open three requires at least one extension that forms an open four (both ends empty).
            // If ALL possible four extensions are blocked, the three is not "open".
            //
            // Horizontal three: (7,7)(7,8)(7,9) with candidate at (7,7).
            //   Extension at (7,6): would create (7,6)(7,7)(7,8)(7,9) but (7,6)=WHITE → blocked
            //   Extension at (7,10): would create (7,7)(7,8)(7,9)(7,10) but (7,11)=WHITE → one end closed → NOT open four
            // So horizontal is NOT an open three.
            // Vertical open three (5,7)(6,7)(7,7) remains open → only 1 open three → NOT double-three.
            val board = boardWith(
                B(7, 8), B(7, 9), W(7, 6), W(7, 11), // horizontal three blocked on both sides
                B(5, 7), B(6, 7)                       // vertical open three remains
            )
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "When horizontal three's four extensions are all blocked, it's not an open three → not double-three"
            )
        }
    }

    // -------------------------------------------------------------------------
    // Allowed moves
    // -------------------------------------------------------------------------

    @Nested
    inner class AllowedMoves {

        @Test
        fun `winning move (exactly 5) overrides all forbidden checks`() {
            // Even if placing creates a double-three or double-four pattern,
            // an exact five-in-a-row is always a valid (winning) move.
            val board = boardWith(B(7, 3), B(7, 4), B(7, 5), B(7, 6))
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Exactly 5 in a row (winning move) should never be forbidden"
            )
        }

        @Test
        fun `first move on empty board is allowed`() {
            val board = emptyBoard()
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "First move on empty board should be allowed"
            )
        }

        @Test
        fun `occupied cell is not forbidden (returns false)`() {
            val board = boardWith(B(7, 7))
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Already occupied cell should return false (not applicable)"
            )
        }

        @Test
        fun `four-three combination is allowed`() {
            // Covered in DoubleFour tests — included here as explicit allowed-moves check
            val board = boardWith(
                B(7, 8), B(7, 9), B(7, 10),   // with candidate → horizontal four
                B(5, 7), B(6, 7)               // with candidate → vertical three (open)
            )
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Four-three (4-3) should be allowed"
            )
        }

        @Test
        fun `three in a row with only one open end is not an open three`() {
            // Open three requires BOTH ends open
            val board = boardWith(
                B(7, 8), B(7, 9), W(7, 6),  // horizontal: left end blocked at (7,6)
                B(5, 7), W(4, 7)             // vertical: upper end blocked at (4,7)
            )
            // Neither is an open three → no forbidden
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 7),
                "Threes blocked on one side should not count as open threes"
            )
        }
    }

    // -------------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------------

    @Nested
    inner class EdgeCases {

        @Test
        fun `forbidden move near board edge - overline`() {
            // Six in a row touching the board edge
            // Row 0, cols 0-5: place BLACK at 0-4, candidate at 5
            // But that's only 5 → winning. Let's do 0-4 + candidate 5 + 6 exists → 7 in row
            val board = boardWith(
                B(0, 0), B(0, 1), B(0, 2), B(0, 3), B(0, 4), B(0, 6)
            )
            assertTrue(
                RenjuValidator.isForbiddenMove(board, 0, 5),
                "Overline at edge should still be forbidden"
            )
        }

        @Test
        fun `boundary position - corner cell allowed when empty`() {
            val board = emptyBoard()
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 0, 0),
                "Empty corner should be allowed"
            )
        }

        @Test
        fun `gapped pattern XX_XX - placing in middle makes 5 (winning, not forbidden)`() {
            // B B _ B B → placing in middle = exactly 5 = winning
            val board = boardWith(B(7, 3), B(7, 4), B(7, 6), B(7, 7))
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 5),
                "Filling gap in XX_XX to make exactly 5 should be a winning move (not forbidden)"
            )
        }

        @Test
        fun `gapped pattern X_XXX - placing to make 5 is a winning move`() {
            // B _ B B B → placing at gap = 5 = winning
            val board = boardWith(B(7, 3), B(7, 5), B(7, 6), B(7, 7))
            assertFalse(
                RenjuValidator.isForbiddenMove(board, 7, 4),
                "Filling gap in X_XXX to make exactly 5 should be winning (not forbidden)"
            )
        }

        @Test
        fun `getAllForbiddenPositions returns correct positions`() {
            // Simple double-three board — candidate at (7,7)
            val board = boardWith(
                B(7, 8), B(7, 9),
                B(5, 7), B(6, 7)
            )
            val forbidden = RenjuValidator.getAllForbiddenPositions(board)
            val positions = forbidden.toSet()
            assertTrue(
                positions.contains(Pair(7, 7)),
                "getAllForbiddenPositions should include known double-three position"
            )
        }

        @Test
        fun `getAllForbiddenPositions on empty board returns empty list`() {
            // On an empty board with just one BLACK stone in the center, no forbidden positions
            val board = emptyBoard()
            val forbidden = RenjuValidator.getAllForbiddenPositions(board)
            // Empty board: no forbidden positions (no patterns at all)
            assertTrue(
                forbidden.isEmpty(),
                "Empty board should have no forbidden positions"
            )
        }
    }
}
