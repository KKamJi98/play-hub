import { describe, expect, it } from "vitest";
import { createBall } from "./ball";
import {
  applyRollingContact,
  applySlidingContact,
  clothContactVelocity,
  getClothContactState,
} from "./contact";
import { Vec2 } from "./vector";
import { BALL_COLORS, BALL_RADIUS, R, TABLE_HEIGHT } from "../constants";

describe("billiards cloth contact", () => {
  it("has near-zero cloth slip for pure rolling motion", () => {
    const ball = createBall("white", 200, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.white);
    ball.vel = new Vec2(1.2, -0.4);
    ball.omega = {
      x: -ball.vel.y / R,
      y: ball.vel.x / R,
      z: 0,
    };
    ball.phase = "rolling";

    expect(clothContactVelocity(ball).length()).toBeLessThan(0.0001);
    expect(getClothContactState(ball).slipSpeed).toBeLessThan(0.0001);
  });

  it("reduces slip while preserving spin-induced state evolution during sliding", () => {
    const ball = createBall("white", 200, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.white);
    ball.vel = new Vec2(2.1, 0);
    ball.omega = { x: 0, y: 0, z: 18 };
    ball.phase = "sliding";

    const beforeSlip = getClothContactState(ball).slipSpeed;
    applySlidingContact(ball, 1 / 240);
    const afterSlip = getClothContactState(ball).slipSpeed;

    expect(afterSlip).toBeLessThan(beforeSlip);
    expect(ball.vel.x).toBeLessThan(2.1);
    expect(Math.abs(ball.omega.z)).toBeLessThan(18);
  });

  it("keeps angular velocity locked to velocity while rolling slows down", () => {
    const ball = createBall("white", 200, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.white);
    ball.vel = new Vec2(1.6, 0.2);
    ball.omega = {
      x: -ball.vel.y / R,
      y: ball.vel.x / R,
      z: 0,
    };
    ball.phase = "rolling";

    applyRollingContact(ball, 1 / 120);

    expect(ball.vel.length()).toBeLessThan(new Vec2(1.6, 0.2).length());
    expect(ball.omega.x).toBeCloseTo(-ball.vel.y / R, 6);
    expect(ball.omega.y).toBeCloseTo(ball.vel.x / R, 6);
  });
});
