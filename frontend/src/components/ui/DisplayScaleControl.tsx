import {
  MIN_SCALE,
  MAX_SCALE,
  SCALE_STEP,
  formatDisplayScale,
} from "../../context/DisplaySettingsContext";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

export default function DisplayScaleControl() {
  const { displayScale, setDisplayScale, resetDisplayScale } =
    useDisplaySettings();

  const canDecrease = displayScale - SCALE_STEP >= MIN_SCALE - 0.001;
  const canIncrease = displayScale + SCALE_STEP <= MAX_SCALE + 0.001;

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 px-1 py-0.5 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setDisplayScale(displayScale - SCALE_STEP)}
        disabled={!canDecrease}
        aria-label="UI 축소"
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#e8ecf1] transition-colors hover:bg-white/10 active:bg-white/20 disabled:opacity-30 disabled:pointer-events-none"
      >
        −
      </button>
      <button
        type="button"
        onClick={resetDisplayScale}
        aria-label="UI 크기 초기화"
        title="기본 크기(100%)로 되돌리기"
        className="min-w-[3rem] rounded-full px-1 py-1 text-center text-xs font-semibold text-[#e8ecf1] transition-colors hover:bg-white/10 active:bg-white/20"
      >
        {formatDisplayScale(displayScale)}
      </button>
      <button
        type="button"
        onClick={() => setDisplayScale(displayScale + SCALE_STEP)}
        disabled={!canIncrease}
        aria-label="UI 확대"
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#e8ecf1] transition-colors hover:bg-white/10 active:bg-white/20 disabled:opacity-30 disabled:pointer-events-none"
      >
        +
      </button>
    </div>
  );
}
