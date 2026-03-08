import { useState, useCallback, useRef, useEffect } from "react";
import { generateLadder, type LadderData } from "./generator";

export type LadderPhase = "setup" | "ladder" | "results";

interface LadderGameState {
  phase: LadderPhase;
  players: string[];
  prizes: string[];
  ladderData: LadderData | null;
  revealedPaths: Set<number>;
  animatingPath: number | null;
  animationProgress: number;
  revealQueue: number[];
  autoRevealing: boolean;
}

export function useLadderGame() {
  const [state, setState] = useState<LadderGameState>({
    phase: "setup",
    players: ["Player 1", "Player 2"],
    prizes: ["Prize 1", "Prize 2"],
    ladderData: null,
    revealedPaths: new Set(),
    animatingPath: null,
    animationProgress: 0,
    revealQueue: [],
    autoRevealing: false,
  });

  const animFrameRef = useRef<number>(0);
  const animStartRef = useRef<number>(0);
  const autoRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ANIM_DURATION = 1500; // ms

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (autoRevealTimeoutRef.current) {
        clearTimeout(autoRevealTimeoutRef.current);
      }
    };
  }, []);

  const setPlayers = useCallback((players: string[]) => {
    setState((s) => ({ ...s, players }));
  }, []);

  const setPrizes = useCallback((prizes: string[]) => {
    setState((s) => ({ ...s, prizes }));
  }, []);

  const generate = useCallback(() => {
    setState((s) => {
      const data = generateLadder(s.players.length);
      return {
        ...s,
        phase: "ladder",
        ladderData: data,
        revealedPaths: new Set<number>(),
        animatingPath: null,
        animationProgress: 0,
        revealQueue: [],
      };
    });
  }, []);

  const animatePath = useCallback(
    (colIndex: number, onComplete?: () => void) => {
      setState((s) => ({
        ...s,
        animatingPath: colIndex,
        animationProgress: 0,
      }));

      animStartRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - animStartRef.current;
        const progress = Math.min(elapsed / ANIM_DURATION, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        setState((s) => ({ ...s, animationProgress: eased }));

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Animation complete
          setState((s) => {
            const newRevealed = new Set(s.revealedPaths);
            newRevealed.add(colIndex);
            return {
              ...s,
              revealedPaths: newRevealed,
              animatingPath: null,
              animationProgress: 0,
            };
          });
          onComplete?.();
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  const revealOne = useCallback(() => {
    setState((s) => {
      if (!s.ladderData || s.animatingPath !== null) return s;

      // Find next unrevealed
      for (let i = 0; i < s.ladderData.columns; i++) {
        if (!s.revealedPaths.has(i)) {
          // Schedule animation outside of setState
          setTimeout(() => animatePath(i), 0);
          return s;
        }
      }

      // All revealed
      return { ...s, phase: "results" };
    });
  }, [animatePath]);

  const autoReveal = useCallback(() => {
    setState((s) => {
      if (!s.ladderData || s.animatingPath !== null || s.autoRevealing) return s;
      return { ...s, autoRevealing: true };
    });

    const doNext = () => {
      setState((s) => {
        if (!s.ladderData) return s;

        // Find next unrevealed
        let nextCol = -1;
        for (let i = 0; i < s.ladderData.columns; i++) {
          if (!s.revealedPaths.has(i)) {
            nextCol = i;
            break;
          }
        }

        if (nextCol === -1) {
          // All revealed
          return { ...s, phase: "results", autoRevealing: false };
        }

        // Animate this one, then schedule next after delay
        setTimeout(() => animatePath(nextCol, () => {
          autoRevealTimeoutRef.current = setTimeout(doNext, 800);
        }), 0);

        return s;
      });
    };

    doNext();
  }, [animatePath]);

  const stopAutoReveal = useCallback(() => {
    if (autoRevealTimeoutRef.current) {
      clearTimeout(autoRevealTimeoutRef.current);
      autoRevealTimeoutRef.current = null;
    }
    setState((s) => ({ ...s, autoRevealing: false }));
  }, []);

  const revealAll = useCallback(() => {
    // Stop auto-reveal if running
    if (autoRevealTimeoutRef.current) {
      clearTimeout(autoRevealTimeoutRef.current);
      autoRevealTimeoutRef.current = null;
    }

    setState((s) => {
      if (!s.ladderData || s.animatingPath !== null) return s;

      const unrevealed: number[] = [];
      for (let i = 0; i < s.ladderData.columns; i++) {
        if (!s.revealedPaths.has(i)) {
          unrevealed.push(i);
        }
      }

      if (unrevealed.length === 0) {
        return { ...s, phase: "results", autoRevealing: false };
      }

      // Reveal all at once, no animation
      const newRevealed = new Set(s.revealedPaths);
      for (const col of unrevealed) {
        newRevealed.add(col);
      }

      return {
        ...s,
        revealedPaths: newRevealed,
        phase: "results",
        autoRevealing: false,
      };
    });
  }, []);

  const reset = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (autoRevealTimeoutRef.current) {
      clearTimeout(autoRevealTimeoutRef.current);
      autoRevealTimeoutRef.current = null;
    }
    setState((s) => ({
      ...s,
      phase: "setup",
      ladderData: null,
      revealedPaths: new Set<number>(),
      animatingPath: null,
      animationProgress: 0,
      revealQueue: [],
      autoRevealing: false,
    }));
  }, []);

  const allRevealed =
    state.ladderData !== null &&
    state.revealedPaths.size === state.ladderData.columns;

  return {
    state,
    setPlayers,
    setPrizes,
    generate,
    revealOne,
    autoReveal,
    stopAutoReveal,
    revealAll,
    reset,
    allRevealed,
  };
}
