import { useCallback, useRef, useState } from "react";
import type { Ball } from "./physics/ball";
import { createBall } from "./physics/ball";
import { applyShotState, buildShotParams, powerToSpeedMps, type ShotParamsV2 } from "./physics/shot";
import { Vec2 } from "./physics/vector";
import {
  BALL_COLORS,
  BALL_RADIUS,
  DEFAULT_ELEVATION_DEG,
  DEFAULT_TARGET_SCORE,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from "./constants";
import type { BallId } from "./constants";

export type GamePhase =
  | "setup"
  | "aiming"
  | "rolling"
  | "scoring"
  | "gameOver";

export type GameMode = "local" | "online";

export interface ShotResult {
  cueBallHits: BallId[];
  scored: boolean;
}

export interface ShootData {
  direction: { x: number; y: number };
  speedMps?: number;
  tipOffset?: { x: number; y: number };
  elevationDeg?: number;
  shot?: ShotParamsV2;
  power?: number;
  spin?: { x: number; y: number };
  playerIndex?: number;
}

export interface BilliardsState {
  balls: Ball[];
  currentPlayer: 0 | 1;
  scores: [number, number];
  targetScore: number;
  phase: GamePhase;
  shotResult: ShotResult | null;
  mode: GameMode;
  winner: 0 | 1 | null;
  aimSpin: Vec2;
  aimPower: number;
  aimDirection: Vec2 | null;
  aimElevationDeg: number;
}

function initialBalls(): Ball[] {
  const cx = TABLE_WIDTH / 2;
  const cy = TABLE_HEIGHT / 2;
  return [
    createBall("white", cx - 300, cy, BALL_RADIUS, BALL_COLORS.white),
    createBall("yellow", cx - 300, cy - 80, BALL_RADIUS, BALL_COLORS.yellow),
    createBall("red1", cx + 200, cy - 40, BALL_RADIUS, BALL_COLORS.red1),
    createBall("red2", cx + 200, cy + 40, BALL_RADIUS, BALL_COLORS.red2),
  ];
}

function cueBallIdForPlayer(player: 0 | 1): BallId {
  return player === 0 ? "white" : "yellow";
}

function coerceShotFromData(data: ShootData): ShotParamsV2 {
  if (data.shot) {
    return data.shot;
  }

  const direction = new Vec2(data.direction.x, data.direction.y);
  const power = data.power ?? 50;
  const legacySpin = data.spin ?? { x: 0, y: 0 };

  return {
    direction: { x: direction.normalize().x, y: direction.normalize().y },
    speedMps: data.speedMps ?? powerToSpeedMps(power),
    tipOffset: data.tipOffset ?? { x: legacySpin.x, y: legacySpin.y },
    elevationDeg: data.elevationDeg ?? DEFAULT_ELEVATION_DEG,
  };
}

function applyShot(
  balls: Ball[],
  cueBallId: BallId,
  shot: ShotParamsV2,
): Ball[] {
  return balls.map((ball) => (
    ball.id === cueBallId ? applyShotState(ball, shot) : ball
  ));
}

export function useBilliardsGame() {
  const [state, setState] = useState<BilliardsState>({
    balls: initialBalls(),
    currentPlayer: 0,
    scores: [0, 0],
    targetScore: DEFAULT_TARGET_SCORE,
    phase: "setup",
    shotResult: null,
    mode: "local",
    winner: null,
    aimSpin: Vec2.zero(),
    aimPower: 50,
    aimDirection: null,
    aimElevationDeg: DEFAULT_ELEVATION_DEG,
  });

  const accumulatedHitsRef = useRef<Set<BallId>>(new Set());

  const setMode = useCallback((mode: GameMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setTargetScore = useCallback((score: number) => {
    setState((prev) => ({ ...prev, targetScore: score }));
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      balls: initialBalls(),
      currentPlayer: 0,
      scores: [0, 0],
      phase: "aiming",
      shotResult: null,
      winner: null,
      aimSpin: Vec2.zero(),
      aimPower: 50,
      aimDirection: null,
      aimElevationDeg: DEFAULT_ELEVATION_DEG,
    }));
    accumulatedHitsRef.current = new Set();
  }, []);

  const setAimSpin = useCallback((spin: Vec2) => {
    setState((prev) => ({ ...prev, aimSpin: spin }));
  }, []);

  const setAimPower = useCallback((power: number) => {
    setState((prev) => ({ ...prev, aimPower: Math.max(0, Math.min(100, power)) }));
  }, []);

  const setAimDirection = useCallback((dir: Vec2 | null) => {
    setState((prev) => ({ ...prev, aimDirection: dir }));
  }, []);

  const setAimElevationDeg = useCallback((elevationDeg: number) => {
    setState((prev) => ({
      ...prev,
      aimElevationDeg: Math.max(0, elevationDeg),
    }));
  }, []);

  const buildShootData = useCallback((direction: Vec2, power: number): ShootData => {
    const shot = buildShotParams(direction, power, state.aimSpin, state.aimElevationDeg);
    return {
      shot,
      direction: shot.direction,
      speedMps: shot.speedMps,
      tipOffset: shot.tipOffset,
      elevationDeg: shot.elevationDeg,
      power,
      spin: { x: state.aimSpin.x, y: state.aimSpin.y },
    };
  }, [state.aimElevationDeg, state.aimSpin]);

  const applyShootData = useCallback((shootData: ShootData) => {
    const shot = coerceShotFromData(shootData);

    setState((prev) => {
      if (prev.phase !== "aiming") return prev;

      const cueBallId = cueBallIdForPlayer(prev.currentPlayer);
      return {
        ...prev,
        balls: applyShot(prev.balls, cueBallId, shot),
        phase: "rolling",
        aimSpin: Vec2.zero(),
        aimPower: 50,
        aimDirection: null,
        aimElevationDeg: DEFAULT_ELEVATION_DEG,
      };
    });

    accumulatedHitsRef.current = new Set();
  }, []);

  const shoot = useCallback((direction: Vec2, power: number) => {
    applyShootData(buildShootData(direction, power));
  }, [applyShootData, buildShootData]);

  const applyOpponentShoot = useCallback((data: ShootData) => {
    applyShootData(data);
  }, [applyShootData]);

  const onPhysicsFrame = useCallback(
    (balls: Ball[], frameHits: Set<BallId>, stopped: boolean) => {
      for (const hit of frameHits) {
        accumulatedHitsRef.current.add(hit);
      }

      if (!stopped) {
        setState((prev) => ({ ...prev, balls: [...balls] }));
        return;
      }

      const allHits = Array.from(accumulatedHitsRef.current);

      setState((prev) => {
        const cueBallId = cueBallIdForPlayer(prev.currentPlayer);
        const opponentCueBallId: BallId = prev.currentPlayer === 0 ? "yellow" : "white";
        const otherBallsHit = allHits.filter((id) => id !== cueBallId);
        const hitOpponentCue = otherBallsHit.includes(opponentCueBallId);
        const currentScore = prev.scores[prev.currentPlayer];

        const newScores: [number, number] = [prev.scores[0], prev.scores[1]];
        let scored = false;

        if (hitOpponentCue && currentScore >= 1) {
          newScores[prev.currentPlayer] -= 1;
        } else if (otherBallsHit.length >= 2 && !hitOpponentCue) {
          newScores[prev.currentPlayer] += 1;
          scored = true;
        } else if (otherBallsHit.length === 0 && currentScore >= 1) {
          newScores[prev.currentPlayer] -= 1;
        }

        const shotResult: ShotResult = {
          cueBallHits: allHits,
          scored,
        };

        const playerScore = newScores[prev.currentPlayer];
        if (playerScore >= prev.targetScore) {
          return {
            ...prev,
            balls: [...balls],
            scores: newScores,
            shotResult,
            phase: "gameOver",
            winner: prev.currentPlayer,
          };
        }

        if (scored) {
          return {
            ...prev,
            balls: [...balls],
            scores: newScores,
            shotResult,
            phase: "scoring",
            currentPlayer: prev.currentPlayer,
          };
        }

        return {
          ...prev,
          balls: [...balls],
          scores: newScores,
          shotResult: null,
          phase: "aiming",
          currentPlayer: prev.currentPlayer === 0 ? 1 : 0,
        };
      });
    },
    [],
  );

  const syncFromOpponent = useCallback(
    (data: {
      scores: [number, number];
      currentPlayer: 0 | 1;
      phase: GamePhase;
      winner: number;
    }) => {
      setState((prev) => {
        const winner = data.winner >= 0 ? (data.winner as 0 | 1) : null;
        const phase =
          winner !== null
            ? "gameOver"
            : data.phase === "scoring"
              ? "scoring"
              : "aiming";

        return {
          ...prev,
          scores: data.scores,
          currentPlayer: data.currentPlayer,
          phase,
          winner,
        };
      });
    },
    [],
  );

  const continueAfterScore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "aiming",
      shotResult: null,
    }));
  }, []);

  const reset = useCallback(() => {
    accumulatedHitsRef.current = new Set();
    setState({
      balls: initialBalls(),
      currentPlayer: 0,
      scores: [0, 0],
      targetScore: DEFAULT_TARGET_SCORE,
      phase: "setup",
      shotResult: null,
      mode: "local",
      winner: null,
      aimSpin: Vec2.zero(),
      aimPower: 50,
      aimDirection: null,
      aimElevationDeg: DEFAULT_ELEVATION_DEG,
    });
  }, []);

  return {
    state,
    setMode,
    setTargetScore,
    startGame,
    setAimSpin,
    setAimPower,
    setAimDirection,
    setAimElevationDeg,
    buildShootData,
    shoot,
    applyOpponentShoot,
    syncFromOpponent,
    onPhysicsFrame,
    continueAfterScore,
    reset,
  } as const;
}
