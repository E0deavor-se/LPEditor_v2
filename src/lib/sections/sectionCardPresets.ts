import type {
  LineMarks,
  SectionCardPresetId,
  SectionCardStyle,
  SectionStyle,
} from "@/src/types/project";

export type SectionCardPreset = {
  id: SectionCardPresetId;
  name: string;
  cardStyle: SectionCardStyle;
  titleMarks: LineMarks;
  headerLayout: "band" | "inner" | "chip";
  surfaceDefaults?: Partial<{
    background: SectionStyle["background"];
    border: SectionStyle["border"];
    shadow: SectionStyle["shadow"];
    layout: Pick<SectionStyle["layout"], "radius">;
  }>;
};

export const DEFAULT_SECTION_CARD_STYLE: SectionCardStyle = {
  presetId: "au PAY",
  borderColor: "transparent",
  borderWidth: 0,
  radius: 0,
  padding: { t: 0, r: 0, b: 0, l: 0 },
  headerStyle: "bandBold",
  headerBgColor: "#EB5505",
  headerTextColor: "#ffffff",
  labelChipEnabled: false,
  labelChipBg: "lg",
  labelChipTextColor: "center",
  shadowEnabled: true,
  shadowOpacity: 0.22,
  innerBgColor: "",
  textColor: "",
};

const buildPresetStyle = (
  presetId: SectionCardPresetId,
  overrides: Partial<SectionCardStyle>
): SectionCardStyle => ({
  ...DEFAULT_SECTION_CARD_STYLE,
  ...overrides,
  presetId,
});

