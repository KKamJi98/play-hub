import { useRef, useEffect, useCallback, useState } from "react";
import type { Ball } from "./physics/ball";
import { advanceSimulation, allStopped } from "./physics/engine";
import { Vec2 } from "./physics/vector";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  E_C,
  E_BB,
  MU_BB,
  R,
  M,
  MAX_SPIN_OMEGA,
} from "./constants";
import type { BallId } from "./constants";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";
import { useCoarsePointer } from "../../hooks/useCoarsePointer";

// ---- Props -----------------------------------------------------------------

interface Props {
  balls: Ball[];
  cueBallId: BallId;
  phase: "aiming" | "rolling" | "scoring" | "gameOver" | "setup";
  aimPower: number; // 0-100
  aimDirection: Vec2 | null;
  aimSpin: Vec2; // x = sidespin [-1,1], y = follow/draw [-1,1]
  onAimChange: (dir: Vec2 | null) => void;
  onPhysicsFrame: (
    balls: Ball[],
    frameHits: Set<BallId>,
    stopped: boolean,
  ) => void;
  disabled?: boolean; // true when it's opponent's turn in online mode
}

// ---- Constants for rendering -----------------------------------------------

const TOTAL_W = TABLE_WIDTH + CUSHION_WIDTH * 2;
const TOTAL_H = TABLE_HEIGHT + CUSHION_WIDTH * 2;

const FELT_COLOR = "#1b6e33";
const FELT_LIGHT = "#238541";
const RAIL_COLOR = "#5d3a1a";
const RAIL_DARK = "#3e2510";
const DIAMOND_COLOR = "#d4af37";

function cloneBalls(source: Ball[]): Ball[] {
  return source.map((ball) => ({
    ...ball,
    pos: new Vec2(ball.pos.x, ball.pos.y),
    vel: new Vec2(ball.vel.x, ball.vel.y),
    omega: { x: ball.omega.x, y: ball.omega.y, z: ball.omega.z },
  }));
}

// ---- Ray-circle intersection -----------------------------------------------

/**
 * Returns distance along ray to first intersection with a circle, or null if no hit.
 * `origin` and `dir` are in table pixel coordinates.
 * `center` is the circle center, `radius` is the effective radius (2*BALL_RADIUS for ball-ball).
 */
function rayCircleIntersect(
  origin: Vec2,
  dir: Vec2,
  center: Vec2,
  radius: number,
): number | null {
  const oc = origin.sub(center);
  const a = dir.dot(dir);
  const b = 2 * oc.dot(dir);
  const c = oc.dot(oc) - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);
  // We want the nearest positive intersection
  if (t1 > 0.001) return t1;
  if (t2 > 0.001) return t2;
  return null;
}

/**
 * Returns distance along ray to intersection with a cushion (axis-aligned edge).
 * Cushion edges are at x=0, x=TABLE_WIDTH, y=0, y=TABLE_HEIGHT.
 * Returns { dist, normal } or null.
 */
