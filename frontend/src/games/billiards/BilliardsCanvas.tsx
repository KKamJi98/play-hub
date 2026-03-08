import { useRef, useEffect, useCallback, useState } from "react";
import type { Ball } from "./physics/ball";
import { step, allStopped } from "./physics/engine";
import { Vec2 } from "./physics/vector";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  MAX_POWER,
} from "./constants";
import type { BallId } from "./constants";

// ---- Props -----------------------------------------------------------------

interface Props {
  balls: Ball[];
  cueBallId: BallId;
  phase: "aiming" | "rolling" | "scoring" | "gameOver" | "setup";
  onShoot: (direction: Vec2, power: number) => void;
  onPhysicsFrame: (
    balls: Ball[],
    frameHits: Set<BallId>,
    stopped: boolean,
  ) => void;
}

// ---- Constants for rendering -----------------------------------------------

const TOTAL_W = TABLE_WIDTH + CUSHION_WIDTH * 2;
const TOTAL_H = TABLE_HEIGHT + CUSHION_WIDTH * 2;

const FELT_COLOR = "#1b6e33";
const FELT_LIGHT = "#238541";
const RAIL_COLOR = "#5d3a1a";
const RAIL_DARK = "#3e2510";
const DIAMOND_COLOR = "#d4af37";

// ---- Component -------------------------------------------------------------

export default function BilliardsCanvas({
  balls,
  cueBallId,
  phase,
  onShoot,
  onPhysicsFrame,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 450 });

  // Aiming state
  const aimingRef = useRef(false);
  const aimStartRef = useRef<Vec2 | null>(null);
  const aimCurrentRef = useRef<Vec2 | null>(null);

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
        spin: new Vec2(b.spin.x, b.spin.y),
      }));
    }
  }, [phase, balls]);

  // ---- Mouse / touch handlers ----------------------------------------------

  const getCueBall = useCallback((): Ball | undefined => {
    return balls.find((b) => b.id === cueBallId);
  }, [balls, cueBallId]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (phase !== "aiming") return;
      const pt = canvasToTable(e.clientX, e.clientY);
      const cue = getCueBall();
      if (!cue) return;

      // Must click near cue ball to start aiming
      if (pt.distance(cue.pos) > cue.radius * 4) return;

      aimingRef.current = true;
      aimStartRef.current = pt;
      aimCurrentRef.current = pt;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [phase, canvasToTable, getCueBall],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!aimingRef.current) return;
      aimCurrentRef.current = canvasToTable(e.clientX, e.clientY);
    },
    [canvasToTable],
  );

  const handlePointerUp = useCallback(() => {
    if (!aimingRef.current) return;
    aimingRef.current = false;

    const start = aimStartRef.current;
    const current = aimCurrentRef.current;
    const cue = getCueBall();
    if (!start || !current || !cue) return;

    // Direction: from mouse back to cue ball (shoot opposite of drag)
    const dragVec = current.sub(cue.pos);
    const power = Math.min(dragVec.length() / 20, MAX_POWER);

    if (power < 0.5) {
      // Too weak, cancel
      aimStartRef.current = null;
      aimCurrentRef.current = null;
      return;
    }

    // Shot direction is opposite of the drag direction
    const direction = cue.pos.sub(current).normalize();

    aimStartRef.current = null;
    aimCurrentRef.current = null;

    onShoot(direction, power);
  }, [getCueBall, onShoot]);

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
      if (phase === "aiming" && aimingRef.current && aimCurrentRef.current) {
        const cue = currentBalls.find((b) => b.id === cueBallId);
        if (cue) {
          drawAimGuide(ctx, cue, aimCurrentRef.current);
          drawCueStick(ctx, cue, aimCurrentRef.current);
          drawPowerGauge(ctx, cue, aimCurrentRef.current);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasSize, balls, phase, cueBallId, onPhysicsFrame]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, cursor: phase === "aiming" ? "crosshair" : "default" }}
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

function drawAimGuide(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  mousePos: Vec2,
) {
  const direction = cue.pos.sub(mousePos).normalize();
  const cx = CUSHION_WIDTH + cue.pos.x;
  const cy = CUSHION_WIDTH + cue.pos.y;
  const endX = cx + direction.x * 300;
  const endY = cy + direction.y * 300;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCueStick(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  mousePos: Vec2,
) {
  const dragVec = mousePos.sub(cue.pos);
  const power = Math.min(dragVec.length() / 20, MAX_POWER);
  const pullBack = power * 8; // visual pull-back distance

  // Direction from mouse to cue ball (stick sits behind)
  const direction = mousePos.sub(cue.pos).normalize();

  const cx = CUSHION_WIDTH + cue.pos.x;
  const cy = CUSHION_WIDTH + cue.pos.y;

  const stickStart = new Vec2(
    cx + direction.x * (cue.radius + 4 + pullBack),
    cy + direction.y * (cue.radius + 4 + pullBack),
  );
  const stickEnd = new Vec2(
    stickStart.x + direction.x * 180,
    stickStart.y + direction.y * 180,
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
    stickStart.x + direction.x * 12,
    stickStart.y + direction.y * 12,
  );
  ctx.stroke();
  ctx.restore();
}

function drawPowerGauge(
  ctx: CanvasRenderingContext2D,
  cue: Ball,
  mousePos: Vec2,
) {
  const dragVec = mousePos.sub(cue.pos);
  const power = Math.min(dragVec.length() / 20, MAX_POWER);
  const ratio = power / MAX_POWER;

  // Draw a small bar near the cue ball
  const barX = CUSHION_WIDTH + cue.pos.x - 25;
  const barY = CUSHION_WIDTH + cue.pos.y - cue.radius - 18;
  const barW = 50;
  const barH = 6;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  // Gradient from green to red
  const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  grad.addColorStop(0, "#4caf50");
  grad.addColorStop(0.5, "#ff9800");
  grad.addColorStop(1, "#f44336");
  ctx.fillStyle = grad;
  ctx.fillRect(barX, barY, barW * ratio, barH);
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
