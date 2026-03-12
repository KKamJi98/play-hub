import { describe, expect, it } from "vitest";
import type { BallId } from "../constants";
import type {
  ReferenceAxisExpectation,
  ReferenceBallExpectation,
  ReferenceScenarioResult,
  TrajectoryExpectation,
} from "./referenceHarness";
import {
  cueBallReversedBefore,
  sampleBallFrame,
  simulateReferenceScenario,
} from "./referenceHarness";
import { ALL_REFERENCE_SCENARIOS } from "./referenceScenarios";

function expectAxisRange(
  label: string,
  value: number,
  expectation: ReferenceAxisExpectation | undefined,
) {
  if (!expectation) return;
  if (expectation.min !== undefined) {
    expect(value, `${label} min`).toBeGreaterThanOrEqual(expectation.min);
  }
  if (expectation.max !== undefined) {
    expect(value, `${label} max`).toBeLessThanOrEqual(expectation.max);
  }
}

function assertBallExpectation(
  result: ReferenceScenarioResult,
  ballId: BallId,
  expectation: ReferenceBallExpectation,
  atTime?: number,
) {
  const ball = atTime === undefined
    ? result.balls.find((candidate) => candidate.id === ballId)
    : null;
  const sampled = atTime === undefined ? null : sampleBallFrame(result, ballId, atTime);
  const pos = ball?.pos ?? sampled?.pos ?? null;

  expect(pos, `ball ${ballId} should exist`).not.toBeNull();
  if (!pos) return;

  expectAxisRange(`${ballId}.x`, pos.x, expectation.x);
  expectAxisRange(`${ballId}.y`, pos.y, expectation.y);
}

function assertTrajectory(
  result: ReferenceScenarioResult,
  trajectory: TrajectoryExpectation,
) {
  for (const point of trajectory.points) {
    const frame = sampleBallFrame(result, trajectory.ballId, point.t);
    expect(frame, `trajectory frame for ${trajectory.ballId} at t=${point.t}`).not.toBeNull();
    if (!frame) return;

    const dx = frame.pos.x - point.x;
    const dy = frame.pos.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(
      dist,
      `${trajectory.ballId} at t=${point.t}: distance ${dist.toFixed(1)}px exceeds tolerance ${trajectory.tolerancePx}px`,
    ).toBeLessThanOrEqual(trajectory.tolerancePx);
  }
}

describe("billiards reference harness", () => {
  for (const scenario of ALL_REFERENCE_SCENARIOS) {
    it(`matches ${scenario.id}`, () => {
      const result = simulateReferenceScenario(scenario);

      for (const sample of scenario.samples ?? []) {
        for (const ballExpectation of sample.balls) {
          assertBallExpectation(result, ballExpectation.id, ballExpectation, sample.t);
        }
      }

      for (const ballExpectation of scenario.finalState ?? []) {
        assertBallExpectation(result, ballExpectation.id, ballExpectation);
      }

      for (const traj of scenario.trajectory ?? []) {
        assertTrajectory(result, traj);
      }

      if (scenario.firstBallHitTargetId !== undefined) {
        expect(result.firstBallHitTargetId).toBe(scenario.firstBallHitTargetId);
      }
      if (scenario.expectFirstCushionHit !== undefined) {
        expect(result.firstCushionHit).toBe(scenario.expectFirstCushionHit);
      }
      if (scenario.expectReverseBeforeSeconds !== undefined) {
        expect(
          cueBallReversedBefore(result, scenario.cueBallId, scenario.expectReverseBeforeSeconds),
        ).toBe(true);
      }
    });
  }
});
