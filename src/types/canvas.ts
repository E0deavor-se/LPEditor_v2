/* ───────────────────────────────────────────────
   Canvas Page – 型定義
   ─────────────────────────────────────────────── */

/* ---------- Device ---------- */

export type CanvasDevice = "pc" | "sp";
export type CanvasMode = "free" | "sections";

/* ---------- Layout (配置は PC/SP 別管理) ---------- */

export type CanvasLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number; // rotation (degrees)
  z: number; // z-index
};

export type CanvasVariantLayout = CanvasLayout & {
  /** デバイス別スタイル上書き（base style にマージ） */
  style?: Partial<LayerStyle>;
};

/* ---------- Layer Content ---------- */

export type TextLayerContent = {
  kind: "text";
  text: string;
  /** HTML リッチテキスト (設定時は text より優先) */
  richText?: string;
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

export type TableCell = {
  text: string;
  richText?: string;
  colSpan?: number;
  rowSpan?: number;
  bgColor?: string;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  fontWeight?: number;
};

export type TableLayerContent = {
  kind: "table";
  rows: TableCell[][];
  headerRows?: number;
  borderColor?: string;
  borderWidth?: number;
  cellPadding?: number;
};

export type LayerContent =
  | TextLayerContent
  | ImageLayerContent
  | ShapeLayerContent
  | ButtonLayerContent
  | SvgLayerContent
  | GroupLayerContent
  | TableLayerContent;

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

export type ImageLayerSettings = {
  lockAspect: boolean;
  fitMode: "contain" | "cover";
  focalPoint: { x: number; y: number };
};

export type HorizontalConstraint = "fixed" | "left" | "right" | "stretch";

export type LayerConstraints = {
  horizontal?: HorizontalConstraint;
  marginLeft?: number;
  marginRight?: number;
};

/* ---------- Layer ---------- */

export type LayerType = "text" | "image" | "shape" | "button" | "svg" | "group" | "table";

export type CanvasLayer = {
  id: string;
  type: LayerType;
  name: string;
  locked: boolean;
  hidden: boolean;
  groupId?: string;
  content: LayerContent;
  style: LayerStyle;
  imageSettings?: ImageLayerSettings;
  constraints?: LayerConstraints;
  variants: {
    pc: CanvasVariantLayout;
    sp: CanvasVariantLayout;
  };
  /** レイヤーの表示対象デバイス。省略時は両方 */
  visibleOn?: ("pc" | "sp")[];
  /** セクション背景レイヤー専用: グラデーション/画像等 */
  _sectionBg?: CanvasBackground;
  /** AI生成バッチ識別子。同一 AI 適用操作で追加された layer 間で共有 */
  aiBatchId?: string;
  /** AI生成セット種別 (heroSet / ctaSet / benefitSet など) */
  aiSetType?: string;
  /** AI生成セットの表示ラベル */
  aiSetLabel?: string;
  /** AI によって挿入された layer かどうか */
  insertedByAi?: boolean;
};

/** Type-safe layout accessor (readonly use). */
export const getLayout = (layer: CanvasLayer, device: CanvasDevice): CanvasLayout =>
  device === "pc" ? layer.variants.pc : layer.variants.sp;

export const getLayerStyle = (layer: CanvasLayer, device: CanvasDevice): LayerStyle => {
  const variant = device === "pc" ? layer.variants.pc : layer.variants.sp;
  return {
    ...layer.style,
    ...(variant.style ?? {}),
  };
};

export const resolveConstraints = (
  variant: CanvasLayout,
  constraints: LayerConstraints | undefined,
  designWidth: number
): CanvasLayout => {
  const horizontal = constraints?.horizontal ?? "fixed";
  if (horizontal !== "stretch") return variant;
  const marginLeft = Math.max(0, constraints?.marginLeft ?? 0);
  const marginRight = Math.max(0, constraints?.marginRight ?? 0);
  return {
    ...variant,
    x: marginLeft,
    w: Math.max(1, designWidth - marginLeft - marginRight),
  };
};

export const resolveLayerLayout = (
  layer: CanvasLayer,
  device: CanvasDevice,
  canvasWidth: number
): CanvasLayout => {
  return resolveConstraints(getLayout(layer, device), layer.constraints, canvasWidth);
};

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
  mode?: CanvasMode;
  free?: {
    layers: CanvasLayer[];
  };
  sections?: {
    sections: CanvasSection[];
  };
  meta: {
    size: {
      pc: CanvasSize;
      sp: CanvasSize;
    };
  };
  background: CanvasBackground;
  /** legacy flat layers (互換維持) */
  layers: CanvasLayer[];
  /** Canonical canvas selection state for editor project persistence */
  selectedNodeIds?: string[];
  guides?: CanvasGuide[];
};

