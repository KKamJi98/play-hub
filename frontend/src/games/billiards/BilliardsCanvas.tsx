import { useCallback, useEffect, useRef, useState } from "react";
import type { Ball } from "./physics/ball";
import {
  approximateFrictionVector,
  clothContactVelocity,
} from "./physics/contact";
import { advanceSimulation, allStopped } from "./physics/engine";
import { simulateGuideTrace } from "./physics/guide";
import { buildShotParams } from "./physics/shot";
import { Vec2 } from "./physics/vector";
import {
  CUSHION_WIDTH,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from "./constants";
import type { BallId } from "./constants";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";
import { useCoarsePointer } from "../../hooks/useCoarsePointer";

interface Props {
  balls: Ball[];
  cueBallId: BallId;
  phase: "aiming" | "rolling" | "scoring" | "gameOver" | "setup";
  aimPower: number;
  aimDirection: Vec2 | null;
  aimSpin: Vec2;
  aimElevationDeg: number;
  showDebugOverlay?: boolean;
  onAimChange: (dir: Vec2 | null) => void;
  onPhysicsFrame: (balls: Ball[], frameHits: Set<BallId>, stopped: boolean) => void;
  disabled?: boolean;
}

const TOTAL_W = TABLE_WIDTH + CUSHION_WIDTH * 2;
const TOTAL_H = TABLE_HEIGHT + CUSHION_WIDTH * 2;
const FELT = "#1b6e33";
const RAIL = "#5d3a1a";
const RAIL_DARK = "#3e2510";
const LINE = "rgba(255,255,255,0.15)";

function cloneBalls(source: Ball[]): Ball[] {
  return source.map((ball) => ({
    ...ball,
    pos: new Vec2(ball.pos.x, ball.pos.y),
    vel: new Vec2(ball.vel.x, ball.vel.y),
    omega: { x: ball.omega.x, y: ball.omega.y, z: ball.omega.z },
  }));
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
  const cx = CUSHION_WIDTH + ball.pos.x;
  const cy = CUSHION_WIDTH + ball.pos.y;
  const grad = ctx.createRadialGradient(
    cx - ball.radius * 0.25,
    cy - ball.radius * 0.25,
    ball.radius * 0.2,
    cx,
    cy,
    ball.radius,
  );
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.4, ball.color);
  grad.addColorStop(1, "rgba(0,0,0,0.35)");

  ctx.beginPath();
  ctx.arc(cx, cy, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - ball.radius * 0.28, cy - ball.radius * 0.28, ball.radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();
}

function drawCueStick(
  ctx: CanvasRenderingContext2D,
  cueBall: Ball,
  direction: Vec2,
  power: number,
  elevationDeg: number,
): void {
  const origin = new Vec2(CUSHION_WIDTH + cueBall.pos.x, CUSHION_WIDTH + cueBall.pos.y);
  const back = direction.scale(-1);
  const pullBack = 14 + power * 0.55;
  const shaftStart = origin.add(back.scale(cueBall.radius + pullBack));
  const shaftEnd = shaftStart.add(back.scale(180));

  ctx.save();
  ctx.strokeStyle = "#c58b3d";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(shaftStart.x, shaftStart.y);
  ctx.lineTo(shaftEnd.x, shaftEnd.y);
  ctx.stroke();

  ctx.strokeStyle = "#f0e7d2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(shaftStart.x, shaftStart.y);
  ctx.lineTo(
    shaftStart.x + back.x * 14,
    shaftStart.y + back.y * 14,
  );
  ctx.stroke();

  if (elevationDeg > 0.1) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px monospace";
    ctx.fillText(`elev ${elevationDeg.toFixed(0)}°`, shaftStart.x + 12, shaftStart.y - 10);
  }

  ctx.restore();
}

