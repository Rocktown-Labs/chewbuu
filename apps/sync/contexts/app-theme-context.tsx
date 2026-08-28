import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Uniwind, useUniwind } from "uniwind";

type ThemeName = "dark";

interface AppThemeContextType {
  currentTheme: string;
  isLight: boolean;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
  undefined
);

export const AppThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { theme } = useUniwind();

  React.useEffect(() => {
    if (theme !== "dark") Uniwind.setTheme("dark");
  }, [theme]);

  const isLight = false;
  const isDark = true;

  const setTheme = useCallback(() => {
    Uniwind.setTheme("dark");
  }, []);

  const toggleTheme = useCallback(() => {
    Uniwind.setTheme("dark");
  }, []);

  const value = useMemo(
    () => ({
      currentTheme: theme,
      isDark,
      isLight,
      setTheme,
      toggleTheme,
    }),
    [theme, isLight, isDark, setTheme, toggleTheme]
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