function rayCushionIntersect(
  origin: Vec2,
  dir: Vec2,
  ballRadius: number,
): { dist: number; normal: Vec2; point: Vec2 } | null {
  let bestDist = Infinity;
  let bestNormal: Vec2 | null = null;

  // Left wall: x = ballRadius
  if (dir.x < -0.0001) {
    const t = (ballRadius - origin.x) / dir.x;
    if (t > 0.001 && t < bestDist) {
      const y = origin.y + dir.y * t;
      if (y >= 0 && y <= TABLE_HEIGHT) {
        bestDist = t;
        bestNormal = new Vec2(1, 0);
      }
    }
  }
  // Right wall: x = TABLE_WIDTH - ballRadius
  if (dir.x > 0.0001) {
    const t = (TABLE_WIDTH - ballRadius - origin.x) / dir.x;
    if (t > 0.001 && t < bestDist) {
      const y = origin.y + dir.y * t;
      if (y >= 0 && y <= TABLE_HEIGHT) {
        bestDist = t;
        bestNormal = new Vec2(-1, 0);
      }
    }
  }
  // Top wall: y = ballRadius
  if (dir.y < -0.0001) {
    const t = (ballRadius - origin.y) / dir.y;
    if (t > 0.001 && t < bestDist) {
      const x = origin.x + dir.x * t;
      if (x >= 0 && x <= TABLE_WIDTH) {
        bestDist = t;
        bestNormal = new Vec2(0, 1);
      }
    }
  }
  // Bottom wall: y = TABLE_HEIGHT - ballRadius
  if (dir.y > 0.0001) {
    const t = (TABLE_HEIGHT - ballRadius - origin.y) / dir.y;
    if (t > 0.001 && t < bestDist) {
      const x = origin.x + dir.x * t;
      if (x >= 0 && x <= TABLE_WIDTH) {
        bestDist = t;
        bestNormal = new Vec2(0, -1);
      }
    }
  }

  if (bestNormal === null) return null;
  const point = origin.add(dir.scale(bestDist));
  return { dist: bestDist, normal: bestNormal, point };
}

// ---- Component -------------------------------------------------------------

