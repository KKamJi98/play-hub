import { describe, expect, it } from "vitest";
import type { BallId } from "../../constants";
import type {
  ReferenceScenario,
  ReferenceScenarioResult,
  ReferenceAxisExpectation,
} from "../referenceHarness";
import { sampleBallFrame, simulateReferenceScenario } from "../referenceHarness";
import { ALL_REFERENCE_SCENARIOS } from "./index";

interface ScenarioError {
  scenarioId: string;
  ballId: BallId;
  axis: "x" | "y";
  atTime: number | "final";
  expected: ReferenceAxisExpectation;
  actual: number;
  errorPx: number;
}

function computeAxisError(
  actual: number,
  expectation: ReferenceAxisExpectation | undefined,
): number {
  if (!expectation) return 0;
  if (expectation.min !== undefined && actual < expectation.min) {
    return expectation.min - actual;
  }
  if (expectation.max !== undefined && actual > expectation.max) {
    return actual - expectation.max;
  }
  return 0;
}

function collectErrors(
  scenario: ReferenceScenario,
  result: ReferenceScenarioResult,
): ScenarioError[] {
  const errors: ScenarioError[] = [];

  for (const sample of scenario.samples ?? []) {
    for (const ballExp of sample.balls) {
      const frame = sampleBallFrame(result, ballExp.id, sample.t);
      if (!frame) continue;

      for (const axis of ["x", "y"] as const) {
        const expectation = ballExp[axis];
        if (!expectation) continue;
        const actual = axis === "x" ? frame.pos.x : frame.pos.y;
        const err = computeAxisError(actual, expectation);
        if (err > 0) {
          errors.push({
            scenarioId: scenario.id,
            ballId: ballExp.id,
            axis,
            atTime: sample.t,
            expected: expectation,
            actual,
            errorPx: err,
          });
        }
      }
    }
  }

  for (const ballExp of scenario.finalState ?? []) {
    const ball = result.balls.find((b) => b.id === ballExp.id);
    if (!ball) continue;

    for (const axis of ["x", "y"] as const) {
      const expectation = ballExp[axis];
      if (!expectation) continue;
      const actual = axis === "x" ? ball.pos.x : ball.pos.y;
      const err = computeAxisError(actual, expectation);
      if (err > 0) {
        errors.push({
          scenarioId: scenario.id,
          ballId: ballExp.id,
          axis,
          atTime: "final",
          expected: expectation,
          actual,
          errorPx: err,
        });
      }
    }
  }

  return errors;
}

describe("calibration report", () => {
  const allErrors: ScenarioError[] = [];
  const results = new Map<string, ReferenceScenarioResult>();

  for (const scenario of ALL_REFERENCE_SCENARIOS) {
    const result = simulateReferenceScenario(scenario);
    results.set(scenario.id, result);
    allErrors.push(...collectErrors(scenario, result));
  }

  it("prints calibration summary", () => {
    const errorValues = allErrors.map((e) => e.errorPx);
    const sorted = [...errorValues].sort((a, b) => a - b);

    const mean = errorValues.length > 0
      ? errorValues.reduce((a, b) => a + b, 0) / errorValues.length
      : 0;
    const max = errorValues.length > 0 ? sorted[sorted.length - 1]! : 0;
    const p95idx = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
    const p95 = sorted.length > 0 ? sorted[p95idx]! : 0;

    const scenarioCount = ALL_REFERENCE_SCENARIOS.length;
    const passCount = ALL_REFERENCE_SCENARIOS.filter(
      (s) => !allErrors.some((e) => e.scenarioId === s.id),
    ).length;

    console.log("\n=== Billiards Calibration Report ===");
    console.log(`Scenarios: ${scenarioCount} total, ${passCount} clean, ${scenarioCount - passCount} with errors`);

    if (errorValues.length > 0) {
      console.log(`Errors: ${errorValues.length} total`);
      console.log(`  mean: ${mean.toFixed(1)} px`);
      console.log(`  p95:  ${p95.toFixed(1)} px`);
      console.log(`  max:  ${max.toFixed(1)} px`);
      console.log("\nPer-scenario breakdown:");
      for (const err of allErrors) {
        const rangeStr = [
          err.expected.min !== undefined ? `min=${err.expected.min.toFixed(0)}` : "",
          err.expected.max !== undefined ? `max=${err.expected.max.toFixed(0)}` : "",
        ].filter(Boolean).join(", ");
        console.log(
          `  ${err.scenarioId} | ${err.ballId}.${err.axis} @ ${err.atTime} | actual=${err.actual.toFixed(1)} [${rangeStr}] | err=${err.errorPx.toFixed(1)}px`,
        );
      }
    } else {
      console.log("All scenarios within tolerance!");
    }

    console.log("====================================\n");
  });

  it("has no errors exceeding 50px threshold", () => {
    const severe = allErrors.filter((e) => e.errorPx > 50);
    if (severe.length > 0) {
      const msg = severe
        .map((e) => `${e.scenarioId}/${e.ballId}.${e.axis}: ${e.errorPx.toFixed(1)}px`)
        .join("\n  ");
      expect.fail(`${severe.length} errors exceed 50px threshold:\n  ${msg}`);
    }
  });

  it("mean error stays below 20px", () => {
    const errorValues = allErrors.map((e) => e.errorPx);
    const mean = errorValues.length > 0
      ? errorValues.reduce((a, b) => a + b, 0) / errorValues.length
      : 0;
    expect(mean, `mean error ${mean.toFixed(1)}px exceeds 20px`).toBeLessThanOrEqual(20);
  });
});
