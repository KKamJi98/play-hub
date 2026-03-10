import type { Ball, Omega3 } from "./ball";
import { clampMagnitude3, cross3, normalize3, scale3, vec3 } from "./math3";
import { Vec2 } from "./vector";
import {
  ELEVATION_SOFT_RAMP_DEGREES,
  M,
  MAX_ELEVATION_DEGREES,
  MAX_SHOT_OMEGA,
  MAX_SHOT_VELOCITY,
  MIN_SHOT_VELOCITY,
  R,
  TIP_OFFSET_LIMIT,
  TIP_SPIN_EFFICIENCY,
} from "../constants";
import type { BallId } from "../constants";

const BALL_INERTIA = (2 / 5) * M * R * R;

export interface ShotParamsV2 {
  direction: { x: number; y: number };
  speedMps: number;
  tipOffset: { x: number; y: number };
  elevationDeg: number;
}

export function clampTipOffset(tipOffset: Vec2): Vec2 {
  const len = tipOffset.length();
  if (len <= TIP_OFFSET_LIMIT) return tipOffset;
  if (len === 0) return Vec2.zero();
  return tipOffset.scale(TIP_OFFSET_LIMIT / len);
}

export function powerToSpeed(power: number): number {
  const t = Math.max(0, Math.min(100, power)) / 100;
  return MIN_SHOT_VELOCITY + t * (MAX_SHOT_VELOCITY - MIN_SHOT_VELOCITY);
}

export const powerToSpeedMps = powerToSpeed;

function softElevationDegrees(elevationDeg: number): number {
  const clamped = Math.max(0, Math.min(MAX_ELEVATION_DEGREES, elevationDeg));
  if (clamped <= ELEVATION_SOFT_RAMP_DEGREES) {
    return (clamped * clamped) / ELEVATION_SOFT_RAMP_DEGREES;
  }
  return clamped;
}

function normalizedDirection(direction: Vec2): Vec2 {
  return direction.length() > 0.0001 ? direction.normalize() : new Vec2(1, 0);
}

export function legacyControlsToShot(
  direction: Vec2,
  power: number,
  spin: Vec2,
  elevationDeg = 0,
): ShotParamsV2 {
  const dir = normalizedDirection(direction);
  const tip = clampTipOffset(spin);

  return {
    direction: { x: dir.x, y: dir.y },
    speedMps: powerToSpeed(power),
    tipOffset: { x: tip.x, y: tip.y },
    elevationDeg: softElevationDegrees(elevationDeg),
  };
}

export const buildShotParams = legacyControlsToShot;

export function shotDirection(shot: ShotParamsV2): Vec2 {
  return normalizedDirection(new Vec2(shot.direction.x, shot.direction.y));
}

export function createShotMotion(shot: ShotParamsV2): { vel: Vec2; omega: Omega3 } {
  const dir = shotDirection(shot);
  const tip = clampTipOffset(new Vec2(shot.tipOffset.x, shot.tipOffset.y));
  const elevationDeg = softElevationDegrees(shot.elevationDeg);
  const elevationRad = (elevationDeg * Math.PI) / 180;

  const horizontalScale = Math.cos(elevationRad);
  const forward3 = normalize3(
    vec3(dir.x * horizontalScale, dir.y * horizontalScale, -Math.sin(elevationRad)),
  );
  const right3 = vec3(dir.y, -dir.x, 0);

  const tipVector = {
    x: right3.x * tip.x * R,
    y: right3.y * tip.x * R,
    z: tip.y * R,
  };
  const impulse = scale3(forward3, M * shot.speedMps * TIP_SPIN_EFFICIENCY);
  const omegaVector = clampMagnitude3(
    scale3(cross3(tipVector, impulse), 1 / BALL_INERTIA),
    MAX_SHOT_OMEGA,
  );

  return {
    vel: dir.scale(shot.speedMps * horizontalScale),
    omega: {
      x: omegaVector.x,
      y: omegaVector.y,
      z: omegaVector.z,
    },
  };
}

export function applyShotState(ball: Ball, shot: ShotParamsV2): Ball {
  const motion = createShotMotion(shot);
  return {
    ...ball,
    vel: motion.vel,
    omega: motion.omega,
    phase: "sliding",
  };
}

export function applyShotToBalls(
  balls: Ball[],
  cueBallId: BallId,
  shot: ShotParamsV2,
): Ball[] {
  return balls.map((ball) => {
    if (ball.id !== cueBallId) return ball;
    return applyShotState(ball, shot);
  });
}
