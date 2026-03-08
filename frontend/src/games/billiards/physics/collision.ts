import type { Ball } from "./ball";
import { Vec2 } from "./vector";
import {
  E_BB,
  MU_BB,
  E_C,
  M,
  R,
  toMeters,
  TABLE_WIDTH,
  TABLE_HEIGHT,
} from "../constants";

// ---- Ball-ball collision --------------------------------------------------

/**
 * Resolve ball-ball collision with impulse-based dynamics + Coulomb friction.
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
  // Tangent (perpendicular to normal)
  const tangent = normal.perp();

  // Relative velocity along normal
  const relVel = a.vel.sub(b.vel);
  const velAlongNormal = relVel.dot(normal);

  // Don't resolve if balls are separating
  if (velAlongNormal > 0) return true;

  // Normal impulse magnitude (equal mass)
  const Jn = (1 + E_BB) * (M / 2) * Math.abs(velAlongNormal);

  // Relative tangential velocity at contact point (including spin)
  // Contact point surface velocity includes omega contribution
  const rA = R; // distance from center to contact point (in meters)
  const rB = R;

  // Surface velocity at contact for ball A (pointing along tangent)
  // v_surface = v_center + omega x r (for 2D, omega.z contributes tangential velocity)
  const vSurfA_t = a.vel.dot(tangent) + a.omega.z * rA;
  const vSurfB_t = b.vel.dot(tangent) - b.omega.z * rB;
  const relTangentVel = vSurfA_t - vSurfB_t;

  // Tangential impulse (Coulomb friction: capped by μ·Jn)
  const maxJt = MU_BB * Jn;
  const desiredJt = (M / 2) * Math.abs(relTangentVel);
  const Jt = Math.min(maxJt, desiredJt);
  const tangentSign = relTangentVel > 0 ? -1 : 1;

  // Apply normal impulse
  const normalImpulse = normal.scale(Jn / M);
  a.vel = a.vel.add(normalImpulse);
  b.vel = b.vel.sub(normalImpulse);

  // Apply tangential impulse
  const tangentImpulse = tangent.scale((Jt * tangentSign) / M);
  a.vel = a.vel.add(tangentImpulse);
  b.vel = b.vel.sub(tangentImpulse);

  // Angular velocity transfer from tangential impulse: Δω = -5·Jt/(2·m·R)
  const deltaOmegaZ = (5 * Jt * tangentSign) / (2 * M * R);
  a.omega.z += deltaOmegaZ;
  b.omega.z += deltaOmegaZ;

  // Both balls enter sliding phase after collision
  a.phase = "sliding";
  b.phase = "sliding";

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

// ---- Ball-cushion collision (Han 2005 simplified) -------------------------

/**
 * Resolve ball-cushion (wall) bounce with sidespin effects.
 * Uses the Han 2005 simplified model:
 *   v_n' = -e_c · v_n
 *   v_t' = (5/7) · v_t + (2/7) · R · ωz
 */
export function resolveBallCushion(ball: Ball): void {
  const r = ball.radius;
  const rMeters = toMeters(r); // ball radius in meters (for omega calc)

  // Left wall
  if (ball.pos.x - r < 0) {
    ball.pos = new Vec2(r, ball.pos.y);
    applyCushionBounce(ball, new Vec2(1, 0), rMeters);
  }
  // Right wall
  if (ball.pos.x + r > TABLE_WIDTH) {
    ball.pos = new Vec2(TABLE_WIDTH - r, ball.pos.y);
    applyCushionBounce(ball, new Vec2(-1, 0), rMeters);
  }
  // Top wall
  if (ball.pos.y - r < 0) {
    ball.pos = new Vec2(ball.pos.x, r);
    applyCushionBounce(ball, new Vec2(0, 1), rMeters);
  }
  // Bottom wall
  if (ball.pos.y + r > TABLE_HEIGHT) {
    ball.pos = new Vec2(ball.pos.x, TABLE_HEIGHT - r);
    applyCushionBounce(ball, new Vec2(0, -1), rMeters);
  }
}

/**
 * Apply cushion bounce physics along a given inward normal.
 * Han 2005 simplified: v_n' = -e_c * v_n, v_t' = (5/7)*v_t + (2/7)*R*ωz
 */
function applyCushionBounce(ball: Ball, inwardNormal: Vec2, _rMeters: number): void {
  const vn = ball.vel.dot(inwardNormal);

  // Only bounce if moving into the cushion
  if (vn >= 0) return;

  const tangent = inwardNormal.perp();
  const vt = ball.vel.dot(tangent);

  // Normal component: reverse with restitution
  const vnNew = -E_C * vn;

  // Tangential component: modified by sidespin (Han 2005)
  // For horizontal cushion (normal = (1,0)): tangent = (0,-1) or (0,1)
  // ωz > 0 means counter-clockwise sidespin (top view)
  const vtNew = (5 / 7) * vt + (2 / 7) * R * ball.omega.z;

  ball.vel = inwardNormal.scale(vnNew).add(tangent.scale(vtNew));

  // Update omega.z after cushion contact
  ball.omega.z = (5 / 7) * ball.omega.z - (2 / 7) * vt / R;

  // Re-enter sliding phase after cushion hit
  ball.phase = "sliding";
}
