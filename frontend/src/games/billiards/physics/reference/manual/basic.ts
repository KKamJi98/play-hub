import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH, toPixels } from "../../../constants";
import { buildShotParams } from "../../shot";
import { Vec2 } from "../../vector";
import type { ReferenceScenario } from "../../referenceHarness";

const CENTER_Y = TABLE_HEIGHT / 2;

export const BASIC_REFERENCE_SCENARIOS: ReferenceScenario[] = [
  // ── Solo cue-ball: follow / draw / english ──────────────────────

  {
    id: "follow-pre-rail-medium",
    cueBallId: "white",
    durationSeconds: 0.4,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 50, new Vec2(0, -0.65), 0),
    source: { type: "manual", confidence: "high" },
    samples: [
      {
        t: 0.2,
        balls: [{ id: "white", x: { min: 525, max: 545 }, y: { min: CENTER_Y - 1, max: CENTER_Y + 1 } }],
      },
      {
        t: 0.4,
        balls: [{ id: "white", x: { min: 830, max: 850 }, y: { min: CENTER_Y - 1, max: CENTER_Y + 1 } }],
      },
    ],
    finalState: [{ id: "white", x: { min: 830, max: 850 } }],
  },
  {
    id: "follow-pre-rail-soft",
    cueBallId: "white",
    durationSeconds: 0.6,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 30, new Vec2(0, -0.65), 0),
    source: { type: "manual", confidence: "high" },
    samples: [
      {
        t: 0.3,
        balls: [{ id: "white", x: { min: 510, max: 535 } }],
      },
    ],
    finalState: [{ id: "white", x: { min: 800, max: 825 } }],
  },
  {
    id: "follow-pre-rail-hard",
    cueBallId: "white",
    durationSeconds: 0.8,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 80, new Vec2(0, -0.65), 0),
    source: { type: "manual", confidence: "medium" },
    finalState: [{ id: "white", x: { min: 210, max: 260 } }],
    expectFirstCushionHit: true,
  },

  {
    id: "draw-reversal-medium",
    cueBallId: "white",
    durationSeconds: 0.8,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 65, new Vec2(0, 0.65), 0),
    source: { type: "manual", confidence: "high" },
    samples: [
      {
        t: 0.4,
        balls: [{ id: "white", x: { min: 950, max: 975 } }],
      },
      {
        t: 0.8,
        balls: [{ id: "white", x: { min: 560, max: 620 } }],
      },
    ],
    finalState: [{ id: "white", x: { min: 560, max: 620 } }],
    expectReverseBeforeSeconds: 0.8,
  },
  {
    id: "draw-no-reverse-soft",
    cueBallId: "white",
    durationSeconds: 1.0,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 50, new Vec2(0, 0.65), 0),
    source: { type: "manual", confidence: "medium" },
    finalState: [{ id: "white", x: { min: 790, max: 820 } }],
  },
  {
    id: "draw-reversal-hard",
    cueBallId: "white",
    durationSeconds: 0.8,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 85, new Vec2(0, 0.65), 0),
    source: { type: "manual", confidence: "medium" },
    finalState: [{ id: "white", x: { max: 400 } }],
    expectReverseBeforeSeconds: 0.6,
  },

  {
    id: "right-english-rail",
    cueBallId: "white",
    durationSeconds: 0.8,
    layout: [{ id: "white", x: TABLE_WIDTH - 200, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 60, new Vec2(0.6, 0), 0),
    source: { type: "manual", confidence: "high" },
    finalState: [
      {
        id: "white",
        x: { min: 180, max: 220 },
        y: { min: CENTER_Y + toPixels(0.02), max: CENTER_Y + toPixels(0.06) },
      },
    ],
    expectFirstCushionHit: true,
  },
  {
    id: "left-english-rail",
    cueBallId: "white",
    durationSeconds: 0.8,
    layout: [{ id: "white", x: TABLE_WIDTH - 200, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 60, new Vec2(-0.6, 0), 0),
    source: { type: "manual", confidence: "high" },
    finalState: [
      {
        id: "white",
        x: { min: 180, max: 220 },
        y: { min: CENTER_Y - toPixels(0.06), max: CENTER_Y - toPixels(0.02) },
      },
    ],
    expectFirstCushionHit: true,
  },
  {
    id: "center-stun-straight",
    cueBallId: "white",
    durationSeconds: 0.6,
    layout: [{ id: "white", x: 220, y: CENTER_Y }],
    shot: buildShotParams(new Vec2(1, 0), 50, new Vec2(0, 0), 0),
    source: { type: "manual", confidence: "high" },
    samples: [
      {
        t: 0.3,
        balls: [{ id: "white", y: { min: CENTER_Y - 1, max: CENTER_Y + 1 } }],
      },
    ],
    finalState: [{ id: "white", y: { min: CENTER_Y - 1, max: CENTER_Y + 1 } }],
  },

  // ── Ball-ball collisions ────────────────────────────────────────

  {
    id: "thin-cut-object-ball",
    cueBallId: "white",
    durationSeconds: 0.5,
    layout: [
      { id: "white", x: 250, y: CENTER_Y },
      { id: "red1", x: 350, y: CENTER_Y - 12 },
      { id: "red2", x: 800, y: CENTER_Y + 70 },
      { id: "yellow", x: 860, y: CENTER_Y - 70 },
    ],
    shot: buildShotParams(new Vec2(1, 0), 55, new Vec2(0, 0), 0),
    source: { type: "manual", confidence: "high" },
    finalState: [{ id: "red1", y: { max: CENTER_Y - 12 - 1 } }],
    firstBallHitTargetId: "red1",
  },
  {
    id: "guide-contact-baseline",
    cueBallId: "white",
    durationSeconds: 0.2,
    layout: [
      { id: "white", x: 220, y: CENTER_Y },
      { id: "red1", x: 420, y: CENTER_Y },
      { id: "red2", x: 820, y: CENTER_Y },
      { id: "yellow", x: 820, y: CENTER_Y + BALL_RADIUS * 8 },
    ],
    shot: buildShotParams(new Vec2(1, 0), 55, new Vec2(0, 0), 0),
    source: { type: "manual", confidence: "high" },
    finalState: [{ id: "white", x: { min: 390, max: 410 } }],
    firstBallHitTargetId: "red1",
  },
  {
    id: "head-on-follow-through",
    cueBallId: "white",
    durationSeconds: 0.5,
    layout: [
      { id: "white", x: 250, y: CENTER_Y },
      { id: "red1", x: 500, y: CENTER_Y },
      { id: "red2", x: 820, y: CENTER_Y + 100 },
      { id: "yellow", x: 820, y: CENTER_Y - 100 },
    ],
    shot: buildShotParams(new Vec2(1, 0), 55, new Vec2(0, -0.65), 0),
    source: { type: "manual", confidence: "medium" },
    finalState: [
      { id: "white", x: { min: 500 } },
      { id: "red1", x: { min: 700 } },
    ],
    firstBallHitTargetId: "red1",
  },
  {
    id: "head-on-draw-back",
    cueBallId: "white",
    durationSeconds: 0.8,
    layout: [
      { id: "white", x: 250, y: CENTER_Y },
      { id: "red1", x: 500, y: CENTER_Y },
      { id: "red2", x: 820, y: CENTER_Y + 100 },
      { id: "yellow", x: 820, y: CENTER_Y - 100 },
    ],
    shot: buildShotParams(new Vec2(1, 0), 55, new Vec2(0, 0.65), 0),
    source: { type: "manual", confidence: "medium" },
    finalState: [
      { id: "white", x: { max: 420 } },
      { id: "red1", x: { min: 700 } },
    ],
    firstBallHitTargetId: "red1",
  },
  {
    id: "head-on-stun-stop",
    cueBallId: "white",
    durationSeconds: 0.5,
    layout: [
      { id: "white", x: 250, y: CENTER_Y },
      { id: "red1", x: 500, y: CENTER_Y },
      { id: "red2", x: 820, y: CENTER_Y + 100 },
      { id: "yellow", x: 820, y: CENTER_Y - 100 },
    ],
    shot: buildShotParams(new Vec2(1, 0), 55, new Vec2(0, 0), 0),
    source: { type: "manual", confidence: "high" },
    finalState: [
      { id: "white", x: { min: 460, max: 520 } },
      { id: "red1", x: { min: 700 } },
    ],
    firstBallHitTargetId: "red1",
  },
  {
    id: "cushion-first-english",
    cueBallId: "white",
    durationSeconds: 1.0,
    layout: [
      { id: "white", x: 250, y: CENTER_Y + 100 },
      { id: "red1", x: 500, y: CENTER_Y - 80 },
      { id: "red2", x: 800, y: CENTER_Y },
      { id: "yellow", x: 800, y: CENTER_Y + 150 },
    ],
    shot: buildShotParams(new Vec2(0, -1), 60, new Vec2(0.5, 0), 0),
    source: { type: "manual", confidence: "medium" },
    expectFirstCushionHit: true,
  },
];
