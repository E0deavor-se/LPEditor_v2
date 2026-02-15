import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type EditorSurfaceStyle = "flat" | "glass";
export type ThemePresetId =
  | "classic"
  | "premium"
  | "midnight"
  | "ivory"
  | "mint";

export type ThemeState = {
  mode: ThemeMode;
  surfaceStyle: EditorSurfaceStyle;
  presetId: ThemePresetId;
  setMode: (mode: ThemeMode) => void;
  setSurfaceStyle: (style: EditorSurfaceStyle) => void;
  setPresetId: (id: ThemePresetId) => void;
};

export const THEME_STORAGE_KEY = "editor_theme_v1";

const DEFAULT_THEME: Pick<ThemeState, "mode" | "surfaceStyle" | "presetId"> = {
  mode: "system",
  surfaceStyle: "glass",
  presetId: "classic",
};

export const useThemeStore = create<ThemeState>((set) => ({
  ...DEFAULT_THEME,
  setMode: (mode) => set({ mode }),
  setSurfaceStyle: (surfaceStyle) => set({ surfaceStyle }),
  setPresetId: (presetId) => set({ presetId }),
}));
