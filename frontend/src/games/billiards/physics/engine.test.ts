import { describe, expect, it } from "vitest";
import { createBall, type Ball } from "./ball";
import { advanceSimulation } from "./engine";
import { Vec2 } from "./vector";
import {
  BALL_COLORS,
  BALL_RADIUS,
  TABLE_HEIGHT,
} from "../constants";

function createMovingCueBall(): Ball {
  return {
    ...createBall("white", 200, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.white),
    vel: new Vec2(1.8, 0.25),
    omega: { x: 0, y: 0, z: 0 },
    phase: "sliding",
  };
}

function simulateAtFrameRate(
  initialBalls: Ball[],
  framesPerSecond: number,
  seconds: number,
): Ball[] {
  const balls = initialBalls.map((ball) => ({
    ...ball,
    pos: new Vec2(ball.pos.x, ball.pos.y),
    vel: new Vec2(ball.vel.x, ball.vel.y),
    omega: { ...ball.omega },
  }));

  let carrySeconds = 0;
  const frameCount = Math.round(framesPerSecond * seconds);
  const deltaSeconds = 1 / framesPerSecond;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const result = advanceSimulation(balls, "white", deltaSeconds, carrySeconds);
    carrySeconds = result.carrySeconds;
  }

  return balls;
}

describe("billiards physics engine", () => {
  it("stays effectively frame-rate independent between 60Hz and 144Hz", () => {
    const sixtyFps = simulateAtFrameRate([createMovingCueBall()], 60, 1.2)[0]!;
    const oneFortyFourFps = simulateAtFrameRate([createMovingCueBall()], 144, 1.2)[0]!;

    expect(sixtyFps.pos.x).toBeCloseTo(oneFortyFourFps.pos.x, 1);
    expect(sixtyFps.pos.y).toBeCloseTo(oneFortyFourFps.pos.y, 1);
    expect(sixtyFps.vel.x).toBeCloseTo(oneFortyFourFps.vel.x, 2);
    expect(sixtyFps.vel.y).toBeCloseTo(oneFortyFourFps.vel.y, 2);
  });

  it("does not introduce lateral drift for a straight head-on collision", () => {
    const cue = {
      ...createBall("white", 260, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.white),
      vel: new Vec2(2.4, 0),
      omega: { x: 0, y: 0, z: 0 },
      phase: "sliding" as const,
    };
    const target = createBall("red1", 320, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLORS.red1);

    const result = simulateAtFrameRate([cue, target], 120, 0.6);

    expect(result[0]!.pos.y).toBeCloseTo(TABLE_HEIGHT / 2, 3);
    expect(result[1]!.pos.y).toBeCloseTo(TABLE_HEIGHT / 2, 3);
    expect(Math.abs(result[0]!.vel.y)).toBeLessThan(0.02);
    expect(Math.abs(result[1]!.vel.y)).toBeLessThan(0.02);
  });
});
