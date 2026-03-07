import type { Ball } from "./ball";
import { updateBall, isMoving } from "./ball";
import { resolveBallBall, resolveBallCushion } from "./collision";
import {
  FRICTION,
  SUB_STEPS,
  TABLE_WIDTH,
  TABLE_HEIGHT,
} from "../constants";
import type { BallId } from "../constants";

export interface StepResult {
  /** Set of ball ids that the cue ball collided with during this frame. */
  cueBallHits: Set<BallId>;
}

/**
 * Advance physics by one frame.
 * Internally runs SUB_STEPS iterations for stability.
 * `cueBallId` indicates which ball is the active cue ball this turn.
 */
export function step(balls: Ball[], cueBallId: BallId): StepResult {
  const cueBallHits = new Set<BallId>();
  const dt = 1; // one unit per sub-step

  for (let s = 0; s < SUB_STEPS; s++) {
    // Move
    for (const ball of balls) {
      updateBall(ball, dt, FRICTION);
    }

    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i]!;
        const b = balls[j]!;
        const hit = resolveBallBall(a, b);
        if (hit) {
          if (a.id === cueBallId) cueBallHits.add(b.id);
          if (b.id === cueBallId) cueBallHits.add(a.id);
        }
      }
    }

    // Cushion collisions
    for (const ball of balls) {
      resolveBallCushion(ball, TABLE_WIDTH, TABLE_HEIGHT);
    }
  }

  return { cueBallHits };
}

/** True when every ball has effectively stopped. */
export function allStopped(balls: Ball[]): boolean {
  return balls.every((b) => !isMoving(b));
}
