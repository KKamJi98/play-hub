import { useCallback, useRef } from "react";
import { Vec2 } from "./physics/vector";
import { MAX_SPIN } from "./constants";
import { useTheme } from "../../hooks/useTheme";

interface SpinSelectorProps {
  spin: Vec2;
  onSpinChange: (spin: Vec2) => void;
}

export default function SpinSelector({ spin, onSpinChange }: SpinSelectorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);

  const SIZE = 80;
  const RADIUS = SIZE / 2;

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / RADIUS;
      const dy = (e.clientY - cy) / RADIUS;
      // Clamp to unit circle
      const len = Math.sqrt(dx * dx + dy * dy);
      const clampedLen = Math.min(len, 1);
      const scale = len > 0 ? clampedLen / len : 0;
      onSpinChange(new Vec2(dx * scale * MAX_SPIN, dy * scale * MAX_SPIN));
    },
    [onSpinChange],
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

  // Dot position: spin normalized to pixel offset
  const dotX = (spin.x / MAX_SPIN) * RADIUS;
  const dotY = (spin.y / MAX_SPIN) * RADIUS;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium text-[#8892a4]">당점</span>
      <div
        ref={containerRef}
        className="relative cursor-crosshair rounded-full border"
        style={{
          width: SIZE,
          height: SIZE,
          background: isDark
            ? "radial-gradient(circle, #f5f5f5 0%, #e0e0e0 60%, #bbb 100%)"
            : "radial-gradient(circle, #fff 0%, #f0f0f0 60%, #ddd 100%)",
          borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Crosshair */}
        <div
          className="absolute"
          style={{
            left: RADIUS - 0.5,
            top: 4,
            width: 1,
            height: SIZE - 8,
            background: "rgba(0,0,0,0.15)",
          }}
        />
        <div
          className="absolute"
          style={{
            left: 4,
            top: RADIUS - 0.5,
            width: SIZE - 8,
            height: 1,
            background: "rgba(0,0,0,0.15)",
          }}
        />
        {/* Spin dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: 12,
            height: 12,
            left: RADIUS + dotX - 6,
            top: RADIUS + dotY - 6,
            background: "#d32f2f",
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            pointerEvents: "none",
          }}
        />
      </div>
      <button
        onClick={() => onSpinChange(Vec2.zero())}
        className={`text-[10px] px-2 py-0.5 rounded transition-all ${
          isDark
            ? "text-[#8892a4] hover:text-white"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        초기화
      </button>
    </div>
  );
}
