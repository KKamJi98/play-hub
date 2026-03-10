import {
  createContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const noop = () => {};

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: "dark", toggleTheme: noop, setTheme: noop }),
    [],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
