import { describe, expect, it } from "vitest";
import { clampPlayerCount, resizeLadderEntries } from "./playerCount";

describe("ladder player count helpers", () => {
  it("clamps the count into the supported range", () => {
    expect(clampPlayerCount(1)).toBe(2);
    expect(clampPlayerCount(5)).toBe(5);
    expect(clampPlayerCount(99)).toBe(8);
  });

  it("extends players and prizes together when the count grows", () => {
    const result = resizeLadderEntries(["A", "B"], ["1등", "2등"], 4);

    expect(result.players).toEqual(["A", "B", "Player 3", "Player 4"]);
    expect(result.prizes).toEqual(["1등", "2등", "Prize 3", "Prize 4"]);
  });

  it("trims players and prizes together when the count shrinks", () => {
    const result = resizeLadderEntries(
      ["A", "B", "C", "D"],
      ["1", "2", "3", "4"],
      2,
    );

    expect(result.players).toEqual(["A", "B"]);
    expect(result.prizes).toEqual(["1", "2"]);
  });
});
