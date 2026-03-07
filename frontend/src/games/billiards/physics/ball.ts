import { Vec2 } from "./vector";
import { STOP_THRESHOLD } from "../constants";
import type { BallId } from "../constants";

export interface Ball {
  id: BallId;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
}

/** Create a fresh ball at the given position (at rest). */
export function createBall(
  id: BallId,
  x: number,
  y: number,
  radius: number,
  color: string,
): Ball {
  return { id, pos: new Vec2(x, y), vel: Vec2.zero(), radius, color };
}

/** Apply velocity & friction for one sub-step. Mutates `ball`. */
export function updateBall(ball: Ball, dt: number, friction: number): void {
  ball.pos = ball.pos.add(ball.vel.scale(dt));
  ball.vel = ball.vel.scale(friction);

  // Clamp tiny velocities to zero
  if (ball.vel.lengthSq() < STOP_THRESHOLD * STOP_THRESHOLD) {
    ball.vel = Vec2.zero();
  }
}

/** Whether the ball has meaningful velocity. */
export function isMoving(ball: Ball): boolean {
  return ball.vel.lengthSq() > STOP_THRESHOLD * STOP_THRESHOLD;
}
