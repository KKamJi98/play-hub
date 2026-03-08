import LadderSetup from "./LadderSetup";
import LadderCanvas from "./LadderCanvas";
import { useLadderGame } from "./useLadderGame";
import { PLAYER_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import GameViewport from "../../components/game/GameViewport";

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
      <GameViewport title="사다리 게임" maxWidth={1180}>
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <LadderSetup
            players={state.players}
            prizes={state.prizes}
            onPlayersChange={setPlayers}
            onPrizesChange={setPrizes}
            onGenerate={generate}
          />
        </div>
      </GameViewport>
    );
  }

  return (
    <GameViewport title="사다리 게임" maxWidth={1360}>
      <div className="flex flex-1 flex-col gap-6 pt-12 sm:pt-14">
        <div
          className={`rounded-[28px] border px-4 py-4 backdrop-blur-md sm:px-6 ${
            isDark
              ? "border-white/10 bg-white/5"
              : "border-gray-200 bg-white/92"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <button
              onClick={reset}
              className={`touch-manipulation rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
              }`}
            >
              다시 설정
            </button>

            <div className="text-center">
              <h2 className="font-display text-xl font-semibold tracking-[0.18em]">
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
                  사다리 게임
                </span>
              </h2>
              <p className="mt-1 text-sm text-[#8892a4]">
                {state.players.length}명의 결과를 순서대로 공개합니다.
              </p>
            </div>

            <div className="text-sm text-[#8892a4]">
              {state.revealedPaths.size}/{state.ladderData?.columns ?? 0} 공개
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          <div
            className={`rounded-[32px] border p-4 backdrop-blur-md sm:p-6 ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white/92"
            }`}
          >
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
          </div>

          <div className="flex flex-col gap-4">
            {state.phase === "ladder" && !allRevealed && (
              <div
                className={`rounded-[32px] border p-6 backdrop-blur-md ${
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white/92"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892a4]">
                  Controls
                </p>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={revealOne}
                    disabled={state.animatingPath !== null || state.autoRevealing}
                    className={`touch-manipulation rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#0080ff] px-5 py-3 font-display text-sm font-semibold tracking-wider text-[#0a0e1a] shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/50 active:scale-[0.98] ${state.animatingPath !== null || state.autoRevealing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    한 명씩 공개
                  </button>
                  <button
                    onClick={state.autoRevealing ? stopAutoReveal : autoReveal}
                    disabled={state.animatingPath !== null && !state.autoRevealing}
                    className={`touch-manipulation rounded-2xl border px-5 py-3 font-display text-sm font-semibold tracking-wider transition-all duration-200 ${
                      state.autoRevealing
                        ? isDark
                          ? "border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
                        : isDark
                          ? "border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] hover:bg-[#00f0ff]/20"
                          : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    } ${state.animatingPath !== null && !state.autoRevealing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {state.autoRevealing ? "자동 중지" : "자동 공개"}
                  </button>
                  <button
                    onClick={revealAll}
                    disabled={state.animatingPath !== null || state.autoRevealing}
                    className={`touch-manipulation rounded-2xl border px-5 py-3 font-display text-sm font-semibold tracking-wider transition-all duration-200 ${
                      isDark
                        ? "border-[#ffb800]/40 text-[#ffb800] hover:bg-[#ffb800]/10"
                        : "border-amber-400 text-amber-600 hover:bg-amber-50"
                    } ${state.animatingPath !== null || state.autoRevealing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    전체 공개
                  </button>
                </div>
              </div>
            )}

            {(state.phase === "results" || allRevealed) && state.ladderData && (
              <div
                className={`rounded-[32px] border p-6 backdrop-blur-md ${
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-gray-200 bg-white/92"
                }`}
              >
                <ResultsPanel
                  players={state.players}
                  prizes={state.prizes}
                  results={state.ladderData.results}
                />
                <button
                  onClick={reset}
                  className="touch-manipulation mt-6 w-full rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#0080ff] px-6 py-3 font-display text-sm font-semibold tracking-wider text-[#0a0e1a] shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/50 active:scale-[0.98]"
                >
                  다시 하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </GameViewport>
  );
}
