import { useRef, useEffect, useState } from "react";
import { ROULETTE_COLORS } from "./constants";
import { useTheme } from "../../hooks/useTheme";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

interface RouletteProps {
  items: string[];
  spinning: boolean;
  targetRotation: number | null;
  result: number | null;
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export default function Roulette({
  items,
  spinning,
  targetRotation,
  result,
}: RouletteProps) {
  const { theme } = useTheme();
  const { displayScale } = useDisplaySettings();
  const isDark = theme === "dark";
  const wheelRef = useRef<SVGGElement>(null);
  const [currentRotation, setCurrentRotation] = useState(0);

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const sliceAngle = 360 / items.length;
  const maxWidth = Math.round(420 * Math.min(displayScale, 1.15));

  // Handle spin animation via CSS transition
  useEffect(() => {
    if (spinning && targetRotation !== null) {
      // Small delay to ensure the initial state is rendered
      requestAnimationFrame(() => {
        setCurrentRotation(targetRotation);
      });
    }
  }, [spinning, targetRotation]);

  // Reset rotation when items change (not during spin)
  useEffect(() => {
    if (!spinning) {
      setCurrentRotation(0);
    }
  }, [items.length, spinning]);

  // Build SVG slices
  const slices = items.map((item, i) => {
    const startAngle = i * sliceAngle - 90; // Start from top
    const endAngle = (i + 1) * sliceAngle - 90;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const color = ROULETTE_COLORS[i % ROULETTE_COLORS.length]!;
    const textColor = getContrastColor(color);

    // Label position
    const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
    const labelRadius = radius * 0.65;
    const labelX = cx + labelRadius * Math.cos(midAngle);
    const labelY = cy + labelRadius * Math.sin(midAngle);
    const labelRotation = (startAngle + endAngle) / 2 + 90;

    // Truncate long labels
    const displayLabel = item.length > 8 ? item.slice(0, 7) + "..." : item;
    const fontSize = items.length > 8 ? 10 : items.length > 5 ? 11 : 13;

    return (
      <g key={i}>
        <path
          d={d}
          fill={color}
          stroke={isDark ? "#0a0e1a" : "#ffffff"}
          strokeWidth={2}
        />
        <text
          x={labelX}
          y={labelY}
          fill={textColor}
          fontSize={fontSize}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${labelRotation}, ${labelX}, ${labelY})`}
        >
          {displayLabel}
        </text>
      </g>
    );
  });

  const transitionStyle = spinning
    ? `transform ${4}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`
    : "none";

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={{ maxWidth }}
    >
      {/* Pointer arrow at top */}
      <div className="relative z-10 -mb-2">
        <svg width="30" height="24" viewBox="0 0 30 24">
          <polygon
            points="15,24 0,0 30,0"
            fill={isDark ? "#e8ecf1" : "#1a1a2e"}
          />
        </svg>
      </div>

      {/* Wheel */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full drop-shadow-lg"
      >
        <g
          ref={wheelRef}
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${currentRotation}deg)`,
            transition: transitionStyle,
          }}
        >
          {slices}
        </g>

        {/* Center circle */}
        <circle
          cx={cx}
          cy={cy}
          r={20}
          fill={isDark ? "#111827" : "#ffffff"}
          stroke={isDark ? "#334155" : "#e2e8f0"}
          strokeWidth={3}
        />
      </svg>

      {/* Result display */}
      {(() => {
        if (result === null || spinning) return null;
        const winnerLabel = items[result];
        if (!winnerLabel) return null;
        const winnerColor = ROULETTE_COLORS[result % ROULETTE_COLORS.length] ?? "#00f0ff";
        return (
          <div
            className={`mt-4 px-6 py-3 rounded-xl text-center font-display font-bold text-lg tracking-wider border
              ${
                isDark
                  ? "bg-white/10 border-white/20"
                  : "bg-gray-50 border-gray-200"
              }`}
            style={{ color: winnerColor }}
          >
            {winnerLabel}
          </div>
        );
      })()}
    </div>
  );
}