export default function BilliardsCanvas({
  balls,
  cueBallId,
  phase,
  aimPower,
  aimDirection,
  aimSpin,
  onAimChange,
  onPhysicsFrame,
  disabled = false,
}: Props) {
  const { displayScale } = useDisplaySettings();
  const isCoarsePointer = useCoarsePointer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 450 });

  // Aiming state — dragging flag only (direction is external)
  const aimingRef = useRef(false);

  // Mutable balls for physics (engine mutates in place)
  const simBallsRef = useRef<Ball[]>([]);
  const propBallsRef = useRef<Ball[]>(balls);
  const phaseRef = useRef<Props["phase"]>(phase);
  const cueBallIdRef = useRef<BallId>(cueBallId);
  const aimPowerRef = useRef(aimPower);
  const aimDirectionRef = useRef<Vec2 | null>(aimDirection);
  const aimSpinRef = useRef<Vec2>(aimSpin);
  const onPhysicsFrameRef = useRef(onPhysicsFrame);

  // Scale factor: canvas pixels → internal units
  const scaleRef = useRef(1);
  const activePointerIdRef = useRef<number | null>(null);
  const simulationCarryRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    propBallsRef.current = balls;
  }, [balls]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    cueBallIdRef.current = cueBallId;
  }, [cueBallId]);

  useEffect(() => {
    aimPowerRef.current = aimPower;
  }, [aimPower]);

  useEffect(() => {
    aimDirectionRef.current = aimDirection;
  }, [aimDirection]);

  useEffect(() => {
    aimSpinRef.current = aimSpin;
  }, [aimSpin]);

  useEffect(() => {
    onPhysicsFrameRef.current = onPhysicsFrame;
  }, [onPhysicsFrame]);

  // ---- Responsive resize ---------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observe = () => {
      const rect = container.getBoundingClientRect();
      const aspectRatio = TOTAL_W / TOTAL_H;
      const maxW = rect.width;
      const maxCanvasWidth = Math.round(1240 * Math.min(Math.max(displayScale, 0.9), 1.15));
      const maxHeight = Math.max(280, rect.height > 100 ? rect.height : window.innerHeight * 0.72);
      const widthFromHeight = maxHeight * aspectRatio;
      const w = Math.max(280, Math.min(maxW, maxCanvasWidth, widthFromHeight));
      const h = w / aspectRatio;
      setCanvasSize({ w, h });
      scaleRef.current = w / TOTAL_W;
    };

    observe();
    const ro = new ResizeObserver(observe);
    ro.observe(container);
    return () => ro.disconnect();
  }, [displayScale]);

  // ---- Coordinate conversion -----------------------------------------------

  const canvasToTable = useCallback(
    (clientX: number, clientY: number): Vec2 => {
      const canvas = canvasRef.current;
      if (!canvas) return Vec2.zero();
      const rect = canvas.getBoundingClientRect();
      const s = scaleRef.current;
      const x = (clientX - rect.left) / s - CUSHION_WIDTH;
      const y = (clientY - rect.top) / s - CUSHION_WIDTH;
      return new Vec2(x, y);
    },
    [],
  );

  // ---- Clone balls into simulation buffer ----------------------------------

  useEffect(() => {
    if (phase === "rolling") {
      simBallsRef.current = cloneBalls(propBallsRef.current);
    } else {
      simBallsRef.current = [];
    }
    simulationCarryRef.current = 0;
    lastFrameTimeRef.current = null;
  }, [phase]);

  // ---- Mouse / touch handlers — direction only -----------------------------

  const getCueBall = useCallback((): Ball | undefined => {
    return propBallsRef.current.find((ball) => ball.id === cueBallIdRef.current);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "aiming" || disabled) return;
      const pt = canvasToTable(e.clientX, e.clientY);
      const cue = getCueBall();
      if (!cue) return;

      // Must click near cue ball to start aiming
      if (pt.distance(cue.pos) > cue.radius * (isCoarsePointer ? 7 : 4)) return;

      aimingRef.current = true;
      activePointerIdRef.current = e.pointerId;
      // Initial direction: from cue ball toward mouse
      const dir = pt.sub(cue.pos);
      if (dir.length() > 0.1) {
        onAimChange(cue.pos.sub(pt).normalize());
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [phase, disabled, canvasToTable, getCueBall, isCoarsePointer, onAimChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!aimingRef.current || activePointerIdRef.current !== e.pointerId) return;
      const pt = canvasToTable(e.clientX, e.clientY);
      const cue = getCueBall();
      if (!cue) return;
      // Direction: from mouse back toward cue ball (shoot opposite of drag)
      const dir = cue.pos.sub(pt);
      if (dir.length() > 0.1) {
        onAimChange(dir.normalize());
      }
    },
    [canvasToTable, getCueBall, onAimChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!aimingRef.current || activePointerIdRef.current !== e.pointerId) return;
    aimingRef.current = false;
    activePointerIdRef.current = null;
    // Direction stays set (aimDirection in parent) — user can adjust spin/power then fire
  }, []);

  // ---- Rolling timeout safety net ------------------------------------------

  const rollingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === "rolling") {
      rollingStartRef.current = performance.now();
    } else {
      rollingStartRef.current = null;
    }
  }, [phase]);

  // ---- Render & physics loop -----------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    const draw = (timestamp: number) => {
      const s = scaleRef.current;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = canvasSize.w * dpr;
      canvas.height = canvasSize.h * dpr;
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);

      // -- Physics step (only while rolling) --------------------------------
      const phase = phaseRef.current;
      const cueBallId = cueBallIdRef.current;
      const aimDirection = aimDirectionRef.current;
      const aimPower = aimPowerRef.current;

      let currentBalls = propBallsRef.current;
      if (phase === "rolling" && simBallsRef.current.length > 0) {
        const previousTimestamp = lastFrameTimeRef.current;
        const deltaSeconds =
          previousTimestamp === null
            ? 0
            : Math.min((timestamp - previousTimestamp) / 1000, 0.05);
        lastFrameTimeRef.current = timestamp;

        const result = advanceSimulation(
          simBallsRef.current,
          cueBallId,
          deltaSeconds,
          simulationCarryRef.current,
        );
        simulationCarryRef.current = result.carrySeconds;
        let stopped = allStopped(simBallsRef.current);

        // Safety: force stop after 10 seconds of rolling
        if (!stopped && rollingStartRef.current !== null) {
          const elapsed = performance.now() - rollingStartRef.current;
          if (elapsed > 10_000) {
            stopped = true;
          }
        }

        onPhysicsFrameRef.current(simBallsRef.current, result.cueBallHits, stopped);
        currentBalls = simBallsRef.current;
      } else {
        lastFrameTimeRef.current = timestamp;
        simulationCarryRef.current = 0;
      }

      // -- Draw table -------------------------------------------------------

      // Rail / border
      ctx.fillStyle = RAIL_COLOR;
      ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

      // Inner shadow on rail
      ctx.fillStyle = RAIL_DARK;
      ctx.fillRect(4, 4, TOTAL_W - 8, TOTAL_H - 8);
      ctx.fillStyle = RAIL_COLOR;
      ctx.fillRect(8, 8, TOTAL_W - 16, TOTAL_H - 16);

      // Felt
      ctx.fillStyle = FELT_COLOR;
      ctx.fillRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH, TABLE_HEIGHT);

      // Subtle felt pattern
      ctx.fillStyle = FELT_LIGHT;
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < TABLE_WIDTH; i += 40) {
        ctx.fillRect(CUSHION_WIDTH + i, CUSHION_WIDTH, 1, TABLE_HEIGHT);
      }
      ctx.globalAlpha = 1;

      // Diamonds on rails
      drawDiamonds(ctx);

      // Center line and spot
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(CUSHION_WIDTH + TABLE_WIDTH / 2, CUSHION_WIDTH);
      ctx.lineTo(CUSHION_WIDTH + TABLE_WIDTH / 2, CUSHION_WIDTH + TABLE_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // -- Draw balls -------------------------------------------------------
      for (const ball of currentBalls) {
        drawBall(ctx, ball);
      }

      // -- Aiming guide (visible when aimDirection is set, even after drag ends)
      if (phase === "aiming" && aimDirection) {
        const cue = currentBalls.find((b) => b.id === cueBallId);
        if (cue) {
          const spin = aimSpinRef.current;
          drawAimGuide(ctx, cue, aimDirection, currentBalls, cueBallId, spin, aimPower);
          drawSpinIndicator(ctx, cue, spin);
          drawCueStick(ctx, cue, aimDirection, aimPower);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasSize]);

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize.w,
          height: canvasSize.h,
          cursor: phase === "aiming" && !disabled ? "crosshair" : "default",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="touch-drag-surface rounded-[28px] shadow-2xl"
      />
    </div>
  );
}

