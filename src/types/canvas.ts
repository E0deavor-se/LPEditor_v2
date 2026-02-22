/* ───────────────────────────────────────────────
   Canvas Page – 型定義
   ─────────────────────────────────────────────── */

import type { BackgroundSpec } from "./project";

/* ---------- Device ---------- */

export type CanvasDevice = "pc" | "sp";

/* ---------- Layout (配置は PC/SP 別管理) ---------- */

export type CanvasLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // rotation (degrees)
  z: number; // z-index
};

/* ---------- Layer Content ---------- */

export type TextLayerContent = {
  kind: "text";
  text: string;
};

export type ImageLayerContent = {
  kind: "image";
  assetId: string;
  alt?: string;
};

export type ShapeLayerContent = {
  kind: "shape";
  shape: "rect" | "circle" | "triangle" | "star" | "line";
};

export type ButtonLayerContent = {
  kind: "button";
  label: string;
  href: string;
};

export type SvgLayerContent = {
  kind: "svg";
  svg: string; // raw SVG string
};

export type GroupLayerContent = {
  kind: "group";
};

export type LayerContent =
  | TextLayerContent
  | ImageLayerContent
  | ShapeLayerContent
  | ButtonLayerContent
  | SvgLayerContent
  | GroupLayerContent;

/* ---------- Layer Style (共通) ---------- */

export type LayerStyle = {
  opacity: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  shadow?: string | LayerShadow;
  // Text specific
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
  textColor?: string;
  // Button specific
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonRadius?: number;
};

export type LayerShadow = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
};

/* ---------- Layer ---------- */

export type LayerType = "text" | "image" | "shape" | "button" | "svg" | "group";

export type CanvasLayer = {
  id: string;
  type: LayerType;
  name: string;
  locked: boolean;
  hidden: boolean;
  groupId?: string;
  content: LayerContent;
  style: LayerStyle;
  variants: {
    pc: CanvasLayout;
    sp: CanvasLayout;
  };
  /** レイヤーの表示対象デバイス。省略時は両方 */
  visibleOn?: ("pc" | "sp")[];
};

/** Type-safe layout accessor (readonly use). */
export const getLayout = (layer: CanvasLayer, device: CanvasDevice): CanvasLayout =>
  device === "pc" ? layer.variants.pc : layer.variants.sp;

/* ---------- Canvas Document ---------- */

export type CanvasSize = {
  width: number;
  height: number;
};

export type CanvasBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; angle: number; stops: { color: string; pos: number }[] }
  | { type: "image"; assetId: string };

/* ---------- Guide ---------- */

export type CanvasGuide = {
  id: string;
  axis: "x" | "y"; // "x" = 縦線 (position は x 座標), "y" = 横線
  position: number; // px
};

export type CanvasDocument = {
  meta: {
    size: {
      pc: CanvasSize;
      sp: CanvasSize;
    };
  };
  background: CanvasBackground;
  layers: CanvasLayer[];
  guides?: CanvasGuide[];
};

/* ---------- Canvas Page (ProjectState 拡張用) ---------- */

export type CanvasPageData = {
  type: "canvas";
  id: string;
  name: string;
  canvas: CanvasDocument;
};

/* ---------- Defaults ---------- */

export const DEFAULT_PC_SIZE: CanvasSize = { width: 1200, height: 2400 };
export const DEFAULT_SP_SIZE: CanvasSize = { width: 375, height: 1600 };

export const DEFAULT_LAYER_STYLE: LayerStyle = {
  opacity: 1,
  fill: "#cccccc",
  fontFamily: "system-ui",
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.6,
  letterSpacing: 0,
  textAlign: "left",
  textColor: "#111111",
};

export const createDefaultCanvasDocument = (): CanvasDocument => ({
  meta: {
    size: {
      pc: { ...DEFAULT_PC_SIZE },
      sp: { ...DEFAULT_SP_SIZE },
    },
  },
  background: { type: "solid", color: "#ffffff" },
  layers: [],
});

let _layerIdCounter = 0;
export const generateLayerId = (): string => {
  _layerIdCounter += 1;
  return `layer_${Date.now()}_${_layerIdCounter}`;
};

export const createDefaultLayout = (overrides?: Partial<CanvasLayout>): CanvasLayout => ({
  x: 100,
  y: 100,
  w: 200,
  h: 100,
  r: 0,
  z: 0,
  ...overrides,
});

export const createTextLayer = (text = "テキスト", overrides?: Partial<CanvasLayout>): CanvasLayer => {
  const layout = createDefaultLayout(overrides);
  return {
    id: generateLayerId(),
    type: "text",
    name: "テキスト",
    locked: false,
    hidden: false,
    content: { kind: "text", text },
    style: {
      ...DEFAULT_LAYER_STYLE,
      fontSize: 24,
      fontWeight: 700,
    },
    variants: {
      pc: { ...layout },
      sp: { ...layout, x: 20, w: 335 },
    },
  };
};

export const createImageLayer = (assetId: string, alt = "", overrides?: Partial<CanvasLayout>): CanvasLayer => {
  const layout = createDefaultLayout({ w: 300, h: 200, ...overrides });
  return {
    id: generateLayerId(),
    type: "image",
    name: "画像",
    locked: false,
    hidden: false,
    content: { kind: "image", assetId, alt },
    style: { ...DEFAULT_LAYER_STYLE, fill: undefined },
    variants: {
      pc: { ...layout },
      sp: { ...layout, x: 20, w: 335 },
    },
  };
};

export const createShapeLayer = (
  shape: ShapeLayerContent["shape"] = "rect",
  overrides?: Partial<CanvasLayout>
): CanvasLayer => {
  const layout = createDefaultLayout({ w: 200, h: 200, ...overrides });
  return {
    id: generateLayerId(),
    type: "shape",
    name: shape === "rect" ? "四角形" : shape === "circle" ? "円" : shape === "triangle" ? "三角形" : shape === "star" ? "星" : "線",
    locked: false,
    hidden: false,
    content: { kind: "shape", shape },
    style: { ...DEFAULT_LAYER_STYLE, fill: "#4f46e5", radius: shape === "rect" ? 8 : 0 },
    variants: {
      pc: { ...layout },
      sp: { ...layout },
    },
  };
};

export const createButtonLayer = (label = "ボタン", href = "#", overrides?: Partial<CanvasLayout>): CanvasLayer => {
  const layout = createDefaultLayout({ w: 240, h: 56, ...overrides });
  return {
    id: generateLayerId(),
    type: "button",
    name: "ボタン",
    locked: false,
    hidden: false,
    content: { kind: "button", label, href },
    style: {
      ...DEFAULT_LAYER_STYLE,
      buttonBgColor: "#1f6feb",
      buttonTextColor: "#ffffff",
      buttonRadius: 999,
      fontSize: 16,
      fontWeight: 700,
    },
    variants: {
      pc: { ...layout },
      sp: { ...layout, x: 40, w: 295 },
    },
  };
};
