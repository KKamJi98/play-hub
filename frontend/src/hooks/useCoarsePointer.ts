import { useEffect, useState } from "react";

function getIsCoarsePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(any-pointer: coarse)").matches
  );
}

export function useCoarsePointer(): boolean {
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(getIsCoarsePointer);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const queries = [
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(any-pointer: coarse)"),
    ];

    const sync = () => setIsCoarsePointer(getIsCoarsePointer());
    for (const query of queries) {
      query.addEventListener("change", sync);
    }

    return () => {
      for (const query of queries) {
        query.removeEventListener("change", sync);
      }
    };
  }, []);

  return isCoarsePointer;
}