// ---- Drawing helpers -------------------------------------------------------

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  const { pos, radius, color } = ball;
  const cx = CUSHION_WIDTH + pos.x;
  const cy = CUSHION_WIDTH + pos.y;

  // Shadow
  ctx.beginPath();
  ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  // Ball body with gradient
  const grad = ctx.createRadialGradient(
    cx - radius * 0.3,
    cy - radius * 0.3,
    radius * 0.1,
    cx,
    cy,
    radius,
  );
  grad.addColorStop(0, lightenColor(color, 60));
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, darkenColor(color, 40));

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Specular highlight
  ctx.beginPath();
  ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill();
}

// ---- Physics-based guide helpers -------------------------------------------

/**
 * Compute cushion reflection with restitution and sidespin english effect.
 * Returns the reflected direction vector (not normalized).
 */
function guideCushionReflect(
  dir: Vec2,
  _speed: number,
  normal: Vec2,
  omegaZ: number,
): Vec2 {
  const tangent = normal.perp();
  const vn = dir.dot(normal);
  const vt = dir.dot(tangent);

  // Restitution on normal component
  const vnNew = -E_C * vn;
  // Sidespin english shifts tangential velocity
  const englishShift = (2 / 7) * R * omegaZ;
  const vtNew = (5 / 7) * vt + englishShift;

  return normal.scale(vnNew).add(tangent.scale(vtNew));
}

/**
 * Compute ball-ball deflection directions using impulse-based physics.
 * Returns { targetDir, cueDir } as normalized direction vectors.
 */
