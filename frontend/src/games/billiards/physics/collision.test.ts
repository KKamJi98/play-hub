import { describe, expect, it } from "vitest";
import { createBall, type Ball } from "./ball";
import { resolveBallCushion } from "./collision";
import { Vec2 } from "./vector";
import {
  BALL_COLORS,
  BALL_RADIUS,
  E_C,
  M,
  MU_C,
  R,
  TABLE_HEIGHT,
} from "../constants";

function createCueBall(): Ball {
  return createBall(
    "white",
    BALL_RADIUS - 1,
    TABLE_HEIGHT / 2,
    BALL_RADIUS,
    BALL_COLORS.white,
  );
}

function expectedLeftCushionBounce(vel: Vec2, omegaZ: number) {
  const inwardNormal = new Vec2(1, 0);
  const tangent = inwardNormal.perp();
  const vn = vel.dot(inwardNormal);
  const vt = vel.dot(tangent);
  const Jn = -(1 + E_C) * vn * M;
  const surfaceSlip = vt - R * omegaZ;
  const desiredJt = -(2 * M / 7) * surfaceSlip;
  const maxJt = MU_C * Jn;
  const Jt = Math.max(-maxJt, Math.min(maxJt, desiredJt));

  const vnNew = -E_C * vn;
  const vtNew = vt + Jt / M;
  const omegaZNew = omegaZ + (-5 * Jt) / (2 * M * R);

  return {
    vel: inwardNormal.scale(vnNew).add(tangent.scale(vtNew)),
    omegaZ: omegaZNew,
  };
}

describe("billiards cushion collision", () => {
  it("transfers head-on sidespin into tangential rebound without deleting it arbitrarily", () => {
    const ball = createCueBall();
    ball.vel = new Vec2(-2, 0);
    ball.omega = { x: 0, y: 0, z: 30 };
    ball.phase = "sliding";

    const expected = expectedLeftCushionBounce(ball.vel, ball.omega.z);

    resolveBallCushion(ball);

    expect(ball.vel.x).toBeCloseTo(expected.vel.x, 6);
    expect(ball.vel.y).toBeCloseTo(expected.vel.y, 6);
    expect(ball.omega.z).toBeCloseTo(expected.omegaZ, 6);
  });

  it("can spin the cue ball up when rail friction opposes the current tangential slip", () => {
    const ball = createCueBall();
    ball.vel = new Vec2(-2, 1.2);
    ball.omega = { x: 0, y: 0, z: 20 };
    ball.phase = "sliding";

    const expected = expectedLeftCushionBounce(ball.vel, ball.omega.z);

    resolveBallCushion(ball);

    expect(ball.vel.y).toBeCloseTo(expected.vel.y, 6);
    expect(ball.omega.z).toBeCloseTo(expected.omegaZ, 6);
    expect(ball.omega.z).toBeGreaterThan(20);
  });
});
