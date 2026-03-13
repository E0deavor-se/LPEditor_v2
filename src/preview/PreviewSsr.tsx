"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Copy, Trash2 } from "lucide-react";
import SectionCard from "@/src/components/preview/SectionCard";
import { buildBackgroundStyle } from "@/src/lib/backgroundSpec";
import { resolveBackgroundPreset } from "@/src/lib/backgroundPresets";
import { normalizeSectionCardStyle } from "@/src/lib/sections/sectionCardPresets";
import { getSectionFrameData } from "@/src/lib/sections/sectionFrame";
import { renderRichText } from "@/src/lib/richText";
import { renderLayoutSection } from "@/src/lib/renderers/layout/renderLayoutSection";
import { renderUnhandledLayoutSectionFallback } from "@/src/lib/renderers/layout/renderUnhandledLayoutSectionFallback";
import { getLayoutSections } from "@/src/lib/editorProject";
import type {
  ButtonContentItem,
  ContentItem,
  ContentItemAnimation,
  ImageItem,
  ImageContentItem,
  LineMarks,
  ProjectState,
  SectionAnimation,
  SectionBase,
  SectionStyle,
} from "@/src/types/project";

type PreviewUiState = {
  previewMode?: string;
  previewAspect?: string;
  isPreviewBusy?: boolean;
  previewBusyReason?: string;
  showGuides?: boolean;
  showSafeArea?: boolean;
  showSectionBounds?: boolean;
  showScrollSnap?: boolean;
  fontScale?: number;
  showContrastWarnings?: boolean;
};

type PreviewSsrProps = {
  project: ProjectState;
  ui?: PreviewUiState | null;
};

// Temporary switch: keep Layout preview static while preserving all saved animation/behavior settings.
const disableLayoutPreviewMotion = true;

const QUICK_INSERT_SECTION_TYPES = [
  { type: "imageOnly", label: "Image" },
  { type: "legalNotes", label: "Notes" },
  { type: "stickyNote", label: "Sticky Note" },
  { type: "contact", label: "Contact" },
] as const;

type SlideshowImage = ImageItem & { w?: number; h?: number };

const parseHexColor = (value: string) => {
  const cleaned = value.replace("#", "").trim();
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

const toLinear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
};

const getLuminance = (rgb: { r: number; g: number; b: number }) =>
  0.2126 * toLinear(rgb.r) +
  0.7152 * toLinear(rgb.g) +
  0.0722 * toLinear(rgb.b);

const getContrastRatio = (a: string, b: string) => {
  const rgbA = parseHexColor(a);
  const rgbB = parseHexColor(b);
  if (!rgbA || !rgbB) {
    return undefined;
  }
  const lumA = getLuminance(rgbA);
  const lumB = getLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
};

const toText = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const TRUTHY_TOKENS = new Set([
  "対象",
  "〇",
  "○",
  "はい",
  "yes",
  "y",
  "true",
  "1",
  "on",
]);

const isTruthyStoreFlag = (value: string) => {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return TRUTHY_TOKENS.has(normalized);
};

const BUTTON_PRESETS: Record<
  string,
  {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    borderWidth: number;
    radius: number;
    align: "left" | "center" | "right";
    fullWidth?: boolean;
    width?: number;
  }
