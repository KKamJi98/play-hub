import {
  MIN_SCALE,
  MAX_SCALE,
  SCALE_STEP,
  formatDisplayScale,
} from "../../context/DisplaySettingsContext";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

interface DisplayScaleControlProps {
  variant?: "compact" | "rail";
}

export default function DisplayScaleControl({
  variant = "compact",
}: DisplayScaleControlProps) {
  const { displayScale, setDisplayScale, resetDisplayScale } =
    useDisplaySettings();

  const isCompact = variant === "compact";

  const shellClassName = isCompact
    ? "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-sm [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white"
    : "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0a0e1a]/70 px-2.5 py-1.5 shadow-lg backdrop-blur-md [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white/95";

  return (
    <div className={shellClassName}>
      <input
        type="range"
        min={MIN_SCALE}
        max={MAX_SCALE}
        step={SCALE_STEP}
        value={displayScale}
        onChange={(e) => setDisplayScale(Number(e.target.value))}
        aria-label="UI 크기 조절"
        className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#00f0ff] [data-theme=light]_&:bg-gray-200 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00f0ff] [&::-webkit-slider-thumb]:shadow-sm"
      />
      <button
        type="button"
        onClick={resetDisplayScale}
        aria-label="UI 크기 초기화"
        title="기본 크기(100%)로 되돌리기"
        className={
          isCompact
            ? "min-w-[3.25rem] rounded-full px-2 py-1 text-center text-xs font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100"
            : "min-w-[3.5rem] rounded-full px-3 py-1.5 text-center text-xs font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100"
        }
      >
        {formatDisplayScale(displayScale)}
      </button>
    </div>
  );
}
