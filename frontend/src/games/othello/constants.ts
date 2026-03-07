export const BOARD_SIZE = 8;
export const EMPTY = 0 as const;
export const BLACK = 1 as const;
export const WHITE = 2 as const;

export type Stone = typeof EMPTY | typeof BLACK | typeof WHITE;
export type Player = typeof BLACK | typeof WHITE;

export type Difficulty = "easy" | "medium" | "hard";
export type GameMode = "local" | "ai" | "online";

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 2,
  medium: 4,
  hard: 6,
};

/** All 8 directions for flipping: [dr, dc] */
export const DIRECTIONS = [
  [-1, -1], // NW
  [-1, 0],  // N
  [-1, 1],  // NE
  [0, -1],  // W
  [0, 1],   // E
  [1, -1],  // SW
  [1, 0],   // S
  [1, 1],   // SE
] as const;
