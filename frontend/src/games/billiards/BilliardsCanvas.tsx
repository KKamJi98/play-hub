import { useRef, useEffect, useCallback, useState } from "react";
import type { Ball } from "./physics/ball";
import { step, allStopped } from "./physics/engine";
import { Vec2 } from "./physics/vector";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
} from "./constants";
import type { BallId } from "./constants";

// ---- Props -----------------------------------------------------------------

interface Props {
  balls: Ball[];
  cueBallId: BallId;
  phase: "aiming" | "rolling" | "scoring" | "gameOver" | "setup";
  aimPower: number; // 0-100
  onShoot: (direction: Vec2, power: number) => void;
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
  onShoot,
  onPhysicsFrame,
  disabled = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 450 });

  // Aiming state — direction only (no power from drag)
  const aimingRef = useRef(false);
  const aimDirectionRef = useRef<Vec2 | null>(null);

  // Mutable balls for physics (engine mutates in place)
  const simBallsRef = useRef<Ball[]>([]);

  // Scale factor: canvas pixels → internal units
  const scaleRef = useRef(1);

  // ---- Responsive resize ---------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observe = () => {
      const rect = container.getBoundingClientRect();
      const maxW = rect.width;
      const aspectRatio = TOTAL_W / TOTAL_H;
      const w = Math.min(maxW, 1024);
      const h = w / aspectRatio;
      setCanvasSize({ w, h });
      scaleRef.current = w / TOTAL_W;
    };

    observe();
    const ro = new ResizeObserver(observe);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

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
      // Deep-clone state balls for mutable simulation
      simBallsRef.current = balls.map((b) => ({
        ...b,
        pos: new Vec2(b.pos.x, b.pos.y),
        vel: new Vec2(b.vel.x, b.vel.y),
        omega: { x: b.omega.x, y: b.omega.y, z: b.omega.z },
      }));
    }
  }, [phase, balls]);

  // ---- Mouse / touch handlers — direction only -----------------------------

  const getCueBall = useCallback((): Ball | undefined => {
    return balls.find((b) => b.id === cueBallId);
  }, [balls, cueBallId]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "aiming" || disabled) return;
      const pt = canvasToTable(e.clientX, e.clientY);
      const cue = getCueBall();
      if (!cue) return;

      // Must click near cue ball to start aiming
      if (pt.distance(cue.pos) > cue.radius * 4) return;

      aimingRef.current = true;
      // Initial direction: from cue ball toward mouse
      const dir = pt.sub(cue.pos);
      if (dir.length() > 0.1) {
        aimDirectionRef.current = cue.pos.sub(pt).normalize();
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [phase, disabled, canvasToTable, getCueBall],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!aimingRef.current) return;
      const pt = canvasToTable(e.clientX, e.clientY);
      const cue = getCueBall();
      if (!cue) return;
      // Direction: from mouse back toward cue ball (shoot opposite of drag)
      const dir = cue.pos.sub(pt);
      if (dir.length() > 0.1) {
        aimDirectionRef.current = dir.normalize();
      }
    },
    [canvasToTable, getCueBall],
  );

  const handlePointerUp = useCallback(() => {
    if (!aimingRef.current) return;
    aimingRef.current = false;

    const direction = aimDirectionRef.current;
    if (!direction) {
      aimDirectionRef.current = null;
      return;
    }

    aimDirectionRef.current = null;

    // Fire shot using external power value
    onShoot(direction, aimPower);
  }, [onShoot, aimPower]);

  // ---- Render & physics loop -----------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;

    const draw = () => {
      const s = scaleRef.current;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = canvasSize.w * dpr;
      canvas.height = canvasSize.h * dpr;
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);

      // -- Physics step (only while rolling) --------------------------------
      let currentBalls = balls;
      if (phase === "rolling" && simBallsRef.current.length > 0) {
        const result = step(simBallsRef.current, cueBallId);
        const stopped = allStopped(simBallsRef.current);
        onPhysicsFrame(simBallsRef.current, result.cueBallHits, stopped);
        currentBalls = simBallsRef.current;
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

      // -- Aiming guide ----------------------------------------------------
      if (phase === "aiming" && aimingRef.current && aimDirectionRef.current) {
        const cue = currentBalls.find((b) => b.id === cueBallId);
        if (cue) {
          const dir = aimDirectionRef.current;
          drawAimGuide(ctx, cue, dir, currentBalls, cueBallId);
          drawCueStick(ctx, cue, dir, aimPower);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasSize, balls, phase, cueBallId, aimPower, onPhysicsFrame]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, cursor: phase === "aiming" && !disabled ? "crosshair" : "default" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="rounded-lg shadow-2xl"
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

/**
 * Ghost ball aiming guide with ray-cast collision detection.
 */
function drawAimGuide(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  direction: Vec2,
  allBalls: Ball[],
  cueBallId: BallId,
) {
  const origin = cue.pos;
  const dir = direction.normalize();

  // Find closest intersection: balls or cushion
  let closestBallDist = Infinity;
  let hitBall: Ball | null = null;

  for (const ball of allBalls) {
    if (ball.id === cueBallId) continue;
    // Ray-circle with effective radius = 2 * ball radius (ghost ball method)
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

    // Primary aim line: cue ball center → ghost ball position
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

    // Target ball deflection line (along contact normal)
    const targetDeflLen = 120;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx + hitBall.pos.x, cy + hitBall.pos.y);
    ctx.lineTo(
      cx + hitBall.pos.x + contactNormal.x * targetDeflLen,
      cy + hitBall.pos.y + contactNormal.y * targetDeflLen,
    );
    ctx.stroke();

    // Cue ball deflection after collision (perpendicular to contact normal, simplified)
    const cueDirAfter = dir.sub(contactNormal.scale(dir.dot(contactNormal)));
    const cueDeflLen = cueDirAfter.length() > 0.01 ? 80 : 0;
    if (cueDeflLen > 0) {
      const cueDeflDir = cueDirAfter.normalize();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + ghostPos.x, cy + ghostPos.y);
      ctx.lineTo(
        cx + ghostPos.x + cueDeflDir.x * cueDeflLen,
        cy + ghostPos.y + cueDeflDir.y * cueDeflLen,
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
  } else if (cushionHit) {
    // --- Hitting a cushion first ---
    const hitPoint = cushionHit.point;

    // Primary aim line: cue ball → cushion hit
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + origin.x, cy + origin.y);
    ctx.lineTo(cx + hitPoint.x, cy + hitPoint.y);
    ctx.stroke();

    // Reflection direction (angle of incidence = angle of reflection)
    const reflected = dir.reflect(cushionHit.normal);
    const reflectLen = 100;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx + hitPoint.x, cy + hitPoint.y);
    ctx.lineTo(
      cx + hitPoint.x + reflected.x * reflectLen,
      cy + hitPoint.y + reflected.y * reflectLen,
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