function guideBallBallDeflection(
  cueDir: Vec2,
  _speed: number,
  contactNormal: Vec2,
): { targetDir: Vec2; cueDir: Vec2 } {
  // Incoming cue velocity along normal and tangent
  const velAlongNormal = cueDir.dot(contactNormal);
  const tangent = contactNormal.perp();
  const velAlongTangent = cueDir.dot(tangent);

  // Normal impulse (equal masses): each ball gets half the impulse transfer
  const Jn = -(1 + E_BB) * velAlongNormal * (M / 2);
  // Tangential friction impulse
  const relTangentVel = velAlongTangent;
  const desiredJt = -(M / 7) * relTangentVel;
  const maxJt = MU_BB * Math.abs(Jn);
  const Jt = Math.max(-maxJt, Math.min(maxJt, desiredJt));

  // Cue ball post-collision velocity
  const cueVelAfter = cueDir
    .add(contactNormal.scale(Jn / M))
    .add(tangent.scale(Jt / M));

  // Target ball post-collision velocity
  const targetVelAfter = contactNormal
    .scale(-Jn / M)
    .add(tangent.scale(-Jt / M));

  const cLen = cueVelAfter.length();
  const tLen = targetVelAfter.length();

  return {
    targetDir: tLen > 0.001 ? targetVelAfter.scale(1 / tLen) : contactNormal,
    cueDir: cLen > 0.001 ? cueVelAfter.scale(1 / cLen) : Vec2.zero(),
  };
}

/**
 * Ghost ball aiming guide with ray-cast collision detection.
 * Uses physics-based deflection and cushion reflection.
 */
function drawAimGuide(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  direction: Vec2,
  allBalls: Ball[],
  cueBallId: BallId,
  aimSpin: Vec2,
  aimPower: number,
) {
  const origin = cue.pos;
  const dir = direction.normalize();

  // Compute omegaZ from sidespin for english effect
  const omegaZ = aimSpin.x * MAX_SPIN_OMEGA;
  // Normalized speed for guide calculations (0-1 range)
  const speed = aimPower / 100;

  // Find closest intersection: balls or cushion
  let closestBallDist = Infinity;
  let hitBall: Ball | null = null;

  for (const ball of allBalls) {
    if (ball.id === cueBallId) continue;
    const t = rayCircleIntersect(origin, dir, ball.pos, cue.radius + ball.radius);
    if (t !== null && t < closestBallDist) {
      closestBallDist = t;
      hitBall = ball;
    }
  }

  const cushionHit = rayCushionIntersect(origin, dir, cue.radius);
  const cushionDist = cushionHit ? cushionHit.dist : Infinity;

  const cx = CUSHION_WIDTH;
  const cy = CUSHION_WIDTH;

  ctx.save();

  if (hitBall && closestBallDist < cushionDist) {
    // --- Hitting a ball first ---
    const ghostPos = origin.add(dir.scale(closestBallDist));

    // Primary aim line
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + origin.x, cy + origin.y);
    ctx.lineTo(cx + ghostPos.x, cy + ghostPos.y);
    ctx.stroke();

    // Ghost ball outline
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + ghostPos.x, cy + ghostPos.y, cue.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Contact normal: from ghost ball center → target ball center
    const contactNormal = hitBall.pos.sub(ghostPos).normalize();

    // Physics-based deflection
    const defl = guideBallBallDeflection(dir, speed, contactNormal);

    // Target ball deflection line
    const targetDeflLen = 120;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx + hitBall.pos.x, cy + hitBall.pos.y);
    ctx.lineTo(
      cx + hitBall.pos.x + defl.targetDir.x * targetDeflLen,
      cy + hitBall.pos.y + defl.targetDir.y * targetDeflLen,
    );
    ctx.stroke();

    // Cue ball deflection after collision
    const cueDeflLen = defl.cueDir.length() > 0.01 ? 80 : 0;
    if (cueDeflLen > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + ghostPos.x, cy + ghostPos.y);
      ctx.lineTo(
        cx + ghostPos.x + defl.cueDir.x * cueDeflLen,
        cy + ghostPos.y + defl.cueDir.y * cueDeflLen,
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
  } else if (cushionHit) {
    // --- Hitting a cushion first ---
    const hitPoint = cushionHit.point;

    // Primary aim line
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + origin.x, cy + origin.y);
    ctx.lineTo(cx + hitPoint.x, cy + hitPoint.y);
    ctx.stroke();

    // Physics-based cushion reflection with english
    const reflected = guideCushionReflect(dir, speed, cushionHit.normal, omegaZ);
    const reflectedNorm = reflected.length() > 0.001 ? reflected.scale(1 / reflected.length()) : dir.reflect(cushionHit.normal);
    const reflectLen = 100;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx + hitPoint.x, cy + hitPoint.y);
    ctx.lineTo(
      cx + hitPoint.x + reflectedNorm.x * reflectLen,
      cy + hitPoint.y + reflectedNorm.y * reflectLen,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // No hit detected — draw a long aim line
    const lineLen = 500;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx + origin.x, cy + origin.y);
    ctx.lineTo(cx + origin.x + dir.x * lineLen, cy + origin.y + dir.y * lineLen);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw follow/draw chevrons on the aim line
  if (Math.abs(aimSpin.y) > 0.05) {
    drawFollowDrawChevrons(ctx, origin, dir, aimSpin.y, closestBallDist < cushionDist ? closestBallDist : (cushionHit ? cushionDist : 300));
  }

  ctx.restore();
}

