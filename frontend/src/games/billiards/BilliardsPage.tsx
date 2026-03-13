import { useCallback, useEffect, useRef, useState } from "react";
import { useBilliardsGame } from "./useBilliardsGame";
import type { GameMode, ShootData } from "./useBilliardsGame";
import BilliardsCanvas from "./BilliardsCanvas";
import SpinSelector from "./SpinSelector";
import { TARGET_SCORE_OPTIONS, BALL_COLORS, MAX_ELEVATION_DEGREES } from "./constants";
import type { BallId } from "./constants";
import { Vec2 } from "./physics/vector";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import OnlineLobby from "../../components/online/OnlineLobby";
import GameViewport from "../../components/game/GameViewport";
import { useCoarsePointer } from "../../hooks/useCoarsePointer";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

// ---- Shot presets ----------------------------------------------------------

const SHOT_PRESETS: {
  label: string;
  tip: [number, number];
  elev: number;
  experimental?: boolean;
}[] = [
  { label: "Center", tip: [0, 0], elev: 0 },
  { label: "Follow", tip: [0, -0.6], elev: 0 },
  { label: "Draw", tip: [0, 0.6], elev: 0 },
  { label: "Left", tip: [-0.5, 0], elev: 0 },
  { label: "Right", tip: [0.5, 0], elev: 0 },
  { label: "Swerve", tip: [0.5, 0], elev: 12, experimental: true },
  { label: "Masse", tip: [0.7, 0.3], elev: 22, experimental: true },
];

// ---- Mode options ----------------------------------------------------------

const MODE_OPTIONS: { mode: GameMode; label: string; desc: string }[] = [
  {
    mode: "local",
    label: "로컬 대전",
    desc: "같은 기기에서 두 명이 번갈아 플레이",
  },
  {
    mode: "online",
    label: "온라인 대전",
    desc: "네트워크로 다른 플레이어와 대결",
  },
];

// ---- Sub-components --------------------------------------------------------