export const SECTION_CARD_PRESETS: SectionCardPreset[] = [
  {
    id: "au PAY",
    name: "au PAY: Title Band Strong",
    cardStyle: DEFAULT_SECTION_CARD_STYLE,
    titleMarks: { bold: true, size: 20 },
    headerLayout: "band",
  },
  {
    id: "box01",
    name: "box01: 実線",
    cardStyle: buildPresetStyle("box01", { headerBgColor: "#0ea5e9" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box02",
    name: "box02: 角丸",
    cardStyle: buildPresetStyle("box02", { headerBgColor: "#22c55e" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box03",
    name: "box03: 二重線",
    cardStyle: buildPresetStyle("box03", { headerBgColor: "#f59e0b" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box04",
    name: "box04: 左帯",
    cardStyle: buildPresetStyle("box04", { headerBgColor: "#6366f1" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box05",
    name: "box05: 上帯",
    cardStyle: buildPresetStyle("box05", { headerBgColor: "#ef4444" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box06",
    name: "box06: 点線",
    cardStyle: buildPresetStyle("box06", { headerBgColor: "#14b8a6" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box07",
    name: "box07: 破線",
    cardStyle: buildPresetStyle("box07", { headerBgColor: "#84cc16" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box08",
    name: "box08: 影枠",
    cardStyle: buildPresetStyle("box08", { headerBgColor: "#3b82f6" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box09",
    name: "box09: 斜線",
    cardStyle: buildPresetStyle("box09", { headerBgColor: "#a855f7" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box10",
    name: "box10: 格子",
    cardStyle: buildPresetStyle("box10", { headerBgColor: "#f97316" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box11",
    name: "box11: 角丸太線",
    cardStyle: buildPresetStyle("box11", { headerBgColor: "#22d3ee" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box12",
    name: "box12: 引き出し",
    cardStyle: buildPresetStyle("box12", { headerBgColor: "#94a3b8" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box13",
    name: "box13: 付箋",
    cardStyle: buildPresetStyle("box13", { headerBgColor: "#facc15" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box14",
    name: "box14: 角落とし",
    cardStyle: buildPresetStyle("box14", { headerBgColor: "#0f766e" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box15",
    name: "box15: 左アクセント",
    cardStyle: buildPresetStyle("box15", { headerBgColor: "#ea580c" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box16",
    name: "box16: ピル枠",
    cardStyle: buildPresetStyle("box16", { headerBgColor: "#0ea5e9" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box17",
    name: "box17: ブロック影",
    cardStyle: buildPresetStyle("box17", { headerBgColor: "#a78bfa" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box18",
    name: "box18: 斜め帯",
    cardStyle: buildPresetStyle("box18", { headerBgColor: "#fb7185" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box19",
    name: "box19: 上下線",
    cardStyle: buildPresetStyle("box19", { headerBgColor: "#10b981" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box20",
    name: "box20: ステッチ",
    cardStyle: buildPresetStyle("box20", { headerBgColor: "#f59e0b" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box21",
    name: "box21: 枠内影",
    cardStyle: buildPresetStyle("box21", { headerBgColor: "#3b82f6" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box22",
    name: "box22: 折り返し",
    cardStyle: buildPresetStyle("box22", { headerBgColor: "#14b8a6" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box23",
    name: "box23: 斜めストライプ",
    cardStyle: buildPresetStyle("box23", { headerBgColor: "#f97316" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box24",
    name: "box24: 角丸ダブル",
    cardStyle: buildPresetStyle("box24", { headerBgColor: "#6366f1" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box25",
    name: "box25: バッジ",
    cardStyle: buildPresetStyle("box25", { headerBgColor: "#ef4444" }),
    titleMarks: { bold: true, size: 18 },
    headerLayout: "inner",
  },
  {
    id: "box26",
    name: "box26: タイトル差し込み",
    cardStyle: buildPresetStyle("box26", {
      headerStyle: "box26",
      headerBgColor: "transparent",
      headerTextColor: "#95ccff",
    }),
    titleMarks: { bold: true, size: 19 },
    headerLayout: "chip",
  },
];

const PRESET_IDS = new Set(SECTION_CARD_PRESETS.map((preset) => preset.id));

export const getSectionCardPreset = (presetId?: SectionCardPresetId) =>
  SECTION_CARD_PRESETS.find((preset) => preset.id === presetId);

export const clampCardShadowOpacity = (value: number) =>
  Math.min(0.3, Math.max(0.02, value));

const normalizeBandSize = (value?: string) =>
  value === "sm" || value === "lg" || value === "md"
    ? value
    : value ?? "md";

export const normalizeSectionCardStyle = (
  input?: Partial<SectionCardStyle>
): SectionCardStyle => {
  const base = DEFAULT_SECTION_CARD_STYLE;
  const presetId = PRESET_IDS.has(input?.presetId as SectionCardPresetId)
    ? (input?.presetId as SectionCardPresetId)
    : base.presetId;
  const headerStyle =
    input?.headerStyle &&
    ["bandBold", "box26"].includes(input.headerStyle)
      ? input.headerStyle
      : base.headerStyle;
  const paddingInput = (input?.padding ?? {}) as Partial<
    SectionCardStyle["padding"]
  >;
  return {
    presetId,
    borderColor: input?.borderColor ?? base.borderColor,
    borderWidth:
      typeof input?.borderWidth === "number"
        ? input.borderWidth
        : base.borderWidth,
    radius: typeof input?.radius === "number" ? input.radius : base.radius,
    padding: {
      t:
        typeof paddingInput.t === "number" ? paddingInput.t : base.padding.t,
      r:
        typeof paddingInput.r === "number" ? paddingInput.r : base.padding.r,
      b:
        typeof paddingInput.b === "number" ? paddingInput.b : base.padding.b,
      l:
        typeof paddingInput.l === "number" ? paddingInput.l : base.padding.l,
    },
    headerStyle,
    headerBgColor: input?.headerBgColor ?? base.headerBgColor,
    headerTextColor: input?.headerTextColor ?? base.headerTextColor,
    labelChipEnabled:
      typeof input?.labelChipEnabled === "boolean"
        ? input.labelChipEnabled
        : base.labelChipEnabled,
    labelChipBg: normalizeBandSize(input?.labelChipBg ?? base.labelChipBg),
    labelChipTextColor:
      input?.labelChipTextColor ?? base.labelChipTextColor,
    shadowEnabled:
      typeof input?.shadowEnabled === "boolean"
        ? input.shadowEnabled
        : base.shadowEnabled,
    shadowOpacity:
      typeof input?.shadowOpacity === "number"
        ? clampCardShadowOpacity(input.shadowOpacity)
        : base.shadowOpacity,
    innerBgColor: input?.innerBgColor ?? base.innerBgColor,
    textColor: input?.textColor ?? base.textColor,
  };
};

export const resolveSectionCardPresetId = (
  style: SectionCardStyle
): SectionCardPresetId =>
  PRESET_IDS.has(style.presetId)
    ? style.presetId
    : "au PAY";

export const extractLegacyPresetId = (customCss?: string) => {
  if (!customCss) {
    return undefined;
  }
  const match = customCss.match(
    /--lp-section-preset\s*:\s*([a-zA-Z0-9_-]+)/
  );
  const raw = match?.[1];
  if (!raw || !PRESET_IDS.has(raw as SectionCardPresetId)) {
    return undefined;
  }
  return raw as SectionCardPresetId;
};
