import { useBilliardsGame } from "./useBilliardsGame";
import type { GameMode } from "./useBilliardsGame";
import BilliardsCanvas from "./BilliardsCanvas";
import { TARGET_SCORE_OPTIONS, BALL_COLORS } from "./constants";
import type { BallId } from "./constants";
import { useTheme } from "../../hooks/useTheme";

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
          const isDisabled = mode === "online";
          return (
            <button
              key={mode}
              onClick={() => !isDisabled && onSelectMode(mode)}
              disabled={isDisabled}
              className={`relative flex flex-col items-center gap-2 rounded-xl border p-6 transition-all duration-200
                ${
                  isDisabled
                    ? "opacity-40 cursor-not-allowed border-white/5"
                    : isSelected
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
              {isDisabled && (
                <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  준비중
                </span>
              )}
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

// ---- Main page component ---------------------------------------------------

export default function BilliardsPage() {
  const {
    state,
    setMode,
    setTargetScore,
    startGame,
    shoot,
    onPhysicsFrame,
    continueAfterScore,
    reset,
  } = useBilliardsGame();

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cueBallId: BallId =
    state.currentPlayer === 0 ? "white" : "yellow";

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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center pt-4 pb-8 px-4">
      {/* Top bar */}
      <div className="w-full max-w-[1200px] flex items-center justify-between mb-4">
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
            ? "조준 중"
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
        </span>
      </div>

      {/* Canvas */}
      <BilliardsCanvas
        balls={state.balls}
        cueBallId={cueBallId}
        phase={state.phase}
        onShoot={shoot}
        onPhysicsFrame={onPhysicsFrame}
      />

      {/* Instruction */}
      {state.phase === "aiming" && (
        <p className="mt-3 text-xs text-[#8892a4] text-center">
          수구 근처를 클릭한 후 드래그하여 방향과 세기를 조절하세요. 놓으면
          발사됩니다.
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
