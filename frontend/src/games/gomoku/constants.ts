export const BOARD_SIZE = 15;
export const EMPTY = 0 as const;
export const BLACK = 1 as const;
export const WHITE = 2 as const;

export type Stone = typeof EMPTY | typeof BLACK | typeof WHITE;
export type Player = typeof BLACK | typeof WHITE;

export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "local" | "ai" | "online";

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

export const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↙
] as const;
