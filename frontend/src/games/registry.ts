import type { GameDefinition } from "./types";
import gomoku from "./gomoku";
import othello from "./othello";
import billiards from "./billiards";
import ladder from "./ladder";
import randomPicker from "./random-picker";

const games: GameDefinition[] = [gomoku, othello, billiards, ladder, randomPicker];

export function getAll(): GameDefinition[] {
  return games;
}

export function getById(id: string): GameDefinition | undefined {
  return games.find((g) => g.id === id);
}

export function getByCategory(
  category: GameDefinition["category"],
): GameDefinition[] {
  return games.filter((g) => g.category === category);
}
