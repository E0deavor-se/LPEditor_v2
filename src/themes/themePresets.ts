import type { BackgroundSpec, PageBaseStyle } from "@/src/types/project";

export type BuilderThemeId =
  | "orangeCampaign"
  | "blueCorporate"
  | "darkModern"
  | "minimalWhite";

export type BuilderThemePreset = {
  id: BuilderThemeId;
  label: string;
  description: string;
  pageStyle: Partial<PageBaseStyle>;
  backgrounds: {
    page?: BackgroundSpec;
    mv?: BackgroundSpec;
  };
};

export const DEFAULT_BUILDER_THEME_ID: BuilderThemeId = "orangeCampaign";

export const BUILDER_THEME_PRESETS: BuilderThemePreset[] = [
  {
    id: "orangeCampaign",
    label: "Orange Campaign",
    description: "販促向けの明るいオレンジ基調テーマ",
    pageStyle: {
      typography: {
        fontFamily: "'Noto Sans JP', sans-serif",
        baseSize: 16,
        lineHeight: 1.7,
        letterSpacing: 0,
        fontWeight: 400,
      },
      colors: {
        background: "#fffaf5",
        text: "#1f2937",
        accent: "#eb5505",
        border: "#fed7aa",
      },
      layout: {
        maxWidth: 1200,
        align: "center",
        radius: 12,
        shadow: "sm",
      },
      spacing: {
        sectionPadding: { t: 32, r: 24, b: 32, l: 24 },
        sectionGap: 24,
      },
    },
    backgrounds: {
      page: {
        type: "gradient",
        angle: 180,
        stops: [
          { color: "#fff7ed", pos: 0 },
          { color: "#ffffff", pos: 100 },
        ],
      },
      mv: { type: "solid", color: "#fff7ed" },
    },
  },
  {
    id: "blueCorporate",
    label: "Blue Corporate",
    description: "信頼感を重視したコーポレート向けテーマ",
    pageStyle: {
      typography: {
        fontFamily: "'Noto Sans JP', sans-serif",
        baseSize: 16,
        lineHeight: 1.75,
        letterSpacing: 0,
        fontWeight: 400,
      },
      colors: {
        background: "#f8fbff",
        text: "#172554",
        accent: "#1d4ed8",
        border: "#bfdbfe",
      },
      layout: {
        maxWidth: 1200,
        align: "center",
        radius: 10,
        shadow: "none",
      },
    },
    backgrounds: {
      page: {
        type: "gradient",
        angle: 180,
        stops: [
          { color: "#eff6ff", pos: 0 },
          { color: "#ffffff", pos: 100 },
        ],
      },
      mv: { type: "solid", color: "#eff6ff" },
    },
  },
  {
    id: "darkModern",
    label: "Dark Modern",
    description: "コントラスト強めのモダンダークテーマ",
    pageStyle: {
      typography: {
        fontFamily: "'Noto Sans JP', sans-serif",
        baseSize: 16,
        lineHeight: 1.7,
        letterSpacing: 0.2,
        fontWeight: 400,
      },
      colors: {
        background: "#0f172a",
        text: "#e5e7eb",
        accent: "#f59e0b",
        border: "#334155",
      },
      layout: {
        maxWidth: 1200,
        align: "center",
        radius: 14,
        shadow: "md",
      },
    },
    backgrounds: {
      page: {
        type: "gradient",
        angle: 180,
        stops: [
          { color: "#111827", pos: 0 },
          { color: "#020617", pos: 100 },
        ],
      },
      mv: { type: "solid", color: "#111827" },
    },
  },
  {
    id: "minimalWhite",
    label: "Minimal White",
    description: "余白重視のミニマルテーマ",
    pageStyle: {
      typography: {
        fontFamily: "'Noto Sans JP', sans-serif",
        baseSize: 16,
        lineHeight: 1.8,
        letterSpacing: 0,
        fontWeight: 400,
      },
      colors: {
        background: "#ffffff",
        text: "#111827",
        accent: "#111827",
        border: "#e5e7eb",
      },
      layout: {
        maxWidth: 1080,
        align: "center",
        radius: 8,
        shadow: "none",
      },
      spacing: {
        sectionPadding: { t: 36, r: 28, b: 36, l: 28 },
        sectionGap: 28,
      },
    },
    backgrounds: {
      page: { type: "solid", color: "#ffffff" },
      mv: { type: "solid", color: "#ffffff" },
    },
  },
];

export const getBuilderThemePreset = (
  themeId?: string,
): BuilderThemePreset =>
  BUILDER_THEME_PRESETS.find((preset) => preset.id === themeId) ??
  BUILDER_THEME_PRESETS.find((preset) => preset.id === DEFAULT_BUILDER_THEME_ID) ??
  BUILDER_THEME_PRESETS[0];
