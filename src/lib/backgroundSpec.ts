import type { BackgroundSpec } from "@/src/types/project";

export type BackgroundStyleResult = {
  style: Record<string, string>;
  video?: { assetId: string; overlayColor?: string };
};

export type BackgroundStyleOptions = {
  resolveAssetUrl?: (assetId: string) => string | undefined;
  resolvePreset?: (presetId: string) => BackgroundSpec | undefined;
  fallbackColor?: string;
};

const DEFAULT_GRADIENT_ANGLE = 135;
const DEFAULT_IMAGE_REPEAT = "no-repeat";
const DEFAULT_IMAGE_SIZE = "cover";
const DEFAULT_IMAGE_POSITION = "center";
const DEFAULT_IMAGE_ATTACHMENT = "scroll";
const DEFAULT_IMAGE_OPACITY = 1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeStopPos = (pos: number) => {
  if (!Number.isFinite(pos)) {
    return 0;
  }
  if (pos >= 0 && pos <= 1) {
    return clamp(pos * 100, 0, 100);
  }
  return clamp(pos, 0, 100);
};

const normalizeSpec = (
  spec: BackgroundSpec,
  fallbackColor: string
): BackgroundSpec => {
  switch (spec.type) {
    case "solid":
      return {
        type: "solid",
        color: spec.color || fallbackColor,
      };
    case "gradient": {
      const stops = Array.isArray(spec.stops) ? spec.stops : [];
      const normalizedStops =
        stops.length > 0
          ? stops
              .filter(
                (stop) => stop && typeof stop.color === "string" && stop.color
              )
              .map((stop) => ({
                color: stop.color,
                pos: normalizeStopPos(stop.pos),
              }))
          : [
              { color: fallbackColor, pos: 0 },
              { color: fallbackColor, pos: 100 },
            ];
      return {
        type: "gradient",
        angle: Number.isFinite(spec.angle) ? spec.angle : DEFAULT_GRADIENT_ANGLE,
        stops: normalizedStops,
      };
    }
    case "image":
      return {
        type: "image",
        assetId: spec.assetId,
        repeat: spec.repeat || DEFAULT_IMAGE_REPEAT,
        size: spec.size || DEFAULT_IMAGE_SIZE,
        position: spec.position || DEFAULT_IMAGE_POSITION,
        attachment: spec.attachment || DEFAULT_IMAGE_ATTACHMENT,
        opacity:
          typeof spec.opacity === "number"
            ? clamp(spec.opacity, 0, 1)
            : DEFAULT_IMAGE_OPACITY,
      };
    case "video":
      return spec;
    case "preset":
      return spec;
    default:
      return { type: "solid", color: fallbackColor };
  }
};

const resolvePresetSpec = (
  spec: BackgroundSpec,
  options: BackgroundStyleOptions,
  depth = 0,
  seen = new Set<string>()
): BackgroundSpec | undefined => {
  if (spec.type !== "preset") {
    return spec;
  }
  if (depth > 3) {
    return undefined;
  }
  if (seen.has(spec.presetId)) {
    return undefined;
  }
  const nextSeen = new Set(seen);
  nextSeen.add(spec.presetId);
  const preset = options.resolvePreset?.(spec.presetId);
  const overrides = spec.overrides ?? {};
  if (!preset) {
    if (overrides && typeof overrides === "object" && "type" in overrides) {
      return overrides as BackgroundSpec;
    }
    return undefined;
  }
  const resolvedPreset = resolvePresetSpec(preset, options, depth + 1, nextSeen);
  if (!resolvedPreset) {
    return undefined;
  }
  if (overrides && typeof overrides === "object" && "type" in overrides) {
    const typedOverrides = overrides as BackgroundSpec;
    if (typedOverrides.type !== resolvedPreset.type) {
      return typedOverrides;
    }
  }
  return { ...resolvedPreset, ...overrides } as BackgroundSpec;
};

const buildGradientCss = (spec: Extract<BackgroundSpec, { type: "gradient" }>) => {
  const stops = spec.stops
    .map((stop) => `${stop.color} ${normalizeStopPos(stop.pos)}%`)
    .join(", ");
  return `linear-gradient(${spec.angle}deg, ${stops})`;
};

export const buildBackgroundStyle = (
  spec: BackgroundSpec | undefined,
  options: BackgroundStyleOptions = {}
): BackgroundStyleResult => {
  const style: Record<string, string> = {};
  if (!spec) {
    return { style };
  }

  const fallbackColor = options.fallbackColor ?? "transparent";
  const resolved = resolvePresetSpec(spec, options);
  if (!resolved) {
    return { style };
  }
  const normalized = normalizeSpec(resolved, fallbackColor);

  switch (normalized.type) {
    case "solid":
      style.backgroundColor = normalized.color || fallbackColor;
      style.backgroundImage = "none";
      break;
    case "gradient":
      style.backgroundImage = buildGradientCss(normalized);
      style.backgroundColor = normalized.stops[0]?.color || fallbackColor;
      break;
    case "image": {
      const imageUrl =
        options.resolveAssetUrl?.(normalized.assetId) ?? normalized.assetId;
      style.backgroundImage = imageUrl ? `url("${imageUrl}")` : "none";
      style.backgroundRepeat = normalized.repeat;
      style.backgroundSize = normalized.size;
      style.backgroundPosition = normalized.position;
      style.backgroundAttachment = normalized.attachment;
      style.backgroundColor = fallbackColor;
      break;
    }
    case "video":
      style.backgroundColor = normalized.overlayColor || fallbackColor;
      style.backgroundImage = "none";
      return {
        style,
        video: {
          assetId: normalized.assetId,
          overlayColor: normalized.overlayColor,
        },
      };
    default:
      style.backgroundColor = fallbackColor;
      style.backgroundImage = "none";
      break;
  }

  return { style };
};