/**
 * Draw chevron arrows along the aim line to indicate follow (forward) or draw (backward) spin.
 */
function drawFollowDrawChevrons(
  ctx: CanvasRenderingContext2D,
  origin: Vec2,
  dir: Vec2,
  spinY: number,
  maxDist: number,
) {
  const cx = CUSHION_WIDTH;
  const cy = CUSHION_WIDTH;
  const isFollow = spinY > 0;
  const intensity = Math.abs(spinY);
  const chevronCount = Math.ceil(intensity * 3); // 1-3 chevrons
  const spacing = Math.min(40, maxDist / (chevronCount + 2));
  const startOffset = 30;

  ctx.strokeStyle = isFollow ? "rgba(0,240,255,0.5)" : "rgba(255,100,60,0.5)";
  ctx.lineWidth = 1.5;

  // Perpendicular to aim direction
  const perp = dir.perp();
  const chevronSize = 6;

  for (let i = 0; i < chevronCount; i++) {
    const dist = startOffset + i * spacing;
    if (dist >= maxDist - 10) break;

    const center = origin.add(dir.scale(dist));
    const tip = isFollow
      ? center.add(dir.scale(chevronSize))
      : center.sub(dir.scale(chevronSize));
    const left = center.sub(perp.scale(chevronSize));
    const right = center.add(perp.scale(chevronSize));

    ctx.beginPath();
    ctx.moveTo(cx + left.x, cy + left.y);
    ctx.lineTo(cx + tip.x, cy + tip.y);
    ctx.lineTo(cx + right.x, cy + right.y);
    ctx.stroke();
  }
}

/**
 * Draw spin indicator around the cue ball:
 * - Sidespin (spin.x): arc arrow around the ball
 */
