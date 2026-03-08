import {
  DISPLAY_SCALE_OPTIONS,
  formatDisplayScale,
} from "../../context/DisplaySettingsContext";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

interface DisplayScaleControlProps {
  variant?: "compact" | "rail";
}

export default function DisplayScaleControl({
  variant = "compact",
}: DisplayScaleControlProps) {
  const {
    displayScale,
    increaseDisplayScale,
    decreaseDisplayScale,
    resetDisplayScale,
  } = useDisplaySettings();

  const isCompact = variant === "compact";
  const minScale = DISPLAY_SCALE_OPTIONS[0] ?? 0.9;
  const maxScale =
    DISPLAY_SCALE_OPTIONS[DISPLAY_SCALE_OPTIONS.length - 1] ?? 1.25;

  const shellClassName = isCompact
    ? "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1 py-1 backdrop-blur-sm [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white"
    : "inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0a0e1a]/70 px-1.5 py-1.5 shadow-lg backdrop-blur-md [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white/95";
  const buttonClassName = isCompact
    ? "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100"
    : "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100";
  const labelClassName = isCompact
    ? "min-w-[3.25rem] rounded-full px-2 py-1 text-center text-xs font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100"
    : "min-w-[3.5rem] rounded-full px-3 py-1.5 text-center text-xs font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100";

  return (
    <div className={shellClassName}>
      <button
        type="button"
        onClick={decreaseDisplayScale}
        disabled={displayScale <= minScale}
        aria-label="UI 축소"
        className={buttonClassName}
      >
        -
      </button>
      <button
        type="button"
        onClick={resetDisplayScale}
        aria-label="UI 크기 초기화"
        title="기본 크기(100%)로 되돌리기"
        className={labelClassName}
      >
        {formatDisplayScale(displayScale)}
      </button>
      <button
        type="button"
        onClick={increaseDisplayScale}
        disabled={displayScale >= maxScale}
        aria-label="UI 확대"
        className={buttonClassName}
      >
        +
      </button>
    </div>
  );
}
