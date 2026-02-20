"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  THEME_STORAGE_KEY,
  type ThemeAccent,
  type ThemeMode,
  useThemeStore,
} from "@/src/store/themeStore";

const resolveSystemTheme = () => {
  if (typeof window === "undefined") {
    return "light" as const;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export default function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const mode = useThemeStore((state) => state.mode);
  const accent = useThemeStore((state) => state.accent);
  const setMode = useThemeStore((state) => state.setMode);
  const setAccent = useThemeStore((state) => state.setAccent);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
    resolveSystemTheme()
  );
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          mode?: ThemeMode;
          accent?: ThemeAccent;
        };
        if (parsed.mode) {
          setMode(parsed.mode);
        }
        if (parsed.accent) {
          setAccent(parsed.accent);
        }
      } catch {
        // Ignore invalid storage payload.
      }
    }
    hydratedRef.current = true;
  }, [setAccent, setMode]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const payload = JSON.stringify({ mode, accent });
    window.localStorage.setItem(THEME_STORAGE_KEY, payload);
  }, [accent, mode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = useMemo(
    () => (mode === "system" ? systemTheme : mode),
    [mode, systemTheme]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = accent;
    root.dataset.surface = "glass";
  }, [accent, resolvedTheme]);

  return <>{children}</>;
}
