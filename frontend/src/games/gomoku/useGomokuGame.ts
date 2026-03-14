import { useReducer, useCallback, useEffect, useRef } from "react";
import {
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  DIRECTIONS,
  type Stone,
  type Player,
  type Difficulty,
  type GameMode,
} from "./constants";
import type { WorkerRequest, WorkerResponse } from "./gomoku.worker";
import { isForbiddenMove, getAllForbiddenPositions } from "./renjuValidator";

// ─── State ───────────────────────────────────────────────────────────────────

export interface GomokuState {
  board: Stone[][];
  currentPlayer: Player;
  gameStatus: "waiting" | "playing" | "finished";
  winner: 0 | 1 | 2;
  lastMove: { row: number; col: number } | null;
  moveHistory: { row: number; col: number; player: Player }[];
  mode: GameMode;
  difficulty: Difficulty;
  winningLine: { row: number; col: number }[] | null;
  aiThinking: boolean;
  renjuRule: boolean;
  forbiddenPositions: Set<string>;
}

function createEmptyBoard(): Stone[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => EMPTY as Stone),
  );
}

function createInitialState(mode: GameMode = "local", difficulty: Difficulty = "medium"): GomokuState {
  return {
    board: createEmptyBoard(),
    currentPlayer: BLACK,
    gameStatus: "waiting",
    winner: 0,
    lastMove: null,
    moveHistory: [],
    mode,
    difficulty,
    winningLine: null,
    aiThinking: false,
    renjuRule: true,
    forbiddenPositions: new Set<string>(),
  };
}

function initialState(): GomokuState {
  return createInitialState();
}

// ─── Win Detection ───────────────────────────────────────────────────────────

/**
 * Find the winning line for `player` passing through (row, col).
 *
 * When renjuRule is true and player is BLACK, only an exact 5 counts as a win.
 * For WHITE or when renjuRule is off, 5 or more counts.
 */
function findWinningLine(
  board: Stone[][],
  row: number,
  col: number,
  player: Player,
  renjuRule: boolean,
): { row: number; col: number }[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: { row: number; col: number }[] = [{ row, col }];

    // Forward
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // Backward
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r]![c] === player) {
      line.push({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    const isBlackRenju = renjuRule && player === BLACK;
    if (isBlackRenju ? line.length === 5 : line.length >= 5) return line;
  }

  return null;
}

function isBoardFull(board: Stone[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== EMPTY));
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "PLACE_STONE"; row: number; col: number }
  | { type: "AI_MOVE"; row: number; col: number }
  | { type: "RESET" }
  | { type: "SET_MODE"; mode: GameMode }
  | { type: "SET_DIFFICULTY"; difficulty: Difficulty }
  | { type: "SET_WINNER"; winner: 0 | 1 | 2; winningLine: { row: number; col: number }[] | null }
  | { type: "START_GAME" }
  | { type: "SET_AI_THINKING"; thinking: boolean };

function computeForbiddenPositions(board: Stone[][], nextPlayer: Player, renjuRule: boolean): Set<string> {
  return renjuRule && nextPlayer === BLACK
    ? getAllForbiddenPositions(board)
    : new Set<string>();
}

