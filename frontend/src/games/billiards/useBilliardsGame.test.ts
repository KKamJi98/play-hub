import { describe, expect, it } from "vitest";
import { Vec2 } from "./physics/vector";
import { spinToOmega } from "./useBilliardsGame";

describe("spinToOmega", () => {
  it("maps follow and draw onto the shot axis instead of a global axis", () => {
    const verticalShot = spinToOmega(new Vec2(0, 1), new Vec2(0, -1));
    const horizontalShot = spinToOmega(new Vec2(1, 0), new Vec2(0, -1));

    expect(verticalShot.x).toBeLessThan(0);
    expect(verticalShot.y).toBeCloseTo(0, 6);
    expect(horizontalShot.x).toBeCloseTo(0, 6);
    expect(horizontalShot.y).toBeGreaterThan(0);
  });

  it("keeps english on omega.z regardless of shot direction", () => {
    const diagonalShot = spinToOmega(new Vec2(1, 1), new Vec2(0.5, 0));

    expect(diagonalShot.z).toBeGreaterThan(0);
    expect(diagonalShot.x).toBeCloseTo(0, 6);
    expect(diagonalShot.y).toBeCloseTo(0, 6);
  });
});
