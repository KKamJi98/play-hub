import { describe, expect, it } from "vitest";
import { createBall, type Ball } from "./physics/ball";
import { advanceSimulation } from "./physics/engine";
import { applyShotState, buildShotParams, createShotMotion } from "./physics/shot";
import { Vec2 } from "./physics/vector";
import { BALL_COLORS, BALL_RADIUS, TABLE_HEIGHT } from "./constants";

describe("shot initialization", () => {
  it("maps top and bottom tip offsets onto the shot axis", () => {
    const topShot = buildShotParams(new Vec2(1, 0), 50, new Vec2(0, -0.6), 0);
    const bottomShot = buildShotParams(new Vec2(1, 0), 50, new Vec2(0, 0.6), 0);

    const topOmega = createShotMotion(topShot).omega;
    const bottomOmega = createShotMotion(bottomShot).omega;

    expect(topOmega.y).toBeGreaterThan(0);
    expect(bottomOmega.y).toBeLessThan(0);
  });

  it("keeps right english on omega.z and gains tilted spin when elevated", () => {
    const diagonalShot = buildShotParams(new Vec2(1, 1), 50, new Vec2(0.5, 0), 0);
    const elevatedShot = buildShotParams(new Vec2(1, 1), 50, new Vec2(0.5, 0), 12);
    const omega = createShotMotion(diagonalShot).omega;
    const elevatedOmega = createShotMotion(elevatedShot).omega;

    expect(omega.z).toBeGreaterThan(0);
    expect(Math.abs(omega.x) + Math.abs(omega.y)).toBeCloseTo(0, 6);
    expect(Math.abs(elevatedOmega.x) + Math.abs(elevatedOmega.y)).toBeGreaterThan(0);
  });
});

describe("online replay determinism", () => {
  function simulateOnce(shot: ReturnType<typeof buildShotParams>, seconds: number): Ball[] {
    const balls = [
      createBall("white", 220, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.white),
      createBall("red1", 420, TABLE_HEIGHT / 2 + 20, BALL_RADIUS, BALL_COLORS.red1),
      createBall("red2", 700, TABLE_HEIGHT / 2 - 30, BALL_RADIUS, BALL_COLORS.red2),
    ].map((b) => ({
      ...b,
      pos: new Vec2(b.pos.x, b.pos.y),
      vel: new Vec2(b.vel.x, b.vel.y),
      omega: { ...b.omega },
    }));

    balls[0] = applyShotState(balls[0]!, shot);

    let carry = 0;
    const frames = Math.round(seconds * 120);
    for (let i = 0; i < frames; i++) {
      const result = advanceSimulation(balls, "white", 1 / 120, carry);
      carry = result.carrySeconds;
    }
    return balls;
  }

  it("two identical simulations produce identical results at 1 second", () => {
    const shot = buildShotParams(new Vec2(1, 0.15), 65, new Vec2(0.3, -0.2), 8);
    const run1 = simulateOnce(shot, 1.0);
    const run2 = simulateOnce(shot, 1.0);

    // Same code path, same inputs → IEEE 754 guarantees bit-exact results
    for (let i = 0; i < run1.length; i++) {
      const a = run1[i]!;
      const b = run2[i]!;
      expect(a.pos.x).toBe(b.pos.x);
      expect(a.pos.y).toBe(b.pos.y);
      expect(a.vel.x).toBe(b.vel.x);
      expect(a.vel.y).toBe(b.vel.y);
      expect(a.omega.z).toBe(b.omega.z);
    }
  });
});
