export type SectionWidthMode = "full" | "contained";
export type TextAlign = "left" | "center" | "right";
export type AnimType = "none" | "fade" | "slide" | "zoom" | "bounce";
export type AnimTrigger = "onView" | "onScroll";
export type Easing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out";

export type SectionTypography = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: TextAlign;
};

export type SectionColors = {
  text?: string;
  background?: string;
  gradient?: { from: string; to: string; angle?: number } | null;
  border?: string;
};

export type SectionLayout = {
  padding?: { t: number; r: number; b: number; l: number };
  margin?: { t: number; b: number };
  widthMode?: SectionWidthMode;
  radius?: number;
};

export type DecoPosition = "lt" | "rt" | "lb" | "rb" | "bg";
export type DecorationItem = {
  id: string;
  assetId: string;
  position: DecoPosition;
  size: number;
  rotate: number;
  opacity: number;
};

export type SectionDecorations = {
  items: DecorationItem[];
};

export type SectionAnimation = {
  type: AnimType;
  trigger: AnimTrigger;
  speed: number;
  easing: Easing;
};

export type CommonSectionStyle = {
  typography?: SectionTypography;
  colors?: SectionColors;
  layout?: SectionLayout;
  decorations?: SectionDecorations;
  animation?: SectionAnimation;
};

type RawDecorationItem = {
  id?: unknown;
  assetId?: unknown;
  position?: unknown;
  size?: unknown;
  rotate?: unknown;
  opacity?: unknown;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const normalizeCommonStyle = (style: unknown): CommonSectionStyle => {
  const input = toRecord(style);
  const typographyInput = toRecord(input.typography);
  const colorsInput = toRecord(input.colors);
  const layoutInput = toRecord(input.layout);
  const decorationsInput = toRecord(input.decorations);
  const animationInput = toRecord(input.animation);
  const gradientInput = toRecord(colorsInput.gradient);
  const paddingInput = toRecord(layoutInput.padding);
  const marginInput = toRecord(layoutInput.margin);

  const typography: SectionTypography = {
    fontFamily:
      typeof typographyInput["fontFamily"] === "string"
        ? (typographyInput["fontFamily"] as string)
        : undefined,
    fontSize: toNumber(typographyInput["fontSize"]) ?? 16,
    fontWeight: toNumber(typographyInput["fontWeight"]) ?? 500,
    lineHeight: toNumber(typographyInput["lineHeight"]) ?? 1.6,
    letterSpacing: toNumber(typographyInput["letterSpacing"]) ?? 0,
    textAlign: (
      "left center right".split(" ").includes(String(typographyInput["textAlign"]))
        ? typographyInput["textAlign"]
      : "left") as TextAlign,
  };

  const colors: SectionColors = {
    text: typeof colorsInput["text"] === "string" ? (colorsInput["text"] as string) : "",
    background:
      typeof colorsInput["background"] === "string"
        ? (colorsInput["background"] as string)
        : "",
    gradient:
      Object.keys(gradientInput).length > 0
        ? {
            from:
              typeof gradientInput["from"] === "string"
                ? (gradientInput["from"] as string)
                : "#ffffff",
            to:
              typeof gradientInput["to"] === "string"
                ? (gradientInput["to"] as string)
                : "#f1f5f9",
            angle: toNumber(gradientInput["angle"]) ?? 135,
          }
        : null,
    border:
      typeof colorsInput["border"] === "string"
        ? (colorsInput["border"] as string)
        : "",
  };

  const layout: SectionLayout = {
    padding: {
      t: toNumber(paddingInput["t"]) ?? 0,
      r: toNumber(paddingInput["r"]) ?? 0,
      b: toNumber(paddingInput["b"]) ?? 0,
      l: toNumber(paddingInput["l"]) ?? 0,
    },
    margin: {
      t: toNumber(marginInput["t"]) ?? 0,
      b: toNumber(marginInput["b"]) ?? 0,
    },
    widthMode: (layoutInput["widthMode"] === "full"
      ? "full"
      : "contained") as SectionWidthMode,
    radius: toNumber(layoutInput["radius"]) ?? 0,
  };

  const rawDecorationItems = Array.isArray(decorationsInput["items"])
    ? (decorationsInput["items"] as unknown[])
    : [];

  const decorations: SectionDecorations = {
    items: rawDecorationItems
      .filter(
        (item: unknown): item is RawDecorationItem =>
          Boolean(item) && typeof item === "object"
      )
      .map((item: RawDecorationItem) => ({
            id: typeof item.id === "string" ? item.id : "",
            assetId: typeof item.assetId === "string" ? item.assetId : "",
            position:
              item.position === "lt" ||
              item.position === "rt" ||
              item.position === "lb" ||
              item.position === "rb" ||
              item.position === "bg"
                ? item.position
                : "bg",
            size: toNumber(item.size) ?? 120,
            rotate: toNumber(item.rotate) ?? 0,
            opacity: toNumber(item.opacity) ?? 0.8,
          })),
  };

  const animation: SectionAnimation = {
    type:
      ("none fade slide zoom bounce"
        .split(" ")
        .includes(String(animationInput["type"]))
        ? animationInput["type"]
        : "none") as AnimType,
    trigger: animationInput["trigger"] === "onScroll" ? "onScroll" : "onView",
    speed: toNumber(animationInput["speed"]) ?? 500,
    easing:
      ("linear ease ease-in ease-out ease-in-out"
        .split(" ")
        .includes(String(animationInput["easing"]))
        ? animationInput["easing"]
        : "ease-out") as Easing,
  };

  return {
    typography,
    colors,
    layout,
    decorations,
    animation,
  };
};
