import { useState, useCallback } from "react";
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
      // The pointer is at the top (0 degrees / 360 degrees)
      // We rotate the wheel clockwise, so to land on slice i,
      // the middle of that slice should align with the top
      const sliceMiddle = winnerIndex * sliceAngle + sliceAngle / 2;
      // We need to rotate so that sliceMiddle ends up at top (360 - sliceMiddle)
      const targetAngle = 360 - sliceMiddle;

      // Add full rotations for visual effect
      const rotations =
        MIN_ROTATIONS +
        Math.floor(Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS + 1));
      const totalRotation = rotations * 360 + targetAngle;

      // Schedule end of spin
      setTimeout(() => {
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
  }, []);

  const resetSpin = useCallback(() => {
    setState((s) => ({
      ...s,
      spinning: false,
      targetRotation: null,
      result: null,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "setup",
      spinning: false,
      targetRotation: null,
      result: null,
    }));
  }, []);

  return {
    state,
    setItems,
    startSpin,
    spin,
    resetSpin,
    goBack,
  };
}
