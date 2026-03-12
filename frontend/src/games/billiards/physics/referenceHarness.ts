import { BALL_COLORS, BALL_RADIUS, TABLE_HEIGHT } from "../constants";
import type { BallId } from "../constants";
import { createBall, type Ball, type BallPhase } from "./ball";
import { advanceSimulation, allStopped } from "./engine";
import type { ShotParamsV2 } from "./shot";
import { applyShotState } from "./shot";
import { Vec2 } from "./vector";

export interface ReferenceLayoutBall {
  id: BallId;
  x: number;
  y: number;
}

export interface ReferenceAxisExpectation {
  min?: number;
  max?: number;
}

export interface ReferenceBallExpectation {
  id: BallId;
  x?: ReferenceAxisExpectation;
  y?: ReferenceAxisExpectation;
}

export interface ReferenceSampleExpectation {
  t: number;
  balls: ReferenceBallExpectation[];
}

export interface ReferenceScenarioSource {
  type: "manual" | "video-extracted";
  videoId?: string;
  confidence?: "high" | "medium" | "low";
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
}

export interface TrajectoryExpectation {
  ballId: BallId;
  points: TrajectoryPoint[];
  tolerancePx: number;
}

export interface ReferenceScenario {
  id: string;
  cueBallId: BallId;
  durationSeconds: number;
  layout: ReferenceLayoutBall[];
  shot: ShotParamsV2;
  samples?: ReferenceSampleExpectation[];
  finalState?: ReferenceBallExpectation[];
  firstBallHitTargetId?: BallId | null;
  expectFirstCushionHit?: boolean;
  expectReverseBeforeSeconds?: number;
  source?: ReferenceScenarioSource;
  trajectory?: TrajectoryExpectation[];
}

export interface SimulatedBallFrame {
  t: number;
  pos: Vec2;
  vel: Vec2;
  phase: BallPhase;
}

export interface ReferenceScenarioResult {
  balls: Ball[];
  history: Record<BallId, SimulatedBallFrame[]>;
  firstBallHitTargetId: BallId | null;
  firstCushionHit: boolean;
}

export interface CueBallSample {
  t: number;
  posX: number;
  posY: number;
  velX: number;
  velY: number;
}

export interface ReferenceShotRun {
  balls: Ball[];
  history: CueBallSample[];
  firstBallHitTargetId: BallId | null;
  firstCushionHit: boolean;
}

const BALL_COLOR_BY_ID: Record<BallId, string> = {
  white: BALL_COLORS.white,
  yellow: BALL_COLORS.yellow,
  red1: BALL_COLORS.red1,
  red2: BALL_COLORS.red2,
};

function layoutFromBalls(balls: Ball[]): ReferenceLayoutBall[] {
  return balls.map((ball) => ({
    id: ball.id,
    x: ball.pos.x,
    y: ball.pos.y,
  }));
}

export function instantiateReferenceLayout(layout: ReferenceLayoutBall[]): Ball[] {
  return layout.map((ball) =>
    createBall(ball.id, ball.x, ball.y, BALL_RADIUS, BALL_COLOR_BY_ID[ball.id]),
  );
}

export function simulateReferenceScenario(scenario: ReferenceScenario): ReferenceScenarioResult {
  const balls = instantiateReferenceLayout(scenario.layout);
  const cueIndex = balls.findIndex((ball) => ball.id === scenario.cueBallId);
  if (cueIndex < 0) {
    throw new Error(`Cue ball ${scenario.cueBallId} not found in scenario ${scenario.id}`);
  }

  balls[cueIndex] = applyShotState(balls[cueIndex]!, scenario.shot);

  const history: Record<BallId, SimulatedBallFrame[]> = {
    white: [],
    yellow: [],
    red1: [],
    red2: [],
  };
  let carrySeconds = 0;
  let firstBallHitTargetId: BallId | null = null;
  let firstCushionHit = false;
  const frameCount = Math.round(scenario.durationSeconds * 120);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const result = advanceSimulation(balls, scenario.cueBallId, 1 / 120, carrySeconds);
    carrySeconds = result.carrySeconds;

    if (!firstBallHitTargetId) {
      const hit = result.events.find(
        (event) =>
          event.type === "ball-ball" &&
          (event.ballId === scenario.cueBallId || event.otherBallId === scenario.cueBallId),
      );
      if (hit?.type === "ball-ball") {
        firstBallHitTargetId =
          hit.ballId === scenario.cueBallId ? hit.otherBallId : hit.ballId;
      }
    }

    if (!firstCushionHit) {
      firstCushionHit = result.events.some(
        (event) => event.type === "cushion" && event.ballId === scenario.cueBallId,
      );
    }

    const t = (frame + 1) / 120;
    for (const ball of balls) {
      history[ball.id].push({
        t,
        pos: new Vec2(ball.pos.x, ball.pos.y),
        vel: new Vec2(ball.vel.x, ball.vel.y),
        phase: ball.phase,
      });
    }

    if (allStopped(balls)) break;
  }

  return {
    balls,
    history,
    firstBallHitTargetId,
    firstCushionHit,
  };
}

export function sampleBallFrame(
  result: ReferenceScenarioResult,
  ballId: BallId,
  t: number,
): SimulatedBallFrame | null {
  const frames = result.history[ballId];
  if (frames.length === 0) return null;

  let bestFrame = frames[0] ?? null;
  let bestDelta = bestFrame ? Math.abs(bestFrame.t - t) : Number.POSITIVE_INFINITY;

  for (const frame of frames) {
    const delta = Math.abs(frame.t - t);
    if (delta < bestDelta) {
      bestFrame = frame;
      bestDelta = delta;
    }
  }

  return bestFrame;
}

export function cueBallReversedBefore(
  result: ReferenceScenarioResult,
  cueBallId: BallId,
  seconds: number,
): boolean {
  return result.history[cueBallId].some((frame) => frame.t <= seconds && frame.vel.x < 0);
}

export function simulateReferenceShot(
  shot: ShotParamsV2,
  seconds: number,
  initialBalls?: Ball[],
  cueBallId: BallId = "white",
): ReferenceShotRun {
  const layoutBalls = initialBalls ?? [
    createBall(cueBallId, 220, TABLE_HEIGHT / 2, BALL_RADIUS, BALL_COLOR_BY_ID[cueBallId]),
  ];
  const result = simulateReferenceScenario({
    id: `probe-${cueBallId}`,
    cueBallId,
    durationSeconds: seconds,
    layout: layoutFromBalls(layoutBalls),
    shot,
  });

  return {
    balls: result.balls,
    history: result.history[cueBallId].map((frame) => ({
      t: frame.t,
      posX: frame.pos.x,
      posY: frame.pos.y,
      velX: frame.vel.x,
      velY: frame.vel.y,
    })),
    firstBallHitTargetId: result.firstBallHitTargetId,
    firstCushionHit: result.firstCushionHit,
  };
}

export function cueBallSampleAtTime(
  history: CueBallSample[],
  targetTime: number,
): CueBallSample {
  return history.reduce((best, sample) => {
    if (Math.abs(sample.t - targetTime) < Math.abs(best.t - targetTime)) {
      return sample;
    }
    return best;
  });
}

export function firstCueBallReverseTime(history: CueBallSample[]): number | null {
  return history.find((sample) => sample.velX < 0)?.t ?? null;
}
