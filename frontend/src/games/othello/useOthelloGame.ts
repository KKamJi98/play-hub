import { useReducer, useCallback, useEffect, useRef } from "react";
import {
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  type Stone,
  type Player,
  type Difficulty,
  type GameMode,
} from "./constants";
import { getFlips, getValidMoves, countStones } from "./logic";
import type { WorkerRequest, WorkerResponse } from "./othello.worker";

// Re-export logic functions so existing imports from other files still work
export { getFlips, getValidMoves, applyMoveToBoard, countStones } from "./logic";

// ─── State ───────────────────────────────────────────────────────────────────

export interface OthelloState {
  board: Stone[][];
  currentPlayer: Player;
  gameStatus: "waiting" | "playing" | "finished";
  winner: 0 | 1 | 2;
  lastMove: { row: number; col: number } | null;
  validMoves: { row: number; col: number }[];
  scores: { black: number; white: number };
  mode: GameMode;
  difficulty: Difficulty;
  aiThinking: boolean;
  flippedStones: { row: number; col: number }[];
}

function createInitialBoard(): Stone[][] {
  const board: Stone[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => EMPTY as Stone),
  );
  // Standard Othello starting position
  board[3]![3] = WHITE;
  board[3]![4] = BLACK;
  board[4]![3] = BLACK;
  board[4]![4] = WHITE;
  return board;
}

function initialState(): OthelloState {
  const board = createInitialBoard();
  return {
    board,
    currentPlayer: BLACK,
    gameStatus: "waiting",
    winner: 0,
    lastMove: null,
    validMoves: getValidMoves(board, BLACK),
    scores: countStones(board),
    mode: "local",
    difficulty: "medium",
    aiThinking: false,
    flippedStones: [],
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "PLACE_STONE"; row: number; col: number }
  | { type: "AI_MOVE"; row: number; col: number }
  | { type: "RESET" }
  | { type: "SET_MODE"; mode: GameMode }
  | { type: "SET_DIFFICULTY"; difficulty: Difficulty }
  | { type: "START_GAME" }
  | { type: "SET_AI_THINKING"; thinking: boolean };

function applyMove(state: OthelloState, row: number, col: number, clearAiThinking: boolean): OthelloState {
  if (state.gameStatus !== "playing") return state;
  if (state.board[row]![col] !== EMPTY) return state;

  const flips = getFlips(state.board, row, col, state.currentPlayer);
  if (flips.length === 0) return state;

  const newBoard = state.board.map((r) => [...r]);
  newBoard[row]![col] = state.currentPlayer;
  for (const { row: fr, col: fc } of flips) {
    newBoard[fr]![fc] = state.currentPlayer;
  }

  const nextPlayer: Player = state.currentPlayer === BLACK ? WHITE : BLACK;
  const nextValidMoves = getValidMoves(newBoard, nextPlayer);
  const scores = countStones(newBoard);

  // Check if next player can move
  if (nextValidMoves.length > 0) {
    return {
      ...state,
      board: newBoard,
      currentPlayer: nextPlayer,
      lastMove: { row, col },
      validMoves: nextValidMoves,
      scores,
      flippedStones: flips,
      aiThinking: clearAiThinking ? false : state.aiThinking,
    };
  }

  // Next player can't move; check if current player can still move
  const currentCanMove = getValidMoves(newBoard, state.currentPlayer);
  if (currentCanMove.length > 0) {
    // Skip next player's turn, stay with current player
    return {
      ...state,
      board: newBoard,
      currentPlayer: state.currentPlayer,
      lastMove: { row, col },
      validMoves: currentCanMove,
      scores,
      flippedStones: flips,
      aiThinking: clearAiThinking ? false : state.aiThinking,
    };
  }

  // Neither player can move: game over
  const winner: 0 | 1 | 2 =
    scores.black > scores.white ? BLACK : scores.white > scores.black ? WHITE : 0;

  return {
    ...state,
    board: newBoard,
    currentPlayer: nextPlayer,
    lastMove: { row, col },
    validMoves: [],
    scores,
    gameStatus: "finished",
    winner,
    flippedStones: flips,
    aiThinking: false,
  };
}

function reducer(state: OthelloState, action: Action): OthelloState {
  switch (action.type) {
    case "PLACE_STONE": {
      if (state.aiThinking) return state;
      return applyMove(state, action.row, action.col, false);
    }

    case "AI_MOVE": {
      return applyMove(state, action.row, action.col, true);
    }

    case "RESET": {
      const board = createInitialBoard();
      return {
        ...initialState(),
        mode: state.mode,
        difficulty: state.difficulty,
        gameStatus: "waiting",
        board,
        validMoves: getValidMoves(board, BLACK),
        scores: countStones(board),
      };
    }

    case "SET_MODE":
      return { ...initialState(), mode: action.mode };

    case "SET_DIFFICULTY":
      return { ...state, difficulty: action.difficulty };

    case "START_GAME": {
      const board = createInitialBoard();
      return {
        ...state,
        board,
        currentPlayer: BLACK,
        gameStatus: "playing",
        winner: 0,
        lastMove: null,
        validMoves: getValidMoves(board, BLACK),
        scores: countStones(board),
        aiThinking: false,
        flippedStones: [],
      };
    }

    case "SET_AI_THINKING":
      return { ...state, aiThinking: action.thinking };

    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOthelloGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const workerRef = useRef<Worker | null>(null);

  // Initialize web worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./othello.worker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { move } = e.data;
      if (move.row >= 0 && move.col >= 0) {
        dispatch({ type: "AI_MOVE", row: move.row, col: move.col });
      } else {
        // AI has no valid move (pass), just clear thinking
        dispatch({ type: "SET_AI_THINKING", thinking: false });
      }
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
