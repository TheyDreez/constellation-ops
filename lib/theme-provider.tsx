"use client";
import { createContext, useContext, useLayoutEffect, useState } from "react";

type Theme = "light" | "dark";
interface ThemeContextType { theme: Theme; setTheme: (t: Theme) => void; }

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useLayoutEffect(() => {
    // Always dark — constellation theme is dark-only
    document.documentElement.classList.add("dark");
    setThemeState("dark");
  }, []);

  const setTheme = (t: Theme) => {
    // Force dark always
    setThemeState("dark");
    document.documentElement.classList.add("dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
