import { useState, useCallback, useRef, useEffect } from "react";
import {
  SPIN_DURATION,
  MIN_ROTATIONS,
  MAX_ROTATIONS,
} from "./constants";

export type PickerPhase = "setup" | "spin";

interface PickerState {
  phase: PickerPhase;
  items: string[];
  spinning: boolean;
  targetRotation: number | null;
  result: number | null;
}

export function useRandomPicker() {
  const [state, setState] = useState<PickerState>({
    phase: "setup",
    items: [],
    spinning: false,
    targetRotation: null,
    result: null,
  });

  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const clearSpinTimer = useCallback(() => {
    if (spinTimerRef.current !== null) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
  }, []);

  const setItems = useCallback((items: string[]) => {
    setState((s) => ({ ...s, items }));
  }, []);

  const startSpin = useCallback(() => {
    setState((s) => ({ ...s, phase: "spin" }));
  }, []);

  const spin = useCallback(() => {
    setState((s) => {
      if (s.spinning || s.items.length < 2) return s;

      // Pick random winner
      const winnerIndex = Math.floor(Math.random() * s.items.length);
      const sliceAngle = 360 / s.items.length;

      // Calculate the rotation to land on the winner
      const sliceMiddle = winnerIndex * sliceAngle + sliceAngle / 2;
      const targetAngle = 360 - sliceMiddle;

      // Add full rotations for visual effect
      const rotations =
        MIN_ROTATIONS +
        Math.floor(Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS + 1));
      const totalRotation = rotations * 360 + targetAngle;

      // Schedule end of spin (outside setState to avoid side effect in updater)
      clearSpinTimer();
      spinTimerRef.current = setTimeout(() => {
        spinTimerRef.current = null;
        setState((prev) => ({
          ...prev,
          spinning: false,
          result: winnerIndex,
        }));
      }, SPIN_DURATION + 200);

      return {
        ...s,
        spinning: true,
        targetRotation: totalRotation,
        result: null,
      };
    });
  }, [clearSpinTimer]);

  const resetSpin = useCallback(() => {
    clearSpinTimer();
    setState((s) => ({
      ...s,
      spinning: false,
      targetRotation: null,
      result: null,
    }));
  }, [clearSpinTimer]);

  const goBack = useCallback(() => {
    clearSpinTimer();
    setState((s) => ({
      ...s,
      phase: "setup",
      spinning: false,
      targetRotation: null,
      result: null,
    }));
  }, [clearSpinTimer]);

  return {
    state,
    setItems,
    startSpin,
    spin,
    resetSpin,
    goBack,
  };
}
