import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const DISPLAY_SCALE_OPTIONS = [0.9, 1, 1.1, 1.25] as const;

const STORAGE_KEY = "play-hub-ui-scale";

export interface DisplaySettingsContextValue {
  displayScale: number;
  setDisplayScale: (scale: number) => void;
  increaseDisplayScale: () => void;
  decreaseDisplayScale: () => void;
  resetDisplayScale: () => void;
}

export const DisplaySettingsContext =
  createContext<DisplaySettingsContextValue | null>(null);

function clampDisplayScale(scale: number): number {
  if (
    DISPLAY_SCALE_OPTIONS.includes(
      scale as (typeof DISPLAY_SCALE_OPTIONS)[number],
    )
  ) {
    return scale;
  }

  let closest: number = DISPLAY_SCALE_OPTIONS[0] ?? 1;
  for (const option of DISPLAY_SCALE_OPTIONS) {
    if (Math.abs(option - scale) < Math.abs(closest - scale)) {
      closest = option;
    }
  }

  return closest;
}

function stepDisplayScale(current: number, direction: -1 | 1): number {
  const index = DISPLAY_SCALE_OPTIONS.findIndex((option) => option === current);
  const safeValue = clampDisplayScale(current) as (typeof DISPLAY_SCALE_OPTIONS)[number];
  const safeIndex = index === -1 ? DISPLAY_SCALE_OPTIONS.indexOf(safeValue) : index;
  const nextIndex = Math.max(
    0,
    Math.min(DISPLAY_SCALE_OPTIONS.length - 1, safeIndex + direction),
  );
  return DISPLAY_SCALE_OPTIONS[nextIndex] ?? 1;
}

function getInitialDisplayScale(): number {
  if (typeof window === "undefined") return 1;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return 1;

  const parsed = Number.parseFloat(stored);
  if (Number.isNaN(parsed)) return 1;
  return clampDisplayScale(parsed);
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
    setDisplayScaleState(clampDisplayScale(scale));
  }, []);

  const increaseDisplayScale = useCallback(() => {
    setDisplayScaleState((current) => stepDisplayScale(current, 1));
  }, []);

  const decreaseDisplayScale = useCallback(() => {
    setDisplayScaleState((current) => stepDisplayScale(current, -1));
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
      increaseDisplayScale,
      decreaseDisplayScale,
      resetDisplayScale,
    }),
    [
      decreaseDisplayScale,
      displayScale,
      increaseDisplayScale,
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
