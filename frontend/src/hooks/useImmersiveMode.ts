import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ImmersiveModeResult<T extends HTMLElement> {
  containerRef: React.RefObject<T | null>;
  isFullscreen: boolean;
  isFallbackFullscreen: boolean;
  toggleFullscreen: () => void;
}

export function useImmersiveMode<T extends HTMLElement>(): ImmersiveModeResult<T> {
  const containerRef = useRef<T>(null);
  const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeElement = document.fullscreenElement;
      setIsNativeFullscreen(activeElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFallbackFullscreen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFallbackFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isFallbackFullscreen]);

  const enterNativeFullscreen = useCallback(async () => {
    const target = containerRef.current;
    if (!target || !target.requestFullscreen || !document.fullscreenEnabled) {
      return false;
    }

    try {
      await target.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  const exitNativeFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore exit failures and keep fallback behavior available.
      }
    }
  }, []);

  const isFullscreen = isNativeFullscreen || isFallbackFullscreen;

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      void exitNativeFullscreen();
      setIsFallbackFullscreen(false);
      return;
    }

    void (async () => {
      const entered = await enterNativeFullscreen();
      if (!entered) {
        setIsFallbackFullscreen(true);
      }
    })();
  }, [enterNativeFullscreen, exitNativeFullscreen, isFullscreen]);

  return useMemo(
    () => ({
      containerRef,
      isFullscreen,
      isFallbackFullscreen,
      toggleFullscreen,
    }),
    [isFallbackFullscreen, isFullscreen, toggleFullscreen],
  );
}
