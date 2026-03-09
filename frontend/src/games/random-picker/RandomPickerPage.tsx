import PickerSetup from "./PickerSetup";
import Roulette from "./Roulette";
import { useRandomPicker } from "./useRandomPicker";
import { useTheme } from "../../hooks/useTheme";
import GameViewport from "../../components/game/GameViewport";

export default function RandomPickerPage() {
  const { state, setItems, startSpin, spin, resetSpin, goBack } =
    useRandomPicker();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (state.phase === "setup") {
    return (
      <GameViewport title="랜덤 뽑기">
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <PickerSetup
            items={state.items}
            onItemsChange={setItems}
            onStart={startSpin}
          />
        </div>
      </GameViewport>
    );
  }

  return (
    <GameViewport title="랜덤 뽑기">
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div
          className={`rounded-2xl border px-3 py-2 backdrop-blur-md sm:px-4 ${
            isDark
              ? "border-white/10 bg-white/5"
              : "border-gray-200 bg-white/90"
          }`}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <button
              onClick={goBack}
              disabled={state.spinning}
              className={`touch-manipulation rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 border
                ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                    : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
                }
                ${state.spinning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              항목 편집
            </button>

            <div className="text-center sm:text-left">
              <h2 className="font-display text-xl font-semibold tracking-[0.18em]">
                <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
                  랜덤 뽑기
                </span>
              </h2>
              <p className="mt-1 text-sm text-[#8892a4]">
                {state.items.length}개 항목 중 하나를 골라보세요.
              </p>
            </div>

            <div className="text-xs uppercase tracking-[0.28em] text-[#8892a4]">
              Roulette
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-center">
          <div
            className={`flex min-h-[320px] items-center justify-center rounded-[32px] border p-5 backdrop-blur-md sm:p-8 ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white/92"
            }`}
          >
            <Roulette
              items={state.items}
              spinning={state.spinning}
              targetRotation={state.targetRotation}
              result={state.result}
            />
          </div>

          <div
            className={`flex flex-col gap-4 rounded-[32px] border p-6 backdrop-blur-md ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white/92"
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8892a4]">
                Controls
              </p>
              <h3 className="mt-3 font-display text-2xl tracking-[0.12em]">
                {state.spinning
                  ? "돌리는 중..."
                  : state.result === null
                    ? "준비 완료"
                    : "결과 확정"}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#8892a4]">
                모바일에서도 한 손으로 누르기 쉽도록 주요 액션을 세로로 정리했습니다.
              </p>
            </div>

            {!state.spinning && state.result === null && (
              <button
                onClick={spin}
                className="touch-manipulation rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#0080ff] px-8 py-4 font-display text-lg font-semibold tracking-wider text-[#0a0e1a] shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/50 active:scale-[0.98]"
              >
                돌리기
              </button>
            )}

            {state.spinning && (
              <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4 text-center font-display text-lg font-semibold tracking-wider text-[#ffb800] animate-pulse">
                돌리는 중...
              </div>
            )}

            {!state.spinning && state.result !== null && (
              <button
                onClick={resetSpin}
                className="touch-manipulation rounded-2xl bg-gradient-to-r from-[#00f0ff] to-[#0080ff] px-8 py-4 font-display text-lg font-semibold tracking-wider text-[#0a0e1a] shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/50 active:scale-[0.98]"
              >
                다시 돌리기
              </button>
            )}
          </div>
        </div>
      </div>
    </GameViewport>
  );
}
