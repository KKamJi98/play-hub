import { Vec2 } from "./vector";
import type { BallId } from "../constants";

// ---- Types ----------------------------------------------------------------

/** 3-axis angular velocity (rad/s) */
export interface Omega3 {
  x: number; // angular vel around x-axis (affects forward/backward roll in y direction)
  y: number; // angular vel around y-axis (affects forward/backward roll in x direction)
  z: number; // angular vel around z-axis (sidespin / massé, top-down view)
}

export type BallPhase = "sliding" | "rolling" | "spinning" | "stationary";

export interface Ball {
  id: BallId;
  pos: Vec2;           // position in pixel coordinates
  vel: Vec2;           // velocity in m/s (physics space)
  omega: Omega3;       // angular velocity in rad/s
  phase: BallPhase;
  radius: number;      // pixel radius for rendering
  color: string;
}

// ---- Factory --------------------------------------------------------------

/** Create a fresh ball at the given position (at rest). */
export function createBall(
  id: BallId,
  x: number,
  y: number,
  radius: number,
  color: string,
): Ball {
  return {
    id,
    pos: new Vec2(x, y),
    vel: Vec2.zero(),
    omega: { x: 0, y: 0, z: 0 },
    phase: "stationary",
    radius,
    color,
  };
}

// ---- Helpers --------------------------------------------------------------

export function zeroOmega(): Omega3 {
  return { x: 0, y: 0, z: 0 };
}

export function cloneOmega(o: Omega3): Omega3 {
  return { x: o.x, y: o.y, z: o.z };
}

/** Whether the ball has meaningful linear velocity or spin. */
export function isMoving(ball: Ball): boolean {
  return ball.phase !== "stationary";
}
