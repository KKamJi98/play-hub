import { useCallback, useRef, useState } from "react";
import { Vec2 } from "./physics/vector";
import type { Ball } from "./physics/ball";
import { createBall } from "./physics/ball";
import {
  BALL_COLORS,
  BALL_RADIUS,
  DEFAULT_TARGET_SCORE,
  TABLE_HEIGHT,
  TABLE_WIDTH,
} from "./constants";
import type { BallId } from "./constants";

// ---- Types ----------------------------------------------------------------

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
}

// ---- Helpers ---------------------------------------------------------------

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

// ---- Hook ------------------------------------------------------------------

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
  });

  /** Accumulated hits across the rolling phase for the current shot. */
  const accumulatedHitsRef = useRef<Set<BallId>>(new Set());

  // -- Mode / settings -------------------------------------------------------

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
    }));
    accumulatedHitsRef.current = new Set();
  }, []);

  // -- Shot ------------------------------------------------------------------

  const setAimSpin = useCallback((spin: Vec2) => {
    setState((prev) => ({ ...prev, aimSpin: spin }));
  }, []);

  const shoot = useCallback((direction: Vec2, power: number) => {
    setState((prev) => {
      if (prev.phase !== "aiming") return prev;

      const cueBallId = cueBallIdForPlayer(prev.currentPlayer);
      const newBalls = prev.balls.map((b) => {
        if (b.id !== cueBallId) return b;
        return { ...b, vel: direction.normalize().scale(power), spin: prev.aimSpin };
      });

      return { ...prev, balls: newBalls, phase: "rolling" as const, aimSpin: Vec2.zero() };
    });
    accumulatedHitsRef.current = new Set();
  }, []);

  // -- Physics frame callback ------------------------------------------------

  /** Called from the canvas animation loop each frame while rolling. */
  const onPhysicsFrame = useCallback(
    (balls: Ball[], frameHits: Set<BallId>, stopped: boolean) => {
      // Accumulate hits
      for (const h of frameHits) {
        accumulatedHitsRef.current.add(h);
      }

      if (!stopped) {
        // Just update ball positions (mutable from engine, mirror to state)
        setState((prev) => ({ ...prev, balls: [...balls] }));
        return;
      }

      // Shot finished – evaluate
      const allHits = Array.from(accumulatedHitsRef.current);

      setState((prev) => {
        const cueBallId = cueBallIdForPlayer(prev.currentPlayer);
        const opponentCueBallId: BallId = prev.currentPlayer === 0 ? "yellow" : "white";
        // Count how many of the OTHER 3 balls the cue ball hit
        const otherBallsHit = allHits.filter((id) => id !== cueBallId);
        const hitOpponentCue = otherBallsHit.includes(opponentCueBallId);
        const currentScore = prev.scores[prev.currentPlayer];

        const newScores: [number, number] = [prev.scores[0], prev.scores[1]];

        // 4구 패널티 규칙:
        // - 상대 수구를 맞추면 무조건 -1점 (현재 점수 >= 1일 때)
        // - 아무 공도 못 맞히면 -1점 (현재 점수 >= 1일 때)
        // - 빨간공 2개 이상 맞추고 상대 수구는 안 맞춤 = 정상 득점
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

        // Check win
        const playerScore = newScores[prev.currentPlayer];
        const won = playerScore >= prev.targetScore;
        if (won) {
          return {
            ...prev,
            balls: [...balls],
            scores: newScores,
            shotResult,
            phase: "gameOver" as const,
            winner: prev.currentPlayer,
          };
        }

        if (scored) {
          // 득점 시 같은 플레이어가 계속, 결과 오버레이 표시
          return {
            ...prev,
            balls: [...balls],
            scores: newScores,
            shotResult,
            phase: "scoring" as const,
            currentPlayer: prev.currentPlayer,
          };
        } else {
          // 실패 시 바로 턴 전환 (오버레이 없이)
          const nextPlayer: 0 | 1 = prev.currentPlayer === 0 ? 1 : 0;
          return {
            ...prev,
            balls: [...balls],
            scores: newScores,
            shotResult: null,
            phase: "aiming" as const,
            currentPlayer: nextPlayer,
          };
        }
      });
    },
    [],
  );

  /** Dismiss scoring overlay and go to aiming. */
  const continueAfterScore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "aiming" as const,
      shotResult: null,
    }));
  }, []);

  // -- Reset -----------------------------------------------------------------

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
    });
  }, []);

  return {
    state,
    setMode,
    setTargetScore,
    startGame,
    setAimSpin,
    shoot,
    onPhysicsFrame,
    continueAfterScore,
    reset,
  } as const;
}