function reducer(state: GomokuState, action: Action): GomokuState {
  switch (action.type) {
    case "PLACE_STONE": {
      if (state.gameStatus !== "playing") return state;
      if (state.aiThinking) return state;
      const { row, col } = action;
      if (state.board[row]![col] !== EMPTY) return state;

      // Renju rule: reject forbidden moves for BLACK
      if (state.renjuRule && state.currentPlayer === BLACK) {
        if (isForbiddenMove(state.board, row, col)) return state;
      }

      const board = state.board.map((r) => [...r]);
      board[row]![col] = state.currentPlayer;

      const winLine = findWinningLine(board, row, col, state.currentPlayer, state.renjuRule);

      if (winLine) {
        return {
          ...state,
          board,
          lastMove: { row, col },
          moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
          gameStatus: "finished",
          winner: state.currentPlayer,
          winningLine: winLine,
          forbiddenPositions: new Set<string>(),
        };
      }

      if (isBoardFull(board)) {
        return {
          ...state,
          board,
          lastMove: { row, col },
          moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
          gameStatus: "finished",
          winner: 0,
          winningLine: null,
          forbiddenPositions: new Set<string>(),
        };
      }

      const nextPlayer: Player = state.currentPlayer === BLACK ? WHITE : BLACK;
      const forbiddenPositions = computeForbiddenPositions(board, nextPlayer, state.renjuRule);
      return {
        ...state,
        board,
        currentPlayer: nextPlayer,
        lastMove: { row, col },
        moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
        forbiddenPositions,
      };
    }

    case "AI_MOVE": {
      if (state.gameStatus !== "playing") return state;
      const { row, col } = action;
      const newBoard = state.board.map((r) => [...r]);
      newBoard[row]![col] = state.currentPlayer;

      const winLine = findWinningLine(newBoard, row, col, state.currentPlayer, state.renjuRule);

      if (winLine) {
        return {
          ...state,
          board: newBoard,
          lastMove: { row, col },
          moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
          gameStatus: "finished",
          winner: state.currentPlayer,
          winningLine: winLine,
          aiThinking: false,
          forbiddenPositions: new Set<string>(),
        };
      }

      if (isBoardFull(newBoard)) {
        return {
          ...state,
          board: newBoard,
          lastMove: { row, col },
          moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
          gameStatus: "finished",
          winner: 0,
          winningLine: null,
          aiThinking: false,
          forbiddenPositions: new Set<string>(),
        };
      }

      const nextPlayer: Player = state.currentPlayer === BLACK ? WHITE : BLACK;
      const forbiddenPositions = computeForbiddenPositions(newBoard, nextPlayer, state.renjuRule);
      return {
        ...state,
        board: newBoard,
        currentPlayer: nextPlayer,
        lastMove: { row, col },
        moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
        aiThinking: false,
        forbiddenPositions,
      };
    }

    case "RESET":
      return createInitialState(state.mode, state.difficulty);

    case "SET_MODE":
      return createInitialState(action.mode, state.difficulty);

    case "SET_DIFFICULTY":
      return { ...state, difficulty: action.difficulty };

    case "START_GAME": {
      const freshBoard = createEmptyBoard();
      // After START_GAME BLACK plays first — compute forbidden for the fresh board
      // (on an empty board there are no forbidden positions, but keep the logic consistent)
      const forbiddenPositions = computeForbiddenPositions(freshBoard, BLACK, state.renjuRule);
      return {
        ...state,
        board: freshBoard,
        currentPlayer: BLACK,
        gameStatus: "playing",
        winner: 0,
        lastMove: null,
        moveHistory: [],
        winningLine: null,
        aiThinking: false,
        forbiddenPositions,
      };
    }

    case "SET_AI_THINKING":
      return { ...state, aiThinking: action.thinking };

    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGomokuGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const workerRef = useRef<Worker | null>(null);

  // Initialize web worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./gomoku.worker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { move } = e.data;
      dispatch({ type: "AI_MOVE", row: move.row, col: move.col });
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (
      state.mode === "ai" &&
      state.gameStatus === "playing" &&
      state.currentPlayer === WHITE && // AI plays white
      !state.aiThinking
    ) {
      dispatch({ type: "SET_AI_THINKING", thinking: true });

      const request: WorkerRequest = {
        board: state.board,
        difficulty: state.difficulty,
        currentPlayer: WHITE,
        renjuRule: state.renjuRule,
      };

      workerRef.current?.postMessage(request);
    }
  }, [state.currentPlayer, state.gameStatus, state.mode, state.aiThinking, state.board, state.difficulty, state.renjuRule]);

  const placeStone = useCallback(
    (row: number, col: number) => {
      // In AI mode, only allow human (BLACK) to place
      if (state.mode === "ai" && state.currentPlayer !== BLACK) return;
      dispatch({ type: "PLACE_STONE", row, col });
    },
    [state.mode, state.currentPlayer],
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const setMode = useCallback((mode: GameMode) => {
    dispatch({ type: "SET_MODE", mode });
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    dispatch({ type: "SET_DIFFICULTY", difficulty });
  }, []);

  const startGame = useCallback(() => {
    dispatch({ type: "START_GAME" });
  }, []);

  return {
    state,
    placeStone,
    reset,
    setMode,
    setDifficulty,
    startGame,
  };
}
