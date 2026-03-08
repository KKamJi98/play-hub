import { useCallback, useEffect, useRef } from "react";
import { useBilliardsGame } from "./useBilliardsGame";
import type { GameMode, ShootData } from "./useBilliardsGame";
import BilliardsCanvas from "./BilliardsCanvas";
import SpinSelector from "./SpinSelector";
import { TARGET_SCORE_OPTIONS, BALL_COLORS } from "./constants";
import type { BallId } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import { useOnlineGame } from "../../hooks/useOnlineGame";
import OnlineLobby from "../../components/online/OnlineLobby";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-6 transition-all duration-200
                ${
                  isSelected
                    ? isDark
                      ? "border-[#00f0ff]/50 bg-[#00f0ff]/10 shadow-lg shadow-cyan-500/10"
                      : "border-blue-400/50 bg-blue-50 shadow-lg shadow-blue-500/10"
                    : isDark
                      ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                ${
                  targetScore === score
                    ? isDark
                      ? "bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]/40"
                      : "bg-blue-100 text-blue-700 border-blue-300"
                    : isDark
                      ? "bg-white/5 text-[#8892a4] border-white/10 hover:bg-white/10"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
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
        className="px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const players: { label: string; color: string; idx: 0 | 1 }[] = [
    { label: "P1 (흰공)", color: BALL_COLORS.white, idx: 0 },
    { label: "P2 (노란공)", color: BALL_COLORS.yellow, idx: 1 },
  ];

  return (
    <div className="flex items-center gap-6">
      {players.map(({ label, color, idx }) => (
        <div
          key={idx}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300
            ${
              currentPlayer === idx
                ? isDark
                  ? "border-[#00f0ff]/50 bg-[#00f0ff]/10"
                  : "border-blue-400/50 bg-blue-50"
                : isDark
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-gray-50"
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className={`flex flex-col items-center gap-4 rounded-2xl border p-6 max-w-xs w-full mx-4
          ${
            isDark
              ? "bg-[#111827] border-white/10"
              : "bg-white border-gray-200 shadow-xl"
          }`}
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
}: {
  winner: 0 | 1;
  scores: [number, number];
  onReset: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const winnerColor =
    winner === 0 ? BALL_COLORS.white : BALL_COLORS.yellow;
  const winnerLabel = winner === 0 ? "Player 1 (흰공)" : "Player 2 (노란공)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`flex flex-col items-center gap-6 rounded-2xl border p-8 max-w-sm w-full mx-4
          ${
            isDark
              ? "bg-[#111827] border-white/10"
              : "bg-white border-gray-200 shadow-xl"
          }`}
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
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider
                     bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                     text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                     hover:shadow-cyan-500/50 hover:scale-105
                     transition-all duration-300 active:scale-95"
        >
          다시 하기
        </button>
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const trackRef = useRef<HTMLDivElement>(null);

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
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handlePointer(e);
    },
    [handlePointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 0) return;
      handlePointer(e);
    },
    [handlePointer],
  );

  const TRACK_H = 140;
  const TRACK_W = 24;
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
        className="relative cursor-pointer rounded-full border"
        style={{
          width: TRACK_W,
          height: TRACK_H,
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
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
    shoot,
    applyOpponentShoot,
    syncFromOpponent,
    onPhysicsFrame,
    continueAfterScore,
    reset,
  } = useBilliardsGame();

  const online = useOnlineGame("billiards", { onGameStarted: startGame });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cueBallId: BallId =
    state.currentPlayer === 0 ? "white" : "yellow";

  // ---- Online sync: detect if it's our turn --------------------------------

  const isOnlineMode = state.mode === "online" && online.state.phase === "playing";
  const myPlayerIndex = online.state.playerIndex;
  const isMyTurn = !isOnlineMode || state.currentPlayer === myPlayerIndex;
  const canAim = state.phase === "aiming" && isMyTurn;

  // ---- Shoot handler (called from "발사" button) ----------------------------

  const handleShoot = useCallback(() => {
    const direction = state.aimDirection;
    if (!direction) return;
    const power = state.aimPower;

    if (isOnlineMode && isMyTurn) {
      const shootData: ShootData = {
        direction: { x: direction.x, y: direction.y },
        power,
        spin: { x: state.aimSpin.x, y: state.aimSpin.y },
        playerIndex: myPlayerIndex ?? 0,
      };
      online.sendAction({ type: "SHOOT", ...shootData });
    }
    shoot(direction, power);
  }, [state.aimDirection, state.aimPower, state.aimSpin, isOnlineMode, isMyTurn, myPlayerIndex, online, shoot]);

  // ---- Online sync: receive opponent's SHOOT action ------------------------

  const lastGameStateRef = useRef<unknown>(null);

  useEffect(() => {
    if (!isOnlineMode) return;
    const gameState = online.state.gameState as {
      lastAction?: {
        type?: string;
        direction?: { x: number; y: number };
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {online.state.phase !== "playing" ? (
            <>
              <button
                onClick={() => { setMode("local"); }}
                className={`self-start px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                }`}
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
    );
  }

  if (state.phase === "setup") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <ModeSelection
          selectedMode={state.mode}
          targetScore={state.targetScore}
          onSelectMode={setMode}
          onSelectTargetScore={setTargetScore}
          onStart={startGame}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center pt-4 pb-8 px-4">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between mb-4 flex-shrink-0">
        <button
          onClick={reset}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border
            ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
            }`}
        >
          나가기
        </button>

        <ScoreBoard
          scores={state.scores}
          targetScore={state.targetScore}
          currentPlayer={state.currentPlayer}
        />

        <div className="text-xs text-[#8892a4] font-display">
          {state.phase === "aiming"
            ? isMyTurn
              ? "조준 중"
              : "상대방 차례..."
            : state.phase === "rolling"
              ? "진행 중..."
              : ""}
        </div>
      </div>

      {/* Turn indicator */}
      <div className="mb-3 text-sm font-medium">
        <span className="text-[#8892a4]">차례: </span>
        <span
          className="font-display font-semibold"
          style={{
            color:
              state.currentPlayer === 0
                ? BALL_COLORS.white
                : BALL_COLORS.yellow,
            textShadow: "0 0 8px rgba(0,0,0,0.5)",
          }}
        >
          {state.currentPlayer === 0 ? "Player 1 (흰공)" : "Player 2 (노란공)"}
          {isOnlineMode && isMyTurn && " (나)"}
        </span>
      </div>

      {/* Canvas + Spin Selector + Power Slider + Shoot Button */}
      <div className="flex items-start gap-4 w-full max-w-5xl mx-auto justify-center">
        <BilliardsCanvas
          balls={state.balls}
          cueBallId={cueBallId}
          phase={state.phase}
          aimPower={state.aimPower}
          aimDirection={state.aimDirection}
          onAimChange={setAimDirection}
          onPhysicsFrame={onPhysicsFrame}
          disabled={!isMyTurn}
        />
        {canAim && (
          <div className="flex-shrink-0 mt-4 flex flex-col items-center gap-4">
            <SpinSelector spin={state.aimSpin} onSpinChange={setAimSpin} />
            <PowerSlider value={state.aimPower} onChange={setAimPower} />
            <button
              onClick={handleShoot}
              disabled={!state.aimDirection}
              className={`px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm
                transition-all duration-200 active:scale-95
                ${
                  state.aimDirection
                    ? "bg-gradient-to-r from-[#00f0ff] to-[#0080ff] text-[#0a0e1a] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105"
                    : isDark
                      ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                      : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                }`}
            >
              발사
            </button>
          </div>
        )}
      </div>

      {/* Instruction */}
      {state.phase === "aiming" && isMyTurn && (
        <p className="mt-3 text-xs text-[#8892a4] text-center">
          수구 근처를 클릭+드래그하여 방향을 설정하세요. 당점과 파워를 조절한 후
          &ldquo;발사&rdquo; 버튼을 누르면 샷이 실행됩니다.
        </p>
      )}

      {/* Waiting for opponent */}
      {state.phase === "aiming" && !isMyTurn && isOnlineMode && (
        <p className="mt-3 text-xs text-[#8892a4] text-center animate-pulse">
          상대방이 조준 중입니다...
        </p>
      )}

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
          onReset={reset}
        />
      )}
    </div>
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
