import type { Ball, Omega3 } from "./ball";
import { Vec2 } from "./vector";
import {
  M,
  MU_R,
  MU_S,
  MU_SP,
  OMEGA_THRESHOLD,
  R,
  STOP_THRESHOLD,
  g,
} from "../constants";

const BALL_INERTIA = (2 / 5) * M * R * R;

export interface ClothContactState {
  slip: Vec2;
  slipSpeed: number;
  rollingOmega: Pick<Omega3, "x" | "y">;
}

/** Relative velocity at the cloth contact point. */
export function clothContactVelocity(ball: Ball): Vec2 {
  return new Vec2(
    ball.vel.x - R * ball.omega.y,
    ball.vel.y + R * ball.omega.x,
  );
}

/** Pure-rolling angular velocity that matches the current linear velocity. */
export function rollingOmegaForVelocity(vel: Vec2): Pick<Omega3, "x" | "y"> {
  return {
    x: -vel.y / R,
    y: vel.x / R,
  };
}

export function getClothContactState(ball: Ball): ClothContactState {
  const slip = clothContactVelocity(ball);
  return {
    slip,
    slipSpeed: slip.length(),
    rollingOmega: rollingOmegaForVelocity(ball.vel),
  };
}

/** Convert a cloth-plane friction force into angular acceleration delta. */
export function clothTorqueDelta(force: Vec2, dt: number): Pick<Omega3, "x" | "y"> {
  return {
    x: (R * force.y * dt) / BALL_INERTIA,
    y: (-R * force.x * dt) / BALL_INERTIA,
  };
}

/** Tangential slip speed at a cushion contact point. */
export function cushionSlipVelocity(ball: Ball, inwardNormal: Vec2): number {
  const tangent = inwardNormal.perp();
  const contactVel = new Vec2(
    ball.vel.x - R * ball.omega.z * inwardNormal.y,
    ball.vel.y + R * ball.omega.z * inwardNormal.x,
  );

  return contactVel.dot(tangent);
}

export function angularImpulseToOmegaDelta(impulse: number): number {
  return (-5 * impulse) / (2 * M * R);
}

export function applySpinDecay(omegaZ: number, dt: number): number {
  if (Math.abs(omegaZ) <= OMEGA_THRESHOLD) return 0;

  const spinDecel = (5 * MU_SP * g * dt) / (2 * R);
  if (Math.abs(omegaZ) <= spinDecel) return 0;
  return omegaZ - Math.sign(omegaZ) * spinDecel;
}

export function approximateFrictionVector(ball: Ball): Vec2 {
  if (ball.phase === "sliding") {
    const slip = clothContactVelocity(ball);
    const slipSpeed = slip.length();
    if (slipSpeed === 0) return Vec2.zero();
    return slip.scale((-MU_S * M * g) / slipSpeed);
  }

  if (ball.phase === "rolling") {
    const speed = ball.vel.length();
    if (speed === 0) return Vec2.zero();
    return ball.vel.scale((-MU_R * M * g) / speed);
  }

  return Vec2.zero();
}

export function applySlidingContact(ball: Ball, dt: number): void {
  const contact = getClothContactState(ball);
  if (contact.slipSpeed <= 0.0001) {
    const rollingOmega = contact.rollingOmega;
    ball.omega.x = rollingOmega.x;
    ball.omega.y = rollingOmega.y;
    ball.omega.z = applySpinDecay(ball.omega.z, dt);
    return;
  }

  const frictionForce = contact.slip.scale((-MU_S * M * g) / contact.slipSpeed);
  const acceleration = frictionForce.scale(1 / M);
  const torqueDelta = clothTorqueDelta(frictionForce, dt);

  ball.vel = ball.vel.add(acceleration.scale(dt));
  ball.omega.x += torqueDelta.x;
  ball.omega.y += torqueDelta.y;
  ball.omega.z = applySpinDecay(ball.omega.z, dt);

  const slipAfter = clothContactVelocity(ball);
  if (slipAfter.dot(contact.slip) <= 0) {
    const rollingOmega = rollingOmegaForVelocity(ball.vel);
    ball.omega.x = rollingOmega.x;
    ball.omega.y = rollingOmega.y;
  }
}

export function applyRollingContact(ball: Ball, dt: number): void {
  const speed = ball.vel.length();

  if (speed <= STOP_THRESHOLD) {
    ball.vel = Vec2.zero();
  } else {
    const decel = MU_R * g * dt;
    if (speed <= decel) {
      ball.vel = Vec2.zero();
    } else {
      ball.vel = ball.vel.scale(1 - decel / speed);
    }
  }

  const rollingOmega = rollingOmegaForVelocity(ball.vel);
  ball.omega.x = rollingOmega.x;
  ball.omega.y = rollingOmega.y;
  ball.omega.z = applySpinDecay(ball.omega.z, dt);
}