> = {
  default: {
    backgroundColor: "var(--lp-accent)",
    textColor: "#ffffff",
    borderColor: "var(--lp-accent)",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  secondary: {
    backgroundColor: "#ffffff",
    textColor: "var(--lp-accent)",
    borderColor: "var(--lp-accent)",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  couponFlow: {
    backgroundColor: "#ea5504",
    textColor: "#ffffff",
    borderColor: "#ffffff",
    borderWidth: 2,
    radius: 999,
    align: "center",
  },
  dark: {
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    borderColor: "#0f172a",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  light: {
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  success: {
    backgroundColor: "#16a34a",
    textColor: "#ffffff",
    borderColor: "#16a34a",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  warning: {
    backgroundColor: "#f59e0b",
    textColor: "#111827",
    borderColor: "#f59e0b",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  danger: {
    backgroundColor: "#dc2626",
    textColor: "#ffffff",
    borderColor: "#dc2626",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  ghost: {
    backgroundColor: "transparent",
    textColor: "var(--lp-accent)",
    borderColor: "var(--lp-accent)",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  pill: {
    backgroundColor: "#0ea5e9",
    textColor: "#ffffff",
    borderColor: "#0ea5e9",
    borderWidth: 1,
    radius: 999,
    align: "center",
  },
  block: {
    backgroundColor: "var(--lp-accent)",
    textColor: "#ffffff",
    borderColor: "var(--lp-accent)",
    borderWidth: 1,
    radius: 10,
    align: "center",
    fullWidth: true,
  },
  slate: {
    backgroundColor: "#334155",
    textColor: "#ffffff",
    borderColor: "#334155",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  ocean: {
    backgroundColor: "#0891b2",
    textColor: "#ffffff",
    borderColor: "#0891b2",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  violet: {
    backgroundColor: "#7c3aed",
    textColor: "#ffffff",
    borderColor: "#7c3aed",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  rose: {
    backgroundColor: "#e11d48",
    textColor: "#ffffff",
    borderColor: "#e11d48",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  lime: {
    backgroundColor: "#84cc16",
    textColor: "#1f2937",
    borderColor: "#84cc16",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
  outlineDark: {
    backgroundColor: "transparent",
    textColor: "#0f172a",
    borderColor: "#0f172a",
    borderWidth: 1,
    radius: 8,
    align: "left",
  },
};

const resolveButtonStyle = (item: ButtonContentItem) => {
  const presetId =
    item.style?.presetId ?? (item.variant === "secondary" ? "secondary" : "default");
  const preset = BUTTON_PRESETS[presetId] ?? BUTTON_PRESETS.default;
  return {
    ...preset,
    ...(item.style ?? {}),
  };
};

const ImageSlideshow = ({
  images,
  assets,
  intervalMs = 3000,
  disableMotion = false,
}: {
  images: SlideshowImage[];
  assets?: ProjectState["assets"];
  intervalMs?: number;
  disableMotion?: boolean;
}) => {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const hasMultiple = count > 1;

  useEffect(() => {
    if (!hasMultiple || disableMotion) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, disableMotion, hasMultiple, intervalMs]);

  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = images[safeIndex];
  const resolvedSrc = current?.assetId
    ? assets?.[current.assetId]?.data || current.src
    : current?.src;
  const aspectRatio =
    current?.w && current?.h ? `${current.w} / ${current.h}` : undefined;

  return (
    <div className="relative w-full">
      <div
        className="w-full overflow-hidden rounded-lg"
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {resolvedSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- Editor preview needs raw img for data URLs and parity with export HTML.
          <img
            src={resolvedSrc}
            alt={current?.alt ?? ""}
            className="h-full w-full object-contain"
            data-asset-id={current?.assetId}
          />
        ) : null}
      </div>
      {hasMultiple && !disableMotion ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2 py-1 text-xs text-white"
            onClick={() => setIndex((currentIndex) => (currentIndex - 1 + count) % count)}
            aria-label="前の画像"
          >
            ◀
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-2 py-1 text-xs text-white"
            onClick={() => setIndex((currentIndex) => (currentIndex + 1) % count)}
            aria-label="次の画像"
          >
            ▶
          </button>
          <div className="mt-2 flex items-center justify-center gap-2">
            {images.map((entry, dotIndex) => (
              <button
                key={entry.id}
                type="button"
                className={
                  "h-2 w-2 rounded-full " +
                  (dotIndex === safeIndex
                    ? "bg-[var(--lp-text)]"
                    : "bg-[var(--lp-border)]")
                }
                aria-label={`画像${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};


const isTargetStoresNoticeItem = (item: ContentItem) =>
  item.type === "text" &&
  item.lines.length > 0 &&
  item.lines.every((line) => Boolean(line.marks?.callout?.enabled));

const getTargetStoresNoticeItem = (items?: ContentItem[]) =>
  items?.find(isTargetStoresNoticeItem);

const resolveImageLayout = (
  layout: ImageContentItem["layout"],
  count: number
) => {
  if (layout === "auto") {
    if (count <= 1) {
      return "vertical" as const;
    }
    if (count === 2) {
      return "columns2" as const;
    }
    if (count === 3) {
      return "columns3" as const;
    }
    return "grid" as const;
  }
  if (!layout) {
    return count > 1 ? ("slideshow" as const) : ("vertical" as const);
  }
  return layout;
};

const getImageLayoutClass = (layout: ImageContentItem["layout"]) => {
  if (layout === "horizontal") {
    return "flex flex-row gap-3 overflow-x-auto";
  }
  if (layout === "columns2") {
    return "grid grid-cols-2 gap-3";
  }
  if (layout === "columns3") {
    return "grid grid-cols-2 gap-3 sm:grid-cols-3";
  }
  if (layout === "grid") {
    return "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
  }
  return "flex flex-col gap-3";
};


const buildSectionStyle = (style: SectionStyle | undefined): CSSProperties => {
  if (!style) {
    return {};
  }

  const result: CSSProperties = {};
  const typography = style.typography;
  result.fontFamily = typography.fontFamily;
  result.fontSize = `calc(${typography.fontSize}px * var(--lp-font-scale, 1))`;
  result.fontWeight = typography.fontWeight;
  result.lineHeight = typography.lineHeight;
  result.letterSpacing = `${typography.letterSpacing}px`;
  result.textAlign = typography.textAlign;
  result.color = typography.textColor;

  if (style.backgroundTransparent) {
    result.backgroundColor = "transparent";
    result.backgroundImage = "none";
  } else if (style.background.type === "gradient") {
    result.backgroundImage = `linear-gradient(135deg, ${style.background.color1}, ${style.background.color2})`;
    result.backgroundColor = style.background.color1;
  } else {
    result.backgroundColor = style.background.color1;
    result.backgroundImage = "none";
  }

  if (style.border.enabled) {
    result.border = `${style.border.width}px solid ${style.border.color}`;
  } else {
    result.border = "none";
  }

  if (style.shadow === "sm") {
    result.boxShadow = "0 12px 24px rgba(120, 53, 15, 0.12)";
  } else if (style.shadow === "md") {
    result.boxShadow = "0 18px 36px rgba(120, 53, 15, 0.16)";
  } else {
    result.boxShadow = "none";
  }

  const layout = style.layout;
  const isFullWidth = layout.fullWidth;
  const paddingRight = isFullWidth ? 0 : layout.padding.r;
  const paddingLeft = isFullWidth ? 0 : layout.padding.l;
  result.padding = `${layout.padding.t}px ${paddingRight}px ${layout.padding.b}px ${paddingLeft}px`;
  result.maxWidth = isFullWidth ? "100%" : `${layout.maxWidth}px`;
  result.marginLeft = isFullWidth ? 0 : layout.align === "center" ? "auto" : 0;
  result.marginRight = isFullWidth ? 0 : layout.align === "center" ? "auto" : 0;
  result.borderRadius = `${layout.radius}px`;
  result.width = "100%";

  return result;
};

const buildLayoutStyle = (style: SectionStyle | undefined): CSSProperties => {
  const base = buildSectionStyle(style);
  return {
    padding: base.padding,
    maxWidth: base.maxWidth,
    marginLeft: base.marginLeft,
    marginRight: base.marginRight,
    width: base.width,
  };
};

const buildLayoutStyleWithOverrides = (
  style: SectionStyle | undefined,
  options: {
    forceFullWidth?: boolean;
    paddingTopPx?: number;
    paddingRightPx?: number;
    paddingBottomPx?: number;
    paddingLeftPx?: number;
  }
): CSSProperties => {
  if (!style) {
    return {};
  }
  const layout = style.layout;
  const isFullWidth = options.forceFullWidth ?? layout.fullWidth;
  const paddingTop = options.paddingTopPx ?? layout.padding.t;
  const paddingBottom = options.paddingBottomPx ?? layout.padding.b;
  const paddingRight =
    options.paddingRightPx ?? (isFullWidth ? 0 : layout.padding.r);
  const paddingLeft =
    options.paddingLeftPx ?? (isFullWidth ? 0 : layout.padding.l);
  return {
    padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
    maxWidth: isFullWidth ? "100%" : `${layout.maxWidth}px`,
    marginLeft: isFullWidth ? 0 : layout.align === "center" ? "auto" : 0,
    marginRight: isFullWidth ? 0 : layout.align === "center" ? "auto" : 0,
    width: "100%",
  };
};

const buildAnimationStyle = (animation?: ContentItemAnimation): CSSProperties => {
  if (disableLayoutPreviewMotion) {
    return {};
  }
  if (!animation) {
    return {};
  }
  const name =
    animation.preset === "slideUp"
      ? "lpSlideUp"
      : animation.preset === "zoom"
      ? "lpZoomIn"
      : "lpFadeIn";
  return {
    animation: `${name} ${animation.durationMs}ms ease ${animation.delayMs}ms both`,
  };
};

const buildSectionAnimationStyle = (
  animation?: SectionAnimation
): CSSProperties => {
  if (disableLayoutPreviewMotion) {
    return {};
  }
  if (!animation || animation.type === "none") {
    return {};
  }
  const name =
    animation.type === "slide"
      ? "lpSlideUp"
      : animation.type === "slideDown"
      ? "lpSlideDown"
      : animation.type === "slideLeft"
      ? "lpSlideLeft"
      : animation.type === "slideRight"
      ? "lpSlideRight"
      : animation.type === "zoom"
      ? "lpZoomIn"
      : animation.type === "bounce"
      ? "lpBounceIn"
      : animation.type === "flip"
      ? "lpFlipIn"
      : animation.type === "flipY"
      ? "lpFlipYIn"
      : animation.type === "rotate"
      ? "lpRotateIn"
      : animation.type === "blur"
      ? "lpBlurIn"
      : animation.type === "pop"
      ? "lpPopIn"
      : animation.type === "swing"
      ? "lpSwingIn"
      : animation.type === "float"
      ? "lpFloatIn"
      : animation.type === "pulse"
      ? "lpPulseIn"
      : animation.type === "shake"
      ? "lpShakeIn"
      : animation.type === "wobble"
      ? "lpWobbleIn"
      : animation.type === "skew"
      ? "lpSkewIn"
      : animation.type === "roll"
      ? "lpRollIn"
      : animation.type === "tilt"
      ? "lpTiltIn"
      : animation.type === "zoomOut"
      ? "lpZoomOutIn"
      : animation.type === "stretch"
      ? "lpStretchIn"
      : animation.type === "compress"
      ? "lpCompressIn"
      : animation.type === "glide"
      ? "lpGlideIn"
      : "lpFadeIn";
  return {
    animation: `${name} ${animation.speed}ms ${animation.easing} 0ms both`,
  };
};

const buildScopedCustomCss = (css: string | undefined, sectionId: string) => {
  const raw = typeof css === "string" ? css.trim() : "";
  if (!raw) {
    return "";
  }
  const scope = `#sec-${sectionId}`;
  const replacedScope = raw.replace(/:scope/g, scope);
  if (!replacedScope.includes("{")) {
    return `${scope} { ${replacedScope} }`;
  }
  return replacedScope
    .split("}")
    .map((block) => {
      const parts = block.split("{");
      if (parts.length < 2) {
        return "";
      }
      const selector = parts.shift()?.trim();
      const body = parts.join("{").trim();
      if (!selector || !body) {
        return "";
      }
      if (selector.startsWith("@")) {
        return `${selector}{${body}}`;
      }
      const scopedSelector = selector
        .split(",")
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) {
            return "";
          }
          if (trimmed.startsWith(scope) || trimmed.includes(scope)) {
            return trimmed;
          }
          return `${scope} ${trimmed}`;
        })
        .filter(Boolean)
        .join(", ");
      return `${scopedSelector} { ${body} }`;
    })
    .filter(Boolean)
    .join("\n");
};

const animationStyleSheet = `
  @keyframes lpFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes lpSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lpSlideDown {
    from { opacity: 0; transform: translateY(-16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lpSlideLeft {
    from { opacity: 0; transform: translateX(16px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes lpSlideRight {
    from { opacity: 0; transform: translateX(-16px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes lpZoomIn {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes lpBounceIn {
    0% { opacity: 0; transform: translateY(18px); }
    60% { opacity: 1; transform: translateY(-6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes lpFlipIn {
    0% { opacity: 0; transform: rotateX(70deg); }
    100% { opacity: 1; transform: rotateX(0deg); }
  }
  @keyframes lpFlipYIn {
    0% { opacity: 0; transform: rotateY(70deg); }
    100% { opacity: 1; transform: rotateY(0deg); }
  }
  @keyframes lpRotateIn {
    from { opacity: 0; transform: rotate(-6deg) scale(0.98); }
    to { opacity: 1; transform: rotate(0deg) scale(1); }
  }
  @keyframes lpBlurIn {
    from { opacity: 0; filter: blur(12px); }
    to { opacity: 1; filter: blur(0); }
  }
  @keyframes lpPopIn {
    0% { opacity: 0; transform: scale(0.92); }
    70% { opacity: 1; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lpSwingIn {
    0% { opacity: 0; transform: rotate(6deg) translateY(6px); }
    100% { opacity: 1; transform: rotate(0deg) translateY(0); }
  }
  @keyframes lpFloatIn {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes lpPulseIn {
    0% { opacity: 0; transform: scale(0.98); }
    70% { opacity: 1; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lpShakeIn {
    0% { opacity: 0; transform: translateX(-10px); }
    30% { opacity: 1; transform: translateX(8px); }
    55% { transform: translateX(-6px); }
    80% { transform: translateX(4px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes lpWobbleIn {
    0% { opacity: 0; transform: rotate(-4deg) translateX(-8px); }
    50% { opacity: 1; transform: rotate(3deg) translateX(6px); }
    100% { opacity: 1; transform: rotate(0deg) translateX(0); }
  }
  @keyframes lpSkewIn {
    0% { opacity: 0; transform: skewY(6deg) translateY(8px); }
    100% { opacity: 1; transform: skewY(0deg) translateY(0); }
  }
  @keyframes lpRollIn {
    0% { opacity: 0; transform: translateX(-18px) rotate(-12deg); }
    100% { opacity: 1; transform: translateX(0) rotate(0deg); }
  }
  @keyframes lpTiltIn {
    0% { opacity: 0; transform: rotate(-6deg) translateY(6px); }
    100% { opacity: 1; transform: rotate(0deg) translateY(0); }
  }
  @keyframes lpZoomOutIn {
    0% { opacity: 0; transform: scale(1.06); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lpStretchIn {
    0% { opacity: 0; transform: scaleX(0.92) scaleY(1.06); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lpCompressIn {
    0% { opacity: 0; transform: scaleX(1.06) scaleY(0.92); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes lpGlideIn {
    0% { opacity: 0; transform: translateX(-14px); }
    100% { opacity: 1; transform: translateX(0); }
  }
`;

const staticLayoutPreviewStyleSheet = `
  #__lp_root__ {
    scroll-behavior: auto !important;
  }
  #__lp_root__ *,
  #__lp_root__ *::before,
  #__lp_root__ *::after {
    animation: none !important;
    transition: none !important;
  }
`;

const calloutPadding = (value?: "sm" | "md" | "lg") =>
  value === "sm" ? "8px" : value === "lg" ? "16px" : "12px";
const calloutVariantClass = (variant?: "note" | "warn" | "info") =>
  variant === "warn"
    ? "lp-callout--warn"
    : variant === "info"
    ? "lp-callout--info"
    : "lp-callout--note";
const buildCalloutStyle = (callout?: LineMarks["callout"]) => {
  const style = {
    "--lp-callout-pad": calloutPadding(callout?.padding),
    "--lp-callout-radius": `${callout?.radius ?? 12}px`,
    "--lp-callout-shadow":
      callout?.shadow === "sm"
        ? "0 6px 16px rgba(15, 23, 42, 0.12)"
        : callout?.shadow === "md"
        ? "0 14px 30px rgba(15, 23, 42, 0.18)"
        : "none",
    "--lp-callout-border-width": callout?.border === false ? "0" : "1px",
  } as CSSProperties & Record<string, string>;
  if (callout?.bgColor && callout?.bg !== false) {
    style["--lp-callout-bg"] = callout.bgColor;
  }
  if (callout?.borderColor && callout?.border !== false) {
    style["--lp-callout-border"] = callout.borderColor;
  }
  if (callout?.bg === false) {
    style["--lp-callout-bg"] = "transparent";
  }
  return style;
};

const renderContentItems = (
  section: SectionBase,
  items: ContentItem[],
  textColor: string,
  assets: ProjectState["assets"]
) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-0 flex flex-col gap-4">
      {items.map((item) => {
        if (item.type === "text") {
          const calloutLines = item.lines.filter(
            (line) => line.marks?.callout?.enabled
          );
          const wrapAll =
            calloutLines.length > 0 && calloutLines.length === item.lines.length;
          const firstCallout = calloutLines[0]?.marks?.callout;
          const wrapperClass = wrapAll
            ? `lp-callout lp-callout--stack ${calloutVariantClass(firstCallout?.variant)}`
            : "flex flex-col gap-1";
          const wrapperStyle = wrapAll ? buildCalloutStyle(firstCallout) : undefined;
          return (
            <div
              key={item.id}
              className={wrapperClass}
              style={wrapperStyle}
            >
              {item.lines.map((line) => {
                const weight = line.marks?.bold
                  ? 700
                  : section.style.typography.fontWeight;
                const color = line.marks?.color ?? textColor;
                const size =
                  line.marks?.size ?? section.style.typography.fontSize;
                const textAlign =
                  line.marks?.textAlign ?? section.style.typography.textAlign;
                const text = typeof line.text === "string" ? line.text : "";
                const lineContent = text.length > 0 ? renderRichText(text) : "\u00a0";
                const callout = line.marks?.callout;
                const lineWrap = Boolean(callout?.enabled) && !wrapAll;
                const lineClass = lineWrap
                  ? `lp-callout lp-callout--line ${calloutVariantClass(callout?.variant)}`
                  : "text-[var(--lp-text)]";
                const lineStyle = lineWrap ? buildCalloutStyle(callout) : undefined;
                return (
                  <p
                    key={line.id}
                    className={lineClass}
                    style={{
                      ...(lineStyle ?? {}),
                      fontFamily: section.style.typography.fontFamily,
                      fontWeight: weight,
                      color,
                      fontSize: `calc(${size}px * var(--lp-font-scale, 1))`,
                      letterSpacing: `${section.style.typography.letterSpacing}px`,
                      lineHeight: section.style.typography.lineHeight,
                      textAlign,
                      minHeight: "1em",
                      ...buildAnimationStyle(line.animation ?? item.animation),
                    }}
                  >
                    {lineContent}
                  </p>
                );
              })}
            </div>
          );
        }

        if (item.type === "image") {
          if (item.images.length === 0) {
            return (
              <div
                key={item.id}
                className="flex h-[200px] w-full items-center justify-center rounded-lg border border-dashed border-[var(--lp-border)] text-sm text-[var(--lp-muted)]"
                style={buildAnimationStyle(item.animation)}
              >
                画像を追加してください
              </div>
            );
          }
          const layout = resolveImageLayout(item.layout, item.images.length);
          if (layout === "slideshow") {
            return (
              <div key={item.id} style={buildAnimationStyle(item.animation)}>
                <ImageSlideshow
                  images={item.images}
                  assets={assets}
                  disableMotion={disableLayoutPreviewMotion}
                />
              </div>
            );
          }
          const layoutClass = getImageLayoutClass(layout);
          return (
            <div
              key={item.id}
              className={`lp-image-list ${layoutClass}`}
              data-layout={layout}
            >
              {item.images.map((image) => {
                const resolvedSrc = image.assetId
                  ? assets?.[image.assetId]?.data || image.src
                  : image.src;
                return (
                  // eslint-disable-next-line @next/next/no-img-element -- Editor preview needs raw img for data URLs and parity with export HTML.
                  <img
                    key={image.id}
                    src={resolvedSrc}
                    alt={image.alt ?? ""}
                    className="w-full rounded-lg object-cover"
                    style={buildAnimationStyle(image.animation ?? item.animation)}
                    data-asset-id={image.assetId}
                  />
                );
              })}
            </div>
          );
        }

        if (item.type === "button") {
          const href =
            item.target.kind === "section"
              ? `#sec-${item.target.sectionId}`
              : item.target.url || "#";
          const style = resolveButtonStyle(item);
          const align = style.align ?? "left";
          const wrapperStyle = {
            justifyContent:
              align === "center"
                ? "center"
                : align === "right"
                ? "flex-end"
                : "flex-start",
            width: style.fullWidth ? "100%" : undefined,
          } as CSSProperties;
          return (
            <div key={item.id} className="flex" style={wrapperStyle}>
              <a
                href={href}
                className="inline-flex w-fit items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold"
                style={{
                  ...buildAnimationStyle(item.animation),
                  backgroundColor: style.backgroundColor,
                  color: style.textColor,
                  borderColor: style.borderColor,
                  borderWidth: `${style.borderWidth ?? 1}px`,
                  borderStyle: "solid",
                  borderRadius: `${style.radius ?? 8}px`,
                  width: style.fullWidth
                    ? "100%"
                    : style.width && style.width > 0
                    ? `${style.width}px`
                    : undefined,
                }}
              >
                {item.label || "ボタン"}
              </a>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

const TargetStoresPreviewSection = ({ section }: { section: SectionBase }) => {
  const data = (section.data ?? {}) as Record<string, unknown>;
  const csv = section.content?.storeCsv;
  const headers = useMemo(
    () => (Array.isArray(csv?.headers) ? csv.headers : []),
    [csv]
  );
  const rows = useMemo(() => (Array.isArray(csv?.rows) ? csv.rows : []), [csv]);
  const storeLabels = useMemo(
    () =>
      section.content?.storeLabels && typeof section.content.storeLabels === "object"
        ? section.content.storeLabels
        : {},
    [section.content]
  );
  const storeFilters =
    section.content?.storeFilters && typeof section.content.storeFilters === "object"
      ? section.content.storeFilters
      : {};
  const filterOperator = section.content?.storeFilterOperator === "OR" ? "OR" : "AND";

  const pageSize =
    typeof data.pageSize === "number" && Number.isFinite(data.pageSize) && data.pageSize > 0
      ? data.pageSize
      : 10;
  const showSearchBox = typeof data.showSearchBox === "boolean" ? data.showSearchBox : true;
  const showRegionFilter =
    typeof data.showRegionFilter === "boolean" ? data.showRegionFilter : true;
  const showLabelFilters =
    typeof data.showLabelFilters === "boolean" ? data.showLabelFilters : true;
  const showResultCount =
    typeof data.showResultCount === "boolean" ? data.showResultCount : true;
  const showPager = typeof data.showPager === "boolean" ? data.showPager : true;
  const cardVariant = toText(data.cardVariant || "outlined");
  const cardBg = toText(data.cardBg || "#ffffff");
  const titleBandColor = toText(data.titleBandColor || "#ffffff");
  const titleTextColor = toText(data.titleTextColor || "#1d4ed8");
  const cardBorderColor = toText(data.cardBorderColor || "#e2e8f0");
  const cardRadius =
    typeof data.cardRadius === "number" && Number.isFinite(data.cardRadius)
      ? data.cardRadius
      : 12;
  const cardShadow = toText(data.cardShadow || "0 1px 0 rgba(15,23,42,0.04)");

  const searchPlaceholder = toText(data.searchPlaceholder || "店舗名・住所など");
  const resultCountLabel = toText(data.resultCountLabel || "表示件数");
  const emptyMessage = toText(
    data.emptyMessage || "条件に一致する対象店舗が見つかりませんでした。"
  );
  const pagerPrevLabel = toText(data.pagerPrevLabel || "前へ");
  const pagerNextLabel = toText(data.pagerNextLabel || "次へ");
  const description = toText(data.description || "");

  const idKey = headers.find((entry) => entry === "店舗ID") ?? headers[0] ?? "店舗ID";
  const nameKey = headers.find((entry) => entry === "店舗名") ?? headers[1] ?? "店舗名";
  const postalKey = headers.find((entry) => entry === "郵便番号") ?? headers[2] ?? "郵便番号";
  const addressKey = headers.find((entry) => entry === "住所") ?? headers[3] ?? "住所";
  const regionKey = headers.find((entry) => entry === "都道府県") ?? headers[4] ?? "都道府県";

  const labelKeys = useMemo(() => {
    const keys = Object.keys(storeLabels).length
      ? Object.keys(storeLabels)
      : headers.filter(
          (column) => ![idKey, nameKey, postalKey, addressKey, regionKey].includes(column)
        );
    return keys.filter(
      (column) => ![idKey, nameKey, postalKey, addressKey, regionKey].includes(column)
    );
  }, [addressKey, headers, idKey, nameKey, postalKey, regionKey, storeLabels]);

  const regions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => toText(row[regionKey]).trim()).filter(Boolean))
    );
    return values.sort((a, b) => a.localeCompare(b, "ja"));
  }, [regionKey, rows]);

  const [keyword, setKeyword] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [activeLabels, setActiveLabels] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    Object.entries(storeFilters).forEach(([key, enabled]) => {
      if (enabled === true) {
        defaults.add(key);
      }
    });
    return defaults;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStores = useMemo(() => {
    const needle = keyword.normalize("NFKC").trim().toLowerCase();
    const selected = Array.from(activeLabels);
    return rows.filter((row) => {
      if (needle) {
        const text = [toText(row[nameKey]), toText(row[addressKey]), toText(row[postalKey])]
          .join(" ")
          .normalize("NFKC")
          .toLowerCase();
        if (!text.includes(needle)) {
          return false;
        }
      }
      if (prefecture && toText(row[regionKey]).trim() !== prefecture) {
        return false;
      }
      if (selected.length === 0) {
        return true;
      }
      if (filterOperator === "OR") {
        return selected.some((key) => isTruthyStoreFlag(toText(row[key])));
      }
      return selected.every((key) => isTruthyStoreFlag(toText(row[key])));
    });
  }, [activeLabels, addressKey, filterOperator, keyword, nameKey, postalKey, prefecture, regionKey, rows]);

  const totalCount = filteredStores.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedStores = filteredStores.slice(startIndex, startIndex + pageSize);

  const toggleLabel = (labelKey: string) => {
    setActiveLabels((prev) => {
      const next = new Set(prev);
      if (next.has(labelKey)) {
        next.delete(labelKey);
      } else {
        next.add(labelKey);
      }
      return next;
    });
    setCurrentPage(1);
  };

  const noticeItem = getTargetStoresNoticeItem(section.content?.items);
  const explicitNoteText = typeof data.note === "string" ? data.note : undefined;
  const hasExplicitNote = typeof explicitNoteText === "string";
  const explicitNoteLines: string[] = hasExplicitNote
    ? explicitNoteText
        .split(/\r?\n/)
        .map((entry: string) => entry.trim())
        .filter((entry: string) => entry.length > 0)
    : [];
  const noticeLines: string[] = hasExplicitNote
    ? explicitNoteLines
    : noticeItem && noticeItem.type === "text"
    ? noticeItem.lines.map((line) => line.text.trim()).filter((entry) => entry.length > 0)
    : [
        "ご注意ください！",
        "リストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。",
      ];

  return (
    <section className="container target-stores target-stores--searchCards" style={{ padding: 0, background: "#f8fafc" }}>
      <header className="target-stores__header" style={{ marginBottom: 12 }}>
        {description ? (
          <p className="target-stores__description" style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
            {description}
          </p>
        ) : null}
      </header>
      {noticeLines.length > 0 ? (
        <section className="target-stores__notice" style={{ marginBottom: 12 }}>
          <div style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontWeight: 700, color: "#d9480f", fontSize: 13, marginBottom: 4 }}>
              {noticeLines[0]}
            </div>
            {noticeLines.slice(1).map((line: string, index: number) => (
              <div key={`${line}-${index}`} style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                ● {line}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="target-stores__controls" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        {showSearchBox ? (
          <div className="target-stores__search" style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "#475569" }}>キーワード</label>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setCurrentPage(1);
              }}
              style={{ height: 32, border: "1px solid #e2e8f0", borderRadius: 8, padding: "0 10px", fontSize: 12, minWidth: 200, flex: "1 1 260px", background: "#fff" }}
            />
          </div>
        ) : null}
        {showRegionFilter ? (
          <div className="target-stores__region" style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4 }}>都道府県</label>
            <select
              value={prefecture}
              onChange={(event) => {
                setPrefecture(event.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "100%", height: 32, border: "1px solid #e2e8f0", borderRadius: 8, padding: "0 10px", fontSize: 12, background: "#fff" }}
            >
              <option value="">すべて</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {showLabelFilters ? (
          <div className="target-stores__filters" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            <div className="target-stores__chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {labelKeys
                .filter((key) => storeLabels[key]?.showAsFilter !== false)
                .map((key) => {
                  const active = activeLabels.has(key);
                  const label = storeLabels[key]?.displayName?.trim() || key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleLabel(key)}
                      style={{
                        border: `1px solid ${active ? "#2563eb" : "#e2e8f0"}`,
                        background: active ? "#eff6ff" : "#fff",
                        color: active ? "#1d4ed8" : "#334155",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                        lineHeight: 1.2,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
          </div>
        ) : null}
      </section>
      <section className="target-stores__meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#64748b", gap: 12, marginBottom: 12 }}>
        {showResultCount ? (
          <div className="target-stores__result-count" style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
            {resultCountLabel}: {totalCount}件
          </div>
        ) : (
          <div />
        )}
        {showPager ? (
          <div className="target-stores__pager" style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, marginRight: 6, color: safePage <= 1 ? "#cbd5f5" : "#334155" }}
            >
              {pagerPrevLabel}
            </button>
            <span style={{ fontSize: 12, color: "#64748b", marginRight: 6 }}>
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, Math.max(1, prev + 1)))
              }
              style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, marginRight: 6, color: safePage >= totalPages ? "#cbd5f5" : "#334155" }}
            >
              {pagerNextLabel}
            </button>
          </div>
        ) : null}
      </section>
      <section className="target-stores__cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {pagedStores.map((row, index) => {
          const storeName = toText(row[nameKey] || `店舗${index + 1}`);
          const postalCode = toText(row[postalKey] || "");
          const prefectureName = toText(row[regionKey] || "");
          const address = toText(row[addressKey] || "");
          const badges = labelKeys
            .filter((key) => storeLabels[key]?.showAsBadge !== false)
            .filter((key) => isTruthyStoreFlag(toText(row[key])))
            .map((key) => storeLabels[key]?.displayName?.trim() || key);
          return (
            <article
              key={`${toText(row[idKey] || storeName)}-${index}`}
              className="target-stores__card"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorderColor}`,
                borderRadius: Math.max(0, cardRadius),
                boxShadow:
                  cardVariant === "flat"
                    ? "none"
                    : cardVariant === "elevated"
                    ? cardShadow || "0 8px 18px rgba(15,23,42,0.12)"
                    : cardShadow,
                padding: 14,
              }}
            >
              <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {badges.map((badge) => (
                  <span key={badge} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 999, background: "#f1f5f9", padding: "3px 8px", fontSize: 11, lineHeight: 1.3, color: "#475569", fontWeight: 600 }}>
                    {badge}
                  </span>
                ))}
              </div>
              <h3
                style={{
                  margin: "0 0 6px",
                  color: titleTextColor,
                  fontSize: 14,
                  lineHeight: 1.4,
                  fontWeight: 700,
                  background: titleBandColor,
                }}
              >
                {storeName}
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>
                {postalCode ? `〒${postalCode} ` : ""}
                {prefectureName}
                {address}
              </p>
            </article>
          );
        })}
      </section>
      <section className="target-stores__empty-wrap" style={{ marginTop: 12 }}>
        {totalCount === 0 ? (
          <div className="target-stores__empty" style={{ textAlign: "center", padding: 24, border: "1px dashed #e2e8f0", borderRadius: 12, color: "#94a3b8", background: "#fff" }}>
            {emptyMessage}
          </div>
        ) : null}
      </section>
    </section>
  );
};

const renderSection = (
  section: SectionBase,
  project: ProjectState,
  ui: PreviewUiState | null | undefined
) => {
  if (!section.visible) {
    return null;
  }

  if (section.type === "targetStores") {
    return <TargetStoresPreviewSection section={section} />;
  }

  const sharedRendered = renderLayoutSection(
    section,
    project.assets ?? {},
    ui?.previewMode === "mobile" ? "mobile" : "desktop",
    {
      allSections: getLayoutSections(project),
      stores: project.stores ?? null,
      disableMotion: disableLayoutPreviewMotion,
    }
  );
  if (sharedRendered) {
    return (
      <div
        className="w-full"
        dangerouslySetInnerHTML={{ __html: sharedRendered }}
      />
    );
  }

  return (
    <div
      className="w-full"
      dangerouslySetInnerHTML={{
        __html: renderUnhandledLayoutSectionFallback(section),
      }}
    />
  );
};

export default function PreviewSsr(props: PreviewSsrProps) {
  const { project, ui } = props;
  const assets = project?.assets ?? {};
  const resolveAssetUrl = (assetId: string) => assets?.[assetId]?.data;
  const pageBackground = buildBackgroundStyle(
    project?.settings?.backgrounds?.page,
    {
      resolveAssetUrl,
      resolvePreset: resolveBackgroundPreset,
      fallbackColor: "#ffffff",
    }
  );
  const pageBaseStyle = project?.pageBaseStyle;
  const pageSectionAnimationStyle = buildSectionAnimationStyle(
    pageBaseStyle?.sectionAnimation
  );
  const allSections = project ? getLayoutSections(project) : [];
  const visibleSections = allSections.filter((section) => section.visible);
  const orderedSections = visibleSections;
  const firstSection = orderedSections[0];
  const isFirstFullBleed = Boolean(
    firstSection &&
      (firstSection.type === "brandBar" ||
        firstSection.type === "heroImage" ||
        firstSection.type === "campaignPeriodBar" ||
        firstSection.type === "footerHtml" ||
        firstSection.type === "footer" ||
        firstSection.type === "excludedStoresList" ||
        firstSection.type === "excludedBrandsList" ||
        firstSection.type === "tabbedNotes" ||
        Boolean(firstSection.data?.footerAssets))
  );
  const isFooterLast =
    orderedSections[orderedSections.length - 1]?.type === "footerHtml";
  const topPaddingClass = isFirstFullBleed ? "pt-0" : "pt-12";
  const bottomPaddingClass = isFooterLast ? "pb-0" : "pb-12";
  const fontScale =
    typeof ui?.fontScale === "number" && Number.isFinite(ui.fontScale)
      ? ui.fontScale
      : 1;
  const pageTypography = pageBaseStyle?.typography;
  const pageColors = pageBaseStyle?.colors;
  const previewRootStyle: CSSProperties & Record<string, string> = {
    "--lp-font-scale": String(fontScale),
  };
  if (pageColors?.background) {
    previewRootStyle["--lp-bg"] = pageColors.background;
  }
  if (pageColors?.text) {
    previewRootStyle["--lp-text"] = pageColors.text;
    previewRootStyle["--lp-muted"] =
      `color-mix(in oklab, ${pageColors.text} 60%, transparent)`;
  }
  if (pageColors?.accent) {
    previewRootStyle["--lp-accent"] = pageColors.accent;
  }
  if (pageColors?.border) {
    previewRootStyle["--lp-border"] = pageColors.border;
  }
  if (pageTypography?.fontFamily) {
    previewRootStyle.fontFamily = pageTypography.fontFamily;
  }
  if (typeof pageTypography?.baseSize === "number") {
    previewRootStyle.fontSize = `${pageTypography.baseSize}px`;
  }
  if (typeof pageTypography?.lineHeight === "number") {
    previewRootStyle.lineHeight = String(pageTypography.lineHeight);
  }
  if (typeof pageTypography?.letterSpacing === "number") {
    previewRootStyle.letterSpacing = `${pageTypography.letterSpacing}px`;
  }
  if (typeof pageTypography?.fontWeight === "number") {
    previewRootStyle.fontWeight = pageTypography.fontWeight;
  }
  const pageBackgroundStyle = pageBackground.style as CSSProperties;
  const pageVideo = pageBackground.video;
  const pageVideoUrl = pageVideo?.assetId
    ? assets?.[pageVideo.assetId]?.data || ""
    : "";
  const pageAutoPlay = disableLayoutPreviewMotion
    ? false
    : pageVideo?.autoPlay ?? true;
  const pageLoop = disableLayoutPreviewMotion ? false : pageVideo?.loop ?? true;
  const pageMuted = pageVideo?.muted ?? true;
  const pageInline = pageVideo?.playsInline ?? true;
  const pageOpacity =
    typeof pageVideo?.opacity === "number" ? pageVideo.opacity : 1;
  const pageBlur = typeof pageVideo?.blur === "number" ? pageVideo.blur : 0;
  const pageBrightness =
    typeof pageVideo?.brightness === "number" ? pageVideo.brightness : 1;
  const pageSaturation =
    typeof pageVideo?.saturation === "number" ? pageVideo.saturation : 1;
  const pageFilters = [
    `brightness(${pageBrightness})`,
    `saturate(${pageSaturation})`,
  ];
  if (pageBlur > 0) {
    pageFilters.push(`blur(${pageBlur}px)`);
  }
  if (pageOpacity !== 1) {
    pageFilters.push(`opacity(${pageOpacity})`);
  }
  const sectionGap =
    typeof pageBaseStyle?.spacing?.sectionGap === "number"
      ? pageBaseStyle.spacing.sectionGap
      : 0;

  useEffect(() => {
    const root = document.getElementById("__lp_root__");
    if (!root) {
      return;
    }

    const cleanups: Array<() => void> = [];
    const sliders = Array.from(
      root.querySelectorAll<HTMLElement>('[data-coupon-slideshow="true"]')
    );

    sliders.forEach((sliderRoot) => {
      const slides = Array.from(
        sliderRoot.querySelectorAll<HTMLElement>(".lp-couponflow__slide")
      );
      const dots = Array.from(
        sliderRoot.querySelectorAll<HTMLElement>(".lp-couponflow__dot")
      );
      if (slides.length <= 1) {
        return;
      }

      let currentSlide = Math.max(
        0,
        slides.findIndex((slide) => slide.classList.contains("is-active"))
      );

      const apply = () => {
        slides.forEach((slide, index) => {
          slide.classList.toggle("is-active", index === currentSlide);
        });
        dots.forEach((dot, index) => {
          dot.classList.toggle("is-active", index === currentSlide);
        });
      };

      const goTo = (index: number) => {
        const length = slides.length;
        currentSlide = ((index % length) + length) % length;
        apply();
      };

      const prevButton = sliderRoot.querySelector<HTMLElement>(
        '[data-coupon-nav="prev"]'
      );
      const nextButton = sliderRoot.querySelector<HTMLElement>(
        '[data-coupon-nav="next"]'
      );

      const onPrev = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        goTo(currentSlide - 1);
      };
      const onNext = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        goTo(currentSlide + 1);
      };

      prevButton?.addEventListener("click", onPrev);
      nextButton?.addEventListener("click", onNext);

      dots.forEach((dot, dotIndex) => {
        const onDot = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          goTo(dotIndex);
        };
        dot.addEventListener("click", onDot);
        cleanups.push(() => dot.removeEventListener("click", onDot));
      });

      cleanups.push(() => prevButton?.removeEventListener("click", onPrev));
      cleanups.push(() => nextButton?.removeEventListener("click", onNext));

      apply();
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  });

  return (
    <div
      id="__lp_root__"
      data-export="1"
      className="relative min-h-screen lp-preview-bg text-[var(--lp-text)]"
      style={previewRootStyle}
    >
      {!disableLayoutPreviewMotion ? (
        <style dangerouslySetInnerHTML={{ __html: animationStyleSheet }} />
      ) : null}
      {disableLayoutPreviewMotion ? (
        <style dangerouslySetInnerHTML={{ __html: staticLayoutPreviewStyleSheet }} />
      ) : null}
      <div className="absolute inset-0 pointer-events-none" style={pageBackgroundStyle}>
        {pageVideo && pageVideoUrl ? (
          <video
            className="h-full w-full object-cover"
            src={pageVideoUrl}
            autoPlay={pageAutoPlay}
            muted={pageMuted}
            loop={pageLoop}
            playsInline={pageInline}
            style={{ filter: pageFilters.join(" ") }}
          />
        ) : null}
      </div>
      <main
        className={
          "relative z-10 flex min-h-screen w-full flex-col gap-0 " +
          topPaddingClass +
          " " +
          bottomPaddingClass
        }
        style={{ gap: `${sectionGap}px` }}
      >
        {visibleSections.length === 0 ? (
          <div className="mx-auto w-full max-w-[920px] px-6 text-sm text-[var(--lp-muted)]">
            No sections
          </div>
        ) : null}
        {orderedSections.map((section, index) => {
          const frameData = getSectionFrameData(section, index);
          const scopedCss = buildScopedCustomCss(
            section.style.customCss,
            section.id
          );
          const isFooterLastSection =
            index === orderedSections.length - 1 &&
            section.type === "footerHtml";
          const isHeroFullSize =
            section.type === "heroImage" &&
            Boolean(section.data?.heroFullSize);
          const isSpecialSection =
            section.type === "brandBar" ||
            section.type === "heroImage" ||
            section.type === "imageOnly" ||
            section.type === "campaignPeriodBar" ||
            section.type === "campaignOverview" ||
            section.type === "rankingTable" ||
            section.type === "legalNotes" ||
            section.type === "footerHtml" ||
            section.type === "image" ||
            section.type === "stickyNote" ||
            section.type === "contact" ||
            section.type === "footer" ||
            section.type === "tabbedNotes" ||
            section.type === "imageOnly" ||
            Boolean(section.data?.footerAssets);
          const sectionCardStyle = normalizeSectionCardStyle(
            section.sectionCardStyle
          );
          const items = Array.isArray(section.content?.items)
            ? section.content?.items
            : [];
          const titleItem = items.find((item) => item.type === "title");
          const sectionData = (section.data ?? {}) as Record<string, unknown>;
          const effectiveSectionTitle =
            section.type === "targetStores"
              ? toText(sectionData.title ?? "").trim()
              : titleItem?.text;
          const effectiveTitleMarks =
            section.type === "targetStores" ? undefined : titleItem?.marks;
          const noticeItem =
            section.type === "targetStores"
              ? getTargetStoresNoticeItem(items)
              : undefined;
          const restItemsBase = items.filter(
            (item) =>
              item.type !== "title" &&
              (!noticeItem || item.id !== noticeItem.id)
          );
          const restItems =
            section.type === "legalNotes" || section.type === "couponFlow"
              ? []
              : restItemsBase;
          const textColor =
            sectionCardStyle.textColor || section.style.typography.textColor;
          const backgroundColor =
            section.style.background?.color1 ||
            sectionCardStyle.innerBgColor ||
            "#ffffff";
          const contrastRatio =
            ui?.showContrastWarnings && textColor
              ? getContrastRatio(textColor, backgroundColor)
              : undefined;
          const isLowContrast =
            typeof contrastRatio === "number" && contrastRatio < 4.5;
          return (
            <div key={section.id}>
              <div
                data-section-id={section.id}
                data-section-type={frameData.sectionType}
                data-section-frame={frameData.sectionFrame}
                data-full-width-background={frameData.fullWidthBackground}
                data-lp-metrics={frameData.lpMetrics}
                data-contrast-warning={isLowContrast ? "true" : "false"}
                id={`sec-${section.id}`}
                className={"scroll-mt-4 transition-shadow transition-colors "}
                style={pageSectionAnimationStyle}
              >
                <div className="lp-preview-section-actions" data-preview-section-actions="true">
                  <button
                    type="button"
                    data-section-action="duplicate"
                    data-section-target-id={section.id}
                    className="lp-preview-section-action-btn"
                    title="Duplicate section"
                    aria-label="Duplicate section"
                  >
                    <Copy size={12} aria-hidden="true" />
                    <span className="sr-only">Duplicate</span>
                  </button>
                  <button
                    type="button"
                    data-section-action="delete"
                    data-section-target-id={section.id}
                    className="lp-preview-section-action-btn lp-preview-section-action-btn--danger"
                    title="Delete section"
                    aria-label="Delete section"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    <span className="sr-only">Delete</span>
                  </button>
                </div>
                {scopedCss ? (
                  <style
                    dangerouslySetInnerHTML={{
                      __html: scopedCss,
                    }}
                  />
                ) : null}
                <div
                  className="lp-section-layout"
                  style={
                    isFooterLastSection
                      ? buildLayoutStyleWithOverrides(section.style, {
                          paddingBottomPx: 0,
                        })
                      : isHeroFullSize
                      ? buildLayoutStyleWithOverrides(section.style, {
                          forceFullWidth: true,
                        })
                      : buildLayoutStyle(section.style)
                  }
                >
                  {isSpecialSection ? (
                    renderSection(section, project, ui)
                  ) : (
                    <SectionCard
                      title={effectiveSectionTitle}
                      titleMarks={effectiveTitleMarks}
                      sectionCardStyle={sectionCardStyle}
                      sectionStyle={section.style}
                      titleAnimationStyle={buildAnimationStyle(
                        titleItem?.animation
                      )}
                    >
                      {renderContentItems(section, restItems, textColor, assets)}
                      {renderSection(
                        section,
                        project,
                        ui
                      )}
                    </SectionCard>
                  )}
                </div>
              </div>
              {index < orderedSections.length - 1 ? (
                <div
                  data-preview-insert-slot="true"
                  className="lp-preview-insert-slot"
                >
                  <div className="lp-preview-insert-separator" aria-hidden="true" />
                  <div className="lp-preview-insert-actions">
                    {QUICK_INSERT_SECTION_TYPES.map((entry) => (
                      <button
                        key={`${section.id}-${entry.type}`}
                        type="button"
                        data-add-after-id={section.id}
                        data-add-type={entry.type}
                        className="lp-preview-insert-btn"
                      >
                        + {entry.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </main>
    </div>
  );
}
