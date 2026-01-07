"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load từ localStorage hoặc system preference
    const savedTheme = localStorage.getItem("theme");
    let shouldBeDark = false;

    if (savedTheme) {
      shouldBeDark = savedTheme === "dark";
    } else {
      // Use system preference
      shouldBeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setMounted(true);
  }, []);

  const toggleDarkMode = () => {
    const newState = !isDark;
    setIsDark(newState);
    if (newState) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Render children ngay lập tức, state sẽ update sau khi mount
  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
