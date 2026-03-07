import PickerSetup from "./PickerSetup";
import Roulette from "./Roulette";
import { useRandomPicker } from "./useRandomPicker";
import { useTheme } from "../../hooks/useTheme";

export default function RandomPickerPage() {
  const { state, setItems, startSpin, spin, resetSpin, goBack } =
    useRandomPicker();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (state.phase === "setup") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <PickerSetup
          items={state.items}
          onItemsChange={setItems}
          onStart={startSpin}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center pt-4 pb-8 px-4">
      {/* Top bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button
          onClick={goBack}
          disabled={state.spinning}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border
            ${
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-[#8892a4]"
                : "border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600"
            }
            ${state.spinning ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          항목 편집
        </button>

        <h2 className="font-display text-lg font-semibold tracking-wider">
          <span className="bg-gradient-to-r from-[#00f0ff] to-[#ffb800] bg-clip-text text-transparent">
            랜덤 뽑기
          </span>
        </h2>

        <div className="text-xs text-[#8892a4]">{state.items.length}개</div>
      </div>

      {/* Roulette */}
      <Roulette
        items={state.items}
        spinning={state.spinning}
        targetRotation={state.targetRotation}
        result={state.result}
      />

      {/* Spin / Reset buttons */}
      <div className="flex gap-4 mt-8">
        {!state.spinning && state.result === null && (
          <button
            onClick={spin}
            className="px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
                       bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                       text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                       hover:shadow-cyan-500/50 hover:scale-105
                       transition-all duration-300 active:scale-95"
          >
            돌리기
          </button>
        )}

        {state.spinning && (
          <span className="font-display text-lg font-semibold tracking-wider text-[#ffb800] animate-pulse">
            돌리는 중...
          </span>
        )}

        {!state.spinning && state.result !== null && (
          <button
            onClick={resetSpin}
            className="px-8 py-3 rounded-xl font-display font-semibold tracking-wider text-lg
                       bg-gradient-to-r from-[#00f0ff] to-[#0080ff]
                       text-[#0a0e1a] shadow-lg shadow-cyan-500/25
                       hover:shadow-cyan-500/50 hover:scale-105
                       transition-all duration-300 active:scale-95"
          >
            다시 돌리기
          </button>
        )}
      </div>
    </div>
  );
}
