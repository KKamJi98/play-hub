import { findBestMove } from "./ai/minimax";
import type { Stone, Player, Difficulty } from "./constants";

export interface WorkerRequest {
  board: Stone[][];
  difficulty: Difficulty;
  currentPlayer: Player;
}

export interface WorkerResponse {
  move: { row: number; col: number };
  stats: { nodesSearched: number; timeMs: number };
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { board, difficulty, currentPlayer } = e.data;
  const result = findBestMove(board, difficulty, currentPlayer);
  self.postMessage({
    move: result.move,
    stats: result.stats,
  } satisfies WorkerResponse);
};