function ModeSelection({
  selectedMode,
  targetScore,
  onSelectMode,
  onSelectTargetScore,
  onStart,
}: {
  selectedMode: GameMode;
  targetScore: number;
  onSelectMode: (m: GameMode) => void;
  onSelectTargetScore: (s: number) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4">
      <h1 className="font-display text-4xl font-bold tracking-wider">
        <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
          4구 당구
        </span>
      </h1>
      <p className="text-[#8892a4] text-center max-w-md">
        4개의 공으로 진행하는 캐롬 당구입니다. 자신의 수구(큐볼)로 나머지 3개 중
        2개 이상의 공을 맞히면 1점을 획득합니다.
      </p>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {MODE_OPTIONS.map(({ mode, label, desc }) => {
          const isSelected = selectedMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onSelectMode(mode)}
              className={`touch-manipulation relative flex flex-col items-center gap-2 rounded-xl border p-6 transition-all duration-200
                ${
                  isSelected
                    ? "border-[#00f0ff]/50 bg-[#00f0ff]/10 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
            >
              <span
                className={`font-display text-lg font-semibold tracking-wide ${
                  isSelected ? "text-[#00f0ff]" : ""
                }`}
              >
                {label}
              </span>
              <span className="text-xs text-[#8892a4] text-center">{desc}</span>
            </button>
          );
        })}
      </div>

      {/* Target score */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm font-medium text-[#8892a4]">목표 점수</span>
        <div className="flex gap-2">
          {TARGET_SCORE_OPTIONS.map((score) => (
            <button
              key={score}
              onClick={() => onSelectTargetScore(score)}
              className={`touch-manipulation px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                ${
                  targetScore === score
                    ? "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40"
                    : "bg-white/5 text-[#8892a4] border-white/10 hover:bg-white/10"
                }`}
            >
              {score}점
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="touch-manipulation px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
                   bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                   text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                   hover:shadow-cyan-500/50 hover:scale-105
                   transition-all duration-300 active:scale-95"
      >
        게임 시작
      </button>
    </div>
  );
}

function ScoreBoard({
  scores,
  targetScore,
  currentPlayer,
}: {
  scores: [number, number];
  targetScore: number;
  currentPlayer: 0 | 1;
}) {
  const players: { label: string; color: string; idx: 0 | 1 }[] = [
    { label: "P1 (흰공)", color: BALL_COLORS.white, idx: 0 },
    { label: "P2 (노란공)", color: BALL_COLORS.yellow, idx: 1 },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
      {players.map(({ label, color, idx }) => (
        <div
          key={idx}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300
            ${
              currentPlayer === idx
                ? "border-[#00f0ff]/50 bg-[#00f0ff]/10"
                : "border-white/10 bg-white/5"
            }`}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 35%, ${lighten(color)}, ${color})`,
              boxShadow: "1px 1px 3px rgba(0,0,0,0.3)",
            }}
          />
          <span className="text-xs font-medium text-[#8892a4]">{label}</span>
          <span className="font-display text-lg font-bold tracking-wider">
            {scores[idx]}
          </span>
          <span className="text-xs text-[#8892a4]">/ {targetScore}</span>
        </div>
      ))}
    </div>
  );
}

function ShotResultOverlay({
  scored,
  cueBallHits,
  onContinue,
}: {
  scored: boolean;
  cueBallHits: BallId[];
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-4 rounded-2xl border p-6 max-w-xs w-full mx-4 bg-[#111827] border-white/10"
      >
        <h3 className="font-display text-xl font-bold tracking-wider">
          {scored ? "득점!" : "실패"}
        </h3>
        <p className="text-sm text-[#8892a4] text-center">
          {cueBallHits.length === 0
            ? "아무 공도 맞히지 못했습니다."
            : cueBallHits.length === 1
              ? "1개의 공만 맞혔습니다. (2개 필요)"
              : `${cueBallHits.length}개의 공을 맞혔습니다!`}
        </p>
        <button
          onClick={onContinue}
          className="px-6 py-2 rounded-xl font-display font-semibold tracking-wider
                     bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                     text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                     hover:shadow-cyan-500/50 hover:scale-105
                     transition-all duration-300 active:scale-95"
        >
          계속하기
        </button>
      </div>
    </div>
  );
}

function GameOverModal({
  winner,
  scores,
  onReset,
  onQuickRematch,
}: {
  winner: 0 | 1;
  scores: [number, number];
  onReset: () => void;
  onQuickRematch?: () => void;
}) {
  const winnerColor =
    winner === 0 ? BALL_COLORS.white : BALL_COLORS.yellow;
  const winnerLabel = winner === 0 ? "Player 1 (흰공)" : "Player 2 (노란공)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-6 rounded-2xl border p-8 max-w-sm w-full mx-4 bg-[#111827] border-white/10"
      >
        <div
          className="w-16 h-16 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${lighten(winnerColor)}, ${winnerColor})`,
            boxShadow: "3px 3px 8px rgba(0,0,0,0.3)",
          }}
        />
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-wider">
            {winnerLabel} 승리!
          </h2>
          <p className="mt-2 text-sm text-[#8892a4]">
            최종 스코어: {scores[0]} - {scores[1]}
          </p>
        </div>
        <div className="flex gap-3">
          {onQuickRematch && (
            <button
              onClick={onQuickRematch}
              className="px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider
                         bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                         text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                         hover:shadow-cyan-500/50 hover:scale-105
                         transition-all duration-300 active:scale-95"
            >
              빠른 재매치
            </button>
          )}
          <button
            onClick={onReset}
            className={`px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider transition-all duration-300 active:scale-95
                       ${onQuickRematch
                         ? "border border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                         : "bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105"
                       }`}
          >
            {onQuickRematch ? "나가기" : "다시 하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- PowerSlider component -------------------------------------------------

function PowerSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { displayScale } = useDisplaySettings();
  const isCoarsePointer = useCoarsePointer();
  const trackRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Vertical: top = 100%, bottom = 0%
      const y = e.clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, y / rect.height));
      onChange(Math.round(ratio * 100));
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      activePointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      handlePointer(e);
    },
    [handlePointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      handlePointer(e);
    },
    [handlePointer],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
  }, []);

  const TRACK_H = Math.round(
    (isCoarsePointer ? 176 : 152) * Math.min(displayScale, 1.1),
  );
  const TRACK_W = Math.round(
    (isCoarsePointer ? 34 : 28) * Math.min(displayScale, 1.08),
  );
  const fillRatio = value / 100;

  // Color based on power level
  const getColor = (ratio: number): string => {
    if (ratio < 0.33) return "#4caf50";
    if (ratio < 0.66) return "#ff9800";
    return "#f44336";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-[#8892a4]">파워</span>
      <div
        ref={trackRef}
        className="touch-drag-surface relative cursor-pointer rounded-full border"
        style={{
          width: TRACK_W,
          height: TRACK_H,
          background: "rgba(255,255,255,0.05)",
          borderColor: "rgba(255,255,255,0.15)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Filled portion (from bottom) */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-75"
          style={{
            height: `${fillRatio * 100}%`,
            background: `linear-gradient(to top, ${getColor(0)}, ${getColor(fillRatio)})`,
            opacity: 0.8,
          }}
        />
        {/* Handle / indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: TRACK_W + 4,
            height: 8,
            bottom: `calc(${fillRatio * 100}% - 4px)`,
            background: getColor(fillRatio),
            boxShadow: `0 0 6px ${getColor(fillRatio)}80`,
          }}
        />
      </div>
      <span
        className="text-xs font-bold tabular-nums"
        style={{ color: getColor(fillRatio) }}
      >
        {value}%
      </span>
    </div>
  );
}

function AdvancedSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-[#8892a4]">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-cyan-400"
      />
    </label>
  );
}

// ---- Main page component ---------------------------------------------------

export default function BilliardsPage() {
  const {
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
  } = useBilliardsGame();

  const online = useOnlineGame("billiards", { onGameStarted: startGame });
  const isCoarsePointer = useCoarsePointer();
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  const cueBallId: BallId =
    state.currentPlayer === 0 ? "white" : "yellow";

  // ---- Online sync: detect if it's our turn --------------------------------

  const isOnlineMode = state.mode === "online" && online.state.phase === "playing";
  const myPlayerIndex = online.state.playerIndex;
  const isMyTurn = !isOnlineMode || state.currentPlayer === myPlayerIndex;
  const canAim = state.phase === "aiming" && isMyTurn;

  const handleReset = useCallback(() => {
    if (state.mode === "online") {
      online.leaveRoom();
    }
    reset();
  }, [online, reset, state.mode]);

  // ---- Shoot handler (called from "발사" button) ----------------------------

  const handleShoot = useCallback(() => {
    const direction = state.aimDirection;
    if (!direction) return;
    const power = state.aimPower;
    const shootData = buildShootData(direction, power);

    if (isOnlineMode && isMyTurn) {
      online.sendAction({ type: "SHOOT", ...shootData, playerIndex: myPlayerIndex ?? 0 });
    }
    shoot(direction, power);
  }, [buildShootData, state.aimDirection, state.aimPower, isOnlineMode, isMyTurn, myPlayerIndex, online, shoot]);

  // ---- Online sync: receive opponent's SHOOT action ------------------------

  const lastGameStateRef = useRef<unknown>(null);

  useEffect(() => {
    if (!isOnlineMode) return;
    const gameState = online.state.gameState as {
      lastAction?: {
        type?: string;
        direction?: { x: number; y: number };
        speedMps?: number;
        tipOffset?: { x: number; y: number };
        elevationDeg?: number;
        shot?: ShootData["shot"];
        power?: number;
        spin?: { x: number; y: number };
        playerIndex?: number;
        scores?: [number, number];
        nextPlayer?: number;
        phase?: string;
        winner?: number;
      };
    } | null;

    if (!gameState || gameState === lastGameStateRef.current) return;
    lastGameStateRef.current = gameState;

    const lastAction = gameState.lastAction;
    if (!lastAction) return;

    // Receive opponent's SHOOT (use playerIndex instead of isMyTurn to avoid timing issues)
    if (lastAction.type === "SHOOT" && lastAction.playerIndex !== myPlayerIndex && state.phase === "aiming") {
      applyOpponentShoot({
        direction: lastAction.direction ?? { x: 0, y: 0 },
        speedMps: lastAction.speedMps,
        tipOffset: lastAction.tipOffset,
        elevationDeg: lastAction.elevationDeg,
        shot: lastAction.shot,
        power: lastAction.power ?? 50,
        spin: lastAction.spin ?? { x: 0, y: 0 },
      });
    }

    // Receive opponent's SCORE_UPDATE
    if (lastAction.type === "SCORE_UPDATE" && lastAction.playerIndex !== myPlayerIndex) {
      syncFromOpponent({
        scores: lastAction.scores ?? state.scores,
        currentPlayer: (lastAction.nextPlayer ?? state.currentPlayer) as 0 | 1,
        phase: (lastAction.phase ?? "aiming") as "aiming" | "scoring" | "gameOver",
        winner: lastAction.winner ?? -1,
      });
    }
  }, [online.state.gameState, isOnlineMode, myPlayerIndex, state.phase, state.scores, state.currentPlayer, applyOpponentShoot, syncFromOpponent]);

  // ---- Online sync: send SCORE_UPDATE after physics completes --------------

  // Track who shot (by phase transition), then send score when state is updated
  const prevPhaseRef = useRef(state.phase);
  const shooterRef = useRef<number | null>(null);

  useEffect(() => {
    // When rolling starts, record who is shooting
    if (state.phase === "rolling" && prevPhaseRef.current !== "rolling") {
      shooterRef.current = state.currentPlayer;
    }
    // When rolling ends, send score update if we were the shooter
    if (prevPhaseRef.current === "rolling" && state.phase !== "rolling") {
      if (isOnlineMode && shooterRef.current === myPlayerIndex) {
        online.sendAction({
          type: "SCORE_UPDATE",
          scores: state.scores,
          nextPlayer: state.currentPlayer,
          phase: state.phase,
          winner: state.winner ?? -1,
          playerIndex: myPlayerIndex ?? 0,
        });
      }
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase, state.scores, state.currentPlayer, isOnlineMode, myPlayerIndex, online]);

  // ---- Render: Online mode setup / lobby -----------------------------------

  if (state.mode === "online" && state.phase === "setup") {
    return (
      <GameViewport title="4구 당구" forceDark>
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <div className="flex flex-col items-center gap-4">
            {online.state.phase !== "playing" ? (
              <>
                <button
                  onClick={() => { setMode("local"); }}
                  className="touch-manipulation self-start px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                >
                  뒤로
                </button>
                <OnlineLobby
                  state={online.state}
                  connected={online.connected}
                  gameLabel="4구 당구 - 캐롬 당구 온라인 대전"
                  onSetNickname={online.setNickname}
                  onConfirmNickname={online.confirmNickname}
                  onCreateRoom={online.createRoom}
                  onJoinRoom={online.joinRoom}
                  onJoinQueue={online.joinQueue}
                  onCancelQueue={online.cancelQueue}
                  onStartGame={() => { online.startGame(); startGame(); }}
                  onLeaveRoom={online.leaveRoom}
                />
              </>
            ) : (
              <ModeSelection
                selectedMode={state.mode}
                targetScore={state.targetScore}
                onSelectMode={setMode}
                onSelectTargetScore={setTargetScore}
                onStart={startGame}
              />
            )}
          </div>
        </div>
      </GameViewport>
    );
  }

  if (state.phase === "setup") {
    return (
      <GameViewport title="4구 당구" forceDark>
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <ModeSelection
            selectedMode={state.mode}
            targetScore={state.targetScore}
            onSelectMode={setMode}
            onSelectTargetScore={setTargetScore}
            onStart={startGame}
          />
        </div>
      </GameViewport>
    );
  }

  return (
    <GameViewport title="4구 당구" forceDark>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2 pt-1">
        <div
          className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md sm:px-4"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <button
              onClick={handleReset}
              className="touch-manipulation rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
            >
              나가기
            </button>

            <ScoreBoard
              scores={state.scores}
              targetScore={state.targetScore}
              currentPlayer={state.currentPlayer}
            />

            <div className="text-sm text-[#8892a4] font-display">
              {state.phase === "aiming"
                ? isMyTurn
                  ? "조준 중"
                  : "상대 차례"
                : state.phase === "rolling"
                  ? "샷 진행 중"
                  : ""}
            </div>
          </div>
        </div>

        <div className="grid w-full flex-1 min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:grid-rows-[minmax(0,1fr)]">
          <div
            className="flex h-full min-h-[360px] items-center justify-center rounded-[32px] border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4 xl:min-h-0"
          >
            <BilliardsCanvas
              balls={state.balls}
              cueBallId={cueBallId}
              phase={state.phase}
              aimPower={state.aimPower}
              aimDirection={state.aimDirection}
              aimSpin={state.aimSpin}
              aimElevationDeg={state.aimElevationDeg}
              onAimChange={setAimDirection}
              onPhysicsFrame={onPhysicsFrame}
              disabled={!isMyTurn}
              showDebugOverlay={showDebugOverlay}
            />
          </div>

          <aside className="flex h-full min-h-0 flex-col gap-4">
            <div
              className="rounded-[32px] border p-6 backdrop-blur-md border-white/10 bg-white/5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892a4]">
                Turn
              </p>
              <h3
                className="mt-3 font-display text-2xl tracking-[0.12em]"
                style={{
                  color:
                    state.currentPlayer === 0
                      ? BALL_COLORS.white
                      : BALL_COLORS.yellow,
                  textShadow: "0 0 8px rgba(0,0,0,0.35)",
                }}
              >
                {state.currentPlayer === 0 ? "Player 1 (흰공)" : "Player 2 (노란공)"}
                {isOnlineMode && isMyTurn && " (나)"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#8892a4]">
                {canAim
                  ? "수구를 드래그해 방향을 잡고 당점과 파워를 조절한 뒤 샷을 실행하세요."
                  : state.phase === "rolling"
                    ? "현재 샷 물리를 계산 중입니다."
                    : isOnlineMode && !isMyTurn
                      ? "상대방이 조준 중입니다."
                      : "결과를 정리하고 다음 턴을 준비 중입니다."}
              </p>
            </div>

            <div
              className="rounded-[32px] border p-6 backdrop-blur-md border-white/10 bg-white/5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892a4]">
                Shot Controls
              </p>

              {canAim ? (
                <>
                  <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:grid-cols-2">
                    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/10 bg-black/10 px-4 py-4 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50">
                      <SpinSelector spin={state.aimSpin} onSpinChange={setAimSpin} />
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/10 bg-black/10 px-4 py-4 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50">
                      <PowerSlider value={state.aimPower} onChange={setAimPower} />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAdvancedControls((prev) => !prev)}
                    className="mt-4 w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left text-sm text-[#c2d3ea] transition hover:bg-black/15 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50"
                  >
                    Advanced Shot {showAdvancedControls ? "숨기기" : "열기"}
                  </button>

                  {showAdvancedControls && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50">
                      <div className="flex flex-col gap-4">
                        <div>
                          <p className="text-xs text-[#8892a4] mb-2">Presets</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SHOT_PRESETS.map((preset) => (
                              <button
                                key={preset.label}
                                onClick={() => {
                                  setAimSpin(new Vec2(preset.tip[0], preset.tip[1]));
                                  setAimElevationDeg(preset.elev);
                                }}
                                className="touch-manipulation inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[#c2d3ea] transition hover:bg-white/10 active:scale-95"
                              >
                                {preset.label}
                                {preset.experimental && (
                                  <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                                    Experimental
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] leading-5 text-[#8892a4]">
                            `Center`, `Follow`, `Draw`, `Left`, `Right` preset은 현재 calibrated basic
                            strokes 범위입니다. `Swerve`, `Masse`는 실험용 preset으로 유지됩니다.
                          </p>
                        </div>
                        <AdvancedSlider
                          label="Cue Elevation"
                          value={state.aimElevationDeg}
                          min={0}
                          max={MAX_ELEVATION_DEGREES}
                          step={1}
                          onChange={setAimElevationDeg}
                        />
                        <label className="flex items-center justify-between text-sm text-[#c2d3ea]">
                          <span>Debug Overlay</span>
                          <input
                            type="checkbox"
                            checked={showDebugOverlay}
                            onChange={(e) => setShowDebugOverlay(e.target.checked)}
                            className="h-4 w-4 accent-cyan-400"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleShoot}
                    disabled={!state.aimDirection}
                    className={`touch-manipulation mt-5 w-full rounded-2xl px-6 py-4 font-display text-base font-semibold tracking-wider transition-all duration-200 active:scale-95 ${
                      state.aimDirection
                        ? "bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-[1.02]"
                        : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                    }`}
                  >
                    발사
                  </button>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm leading-6 text-[#8892a4] [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-gray-50">
                  {state.phase === "rolling"
                    ? "공이 모두 멈추면 자동으로 점수 판정이 진행됩니다."
                    : isOnlineMode && !isMyTurn
                      ? "당구대 물리 상태는 양쪽 클라이언트에서 동일하게 재생됩니다. 상대 턴이 끝날 때까지 기다려주세요."
                      : "득점 결과를 확인한 뒤 다음 턴으로 넘어갑니다."}
                </div>
              )}
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892a4]">
                Mobile Tips
              </p>
              <p className="mt-3 text-sm leading-6 text-[#8892a4]">
                {isCoarsePointer
                  ? "모바일에서는 수구 근처를 넓게 잡아 드래그할 수 있고, 당점/파워 컨트롤도 확대된 터치 영역으로 동작합니다."
                  : "직선 샷과 뱅크 샷 모두 프레임레이트와 무관한 fixed timestep으로 재생됩니다."}
              </p>
            </div>
          </aside>
        </div>

        {/* Shot result overlay */}
        {state.phase === "scoring" && state.shotResult && (
          <ShotResultOverlay
            scored={state.shotResult.scored}
            cueBallHits={state.shotResult.cueBallHits}
            onContinue={continueAfterScore}
          />
        )}

        {/* Game over modal */}
        {state.phase === "gameOver" && state.winner !== null && (
          <GameOverModal
            winner={state.winner}
            scores={state.scores}
            onReset={handleReset}
            onQuickRematch={online.state.isQuickMatch ? () => { handleReset(); online.joinQueue(); } : undefined}
          />
        )}

        {online.state.opponentLeft === true && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className="flex flex-col items-center gap-6 rounded-2xl border p-8 max-w-sm w-full mx-4 bg-[#111827] border-white/10"
            >
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold tracking-wider">상대가 나갔습니다</h2>
                <p className="mt-2 text-sm text-[#8892a4]">상대 플레이어가 게임을 떠났습니다.</p>
              </div>
              <div className="flex gap-3">
                {online.state.isQuickMatch && (
                  <button
                    onClick={() => { handleReset(); online.joinQueue(); }}
                    className="touch-manipulation px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider
                               bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                               text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                               hover:shadow-cyan-500/50 hover:scale-105
                               transition-all duration-300 active:scale-95"
                  >
                    빠른 재매치
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className={`touch-manipulation px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider transition-all duration-300 active:scale-95
                             ${online.state.isQuickMatch
                               ? "border border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                               : "bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105"
                             }`}
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameViewport>
  );
}

// ---- Helper ----------------------------------------------------------------

function lighten(hex: string): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + 40);
  const g = Math.min(255, ((num >> 8) & 0xff) + 40);
  const b = Math.min(255, (num & 0xff) + 40);
  return `rgb(${r},${g},${b})`;
}
