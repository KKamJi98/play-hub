import type { CSSProperties, ReactNode } from "react";
import DisplayScaleControl from "../ui/DisplayScaleControl";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";
import { useImmersiveMode } from "../../hooks/useImmersiveMode";

interface GameViewportProps {
  title: string;
  children: ReactNode;
  maxWidth?: number;
}

export default function GameViewport({
  title,
  children,
  maxWidth = 1360,
}: GameViewportProps) {
  const { displayScale } = useDisplaySettings();
  const { containerRef, isFullscreen, isFallbackFullscreen, toggleFullscreen } =
    useImmersiveMode<HTMLElement>();

  const shellStyle: CSSProperties = {
    maxWidth: Math.round(maxWidth * displayScale),
    paddingTop: isFullscreen ? "max(1rem, env(safe-area-inset-top))" : undefined,
    paddingRight: isFullscreen ? "max(1rem, env(safe-area-inset-right))" : undefined,
    paddingBottom: isFullscreen
      ? "max(1rem, env(safe-area-inset-bottom))"
      : undefined,
    paddingLeft: isFullscreen ? "max(1rem, env(safe-area-inset-left))" : undefined,
  };

  return (
    <section
      ref={containerRef}
      aria-label={title}
      className={`relative isolate flex ${
        isFallbackFullscreen
          ? "fixed inset-0 z-[100] min-h-[100dvh]"
          : "min-h-[calc(100dvh-4rem)]"
      }`}
    >
      <div className="gradient-mesh absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(0,240,255,0.16), transparent 28%), radial-gradient(circle at bottom left, rgba(255,184,0,0.14), transparent 24%)",
        }}
      />

      <div
        className={`relative mx-auto flex w-full flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 ${
          isFullscreen ? "min-h-full overflow-y-auto overscroll-contain" : "overflow-hidden"
        }`}
        style={shellStyle}
      >
        <div className="pointer-events-none absolute right-4 top-4 z-20 flex flex-wrap justify-end gap-2 sm:right-6 sm:top-6">
          <div className="pointer-events-auto">
            <DisplayScaleControl variant="rail" />
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="pointer-events-auto inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-[#0a0e1a]/70 px-4 text-sm font-semibold text-[#e8ecf1] shadow-lg backdrop-blur-md transition-colors hover:bg-white/10 [data-theme=light]_&:border-gray-200 [data-theme=light]_&:bg-white/95 [data-theme=light]_&:text-[#1a1a2e] [data-theme=light]_&:hover:bg-gray-100"
            aria-label={isFullscreen ? "전체화면 종료" : "전체화면 시작"}
          >
            {isFullscreen ? "전체화면 종료" : "Full Screen"}
          </button>
        </div>

        {children}
      </div>
    </section>
  );
}
