import type { BackgroundPatternId, BackgroundPatternSpec } from "@/src/types/project";

export type BackgroundPatternPreset = {
  id: BackgroundPatternId;
  label: string;
  size: number;
  opacity: number;
};

const DEFAULT_FOREGROUND = "#111827";
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_SIZE = 16;
const DEFAULT_OPACITY = 0.15;

export const BACKGROUND_PATTERN_PRESETS: BackgroundPatternPreset[] = [
  { id: "dots", label: "Dots", size: 16, opacity: 0.18 },
  { id: "diagonal", label: "Diagonal", size: 14, opacity: 0.18 },
  { id: "grid", label: "Grid", size: 24, opacity: 0.16 },
  { id: "zigzag", label: "Zigzag", size: 20, opacity: 0.18 },
  { id: "noise", label: "Noise", size: 12, opacity: 0.08 },
  { id: "checker", label: "Checker", size: 18, opacity: 0.16 },
  { id: "cross", label: "Cross", size: 18, opacity: 0.16 },
  { id: "stripes", label: "Stripes", size: 14, opacity: 0.16 },
  { id: "waves", label: "Waves", size: 22, opacity: 0.14 },
  { id: "stars", label: "Stars", size: 22, opacity: 0.2 },
  { id: "hearts", label: "Hearts", size: 22, opacity: 0.2 },
  { id: "ribbon", label: "Ribbon", size: 24, opacity: 0.2 },
  { id: "clouds", label: "Clouds", size: 26, opacity: 0.16 },
  { id: "candy", label: "Candy", size: 22, opacity: 0.2 },
  { id: "balloons", label: "Balloons", size: 26, opacity: 0.18 },
  { id: "flowers", label: "Flowers", size: 24, opacity: 0.18 },
  { id: "bow", label: "Bow", size: 22, opacity: 0.2 },
  { id: "yume", label: "Yume", size: 28, opacity: 0.16 },
];

export const BACKGROUND_PATTERN_OPTIONS = BACKGROUND_PATTERN_PRESETS.map(
  (preset) => ({ id: preset.id, label: preset.label })
);

const PRESET_BY_ID = new Map(
  BACKGROUND_PATTERN_PRESETS.map((preset) => [preset.id, preset])
);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toRgb = (hex: string) => {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return undefined;
    }
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return undefined;
    }
    return { r, g, b };
  }
  return undefined;
};

