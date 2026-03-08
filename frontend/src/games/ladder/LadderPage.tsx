import LadderSetup from "./LadderSetup";
import LadderCanvas from "./LadderCanvas";
import { useLadderGame } from "./useLadderGame";
import { PLAYER_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";

function ResultsPanel({
  players,
  prizes,
  results,
}: {
  players: string[];
  prizes: string[];
  results: number[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="w-full max-w-md mt-6">
      <h3 className="font-display text-lg font-semibold tracking-wider text-center mb-4">
        결과
      </h3>
      <div className="flex flex-col gap-2">
        {players.map((name, i) => {
          const endCol = results[i];
          const prize = endCol !== undefined ? (prizes[endCol] ?? "?") : "?";
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isDark
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium text-sm">{name}</span>
              </div>
              <span
                className="font-display text-sm font-semibold tracking-wide"
                style={{ color }}
              >
                {prize}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LadderPage() {
  const {
    state,
    setPlayers,
    setPrizes,
    generate,
    revealOne,
    autoReveal,
    stopAutoReveal,
    revealAll,
    reset,
    allRevealed,
  } = useLadderGame();

  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (state.phase === "setup") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LadderSetup
          players={state.players}
          prizes={state.prizes}
          onPlayersChange={setPlayers}
          onPrizesChange={setPrizes}
          onGenerate={generate}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center pt-4 pb-8 px-4">
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button
          onClick={reset}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border
            ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
            }`}
        >
          다시 설정
        </button>

        <h2 className="font-display text-lg font-semibold tracking-wider">
          <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
            사다리 게임
          </span>
        </h2>

        <div className="text-xs text-[#8892a4]">
          {state.revealedPaths.size}/{state.ladderData?.columns ?? 0}
        </div>
      </div>

      {/* Ladder */}
      {state.ladderData && (
        <LadderCanvas
          data={state.ladderData}
          revealedPaths={state.revealedPaths}
          animatingPath={state.animatingPath}
          animationProgress={state.animationProgress}
          players={state.players}
          prizes={state.prizes}
        />
      )}

      {/* Control buttons */}
      {state.phase === "ladder" && !allRevealed && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={revealOne}
            disabled={state.animatingPath !== null || state.autoRevealing}
            className={`px-5 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm
                       bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                       text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                       hover:shadow-cyan-500/50 hover:scale-105
                       transition-all duration-300 active:scale-95
                       ${state.animatingPath !== null || state.autoRevealing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            한 명씩 공개
          </button>
          <button
            onClick={state.autoRevealing ? stopAutoReveal : autoReveal}
            disabled={state.animatingPath !== null && !state.autoRevealing}
            className={`px-5 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm
                       border transition-all duration-200
                       ${
                         state.autoRevealing
                           ? isDark
                             ? "border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                             : "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
                           : isDark
                             ? "border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20"
                             : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                       }
                       ${state.animatingPath !== null && !state.autoRevealing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {state.autoRevealing ? "자동 중지" : "자동 공개"}
          </button>
          <button
            onClick={revealAll}
            disabled={state.animatingPath !== null || state.autoRevealing}
            className={`px-5 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm
                       border transition-all duration-200
                       ${
                         isDark
                           ? "border-[#ffb800]/40 text-[#ffb800] hover:bg-[#ffb800]/10"
                           : "border-amber-400 text-amber-600 hover:bg-amber-50"
                       }
                       ${state.animatingPath !== null || state.autoRevealing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            전체 공개
          </button>
        </div>
      )}

      {/* Results */}
      {(state.phase === "results" || allRevealed) && state.ladderData && (
        <>
          <ResultsPanel
            players={state.players}
            prizes={state.prizes}
            results={state.ladderData.results}
          />
          <button
            onClick={reset}
            className="mt-6 px-6 py-2.5 rounded-xl font-display font-semibold tracking-wider text-sm
                       bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                       text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                       hover:shadow-cyan-500/50 hover:scale-105
                       transition-all duration-300 active:scale-95"
          >
            다시 하기
          </button>
        </>
      )}
    </div>
  );
}
