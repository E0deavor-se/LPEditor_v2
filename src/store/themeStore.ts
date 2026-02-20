import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeAccent = "aupay-orange" | "kddi-blue";

export type ThemeState = {
  mode: ThemeMode;
  accent: ThemeAccent;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
};

export const THEME_STORAGE_KEY = "editor_theme_v1";

const DEFAULT_THEME: Pick<ThemeState, "mode" | "accent"> = {
  mode: "light",
  accent: "aupay-orange",
};

export const useThemeStore = create<ThemeState>((set) => ({
  ...DEFAULT_THEME,
  setMode: (mode) => set({ mode }),
  setAccent: (accent) => set({ accent }),
}));
