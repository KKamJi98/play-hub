import type { Ball } from "./ball";
import { Vec2 } from "./vector";
import {
  E_BB,
  E_C,
  M,
  MU_BB,
  MU_C,
  R,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from "../constants";

export type CollisionEvent =
  | {
      type: "ball-ball";
      ballId: Ball["id"];
      otherBallId: Ball["id"];
      point: Vec2;
    }
  | {
      type: "cushion";
      ballId: Ball["id"];
      normal: Vec2;
      point: Vec2;
    };

export function resolveBallBall(a: Ball, b: Ball, events?: CollisionEvent[]): boolean {
  const diff = a.pos.sub(b.pos);
  const dist = diff.length();
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) return false;

  separateBalls(a, b, diff, dist, minDist);

  const normal = diff.scale(1 / dist);
  const tangent = normal.perp();
  const relVel = a.vel.sub(b.vel);
  const velAlongNormal = relVel.dot(normal);

  if (velAlongNormal > 0) return true;

  const jn = -(1 + E_BB) * velAlongNormal * (M / 2);
  const nx = normal.x;
  const ny = normal.y;

  // 2D tangential relative surface velocity (in-plane, existing)
  const relTangentVel = relVel.dot(tangent) - R * (a.omega.z + b.omega.z);
  // Vertical relative surface velocity at contact (topspin/backspin transfer)
  const relVerticalVel = R * (nx * (a.omega.y + b.omega.y) - ny * (a.omega.x + b.omega.x));

  // Effective masses for tangential impulses (I = 2/5 MR², equal-mass balls):
  //   Tangent (in-plane): 1/m_eff = 2/M + 2R²/I = 7/M → m_eff = M/7
  //   Vertical (constrained, torque-only): 1/m_eff = 2R²/I = 5/M → m_eff = M/5
  // Both balls receive same-sign omega delta (contact geometry, like meshing gears).
  const desiredJt = -(M / 7) * relTangentVel;
  const desiredJz = -(M / 5) * relVerticalVel;

  // Clamp combined tangential impulse within friction cone
  const maxJ = MU_BB * jn;
  const desiredMag = Math.sqrt(desiredJt * desiredJt + desiredJz * desiredJz);
  let jt: number;
  let jz: number;
  if (desiredMag <= maxJ || desiredMag === 0) {
    jt = desiredJt;
    jz = desiredJz;
  } else {
    const scale = maxJ / desiredMag;
    jt = desiredJt * scale;
    jz = desiredJz * scale;
  }

  const normalImpulse = normal.scale(jn / M);
  const tangentImpulse = tangent.scale(jt / M);

  a.vel = a.vel.add(normalImpulse).add(tangentImpulse);
  b.vel = b.vel.sub(normalImpulse).sub(tangentImpulse);

  // Z-axis spin transfer (sidespin, from tangent impulse)
  const deltaOmegaZ = (-5 * jt) / (2 * M * R);
  a.omega.z += deltaOmegaZ;
  b.omega.z += deltaOmegaZ;

  // X/Y spin transfer (topspin/backspin, from vertical impulse)
  const spinFactor = 5 / (2 * M * R);
  a.omega.x += -ny * jz * spinFactor;
  a.omega.y += nx * jz * spinFactor;
  b.omega.x += -ny * jz * spinFactor;
  b.omega.y += nx * jz * spinFactor;

  a.phase = "sliding";
  b.phase = "sliding";

  events?.push({
    type: "ball-ball",
    ballId: a.id,
    otherBallId: b.id,
    point: a.pos.add(b.pos).scale(0.5),
  });

  return true;
}

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

export function resolveBallCushion(ball: Ball, events?: CollisionEvent[]): void {
  const r = ball.radius;

  if (ball.pos.x - r < 0) {
    ball.pos = new Vec2(r, ball.pos.y);
    applyCushionBounce(ball, new Vec2(1, 0), events);
  }
  if (ball.pos.x + r > TABLE_WIDTH) {
    ball.pos = new Vec2(TABLE_WIDTH - r, ball.pos.y);
    applyCushionBounce(ball, new Vec2(-1, 0), events);
  }
  if (ball.pos.y - r < 0) {
    ball.pos = new Vec2(ball.pos.x, r);
    applyCushionBounce(ball, new Vec2(0, 1), events);
  }
  if (ball.pos.y + r > TABLE_HEIGHT) {
    ball.pos = new Vec2(ball.pos.x, TABLE_HEIGHT - r);
    applyCushionBounce(ball, new Vec2(0, -1), events);
  }
}

function applyCushionBounce(ball: Ball, inwardNormal: Vec2, events?: CollisionEvent[]): void {
  const vn = ball.vel.dot(inwardNormal);
  if (vn >= 0) return;

  const tangent = inwardNormal.perp();
  const vt = ball.vel.dot(tangent);
  const jn = -(1 + E_C) * vn * M;
  const surfaceSlip = vt - R * ball.omega.z;
  const desiredJt = -(2 * M / 7) * surfaceSlip;
  const maxJt = MU_C * jn;
  const jt = Math.max(-maxJt, Math.min(maxJt, desiredJt));

  const vnNew = -E_C * vn;
  const vtNew = vt + jt / M;
  const deltaOmegaZ = (-5 * jt) / (2 * M * R);

  ball.vel = inwardNormal.scale(vnNew).add(tangent.scale(vtNew));
  ball.omega.z += deltaOmegaZ;
  ball.phase = "sliding";

  events?.push({
    type: "cushion",
    ballId: ball.id,
    normal: inwardNormal,
    point: ball.pos,
  });
}
