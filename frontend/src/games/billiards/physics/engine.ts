import type { Ball, BallPhase } from "./ball";
import { isMoving } from "./ball";
import { resolveBallBall, resolveBallCushion } from "./collision";
import {
  PHYSICS_DT,
  MAX_SIMULATION_STEPS_PER_TICK,
  R,
  g,
  MU_S,
  MU_R,
  MU_SP,
  STOP_THRESHOLD,
  OMEGA_THRESHOLD,
  SLIP_THRESHOLD,
  toPixels,
} from "../constants";
import type { BallId } from "../constants";
import { Vec2 } from "./vector";

export interface StepResult {
  /** Set of ball ids that the cue ball collided with during this frame. */
  cueBallHits: Set<BallId>;
  carrySeconds: number;
  simulatedSteps: number;
}

// ---- Slip velocity 3-phase integration ------------------------------------

/**
 * Compute the slip velocity: u = (vx - R·ωy, vy + R·ωx)
 */
function slipVelocity(ball: Ball): Vec2 {
  return new Vec2(
    ball.vel.x - R * ball.omega.y,
    ball.vel.y + R * ball.omega.x,
  );
}

/**
 * Determine the ball's phase based on its current state.
 */
function determinePhase(ball: Ball): BallPhase {
  const slip = slipVelocity(ball);
  const speed = ball.vel.length();
  const omegaZ = Math.abs(ball.omega.z);

  if (slip.length() > SLIP_THRESHOLD) return "sliding";
  if (speed > STOP_THRESHOLD) return "rolling";
  if (omegaZ > OMEGA_THRESHOLD) return "spinning";
  return "stationary";
}

/**
 * Integrate one physics sub-step for a single ball using the 3-phase model.
 * All velocities are in m/s, angular velocities in rad/s.
 */
function integrateBall(ball: Ball, dt: number): void {
  if (ball.phase === "stationary") return;

  const speed = ball.vel.length();

  if (ball.phase === "sliding") {
    // Phase 1: Sliding — slip velocity drives friction
    const slip = slipVelocity(ball);
    const slipMag = slip.length();

    if (slipMag > SLIP_THRESHOLD) {
      const frictionAccel = MU_S * g * dt;

      if (frictionAccel >= slipMag) {
        // Friction would overshoot slip → snap to rolling condition
        ball.omega.x = -ball.vel.y / R;
        ball.omega.y = ball.vel.x / R;
        // Don't modify vel — keep current velocity, just eliminate slip
      } else {
        // Normal friction application (safe — won't overshoot)
        const ux = slip.x / slipMag;
        const uy = slip.y / slipMag;

        ball.vel = new Vec2(
          ball.vel.x - MU_S * g * ux * dt,
          ball.vel.y - MU_S * g * uy * dt,
        );

        const angFactor = (5 * MU_S * g) / (2 * R);
        ball.omega.x += angFactor * uy * dt;
        ball.omega.y -= angFactor * ux * dt;
      }
    }

    // Spinning friction always active
    if (Math.abs(ball.omega.z) > OMEGA_THRESHOLD) {
      const spinDecel = (5 * MU_SP * g) / (2 * R) * dt;
      if (Math.abs(ball.omega.z) <= spinDecel) {
        ball.omega.z = 0;
      } else {
        ball.omega.z -= Math.sign(ball.omega.z) * spinDecel;
      }
    } else {
      ball.omega.z = 0;
    }
  } else if (ball.phase === "rolling") {
    // Phase 2: Rolling — no slip, rolling resistance decelerates
    // Lock angular velocity to linear velocity
    ball.omega.x = -ball.vel.y / R;
    ball.omega.y = ball.vel.x / R;

    if (speed > STOP_THRESHOLD) {
      const decel = MU_R * g * dt;
      if (speed <= decel) {
        ball.vel = Vec2.zero();
      } else {
        const factor = 1 - decel / speed;
        ball.vel = ball.vel.scale(factor);
      }
      // Re-lock omega after velocity change
      ball.omega.x = -ball.vel.y / R;
      ball.omega.y = ball.vel.x / R;
    }

    // Spinning friction
    if (Math.abs(ball.omega.z) > OMEGA_THRESHOLD) {
      const spinDecel = (5 * MU_SP * g) / (2 * R) * dt;
      if (Math.abs(ball.omega.z) <= spinDecel) {
        ball.omega.z = 0;
      } else {
        ball.omega.z -= Math.sign(ball.omega.z) * spinDecel;
      }
    } else {
      ball.omega.z = 0;
    }
  } else if (ball.phase === "spinning") {
    // Phase 3: Spinning — only ωz active, no linear motion
    ball.vel = Vec2.zero();
    ball.omega.x = 0;
    ball.omega.y = 0;

    if (Math.abs(ball.omega.z) > OMEGA_THRESHOLD) {
      const spinDecel = (5 * MU_SP * g) / (2 * R) * dt;
      if (Math.abs(ball.omega.z) <= spinDecel) {
        ball.omega.z = 0;
      } else {
        ball.omega.z -= Math.sign(ball.omega.z) * spinDecel;
      }
    } else {
      ball.omega.z = 0;
    }
  }

  // Update position (convert velocity m/s to pixels)
  const dxPixels = toPixels(ball.vel.x * dt);
  const dyPixels = toPixels(ball.vel.y * dt);
  ball.pos = ball.pos.add(new Vec2(dxPixels, dyPixels));

  // Determine new phase
  ball.phase = determinePhase(ball);

  // Force stop if near-zero (safety net to prevent lingering micro-motion)
  const totalOmega = Math.abs(ball.omega.x) + Math.abs(ball.omega.y) + Math.abs(ball.omega.z);
  if (ball.vel.length() < STOP_THRESHOLD && totalOmega < OMEGA_THRESHOLD * 3) {
    ball.vel = Vec2.zero();
    ball.omega = { x: 0, y: 0, z: 0 };
    ball.phase = "stationary";
  }
}

// ---- Main step function ---------------------------------------------------

/**
 * Advance physics by one animation frame.
 * Internally runs SUB_STEPS iterations for stability.
 * `cueBallId` indicates which ball is the active cue ball this turn.
 */
function runPhysicsSubStep(balls: Ball[], cueBallId: BallId, cueBallHits: Set<BallId>): void {
  // Integrate each ball
  for (const ball of balls) {
    integrateBall(ball, PHYSICS_DT);
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
    resolveBallCushion(ball);
  }
}

export function advanceSimulation(
  balls: Ball[],
  cueBallId: BallId,
  deltaSeconds: number,
  carrySeconds = 0,
): StepResult {
  const cueBallHits = new Set<BallId>();
  let availableTime = Math.max(0, carrySeconds + deltaSeconds);
  let simulatedSteps = 0;
  const maxTickTime = PHYSICS_DT * MAX_SIMULATION_STEPS_PER_TICK;

  availableTime = Math.min(availableTime, maxTickTime);

  while (
    availableTime >= PHYSICS_DT &&
    simulatedSteps < MAX_SIMULATION_STEPS_PER_TICK
  ) {
    runPhysicsSubStep(balls, cueBallId, cueBallHits);
    availableTime -= PHYSICS_DT;
    simulatedSteps += 1;
  }

  return {
    cueBallHits,
    carrySeconds: availableTime,
    simulatedSteps,
  };
}

/** True when every ball has effectively stopped. */
export function allStopped(balls: Ball[]): boolean {
  return balls.every((b) => !isMoving(b));
}
