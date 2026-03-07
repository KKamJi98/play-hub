import type { Ball } from "./ball";
import { Vec2 } from "./vector";
import { BALL_RESTITUTION, CUSHION_RESTITUTION } from "../constants";

/**
 * Resolve elastic ball-ball collision (equal mass).
 * Returns true if a collision occurred.
 */
export function resolveBallBall(a: Ball, b: Ball): boolean {
  const diff = a.pos.sub(b.pos);
  const dist = diff.length();
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) return false;

  // Separate overlapping balls
  separateBalls(a, b, diff, dist, minDist);

  // Normal from b → a
  const normal = diff.scale(1 / dist);

  // Relative velocity
  const relVel = a.vel.sub(b.vel);
  const velAlongNormal = relVel.dot(normal);

  // Don't resolve if balls are separating
  if (velAlongNormal > 0) return true;

  const impulse = -(1 + BALL_RESTITUTION) * velAlongNormal * 0.5; // equal mass → 0.5
  const impulseVec = normal.scale(impulse);

  a.vel = a.vel.add(impulseVec);
  b.vel = b.vel.sub(impulseVec);

  return true;
}

/** Push apart two overlapping balls. Mutates positions. */
export function separateBalls(
  a: Ball,
  b: Ball,
  diff: Vec2,
  dist: number,
  minDist: number,
): void {
  const overlap = minDist - dist;
  const correction = diff.scale(overlap / (2 * dist));
  a.pos = a.pos.add(correction);
  b.pos = b.pos.sub(correction);
}

/** Resolve ball-cushion (wall) bounce. Mutates ball. */
export function resolveBallCushion(
  ball: Ball,
  tableWidth: number,
  tableHeight: number,
): void {
  const r = ball.radius;

  // Left wall
  if (ball.pos.x - r < 0) {
    ball.pos = new Vec2(r, ball.pos.y);
    ball.vel = new Vec2(-ball.vel.x * CUSHION_RESTITUTION, ball.vel.y);
  }
  // Right wall
  if (ball.pos.x + r > tableWidth) {
    ball.pos = new Vec2(tableWidth - r, ball.pos.y);
    ball.vel = new Vec2(-ball.vel.x * CUSHION_RESTITUTION, ball.vel.y);
  }
  // Top wall
  if (ball.pos.y - r < 0) {
    ball.pos = new Vec2(ball.pos.x, r);
    ball.vel = new Vec2(ball.vel.x, -ball.vel.y * CUSHION_RESTITUTION);
  }
  // Bottom wall
  if (ball.pos.y + r > tableHeight) {
    ball.pos = new Vec2(ball.pos.x, tableHeight - r);
    ball.vel = new Vec2(ball.vel.x, -ball.vel.y * CUSHION_RESTITUTION);
  }
}