export type CanvasSection = {
  id: string;
  name: string;
  title?: string;
  /** 単色文字列 (legacy) または CanvasBackground オブジェクト */
  background: CanvasBackground | string;
  paddingTop: number;
  paddingBottom: number;
  gap: number;
  minHeight?: number;
  layers: CanvasLayer[];
};

/** background フィールドを正規化: string → CanvasBackground */
export const normalizeSectionBackground = (
  bg: CanvasBackground | string | undefined
): CanvasBackground => {
  if (!bg) return DEFAULT_SECTION_BG;
  if (typeof bg === "string") return { type: "solid", color: bg };
  return bg;
};

/** 背景を単色文字列として取る互換ヘルパー */
export const getSectionBgColor = (
  bg: CanvasBackground | string | undefined
): string => {
  const normalized = normalizeSectionBackground(bg);
  return normalized.type === "solid" ? normalized.color : "transparent";
};

export type CanvasSectionMetric = {
  sectionId: string;
  yOffset: number;
  contentOffsetY: number;
  height: number;
  gap: number;
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

export const DEFAULT_SECTION_BG_COLOR = "#f5f5f5";
export const DEFAULT_SECTION_BG: CanvasBackground = { type: "solid", color: DEFAULT_SECTION_BG_COLOR };
export const DEFAULT_SECTION_PADDING_TOP = 24;
export const DEFAULT_SECTION_PADDING_BOTTOM = 24;
export const DEFAULT_SECTION_GAP = 24;
export const DEFAULT_SECTION_MIN_HEIGHT = 320;

export const normalizeSectionModel = (section: CanvasSection): CanvasSection => ({
  ...section,
  name: section.name ?? section.title ?? "セクション",
  background: normalizeSectionBackground(section.background),
  paddingTop: section.paddingTop ?? DEFAULT_SECTION_PADDING_TOP,
  paddingBottom: section.paddingBottom ?? DEFAULT_SECTION_PADDING_BOTTOM,
  gap: section.gap ?? DEFAULT_SECTION_GAP,
  minHeight: section.minHeight ?? DEFAULT_SECTION_MIN_HEIGHT,
  layers: section.layers ?? [],
});

export const createDefaultCanvasDocument = (): CanvasDocument => ({
  mode: "free",
  free: { layers: [] },
  sections: { sections: [] },
  meta: {
    size: {
      pc: { ...DEFAULT_PC_SIZE },
      sp: { ...DEFAULT_SP_SIZE },
    },
  },
  background: { type: "solid", color: "#ffffff" },
  layers: [],
  selectedNodeIds: [],
});

export const getDocumentMode = (doc: CanvasDocument): CanvasMode => doc.mode ?? "free";

export const getFreeLayers = (doc: CanvasDocument): CanvasLayer[] =>
  doc.free?.layers ?? doc.layers;

export const flattenSectionsToLayers = (
  sections: CanvasSection[],
  device: CanvasDevice,
  designWidth: number,
): CanvasLayer[] => {
  const out: CanvasLayer[] = [];
  const metrics = getSectionMetrics(sections, device);

  for (const metric of metrics) {
    const section = normalizeSectionModel(sections.find((s) => s.id === metric.sectionId) ?? sections[0]);
    if (!section) continue;
    const orderedLayers = [...section.layers];

    const bg: CanvasLayer = {
      id: `section-bg:${section.id}`,
      type: "shape",
      name: `Section BG ${section.name}`,
      locked: true,
      hidden: false,
      content: { kind: "shape", shape: "rect" },
      style: {
        ...DEFAULT_LAYER_STYLE,
        fill: getSectionBgColor(section.background),
        radius: 0,
        stroke: "#d1d5db",
        strokeWidth: 1,
      },
      /** セクション背景情報を _sectionBg に保持（レンダラー専用） */
      _sectionBg: normalizeSectionBackground(section.background),
      variants: {
        pc: { x: 0, y: metric.yOffset, w: designWidth, h: metric.height, r: 0, z: -100000 + out.length },
        sp: { x: 0, y: metric.yOffset, w: designWidth, h: metric.height, r: 0, z: -100000 + out.length },
      },
      constraints: { horizontal: "stretch", marginLeft: 0, marginRight: 0 },
    };
    out.push(bg);

    for (const layer of orderedLayers) {
      const cloned = JSON.parse(JSON.stringify(layer)) as CanvasLayer;
      const layout = getLayout(cloned, device);
      layout.y += metric.contentOffsetY;
      out.push(cloned);
    }
  }

  return out;
};

export const getSectionMetrics = (
  sections: CanvasSection[],
  device: CanvasDevice,
): CanvasSectionMetric[] => {
  const metrics: CanvasSectionMetric[] = [];
  let cursorY = 0;

  for (const rawSection of sections) {
    const section = normalizeSectionModel(rawSection);
    const contentBottom = section.layers.length > 0
      ? Math.max(...section.layers.map((l) => getLayout(l, device).y + getLayout(l, device).h))
      : 0;
    const sectionMinHeight = section.minHeight ?? DEFAULT_SECTION_MIN_HEIGHT;
    const sectionHeight = Math.max(
      1,
      sectionMinHeight,
      section.paddingTop + contentBottom + section.paddingBottom,
    );

    metrics.push({
      sectionId: section.id,
      yOffset: cursorY,
      contentOffsetY: cursorY + section.paddingTop,
      height: sectionHeight,
      gap: section.gap,
    });

    cursorY += sectionHeight + section.gap;
  }

  return metrics;
};

export const getSectionContentYOffset = (
  sections: CanvasSection[],
  sectionId: string,
  device: CanvasDevice,
): number => {
  const metric = getSectionMetrics(sections, device).find((m) => m.sectionId === sectionId);
  return metric?.contentOffsetY ?? 0;
};

export const getRenderableLayersForDocument = (
  doc: CanvasDocument,
  device: CanvasDevice,
  designWidth: number,
): CanvasLayer[] => {
  if (getDocumentMode(doc) === "sections") {
    return flattenSectionsToLayers(doc.sections?.sections ?? [], device, designWidth);
  }
  return getFreeLayers(doc);
};

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
    constraints: { horizontal: "fixed", marginLeft: 0, marginRight: 0 },
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
    imageSettings: {
      lockAspect: true,
      fitMode: "cover",
      focalPoint: { x: 0.5, y: 0.5 },
    },
    constraints: { horizontal: "fixed", marginLeft: 0, marginRight: 0 },
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
    constraints: { horizontal: "fixed", marginLeft: 0, marginRight: 0 },
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
    constraints: { horizontal: "fixed", marginLeft: 0, marginRight: 0 },
    variants: {
      pc: { ...layout },
      sp: { ...layout, x: 40, w: 295 },
    },
  };
};

export const createTableLayer = (
  rows: TableCell[][] = [
    [{ text: "項目" }, { text: "内容" }],
    [{ text: "データ1" }, { text: "値1" }],
    [{ text: "データ2" }, { text: "値2" }],
  ],
  overrides?: Partial<CanvasLayout>
): CanvasLayer => {
  const layout = createDefaultLayout({ w: 400, h: 200, ...overrides });
  return {
    id: generateLayerId(),
    type: "table",
    name: "テーブル",
    locked: false,
    hidden: false,
    content: {
      kind: "table",
      rows,
      headerRows: 1,
      borderColor: "#dddddd",
      borderWidth: 1,
      cellPadding: 8,
    },
    style: { ...DEFAULT_LAYER_STYLE, fontSize: 14 },
    constraints: { horizontal: "fixed", marginLeft: 0, marginRight: 0 },
    variants: {
      pc: { ...layout },
      sp: { ...layout, x: 16, w: 343 },
    },
  };
};
