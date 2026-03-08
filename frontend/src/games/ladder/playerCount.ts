import { MAX_PLAYERS, MIN_PLAYERS } from "./constants";

export interface LadderEntries {
  players: string[];
  prizes: string[];
}

export function clampPlayerCount(count: number): number {
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, count));
}

export function resizeLadderEntries(
  players: string[],
  prizes: string[],
  count: number,
): LadderEntries {
  const nextCount = clampPlayerCount(count);
  const nextPlayers = [...players];
  const nextPrizes = [...prizes];

  if (nextCount > nextPlayers.length) {
    for (let index = nextPlayers.length; index < nextCount; index += 1) {
      nextPlayers.push(`Player ${index + 1}`);
      nextPrizes.push(`Prize ${index + 1}`);
    }
  }

  return {
    players: nextPlayers.slice(0, nextCount),
    prizes: nextPrizes.slice(0, nextCount),
  };
}
