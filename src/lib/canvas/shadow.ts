import type { LayerShadow } from "@/src/types/canvas";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.trim().replace("#", "");
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
};

export const DEFAULT_LAYER_SHADOW: LayerShadow = {
  enabled: false,
  x: 0,
  y: 2,
  blur: 8,
  spread: 0,
  color: "#000000",
  opacity: 0.15,
};

const fromCssShadow = (css: string): LayerShadow => {
  const value = css.trim();
  if (!value) return { ...DEFAULT_LAYER_SHADOW };
  const rgba = value.match(/rgba?\(([^)]+)\)/i)?.[1] ?? "";
  const colorNums = rgba.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
  const alpha = colorNums.length >= 4 ? clamp(colorNums[3], 0, 1) : DEFAULT_LAYER_SHADOW.opacity;
  const rgb = colorNums.length >= 3
    ? { r: clamp(Math.round(colorNums[0]), 0, 255), g: clamp(Math.round(colorNums[1]), 0, 255), b: clamp(Math.round(colorNums[2]), 0, 255) }
    : { r: 0, g: 0, b: 0 };

  const withoutColor = value.replace(/rgba?\([^)]+\)/gi, "").trim();
  const nums = withoutColor.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  return {
    enabled: true,
    x: Number.isFinite(nums[0]) ? nums[0] : DEFAULT_LAYER_SHADOW.x,
    y: Number.isFinite(nums[1]) ? nums[1] : DEFAULT_LAYER_SHADOW.y,
    blur: Number.isFinite(nums[2]) ? Math.max(0, nums[2]) : DEFAULT_LAYER_SHADOW.blur,
    spread: Number.isFinite(nums[3]) ? nums[3] : DEFAULT_LAYER_SHADOW.spread,
    color: `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`,
    opacity: alpha,
  };
};

export const parseLayerShadow = (shadow?: string | LayerShadow): LayerShadow => {
  if (!shadow) return { ...DEFAULT_LAYER_SHADOW };
  if (typeof shadow === "string") return fromCssShadow(shadow);
  return {
    enabled: Boolean(shadow.enabled),
    x: Number.isFinite(shadow.x) ? shadow.x : DEFAULT_LAYER_SHADOW.x,
    y: Number.isFinite(shadow.y) ? shadow.y : DEFAULT_LAYER_SHADOW.y,
    blur: Number.isFinite(shadow.blur) ? Math.max(0, shadow.blur) : DEFAULT_LAYER_SHADOW.blur,
    spread: Number.isFinite(shadow.spread) ? shadow.spread : DEFAULT_LAYER_SHADOW.spread,
    color: typeof shadow.color === "string" && shadow.color ? shadow.color : DEFAULT_LAYER_SHADOW.color,
    opacity: Number.isFinite(shadow.opacity) ? clamp(shadow.opacity, 0, 1) : DEFAULT_LAYER_SHADOW.opacity,
  };
};

export const layerShadowToCss = (shadow?: string | LayerShadow): string | undefined => {
  if (!shadow) return undefined;
  if (typeof shadow === "string") return shadow || undefined;
  if (!shadow.enabled) return undefined;
  const parsed = parseLayerShadow(shadow);
  const rgb = hexToRgb(parsed.color) ?? { r: 0, g: 0, b: 0 };
  return `${parsed.x}px ${parsed.y}px ${Math.max(0, parsed.blur)}px ${parsed.spread}px rgba(${rgb.r},${rgb.g},${rgb.b},${parsed.opacity})`;
};