function drawSpinIndicator(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  spin: Vec2,
) {
  const cx = CUSHION_WIDTH + cue.pos.x;
  const cy = CUSHION_WIDTH + cue.pos.y;
  const indicatorRadius = cue.radius + 6;

  ctx.save();

  // Sidespin arc arrow
  if (Math.abs(spin.x) > 0.05) {
    const intensity = Math.abs(spin.x);
    const arcLen = intensity * Math.PI * 0.8; // up to ~144 degrees
    const startAngle = -Math.PI / 2 - arcLen / 2;
    const endAngle = -Math.PI / 2 + arcLen / 2;
    const clockwise = spin.x > 0; // positive = right english

    ctx.strokeStyle = `rgba(0,240,255,${0.3 + intensity * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (clockwise) {
      ctx.arc(cx, cy, indicatorRadius, startAngle, endAngle, false);
    } else {
      ctx.arc(cx, cy, indicatorRadius, endAngle, startAngle, true);
    }
    ctx.stroke();

    // Arrowhead at the end of the arc
    const arrowAngle = clockwise ? endAngle : startAngle;
    const arrowX = cx + Math.cos(arrowAngle) * indicatorRadius;
    const arrowY = cy + Math.sin(arrowAngle) * indicatorRadius;
    const tangentAngle = arrowAngle + (clockwise ? Math.PI / 2 : -Math.PI / 2);
    const arrowSize = 5;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX + Math.cos(tangentAngle + 0.5) * arrowSize,
      arrowY + Math.sin(tangentAngle + 0.5) * arrowSize,
    );
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX + Math.cos(tangentAngle - 0.5) * arrowSize,
      arrowY + Math.sin(tangentAngle - 0.5) * arrowSize,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawCueStick(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  direction: Vec2,
  power: number,
) {
  // Cue stick is behind the cue ball, opposite to aim direction
  const backDir = direction.scale(-1);

  // Pull-back distance scales with power (0-100)
  const pullBack = (power / 100) * 60 + 8; // 8 to 68 pixels pull-back

  const cx = CUSHION_WIDTH + cue.pos.x;
  const cy = CUSHION_WIDTH + cue.pos.y;

  const stickStart = new Vec2(
    cx + backDir.x * (cue.radius + 4 + pullBack),
    cy + backDir.y * (cue.radius + 4 + pullBack),
  );
  const stickEnd = new Vec2(
    stickStart.x + backDir.x * 180,
    stickStart.y + backDir.y * 180,
  );

  ctx.save();
  // Stick body
  ctx.strokeStyle = "#c4883a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(stickStart.x, stickStart.y);
  ctx.lineTo(stickEnd.x, stickEnd.y);
  ctx.stroke();

  // Tip
  ctx.strokeStyle = "#efe8d8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(stickStart.x, stickStart.y);
  ctx.lineTo(
    stickStart.x + backDir.x * 12,
    stickStart.y + backDir.y * 12,
  );
  ctx.stroke();
  ctx.restore();
}

function drawDiamonds(ctx: CanvasRenderingContext2D) {
  const size = 4;
  ctx.fillStyle = DIAMOND_COLOR;

  // Top and bottom edges
  for (let i = 1; i < 8; i++) {
    const x = CUSHION_WIDTH + (TABLE_WIDTH / 8) * i;
    // Top
    ctx.beginPath();
    ctx.arc(x, CUSHION_WIDTH / 2, size, 0, Math.PI * 2);
    ctx.fill();
    // Bottom
    ctx.beginPath();
    ctx.arc(x, CUSHION_WIDTH + TABLE_HEIGHT + CUSHION_WIDTH / 2, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Left and right edges
  for (let i = 1; i < 4; i++) {
    const y = CUSHION_WIDTH + (TABLE_HEIGHT / 4) * i;
    // Left
    ctx.beginPath();
    ctx.arc(CUSHION_WIDTH / 2, y, size, 0, Math.PI * 2);
    ctx.fill();
    // Right
    ctx.beginPath();
    ctx.arc(CUSHION_WIDTH + TABLE_WIDTH + CUSHION_WIDTH / 2, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Color helpers ---------------------------------------------------------

function lightenColor(hex: string, amount: number): string {
  return adjustColor(hex, amount);
}

function darkenColor(hex: string, amount: number): string {
  return adjustColor(hex, -amount);
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
