import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.0;
export const SCALE_STEP = 0.05;

const STORAGE_KEY = "play-hub-ui-scale";

export interface DisplaySettingsContextValue {
  displayScale: number;
  setDisplayScale: (scale: number) => void;
  resetDisplayScale: () => void;
}

export const DisplaySettingsContext =
  createContext<DisplaySettingsContextValue | null>(null);

function snapAndClamp(scale: number): number {
  const snapped = Math.round(scale / SCALE_STEP) * SCALE_STEP;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, snapped));
}

function getInitialDisplayScale(): number {
  if (typeof window === "undefined") return 1;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return 1;

  const parsed = Number.parseFloat(stored);
  if (Number.isNaN(parsed)) return 1;
  return snapAndClamp(parsed);
}

export function formatDisplayScale(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

export function DisplaySettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [displayScale, setDisplayScaleState] = useState<number>(getInitialDisplayScale);

  const setDisplayScale = useCallback((scale: number) => {
    setDisplayScaleState(snapAndClamp(scale));
  }, []);

  const resetDisplayScale = useCallback(() => {
    setDisplayScaleState(1);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(displayScale));
    document.documentElement.dataset.uiScale = String(Math.round(displayScale * 100));
    window.localStorage.setItem(STORAGE_KEY, String(displayScale));
  }, [displayScale]);

  const value = useMemo(
    () => ({
      displayScale,
      setDisplayScale,
      resetDisplayScale,
    }),
    [
      displayScale,
      resetDisplayScale,
      setDisplayScale,
    ],
  );

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}
