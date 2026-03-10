import type { Ball } from "./ball";
import { applyShotState, type ShotParamsV2 } from "./shot";
import { advanceSimulation, allStopped } from "./engine";
import { GUIDE_DT, MAX_GUIDE_STEPS } from "../constants";
import type { BallId } from "../constants";
import { Vec2 } from "./vector";

export interface GuideTrace {
  cuePath: Vec2[];
  firstBallHit: { point: Vec2; targetId: BallId } | null;
  firstCushionHit: { point: Vec2; normal: Vec2 } | null;
}

function cloneBalls(source: Ball[]): Ball[] {
  return source.map((ball) => ({
    ...ball,
    pos: new Vec2(ball.pos.x, ball.pos.y),
    vel: new Vec2(ball.vel.x, ball.vel.y),
    omega: { x: ball.omega.x, y: ball.omega.y, z: ball.omega.z },
  }));
}

export function simulateGuideTrace(
  balls: Ball[],
  cueBallId: BallId,
  shot: ShotParamsV2,
): GuideTrace {
  const traceBalls = cloneBalls(balls);
  const cueIndex = traceBalls.findIndex((ball) => ball.id === cueBallId);

  if (cueIndex < 0) {
    return { cuePath: [], firstBallHit: null, firstCushionHit: null };
  }

  traceBalls[cueIndex] = applyShotState(traceBalls[cueIndex]!, shot);

  const cuePath: Vec2[] = [traceBalls[cueIndex]!.pos];
  let carrySeconds = 0;
  let firstBallHit: GuideTrace["firstBallHit"] = null;
  let firstCushionHit: GuideTrace["firstCushionHit"] = null;

  for (let step = 0; step < MAX_GUIDE_STEPS; step += 1) {
    const result = advanceSimulation(traceBalls, cueBallId, GUIDE_DT, carrySeconds);
    carrySeconds = result.carrySeconds;

    const cueBall = traceBalls.find((ball) => ball.id === cueBallId);
    if (!cueBall) break;

    cuePath.push(cueBall.pos);

    if (!firstBallHit) {
      const ballEvent = result.events.find(
        (event) => event.type === "ball-ball" &&
          (event.ballId === cueBallId || event.otherBallId === cueBallId),
      );
      if (ballEvent && ballEvent.type === "ball-ball") {
        firstBallHit = {
          point: ballEvent.point,
          targetId: ballEvent.ballId === cueBallId ? ballEvent.otherBallId : ballEvent.ballId,
        };
      }
    }

    if (!firstCushionHit) {
      const cushionEvent = result.events.find(
        (event) => event.type === "cushion" && event.ballId === cueBallId,
      );
      if (cushionEvent && cushionEvent.type === "cushion") {
        firstCushionHit = {
          point: cushionEvent.point,
          normal: cushionEvent.normal,
        };
      }
    }

    if (allStopped(traceBalls)) break;
  }

  return {
    cuePath,
    firstBallHit,
    firstCushionHit,
  };
}