function drawGuideTrace(
  ctx: CanvasRenderingContext2D,
  trace: ReturnType<typeof simulateGuideTrace>,
): void {
  if (trace.cuePath.length < 2) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  trace.cuePath.forEach((point, index) => {
    const x = CUSHION_WIDTH + point.x;
    const y = CUSHION_WIDTH + point.y;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  if (trace.firstBallHit) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(
      CUSHION_WIDTH + trace.firstBallHit.point.x,
      CUSHION_WIDTH + trace.firstBallHit.point.y,
      5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  if (trace.firstCushionHit) {
    const point = trace.firstCushionHit.point;
    const normal = trace.firstCushionHit.normal;
    ctx.strokeStyle = "rgba(0,240,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CUSHION_WIDTH + point.x, CUSHION_WIDTH + point.y);
    ctx.lineTo(
      CUSHION_WIDTH + point.x + normal.x * 18,
      CUSHION_WIDTH + point.y + normal.y * 18,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawDebugVector(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  vector: Vec2,
  color: string,
  scale: number,
): void {
  if (vector.length() < 0.001) return;

  const end = start.add(vector.scale(scale));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(CUSHION_WIDTH + start.x, CUSHION_WIDTH + start.y);
  ctx.lineTo(CUSHION_WIDTH + end.x, CUSHION_WIDTH + end.y);
  ctx.stroke();
}

function drawDebugOverlay(ctx: CanvasRenderingContext2D, balls: Ball[]): void {
  balls.forEach((ball) => {
    const omegaVector = new Vec2(ball.omega.y, -ball.omega.x);
    drawDebugVector(ctx, ball.pos, ball.vel, "rgba(80,180,255,0.8)", 70);
    drawDebugVector(ctx, ball.pos, clothContactVelocity(ball), "rgba(40,220,120,0.75)", 32);
    drawDebugVector(ctx, ball.pos, approximateFrictionVector(ball, true), "rgba(255,180,60,0.75)", 3.5);
    drawDebugVector(ctx, ball.pos, omegaVector, "rgba(255,90,90,0.75)", 0.7);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "10px monospace";
    ctx.fillText(
      `${ball.phase} z:${ball.omega.z.toFixed(1)}`,
      CUSHION_WIDTH + ball.pos.x + 12,
      CUSHION_WIDTH + ball.pos.y - 12,
    );
  });
}

export default function BilliardsCanvas({
  balls,
  cueBallId,
  phase,
  aimPower,
  aimDirection,
  aimSpin,
  aimElevationDeg,
  showDebugOverlay = false,
  onAimChange,
  onPhysicsFrame,
  disabled = false,
}: Props) {
  const { displayScale } = useDisplaySettings();
  const isCoarsePointer = useCoarsePointer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 920, h: 490 });

  const aimingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const scaleRef = useRef(1);
  const simBallsRef = useRef<Ball[]>([]);
  const propBallsRef = useRef<Ball[]>(balls);
  const phaseRef = useRef(phase);
  const cueBallIdRef = useRef(cueBallId);
  const aimPowerRef = useRef(aimPower);
  const aimDirectionRef = useRef<Vec2 | null>(aimDirection);
  const aimSpinRef = useRef(aimSpin);
  const aimElevationRef = useRef(aimElevationDeg);
  const onPhysicsFrameRef = useRef(onPhysicsFrame);
  const simulationCarryRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const rollingStartRef = useRef<number | null>(null);

  useEffect(() => { propBallsRef.current = balls; }, [balls]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { cueBallIdRef.current = cueBallId; }, [cueBallId]);
  useEffect(() => { aimPowerRef.current = aimPower; }, [aimPower]);
  useEffect(() => { aimDirectionRef.current = aimDirection; }, [aimDirection]);
  useEffect(() => { aimSpinRef.current = aimSpin; }, [aimSpin]);
  useEffect(() => { aimElevationRef.current = aimElevationDeg; }, [aimElevationDeg]);
  useEffect(() => { onPhysicsFrameRef.current = onPhysicsFrame; }, [onPhysicsFrame]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalc = () => {
      const rect = container.getBoundingClientRect();
      const aspect = TOTAL_W / TOTAL_H;
      const maxWidth = Math.min(rect.width, 1240 * Math.min(Math.max(displayScale, 0.9), 1.15));
      const maxHeight = Math.max(280, rect.height > 120 ? rect.height : window.innerHeight * 0.72);
      const width = Math.max(300, Math.min(maxWidth, maxHeight * aspect));
      const height = width / aspect;
      setCanvasSize({ w: width, h: height });
      scaleRef.current = width / TOTAL_W;
    };

    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(container);
    return () => ro.disconnect();
  }, [displayScale]);

  useEffect(() => {
    if (phase === "rolling") {
      simBallsRef.current = cloneBalls(propBallsRef.current);
      rollingStartRef.current = performance.now();
    } else {
      simBallsRef.current = [];
      rollingStartRef.current = null;
    }
    simulationCarryRef.current = 0;
    lastFrameTimeRef.current = null;
  }, [phase]);

  const canvasToTable = useCallback((clientX: number, clientY: number): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return Vec2.zero();
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return new Vec2(
      (clientX - rect.left) / scale - CUSHION_WIDTH,
      (clientY - rect.top) / scale - CUSHION_WIDTH,
    );
  }, []);

  const getCueBall = useCallback(() => (
    propBallsRef.current.find((ball) => ball.id === cueBallIdRef.current)
  ), []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== "aiming" || disabled) return;
    const cueBall = getCueBall();
    if (!cueBall) return;

    const point = canvasToTable(e.clientX, e.clientY);
    const maxDistance = cueBall.radius * (isCoarsePointer ? 7 : 4.2);
    if (point.distance(cueBall.pos) > maxDistance) return;

    aimingRef.current = true;
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    const dir = cueBall.pos.sub(point);
    if (dir.length() > 0.1) onAimChange(dir.normalize());
  }, [canvasToTable, disabled, getCueBall, isCoarsePointer, onAimChange, phase]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!aimingRef.current || activePointerIdRef.current !== e.pointerId) return;
    const cueBall = getCueBall();
    if (!cueBall) return;

    const point = canvasToTable(e.clientX, e.clientY);
    const dir = cueBall.pos.sub(point);
    if (dir.length() > 0.1) onAimChange(dir.normalize());
  }, [canvasToTable, getCueBall, onAimChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    aimingRef.current = false;
    activePointerIdRef.current = null;
  }, []);

  const handleLostPointerCapture = useCallback(() => {
    aimingRef.current = false;
    activePointerIdRef.current = null;
  }, []);

  // Fallback: window-level pointerup catches releases outside the browser window
  useEffect(() => {
    const onWindowPointerUp = () => {
      if (aimingRef.current) {
        aimingRef.current = false;
        activePointerIdRef.current = null;
      }
    };
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => window.removeEventListener("pointerup", onWindowPointerUp);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = (timestamp: number) => {
      const scale = scaleRef.current;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasSize.w * dpr;
      canvas.height = canvasSize.h * dpr;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      ctx.clearRect(0, 0, TOTAL_W, TOTAL_H);

      let currentBalls = propBallsRef.current;
      if (phaseRef.current === "rolling" && simBallsRef.current.length > 0) {
        const previous = lastFrameTimeRef.current;
        const deltaSeconds = previous === null ? 0 : Math.min((timestamp - previous) / 1000, 0.05);
        lastFrameTimeRef.current = timestamp;

        const result = advanceSimulation(
          simBallsRef.current,
          cueBallIdRef.current,
          deltaSeconds,
          simulationCarryRef.current,
        );
        simulationCarryRef.current = result.carrySeconds;
        let stopped = allStopped(simBallsRef.current);

        if (!stopped && rollingStartRef.current !== null) {
          stopped = performance.now() - rollingStartRef.current > 12_000;
        }

        onPhysicsFrameRef.current(simBallsRef.current, result.cueBallHits, stopped);
        currentBalls = simBallsRef.current;
      } else {
        lastFrameTimeRef.current = timestamp;
        simulationCarryRef.current = 0;
      }

      ctx.fillStyle = RAIL;
      ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);
      ctx.fillStyle = RAIL_DARK;
      ctx.fillRect(8, 8, TOTAL_W - 16, TOTAL_H - 16);
      ctx.fillStyle = FELT;
      ctx.fillRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH, TABLE_HEIGHT);

      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(CUSHION_WIDTH, CUSHION_WIDTH, TABLE_WIDTH, TABLE_HEIGHT);
      ctx.strokeRect(CUSHION_WIDTH + 1, CUSHION_WIDTH + 1, TABLE_WIDTH - 2, TABLE_HEIGHT - 2);

      const cueBall = currentBalls.find((ball) => ball.id === cueBallIdRef.current);
      const direction = aimDirectionRef.current;
      if (phaseRef.current === "aiming" && cueBall && direction) {
        const shot = buildShotParams(
          direction,
          aimPowerRef.current,
          aimSpinRef.current,
          aimElevationRef.current,
        );
        const trace = simulateGuideTrace(currentBalls, cueBallIdRef.current, shot);
        drawGuideTrace(ctx, trace);
        drawCueStick(ctx, cueBall, direction, aimPowerRef.current, aimElevationRef.current);
      }

      currentBalls.forEach((ball) => drawBall(ctx, ball));

      if (showDebugOverlay) {
        drawDebugOverlay(ctx, currentBalls);
      }

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(raf);
  }, [canvasSize.h, canvasSize.w, showDebugOverlay]);

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full rounded-[24px] touch-none"
        style={{ width: canvasSize.w, height: canvasSize.h }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handleLostPointerCapture}
      />
    </div>
  );
}
