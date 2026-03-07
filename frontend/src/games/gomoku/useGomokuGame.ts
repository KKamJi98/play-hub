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
}

function createEmptyBoard(): Stone[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => EMPTY as Stone),
  );
}

function initialState(): GomokuState {
  return {
    board: createEmptyBoard(),
    currentPlayer: BLACK,
    gameStatus: "waiting",
    winner: 0,
    lastMove: null,
    moveHistory: [],
    mode: "local",
    difficulty: "medium",
    winningLine: null,
    aiThinking: false,
  };
}

// ─── Win Detection ───────────────────────────────────────────────────────────

function findWinningLine(
  board: Stone[][],
  row: number,
  col: number,
  player: Player,
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

    if (line.length >= 5) return line;
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

function reducer(state: GomokuState, action: Action): GomokuState {
  switch (action.type) {
    case "PLACE_STONE": {
      if (state.gameStatus !== "playing") return state;
      if (state.aiThinking) return state;
      const { row, col } = action;
      if (state.board[row]![col] !== EMPTY) return state;

      const board = state.board.map((r) => [...r]);
      board[row]![col] = state.currentPlayer;

      const winLine = findWinningLine(board, row, col, state.currentPlayer);

      if (winLine) {
        return {
          ...state,
          board,
          lastMove: { row, col },
          moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
          gameStatus: "finished",
          winner: state.currentPlayer,
          winningLine: winLine,
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
        };
      }

      const nextPlayer: Player = state.currentPlayer === BLACK ? WHITE : BLACK;
      return {
        ...state,
        board,
        currentPlayer: nextPlayer,
        lastMove: { row, col },
        moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
      };
    }

    case "AI_MOVE": {
      if (state.gameStatus !== "playing") return state;
      const { row, col } = action;
      const newBoard = state.board.map((r) => [...r]);
      newBoard[row]![col] = state.currentPlayer;

      const winLine = findWinningLine(newBoard, row, col, state.currentPlayer);

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
        };
      }

      const nextPlayer: Player = state.currentPlayer === BLACK ? WHITE : BLACK;
      return {
        ...state,
        board: newBoard,
        currentPlayer: nextPlayer,
        lastMove: { row, col },
        moveHistory: [...state.moveHistory, { row, col, player: state.currentPlayer }],
        aiThinking: false,
      };
    }

    case "RESET":
      return {
        ...initialState(),
        mode: state.mode,
        difficulty: state.difficulty,
        gameStatus: "waiting",
      };

    case "SET_MODE":
      return { ...initialState(), mode: action.mode };

    case "SET_DIFFICULTY":
      return { ...state, difficulty: action.difficulty };

    case "START_GAME":
      return {
        ...state,
        board: createEmptyBoard(),
        currentPlayer: BLACK,
        gameStatus: "playing",
        winner: 0,
        lastMove: null,
        moveHistory: [],
        winningLine: null,
        aiThinking: false,
      };

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
      };

      workerRef.current?.postMessage(request);
    }
  }, [state.currentPlayer, state.gameStatus, state.mode, state.aiThinking, state.board, state.difficulty]);

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
