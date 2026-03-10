import type { Ball, BallPhase } from "./ball";
import { isMoving } from "./ball";
import {
  approximateFrictionVector,
  applyRollingContact,
  applySlidingContact,
  applySpinDecay,
  getClothContactState,
} from "./contact";
import { resolveBallBall, resolveBallCushion, type CollisionEvent } from "./collision";
import {
  MAX_SIMULATION_STEPS_PER_TICK,
  OMEGA_THRESHOLD,
  PHYSICS_DT,
  STOP_THRESHOLD,
  toPixels,
} from "../constants";
import type { BallId } from "../constants";
import { Vec2 } from "./vector";

export interface StepResult {
  cueBallHits: Set<BallId>;
  carrySeconds: number;
  simulatedSteps: number;
  events: CollisionEvent[];
}

function determinePhase(ball: Ball): BallPhase {
  const contact = getClothContactState(ball);
  const speed = ball.vel.length();
  const omegaZ = Math.abs(ball.omega.z);

  if (speed <= STOP_THRESHOLD && contact.slipSpeed <= STOP_THRESHOLD && omegaZ <= OMEGA_THRESHOLD) {
    return "stationary";
  }
  if (contact.slipSpeed > 0.01) return "sliding";
  if (speed > STOP_THRESHOLD) return "rolling";
  if (omegaZ > OMEGA_THRESHOLD) return "spinning";
  return "stationary";
}

function integrateBall(ball: Ball, dt: number): void {
  ball.phase = determinePhase(ball);
  if (ball.phase === "stationary") {
    ball.vel = Vec2.zero();
    ball.omega = { x: 0, y: 0, z: 0 };
    return;
  }

  if (ball.phase === "sliding") {
    applySlidingContact(ball, dt);
  } else if (ball.phase === "rolling") {
    applyRollingContact(ball, dt);
  } else if (ball.phase === "spinning") {
    ball.vel = Vec2.zero();
    ball.omega.x = 0;
    ball.omega.y = 0;
    ball.omega.z = applySpinDecay(ball.omega.z, dt);
  }

  ball.pos = ball.pos.add(new Vec2(
    toPixels(ball.vel.x * dt),
    toPixels(ball.vel.y * dt),
  ));

  ball.phase = determinePhase(ball);
  const frictionVector = approximateFrictionVector(ball);
  const shouldStop =
    ball.vel.length() <= STOP_THRESHOLD &&
    frictionVector.length() <= 0.01 &&
    Math.abs(ball.omega.z) <= OMEGA_THRESHOLD;

  if (shouldStop) {
    ball.vel = Vec2.zero();
    ball.omega = { x: 0, y: 0, z: 0 };
    ball.phase = "stationary";
  }
}

function runPhysicsSubStep(
  balls: Ball[],
  cueBallId: BallId,
  cueBallHits: Set<BallId>,
  events: CollisionEvent[],
): void {
  for (const ball of balls) {
    integrateBall(ball, PHYSICS_DT);
  }

  for (let i = 0; i < balls.length; i += 1) {
    for (let j = i + 1; j < balls.length; j += 1) {
      const a = balls[i]!;
      const b = balls[j]!;
      const hit = resolveBallBall(a, b, events);
      if (hit) {
        if (a.id === cueBallId) cueBallHits.add(b.id);
        if (b.id === cueBallId) cueBallHits.add(a.id);
      }
    }
  }

  for (const ball of balls) {
    resolveBallCushion(ball, events);
  }
}

export function advanceSimulation(
  balls: Ball[],
  cueBallId: BallId,
  deltaSeconds: number,
  carrySeconds = 0,
): StepResult {
  const cueBallHits = new Set<BallId>();
  const events: CollisionEvent[] = [];
  let availableTime = Math.max(0, carrySeconds + deltaSeconds);
  let simulatedSteps = 0;
  const maxTickTime = PHYSICS_DT * MAX_SIMULATION_STEPS_PER_TICK;

  availableTime = Math.min(availableTime, maxTickTime);

  while (
    availableTime >= PHYSICS_DT &&
    simulatedSteps < MAX_SIMULATION_STEPS_PER_TICK
  ) {
    runPhysicsSubStep(balls, cueBallId, cueBallHits, events);
    availableTime -= PHYSICS_DT;
    simulatedSteps += 1;
  }

  return {
    cueBallHits,
    carrySeconds: availableTime,
    simulatedSteps,
    events,
  };
}

export function allStopped(balls: Ball[]): boolean {
  return balls.every((b) => !isMoving(b));
}