const toRgba = (color: string, opacity: number) => {
  const rgb = toRgb(color);
  if (!rgb) {
    return color;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

const svgDataUri = (svg: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

export const normalizePatternSpec = (
  spec: Partial<BackgroundPatternSpec>,
  fallbackColor: string
): BackgroundPatternSpec => {
  const preset = PRESET_BY_ID.get(spec.patternId ?? "dots");
  const size = Number.isFinite(spec.size)
    ? clamp(spec.size as number, 4, 120)
    : preset?.size ?? DEFAULT_SIZE;
  const opacity = Number.isFinite(spec.opacity)
    ? clamp(spec.opacity as number, 0, 1)
    : preset?.opacity ?? DEFAULT_OPACITY;
  return {
    type: "pattern",
    patternId: (spec.patternId ?? preset?.id ?? "dots") as BackgroundPatternId,
    foreground: spec.foreground || DEFAULT_FOREGROUND,
    background: spec.background || fallbackColor || DEFAULT_BACKGROUND,
    size,
    opacity,
  };
};

export const buildPatternStyle = (spec: BackgroundPatternSpec) => {
  const size = Math.max(4, spec.size);
  const fg = toRgba(spec.foreground, spec.opacity);
  const style: Record<string, string> = {
    backgroundColor: spec.background,
  };

  switch (spec.patternId) {
    case "dots":
      style.backgroundImage = `radial-gradient(${fg} 1px, transparent 1px)`;
      style.backgroundSize = `${size}px ${size}px`;
      break;
    case "diagonal":
      style.backgroundImage = `repeating-linear-gradient(45deg, ${fg} 0, ${fg} 1px, transparent 1px, transparent ${size}px)`;
      style.backgroundSize = `${size}px ${size}px`;
      break;
    case "grid":
      style.backgroundImage = `linear-gradient(${fg} 1px, transparent 1px), linear-gradient(90deg, ${fg} 1px, transparent 1px)`;
      style.backgroundSize = `${size}px ${size}px`;
      break;
    case "zigzag":
      style.backgroundImage = `linear-gradient(135deg, ${fg} 25%, transparent 25%), linear-gradient(225deg, ${fg} 25%, transparent 25%), linear-gradient(45deg, ${fg} 25%, transparent 25%), linear-gradient(315deg, ${fg} 25%, transparent 25%)`;
      style.backgroundSize = `${size}px ${size}px`;
      style.backgroundPosition = `0 0, 0 ${size / 2}px, ${size / 2}px -${size / 2}px, -${size / 2}px 0`;
      break;
    case "noise": {
      const noiseSize = Math.max(4, Math.round(size / 4));
      const soft = toRgba(spec.foreground, Math.min(spec.opacity, 0.12));
      style.backgroundImage = `linear-gradient(0deg, ${soft} 1px, transparent 1px), linear-gradient(90deg, ${soft} 1px, transparent 1px), linear-gradient(45deg, ${soft} 1px, transparent 1px)`;
      style.backgroundSize = `${noiseSize}px ${noiseSize}px, ${noiseSize}px ${noiseSize}px, ${noiseSize * 2}px ${noiseSize * 2}px`;
      break;
    }
    case "checker": {
      const half = Math.max(2, Math.round(size / 2));
      style.backgroundImage = `linear-gradient(45deg, ${fg} 25%, transparent 25%), linear-gradient(-45deg, ${fg} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fg} 75%), linear-gradient(-45deg, transparent 75%, ${fg} 75%)`;
      style.backgroundSize = `${size}px ${size}px`;
      style.backgroundPosition = `0 0, 0 ${half}px, ${half}px -${half}px, -${half}px 0`;
      break;
    }
    case "cross":
      style.backgroundImage = `linear-gradient(${fg} 1px, transparent 1px), linear-gradient(90deg, ${fg} 1px, transparent 1px), linear-gradient(${fg} 1px, transparent 1px), linear-gradient(90deg, ${fg} 1px, transparent 1px)`;
      style.backgroundSize = `${size}px ${size}px, ${size}px ${size}px, ${size / 2}px ${size / 2}px, ${size / 2}px ${size / 2}px`;
      style.backgroundPosition = "0 0, 0 0, 0 0, 0 0";
      break;
    case "stripes":
      style.backgroundImage = `repeating-linear-gradient(90deg, ${fg} 0, ${fg} 2px, transparent 2px, transparent ${size}px)`;
      style.backgroundSize = `${size}px ${size}px`;
      break;
    case "waves": {
      const wave = Math.max(6, Math.round(size / 2));
      style.backgroundImage = `radial-gradient(circle at 0 50%, ${fg} 0, ${fg} 2px, transparent 2px), radial-gradient(circle at ${wave}px 50%, ${fg} 0, ${fg} 2px, transparent 2px)`;
      style.backgroundSize = `${wave * 2}px ${wave}px`;
      break;
    }
    case "stars": {
      const starSize = Math.max(8, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${starSize}' height='${starSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M12 2l2.7 5.7 6.3.9-4.6 4.4 1.1 6.3L12 16.9l-5.5 2.9 1.1-6.3-4.6-4.4 6.3-.9L12 2z'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${starSize}px ${starSize}px`;
      break;
    }
    case "hearts": {
      const heartSize = Math.max(8, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${heartSize}' height='${heartSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M12 21s-7.5-4.6-9.6-8.3C.9 10.1 2 6.6 5.1 6c1.7-.3 3.4.4 4.5 1.8.3.4.9.4 1.2 0C11.9 6.4 13.6 5.7 15.3 6c3.1.6 4.2 4.1 2.7 6.7C19.5 16.4 12 21 12 21z'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${heartSize}px ${heartSize}px`;
      break;
    }
    case "ribbon": {
      const ribbonSize = Math.max(10, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${ribbonSize}' height='${ribbonSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M6 7c2.8-2.6 7.2-2.6 10 0-1.1 2.3-3.2 3.7-5 3.7S7.1 9.3 6 7zm5 4.7l-6 4.3 2.4-5.2 3.6.9zm2 0l6 4.3-2.4-5.2-3.6.9z'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${ribbonSize}px ${ribbonSize}px`;
      break;
    }
    case "clouds": {
      const cloudSize = Math.max(12, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${cloudSize}' height='${cloudSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M7.5 18h9.2a4.3 4.3 0 0 0 .4-8.6 5 5 0 0 0-9.6-1.2A3.8 3.8 0 0 0 7.5 18z'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${cloudSize}px ${cloudSize}px`;
      break;
    }
    case "candy": {
      const candySize = Math.max(10, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${candySize}' height='${candySize}' viewBox='0 0 24 24' fill='${fg}'><path d='M7 12l-4-3 2 3-2 3 4-3zm10 0l4-3-2 3 2 3-4-3z'/><circle cx='12' cy='12' r='4'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${candySize}px ${candySize}px`;
      break;
    }
    case "balloons": {
      const balloonSize = Math.max(12, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${balloonSize}' height='${balloonSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M12 3c-3.1 0-5.6 2.6-5.6 5.9 0 3.7 2.4 6.7 5.6 6.7s5.6-3 5.6-6.7C17.6 5.6 15.1 3 12 3z'/><path d='M12 15.7l-2 3.3h4l-2-3.3z'/><path d='M12 19v2' stroke='${fg}' stroke-width='1.5' fill='none'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${balloonSize}px ${balloonSize}px`;
      break;
    }
    case "flowers": {
      const flowerSize = Math.max(12, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${flowerSize}' height='${flowerSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M12 7.2c1.3-2.5 4.6-2.1 4.6.7 2.7-.7 4.2 2.4 2.2 4.2 2.2 1.8.5 5-2.2 4.2 0 2.9-3.3 3.2-4.6.7-1.3 2.5-4.6 2.1-4.6-.7-2.7.7-4.2-2.4-2.2-4.2-2.2-1.8-.5-5 2.2-4.2 0-2.9 3.3-3.2 4.6-.7z'/><circle cx='12' cy='12' r='2.2' fill='${fg}'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${flowerSize}px ${flowerSize}px`;
      break;
    }
    case "bow": {
      const bowSize = Math.max(10, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${bowSize}' height='${bowSize}' viewBox='0 0 24 24' fill='${fg}'><path d='M11 12c0-2.2-2.3-4-5-4-1.2 0-2 1.2-1.4 2.3l2.1 3.7-2.1 3.7c-.6 1.1.2 2.3 1.4 2.3 2.7 0 5-1.8 5-4zm2 0c0-2.2 2.3-4 5-4 1.2 0 2 1.2 1.4 2.3l-2.1 3.7 2.1 3.7c.6 1.1-.2 2.3-1.4 2.3-2.7 0-5-1.8-5-4zm-3 0c0 .9.7 1.6 1.6 1.6h1.8c.9 0 1.6-.7 1.6-1.6S14.3 10.4 13.4 10.4h-1.8c-.9 0-1.6.7-1.6 1.6z'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${bowSize}px ${bowSize}px`;
      break;
    }
    case "yume": {
      const yumeSize = Math.max(14, Math.round(size));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${yumeSize}' height='${yumeSize}' viewBox='0 0 24 24'><circle cx='7' cy='8' r='3' fill='${fg}'/><circle cx='16.5' cy='6.5' r='2' fill='${fg}'/><path d='M6 16h9a3.5 3.5 0 0 0 0-7 4.7 4.7 0 0 0-9-1.3A3.6 3.6 0 0 0 6 16z' fill='${fg}'/><path d='M18.8 15.2l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8z' fill='${fg}'/></svg>`;
      style.backgroundImage = svgDataUri(svg);
      style.backgroundSize = `${yumeSize}px ${yumeSize}px`;
      break;
    }
    default:
      style.backgroundImage = "none";
      break;
  }

  return style;
};
