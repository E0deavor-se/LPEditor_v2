"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  THEME_STORAGE_KEY,
  type EditorSurfaceStyle,
  type ThemeMode,
  type ThemePresetId,
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
  const surfaceStyle = useThemeStore((state) => state.surfaceStyle);
  const presetId = useThemeStore((state) => state.presetId);
  const setMode = useThemeStore((state) => state.setMode);
  const setSurfaceStyle = useThemeStore((state) => state.setSurfaceStyle);
  const setPresetId = useThemeStore((state) => state.setPresetId);
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
          surfaceStyle?: EditorSurfaceStyle;
          presetId?: ThemePresetId;
        };
        if (parsed.mode) {
          setMode(parsed.mode);
        }
        if (parsed.surfaceStyle) {
          setSurfaceStyle(parsed.surfaceStyle);
        }
        if (parsed.presetId) {
          setPresetId(parsed.presetId);
        }
      } catch {
        // Ignore invalid storage payload.
      }
    }
    hydratedRef.current = true;
  }, [setMode, setPresetId, setSurfaceStyle]);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const payload = JSON.stringify({ mode, surfaceStyle, presetId });
    window.localStorage.setItem(THEME_STORAGE_KEY, payload);
  }, [mode, presetId, surfaceStyle]);

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
    root.dataset.surface = surfaceStyle;
    root.dataset.preset = presetId;
  }, [resolvedTheme, surfaceStyle, presetId]);

  return <>{children}</>;
}
