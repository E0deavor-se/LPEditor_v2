"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import SectionCard from "@/src/components/preview/SectionCard";
import { buildBackgroundStyle } from "@/src/lib/backgroundSpec";
import { resolveBackgroundPreset } from "@/src/lib/backgroundPresets";
import { normalizeSectionCardStyle } from "@/src/lib/sections/sectionCardPresets";
import { buildFooterHtml } from "@/src/lib/footerTemplate";
import { renderRichText } from "@/src/lib/richText";
import {
  getStableLabelColor,
  getUniqueLabelColorMap,
} from "@/src/lib/stores/labelColors";
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
  StoreCsvData,
  StoreFilters,
  StoreLabels,
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
  onUpdateTargetStoresFilters?: (
    sectionId: string,
    filters: Record<string, boolean>
  ) => void;
};

type TargetStoresSectionProps = {
  section: SectionBase;
  stores?: ProjectState["stores"];
  ui?: PreviewUiState | null;
  assets?: ProjectState["assets"];
  onUpdateTargetStoresFilters?: (
    sectionId: string,
    filters: Record<string, boolean>
  ) => void;
};

type SlideshowImage = ImageItem & { w?: number; h?: number };

/**
 * 透過PNG/WebPかどうかを判定する（data URL の先頭を見て判定）
 * PNG または WebP の場合に透過の可能性があるとみなす
 */
const isTransparentImage = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith("data:image/png")) return true;
  if (url.startsWith("data:image/webp")) return true;
  if (url.startsWith("data:image/gif")) return true;
  // 外部URL の場合は拡張子で判定
  const lower = url.toLowerCase().split("?")[0];
  return lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif");
};

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

const CouponFlowSlider = ({
  slides,
  assets,
}: {
  slides: SlideshowImage[];
  assets?: ProjectState["assets"];
}) => {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const hasMultiple = count > 1;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = slides[safeIndex];
  const resolvedSrc = current?.assetId
    ? assets?.[current.assetId]?.data || current.src
    : current?.src;
  const aspectRatio =
    current?.w && current?.h ? `${current.w} / ${current.h}` : "3 / 4";

  return (
    <div className="lp-couponflow__slider">
      <button
        type="button"
        className="lp-couponflow__nav lp-couponflow__nav--prev"
        aria-label="前へ"
        disabled={!hasMultiple}
        onClick={() => setIndex((currentIndex) => (currentIndex - 1 + count) % count)}
      />
      <div
        className="lp-couponflow__frame"
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {resolvedSrc ? (
          <img
            src={resolvedSrc}
            alt={current?.alt ?? ""}
            className="lp-couponflow__image"
            data-asset-id={current?.assetId}
          />
        ) : (
          <div className="lp-couponflow__placeholder">画像を追加してください</div>
        )}
      </div>
      <button
        type="button"
        className="lp-couponflow__nav lp-couponflow__nav--next"
        aria-label="次へ"
        disabled={!hasMultiple}
        onClick={() => setIndex((currentIndex) => (currentIndex + 1) % count)}
      />
      {hasMultiple ? (
        <div className="lp-couponflow__dots">
          {slides.map((image, dotIndex) => (
            <button
              key={image.id}
              type="button"
              className={
                dotIndex === safeIndex
                  ? "lp-couponflow__dot is-active"
                  : "lp-couponflow__dot"
              }
              aria-label={`スライド${dotIndex + 1}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const TabbedNotesSection = ({
  section,
  project,
  cardTextColor,
}: {
  section: SectionBase;
  project: ProjectState;
  cardTextColor: string | undefined;
}) => {
  const data = section.data ?? {};
  const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
  const tabs = rawTabs.map((tab, index) => {
    const entry = tab && typeof tab === "object"
      ? (tab as Record<string, unknown>)
      : {};
    const rawItems = Array.isArray(entry.items) ? entry.items : [];
    const items = rawItems.map((item, itemIndex) => {
      const itemEntry = item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
      return {
        id:
          typeof itemEntry.id === "string" && itemEntry.id.trim()
            ? itemEntry.id
            : `tab_item_${index + 1}_${itemIndex + 1}`,
        text: typeof itemEntry.text === "string" ? itemEntry.text : "",
        bullet: itemEntry.bullet === "none" ? "none" : "disc",
        tone: itemEntry.tone === "accent" ? "accent" : "normal",
        bold: Boolean(itemEntry.bold),
        subItems: Array.isArray(itemEntry.subItems)
          ? itemEntry.subItems.map((value) => String(value))
          : [],
      };
    });
    return {
      id: typeof entry.id === "string" && entry.id.trim()
        ? entry.id
        : `tab_${index + 1}`,
      labelTop: typeof entry.labelTop === "string" ? entry.labelTop : "",
      labelBottom:
        typeof entry.labelBottom === "string" ? entry.labelBottom : "注意事項",
      intro: typeof entry.intro === "string" ? entry.intro : "",
      items,
      footnote: typeof entry.footnote === "string" ? entry.footnote : "",
      ctaText: typeof entry.ctaText === "string" ? entry.ctaText : "",
      ctaLinkText:
        typeof entry.ctaLinkText === "string" ? entry.ctaLinkText : "",
      ctaLinkUrl:
        typeof entry.ctaLinkUrl === "string" ? entry.ctaLinkUrl : "",
      ctaTargetKind: entry.ctaTargetKind === "section" ? "section" : "url",
      ctaSectionId:
        typeof entry.ctaSectionId === "string" ? entry.ctaSectionId : "",
      ctaImageUrl:
        typeof entry.ctaImageUrl === "string" ? entry.ctaImageUrl : "",
      ctaImageAlt:
        typeof entry.ctaImageAlt === "string" ? entry.ctaImageAlt : "",
      ctaImageAssetId:
        typeof entry.ctaImageAssetId === "string" ? entry.ctaImageAssetId : "",
      buttonText:
        typeof entry.buttonText === "string" ? entry.buttonText : "",
      buttonTargetKind:
        entry.buttonTargetKind === "section" ? "section" : "url",
      buttonUrl: typeof entry.buttonUrl === "string" ? entry.buttonUrl : "",
      buttonSectionId:
        typeof entry.buttonSectionId === "string" ? entry.buttonSectionId : "",
    };
  });
  const style = data.tabStyle && typeof data.tabStyle === "object"
    ? (data.tabStyle as Record<string, unknown>)
    : {};
  const rawVariant = typeof style.variant === "string" ? style.variant : "simple";
  const variant =
    rawVariant === "sticky" || rawVariant === "underline" || rawVariant === "popout"
      ? rawVariant
      : "simple";
  const tabStyle = {
    variant,
    inactiveBg: typeof style.inactiveBg === "string" ? style.inactiveBg : "#DDDDDD",
    inactiveText:
      typeof style.inactiveText === "string" ? style.inactiveText : "#000000",
    activeBg: typeof style.activeBg === "string" ? style.activeBg : "#000000",
    activeText:
      typeof style.activeText === "string" ? style.activeText : "#FFFFFF",
    border: typeof style.border === "string" ? style.border : "#000000",
    contentBg:
      typeof style.contentBg === "string" ? style.contentBg : "#FFFFFF",
    contentBorder:
      typeof style.contentBorder === "string" ? style.contentBorder : "#000000",
    accent: typeof style.accent === "string" ? style.accent : "#EB5505",
  };
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  useEffect(() => {
    if (tabs.length === 0) {
      return;
    }
    if (!tabs.find((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id ?? "");
    }
  }, [activeTabId, tabs]);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const textColor = cardTextColor ?? section.style.typography.textColor;
  const baseStyle: CSSProperties = {
    fontFamily: section.style.typography.fontFamily,
    fontSize: `calc(${section.style.typography.fontSize}px * var(--lp-font-scale, 1))`,
    fontWeight: section.style.typography.fontWeight,
    letterSpacing: `${section.style.typography.letterSpacing}px`,
    lineHeight: section.style.typography.lineHeight,
    color: textColor,
    ["--lp-tab-inactive-bg" as string]: tabStyle.inactiveBg,
    ["--lp-tab-inactive-text" as string]: tabStyle.inactiveText,
    ["--lp-tab-active-bg" as string]: tabStyle.activeBg,
    ["--lp-tab-active-text" as string]: tabStyle.activeText,
    ["--lp-tab-border" as string]: tabStyle.border,
    ["--lp-tab-content-bg" as string]: tabStyle.contentBg,
    ["--lp-tab-content-border" as string]: tabStyle.contentBorder,
    ["--lp-tab-accent" as string]: tabStyle.accent,
  };
  const resolveLink = (kind: string, sectionId: string, url: string) =>
    kind === "section" && sectionId ? `#sec-${sectionId}` : url;
  const resolvedCtaUrl = resolveLink(
    activeTab?.ctaTargetKind ?? "url",
    activeTab?.ctaSectionId ?? "",
    activeTab?.ctaLinkUrl ?? ""
  );
  const resolvedButtonUrl = resolveLink(
    activeTab?.buttonTargetKind ?? "url",
    activeTab?.buttonSectionId ?? "",
    activeTab?.buttonUrl ?? ""
  );
  const assets = project?.assets ?? {};
  const resolvedCtaImage = activeTab?.ctaImageAssetId
    ? assets?.[activeTab.ctaImageAssetId]?.data || activeTab.ctaImageUrl
    : activeTab?.ctaImageUrl;
  return (
    <section
      className={`lp-tabbed-notes lp-tabbed-notes--${tabStyle.variant}`}
      style={baseStyle}
    >
      <div className="lp-tabbed-notes__shell">
        <div className="lp-tabbed-notes__card">
          <div className="lp-tabbed-notes__tabs">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    "lp-tabbed-notes__tab" + (isActive ? " is-active" : "")
                  }
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.labelTop ? (
                    <span className="lp-tabbed-notes__tab-top">{tab.labelTop}</span>
                  ) : null}
                  <span className="lp-tabbed-notes__tab-bottom">
                    {tab.labelBottom || "注意事項"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="lp-tabbed-notes__panel">
            {activeTab?.intro ? (
              <p className="lp-tabbed-notes__intro">{activeTab.intro}</p>
            ) : null}
            <ul className="lp-tabbed-notes__list">
              {(activeTab?.items ?? []).map((item) => (
                <li
                  key={item.id}
                  className={
                    "lp-tabbed-notes__item" +
                    (item.bullet === "disc" ? " is-disc" : "") +
                    (item.tone === "accent" ? " is-accent" : "") +
                    (item.bold ? " is-bold" : "")
                  }
                >
                  {item.text}
                  {item.subItems.length > 0 ? (
                    <ul className="lp-tabbed-notes__sublist">
                      {item.subItems.map((subItem, index) => (
                        <li key={`${item.id}_sub_${index}`}>{subItem}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            {activeTab?.footnote ? (
              <p className="lp-tabbed-notes__footnote">{activeTab.footnote}</p>
            ) : null}
            {activeTab?.ctaText || activeTab?.ctaLinkText || resolvedCtaImage ? (
              <div className="lp-tabbed-notes__cta">
                {activeTab?.ctaText ? (
                  <p className="lp-tabbed-notes__cta-text">{activeTab.ctaText}</p>
                ) : null}
                {activeTab?.ctaLinkText && resolvedCtaUrl ? (
                  <a className="lp-tabbed-notes__cta-link" href={resolvedCtaUrl}>
                    {activeTab.ctaLinkText}
                  </a>
                ) : null}
                {resolvedCtaImage ? (
                  <a
                    className="lp-tabbed-notes__cta-image"
                    href={resolvedCtaUrl || "#"}
                  >
                    <img src={resolvedCtaImage} alt={activeTab?.ctaImageAlt ?? ""} />
                  </a>
                ) : null}
              </div>
            ) : null}
            {activeTab?.buttonText && resolvedButtonUrl ? (
              <div className="lp-tabbed-notes__button">
                <a
                  className="lp-tabbed-notes__button-link"
                  href={resolvedButtonUrl}
                >
                  {activeTab.buttonText}
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const ImageSlideshow = ({
  images,
  assets,
  intervalMs = 3000,
}: {
  images: SlideshowImage[];
  assets?: ProjectState["assets"];
  intervalMs?: number;
}) => {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const hasMultiple = count > 1;

  useEffect(() => {
    if (!hasMultiple) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, hasMultiple, intervalMs]);

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
          <img
            src={resolvedSrc}
            alt={current?.alt ?? ""}
            className="h-full w-full object-contain"
            data-asset-id={current?.assetId}
          />
        ) : null}
      </div>
      {hasMultiple ? (
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

const MAX_LABEL_BADGES = 3;

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const normalizeTruthValue = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase();

const isTruthyStoreFlag = (value: string) => {
  const normalized = normalizeTruthValue(value);
  if (!normalized) {
    return false;
  }
  return TRUTHY_TOKENS.has(normalized);
};

const resolveStoreCsv = (
  section: SectionBase,
  stores?: ProjectState["stores"]
): StoreCsvData | undefined => {
  const storeCsv = section.content?.storeCsv;
  if (storeCsv && Array.isArray(storeCsv.headers) && storeCsv.headers.length > 0) {
    return storeCsv;
  }
  if (stores?.columns?.length) {
    return {
      headers: stores.columns,
      rows: stores.rows ?? [],
    };
  }
  return undefined;
};

const REGION_GROUPS = [
  {
    region: "北海道",
    items: [{ name: "北海道", label: "北海道", id: "hokkaido" }],
  },
  {
    region: "東北",
    items: [
      { name: "青森県", label: "青森", id: "aomori" },
      { name: "岩手県", label: "岩手", id: "iwate" },
      { name: "宮城県", label: "宮城", id: "miyagi" },
      { name: "秋田県", label: "秋田", id: "akita" },
      { name: "山形県", label: "山形", id: "yamagata" },
      { name: "福島県", label: "福島", id: "fukushima" },
    ],
  },
  {
    region: "関東",
    items: [
      { name: "茨城県", label: "茨城", id: "ibaraki" },
      { name: "栃木県", label: "栃木", id: "tochigi" },
      { name: "群馬県", label: "群馬", id: "gunma" },
      { name: "埼玉県", label: "埼玉", id: "saitama" },
      { name: "千葉県", label: "千葉", id: "chiba" },
      { name: "東京都", label: "東京", id: "tokyo" },
      { name: "神奈川県", label: "神奈川", id: "kanagawa" },
    ],
  },
  {
    region: "中部",
    items: [
      { name: "新潟県", label: "新潟", id: "niigata" },
      { name: "富山県", label: "富山", id: "toyama" },
      { name: "石川県", label: "石川", id: "ishikawa" },
      { name: "福井県", label: "福井", id: "fukui" },
      { name: "山梨県", label: "山梨", id: "yamanashi" },
      { name: "長野県", label: "長野", id: "nagano" },
      { name: "岐阜県", label: "岐阜", id: "gifu" },
      { name: "静岡県", label: "静岡", id: "shizuoka" },
      { name: "愛知県", label: "愛知", id: "aichi" },
    ],
  },
  {
    region: "近畿",
    items: [
      { name: "三重県", label: "三重", id: "mie" },
      { name: "滋賀県", label: "滋賀", id: "shiga" },
      { name: "京都府", label: "京都", id: "kyoto" },
      { name: "大阪府", label: "大阪", id: "osaka" },
      { name: "兵庫県", label: "兵庫", id: "hyogo" },
      { name: "奈良県", label: "奈良", id: "nara" },
      { name: "和歌山県", label: "和歌山", id: "wakayama" },
    ],
  },
  {
    region: "中国",
    items: [
      { name: "鳥取県", label: "鳥取", id: "tottori" },
      { name: "島根県", label: "島根", id: "shimane" },
      { name: "岡山県", label: "岡山", id: "okayama" },
      { name: "広島県", label: "広島", id: "hiroshima" },
      { name: "山口県", label: "山口", id: "yamaguchi" },
    ],
  },
  {
    region: "四国",
    items: [
      { name: "徳島県", label: "徳島", id: "tokushima" },
      { name: "香川県", label: "香川", id: "kagawa" },
      { name: "愛媛県", label: "愛媛", id: "ehime" },
      { name: "高知県", label: "高知", id: "kouchi" },
    ],
  },
  {
    region: "九州・沖縄",
    items: [
      { name: "福岡県", label: "福岡", id: "fukuoka" },
      { name: "佐賀県", label: "佐賀", id: "saga" },
      { name: "長崎県", label: "長崎", id: "nagasaki" },
      { name: "熊本県", label: "熊本", id: "kumamoto" },
      { name: "大分県", label: "大分", id: "oita" },
      { name: "宮崎県", label: "宮崎", id: "miyazaki" },
      { name: "鹿児島県", label: "鹿児島", id: "kagoshima" },
      { name: "沖縄県", label: "沖縄", id: "okinawa" },
    ],
  },
];

const PREFECTURE_ORDER = REGION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.name)
);

const PREFECTURE_ID_MAP = new Map(
  REGION_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.name, item.id] as const)
  )
);

const resolvePrefectureId = (prefecture: string, fallbackIndex: number) =>
  PREFECTURE_ID_MAP.get(prefecture) ?? `pref-${fallbackIndex}`;

const buildExcludedStoreGroups = (storeCsv: StoreCsvData | undefined) => {
  if (!storeCsv || storeCsv.rows.length === 0) {
    return [] as Array<{
      prefecture: string;
      id: string;
      entries: Array<{ name: string; address: string }>;
    }>;
  }
  const headers = storeCsv.headers ?? [];
  const storeNameKey = headers.find((entry) => entry === "店舗名") ?? "店舗名";
  const addressKey = headers.find((entry) => entry === "住所") ?? "住所";
  const prefectureKey =
    headers.find((entry) => entry === "都道府県") ?? "都道府県";
  const groups = new Map<string, Array<{ name: string; address: string }>>();
  storeCsv.rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    const pref = str(row[prefectureKey]).trim();
    const name = str(row[storeNameKey]).trim();
    const address = str(row[addressKey]).trim();
    if (!pref && !name && !address) {
      return;
    }
    const key = pref || "未分類";
    const list = groups.get(key) ?? [];
    list.push({ name, address });
    groups.set(key, list);
  });
  const orderMap = new Map(
    PREFECTURE_ORDER.map((prefecture, index) => [prefecture, index])
  );
  return Array.from(groups.entries())
    .map(([prefecture, entries]) => ({
      prefecture,
      entries,
    }))
    .sort((a, b) => {
      const orderA = orderMap.get(a.prefecture) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.prefecture) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .map((group, index) => ({
      ...group,
      id: resolvePrefectureId(group.prefecture, index + 1),
    }));
};

const pickHeader = (headers: string[], candidates: string[]) =>
  candidates.find((candidate) => headers.includes(candidate)) ?? "";

const buildBrandAnchorId = (
  label: string,
  index: number,
  used: Set<string>
) => {
  const trimmed = label.trim();
  const base = trimmed ? trimmed.replace(/\s+/g, "-") : `brand-${index + 1}`;
  let next = base;
  let counter = 1;
  while (used.has(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  used.add(next);
  return next;
};

const buildExcludedBrandGroups = (storeCsv: StoreCsvData | undefined) => {
  if (!storeCsv || storeCsv.rows.length === 0) {
    return [] as Array<{
      brand: string;
      id: string;
      entries: Array<{ name: string; address: string }>;
    }>;
  }
  const headers = storeCsv.headers ?? [];
  const brandKey = pickHeader(headers, [
    "ブランド名",
    "ブランド",
    "グループ",
    "チェーン名",
  ]);
  const storeNameKey =
    pickHeader(headers, ["店舗名", "店名", "対象外店舗名", "加盟店名"]) ||
    headers[0] ||
    "店舗名";
  const addressKey =
    pickHeader(headers, ["住所", "所在地", "所在地住所"]) ||
    headers[1] ||
    "住所";
  const order: string[] = [];
  const groups = new Map<string, Array<{ name: string; address: string }>>();
  storeCsv.rows.forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }
    const brand = str(row[brandKey]).trim();
    const name = str(row[storeNameKey]).trim();
    const address = str(row[addressKey]).trim();
    if (!brand && !name && !address) {
      return;
    }
    const key = brand || "未分類";
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)?.push({ name, address });
  });
  const usedIds = new Set<string>();
  return order.map((brand, index) => ({
    brand,
    entries: groups.get(brand) ?? [],
    id: buildBrandAnchorId(brand, index, usedIds),
  }));
};

const resolveStoreLabels = (
  labels: StoreLabels | undefined,
  extraColumns: string[],
  colorMap: Record<string, string>
): StoreLabels => {
  const result: StoreLabels = {};
  extraColumns.forEach((column) => {
    const existing = labels?.[column];
    const fallbackColor = colorMap[column] ?? getStableLabelColor(column);
    result[column] = {
      columnKey: column,
      displayName:
        typeof existing?.displayName === "string" && existing.displayName.trim()
          ? existing.displayName
          : column,
      color:
        typeof existing?.color === "string" && existing.color.trim()
          ? existing.color
          : fallbackColor,
      trueText:
        typeof existing?.trueText === "string" && existing.trueText.trim()
          ? existing.trueText
          : "ON",
      falseText:
        typeof existing?.falseText === "string" && existing.falseText.trim()
          ? existing.falseText
          : "OFF",
      valueDisplay: existing?.valueDisplay === "raw" ? "raw" : "toggle",
      showAsFilter:
        typeof existing?.showAsFilter === "boolean"
          ? existing.showAsFilter
          : true,
      showAsBadge:
        typeof existing?.showAsBadge === "boolean"
          ? existing.showAsBadge
          : true,
    };
  });
  return result;
};

const hexToRgb = (value: string) => {
  const hex = value.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const int = Number.parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const mixRgb = (rgb: { r: number; g: number; b: number }, mix: number) => {
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const r = clamp(Math.round(rgb.r * (1 - mix) + 255 * mix));
  const g = clamp(Math.round(rgb.g * (1 - mix) + 255 * mix));
  const b = clamp(Math.round(rgb.b * (1 - mix) + 255 * mix));
  return `rgb(${r}, ${g}, ${b})`;
};

const darkenRgb = (rgb: { r: number; g: number; b: number }, amount: number) => {
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const r = clamp(Math.round(rgb.r * (1 - amount)));
  const g = clamp(Math.round(rgb.g * (1 - amount)));
  const b = clamp(Math.round(rgb.b * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
};

const buildLabelStyle = (color: string, selected: boolean) => {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return selected
      ? { backgroundColor: color, borderColor: color, color: "#000000" }
      : { backgroundColor: color, borderColor: color, color: "#000000" };
  }
  return selected
    ? {
        backgroundColor: darkenRgb(rgb, 0.05),
        borderColor: darkenRgb(rgb, 0.2),
        color: "#000000",
      }
    : {
        backgroundColor: mixRgb(rgb, 0.70),
        borderColor: darkenRgb(rgb, 0.1),
        color: "#000000",
      };
};

type LabelPillProps = {
  label: string;
  color: string;
  selected?: boolean;
  disabled?: boolean;
  dataKey?: string;
  onClick?: () => void;
};

const LabelPill = ({
  label,
  color,
  selected = false,
  disabled = false,
  dataKey,
  onClick,
}: LabelPillProps) => (
  <button
    type="button"
    className={
      "inline-flex min-h-[24px] max-w-[180px] items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium leading-none transition-all duration-150 hover:scale-105 " +
      (disabled ? "opacity-50" : "")
    }
    style={buildLabelStyle(color, selected)}
    data-store-filter-key={dataKey}
    data-store-filter-color={color}
    data-store-selected={selected ? "true" : "false"}
    onClick={onClick}
    disabled={disabled}
  >
    <span
      aria-hidden="true"
      className={
        "inline-flex h-3 w-3 items-center justify-center rounded-[3px] border text-[10px] font-bold leading-none " +
        (selected ? "bg-black/20 border-black/40" : "border-black/30")
      }
    >
      {selected ? "✓" : ""}
    </span>
    <span className="truncate">{label}</span>
  </button>
);

type LabelBadgeProps = {
  label: string;
  color: string;
};

const LabelBadge = ({ label, color }: LabelBadgeProps) => (
  <span
    className="inline-flex min-h-[24px] max-w-[160px] items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-none"
    style={buildLabelStyle(color, true)}
  >
    <span className="truncate">{label}</span>
  </span>
);

const isTargetStoresNoticeItem = (item: ContentItem) =>
  item.type === "text" &&
  item.lines.length > 0 &&
  item.lines.every((line) => Boolean(line.marks?.callout?.enabled));

const getTargetStoresNoticeItem = (items?: ContentItem[]) =>
  items?.find(isTargetStoresNoticeItem);

const getTargetStoresNoticeLines = (items?: ContentItem[]) => {
  const noticeItem = getTargetStoresNoticeItem(items);
  if (!noticeItem || noticeItem.type !== "text") {
    return [];
  }
  return noticeItem.lines
    .map((line) => line.text.trim())
    .filter((text) => text.length > 0);
};

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

function TargetStoresSection({
  section,
  stores,
  ui,
  assets,
  onUpdateTargetStoresFilters,
}: TargetStoresSectionProps) {
  const imageItems = useMemo(
    () =>
      (section.content?.items ?? []).filter(
        (item): item is ImageContentItem => item.type === "image"
      ),
    [section.content?.items]
  );
  const resolvedImageItems = useMemo(
    () =>
      imageItems.map((item) => ({
        ...item,
        layout: resolveImageLayout(item.layout, item.images.length),
      })),
    [imageItems]
  );
  const resolvedCsv = useMemo(
    () => resolveStoreCsv(section, stores),
    [section, stores]
  );
  const headers = resolvedCsv?.headers ?? [];
  const rows = resolvedCsv?.rows ?? [];
  const extraColumns = useMemo(
    () => (headers.length >= 5 ? headers.slice(5) : []),
    [headers]
  );
  const labelColorMap = useMemo(
    () => getUniqueLabelColorMap(extraColumns),
    [extraColumns]
  );
  const resolvedLabels = useMemo(
    () =>
      resolveStoreLabels(section.content?.storeLabels, extraColumns, labelColorMap),
    [section.content?.storeLabels, extraColumns, labelColorMap]
  );
  const [activeFilters, setActiveFilters] = useState<StoreFilters>({});
  const [keyword, setKeyword] = useState("");
  const [selectedPrefecture, setSelectedPrefecture] = useState("");
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(ui?.previewMode === "mobile");
  const hasStores = rows.length > 0;
  const noticeLines = useMemo(
    () => getTargetStoresNoticeLines(section.content?.items),
    [section.content?.items]
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const nextFilters: StoreFilters = {};
    extraColumns.forEach((column) => {
      nextFilters[column] = Boolean(section.content?.storeFilters?.[column]);
    });
    setActiveFilters((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextFilters);
      if (currentKeys.length !== nextKeys.length) {
        return nextFilters;
      }
      for (const key of nextKeys) {
        if (current[key] !== nextFilters[key]) {
          return nextFilters;
        }
      }
      return current;
    });
  }, [extraColumns, section.content?.storeFilters]);

  const effectivePageSize = isMobile ? 5 : 10;
  const requiredKeys = {
    storeIdKey: headers[0] ?? "店舗ID",
    storeNameKey: headers[1] ?? "店舗名",
    postalCodeKey: headers[2] ?? "郵便番号",
    addressKey: headers[3] ?? "住所",
    prefectureKey: headers[4] ?? "都道府県",
  };
  const filterLabels = useMemo(
    () => extraColumns.map((column) => resolvedLabels[column]).filter(Boolean),
    [extraColumns, resolvedLabels]
  );
  const badgeLabels = filterLabels;
  const labelFilterOperator =
    section.content?.storeFilterOperator === "OR" ? "OR" : "AND";

  const prefectureOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        rows
          .map((row) => str(row[requiredKeys.prefectureKey]).trim())
          .filter((value) => value.length > 0)
      )
    );
    return values.sort((left, right) => left.localeCompare(right, "ja"));
  }, [rows, requiredKeys.prefectureKey]);

  const effectiveSelectedPrefecture =
    selectedPrefecture && prefectureOptions.includes(selectedPrefecture)
      ? selectedPrefecture
      : "";

  const normalizedKeyword = keyword.trim().toLowerCase();
  const activeFilterKeys = filterLabels
    .map((label) => label.columnKey)
    .filter((key) => activeFilters[key]);

  const filteredRows = useMemo(() => {
    if (!hasStores) {
      return [];
    }
    return rows.filter((row) => {
      if (normalizedKeyword) {
        const name = str(row[requiredKeys.storeNameKey]).toLowerCase();
        const address = str(row[requiredKeys.addressKey]).toLowerCase();
        const postal = str(row[requiredKeys.postalCodeKey]).toLowerCase();
        if (
          !name.includes(normalizedKeyword) &&
          !address.includes(normalizedKeyword) &&
          !postal.includes(normalizedKeyword)
        ) {
          return false;
        }
      }

      if (effectiveSelectedPrefecture) {
        const prefecture = str(row[requiredKeys.prefectureKey]).trim();
        if (prefecture !== effectiveSelectedPrefecture) {
          return false;
        }
      }

      if (activeFilterKeys.length > 0) {
        if (labelFilterOperator === "OR") {
          const hasMatch = activeFilterKeys.some((key) =>
            isTruthyStoreFlag(str(row[key]).trim())
          );
          if (!hasMatch) {
            return false;
          }
        } else {
          for (const key of activeFilterKeys) {
            const value = str(row[key]).trim();
            if (!isTruthyStoreFlag(value)) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [
    rows,
    hasStores,
    normalizedKeyword,
    effectiveSelectedPrefecture,
    activeFilterKeys,
    requiredKeys,
    labelFilterOperator,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / effectivePageSize)),
    [filteredRows.length, effectivePageSize]
  );
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * effectivePageSize;
    return filteredRows.slice(start, start + effectivePageSize);
  }, [filteredRows, currentPage, effectivePageSize]);

  const toggleFilter = (columnKey: string) => {
    const next = {
      ...activeFilters,
      [columnKey]: !activeFilters[columnKey],
    };
    setActiveFilters(next);
    onUpdateTargetStoresFilters?.(section.id, next);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSelectedPrefecture("");
    const cleared: StoreFilters = {};
    extraColumns.forEach((column) => {
      cleared[column] = false;
    });
    setActiveFilters(cleared);
    onUpdateTargetStoresFilters?.(section.id, cleared);
    setPage(1);
  };

  return (
    <section
      className="mx-auto mt-3 w-full max-w-5xl space-y-4"
      data-target-stores="true"
      data-section-id={section.id}
    >
      {resolvedImageItems.length > 0 ? (
        <div className="flex flex-col gap-3">
          {resolvedImageItems.map((item) => {
            if (item.images.length === 0) {
              return (
                <div
                  key={item.id}
                  className="flex h-[200px] w-full items-center justify-center rounded-lg border border-dashed border-[var(--lp-border)] text-sm text-[var(--lp-muted)]"
                >
                  画像を追加してください
                </div>
              );
            }
            const layout = resolveImageLayout(item.layout, item.images.length);
            if (layout === "slideshow") {
              const current = item.images[0];
              const resolvedSrc = current?.assetId
                ? assets?.[current.assetId]?.data || current.src
                : current?.src;
              const aspectRatio =
                current?.w && current?.h
                  ? `${current.w} / ${current.h}`
                  : undefined;
              return (
                <div key={item.id} className="relative w-full">
                  <div
                    className="w-full overflow-hidden rounded-lg"
                    style={aspectRatio ? { aspectRatio } : undefined}
                  >
                    {resolvedSrc ? (
                      <img
                        src={resolvedSrc}
                        alt={current?.alt ?? ""}
                        className="h-full w-full object-contain"
                        data-asset-id={current?.assetId}
                      />
                    ) : null}
                  </div>
                  {item.images.length > 1 ? (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      {item.images.map((image) => (
                        <span
                          key={image.id}
                          className={
                            "h-2 w-2 rounded-full " +
                            (image.id === current?.id
                              ? "bg-[var(--lp-text)]"
                              : "bg-[var(--lp-border)]")
                          }
                        />
                      ))}
                    </div>
                  ) : null}
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
                    <img
                      key={image.id}
                      src={resolvedSrc}
                      alt={image.alt ?? ""}
                      className="w-full rounded-lg object-contain"
                      data-asset-id={image.assetId}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="rounded-2xl border border-orange-300 bg-white p-4 shadow-md md:p-5">
        <div className="space-y-3">
          {noticeLines.length > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border-l-4 border-yellow-500 bg-yellow-100 px-4 py-3 text-sm text-gray-700">
              <span aria-hidden="true">⚠</span>
              <div className="space-y-1">
                {noticeLines.map((text, index) => (
                  <p key={`notice-${section.id}-${index}`}>
                    {renderRichText(text)}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {filterLabels.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2.5">
              {filterLabels.map((label) => {
                const isActive = Boolean(activeFilters[label.columnKey]);
                const baseColor =
                  typeof label.color === "string" && label.color.trim()
                    ? label.color
                    : labelColorMap[label.columnKey] ??
                      getStableLabelColor(label.columnKey);
                return (
                  <LabelPill
                    key={label.columnKey}
                    label={label.displayName}
                    color={baseColor}
                    selected={isActive}
                    disabled={!hasStores}
                    dataKey={label.columnKey}
                    onClick={() => {
                      if (!hasStores) {
                        return;
                      }
                      toggleFilter(label.columnKey);
                    }}
                  />
                );
              })}
            </div>
          ) : null}

          <div className="mx-auto grid w-full max-w-4xl gap-3 md:grid-cols-[2fr_1fr] md:items-center">
            <div>
              <label
                htmlFor={`store-search-${section.id}`}
                className="text-sm font-medium text-gray-600"
              >
                キーワード
              </label>
              <input
                id={`store-search-${section.id}`}
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-[var(--lp-text)] placeholder:text-gray-400 focus:ring-2 focus:ring-orange-300"
                type="text"
                value={keyword}
                placeholder="店舗名・住所・郵便番号で検索"
                aria-label="キーワード検索"
                data-store-keyword="true"
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label
                htmlFor={`store-prefecture-${section.id}`}
                className="text-sm font-medium text-gray-600"
              >
                都道府県
              </label>
              <select
                id={`store-prefecture-${section.id}`}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-[var(--lp-text)]"
                value={effectiveSelectedPrefecture}
                aria-label="都道府県フィルター"
                disabled={!hasStores || prefectureOptions.length === 0}
                data-store-prefecture="true"
                onChange={(event) => {
                  setSelectedPrefecture(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">すべて</option>
                {prefectureOptions.map((prefecture) => (
                  <option key={prefecture} value={prefecture}>
                    {prefecture}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
            <span data-store-count>
              該当件数: {hasStores ? filteredRows.length : 0}件
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="前のページ"
                className="rounded-full border border-orange-400 px-4 py-2 text-sm text-orange-500 hover:bg-orange-50 disabled:text-orange-300 disabled:hover:bg-transparent"
                disabled={!hasStores || currentPage <= 1}
                data-store-prev
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                前へ
              </button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                aria-label="次のページ"
                className="rounded-full border border-orange-400 px-4 py-2 text-sm text-orange-500 hover:bg-orange-50 disabled:text-orange-300 disabled:hover:bg-transparent"
                disabled={!hasStores || currentPage >= totalPages}
                data-store-next
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                次へ
              </button>
            </div>
          </div>
        </div>
      </div>

      {hasStores ? (
        <>
          {filteredRows.length === 0 ? (
            <div
              className="rounded-xl border border-dashed border-orange-200 p-5 text-center text-sm text-gray-500"
              data-store-empty
            >
              <div>該当する店舗がありません</div>
              <button
                type="button"
                aria-label="フィルタを全解除"
                className="mt-2 rounded-full border border-orange-300 bg-white px-4 py-2 text-sm text-orange-500 hover:bg-orange-50"
                data-store-clear
                onClick={clearAllFilters}
              >
                フィルタを全解除
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2" data-store-cards>
              {pageRows.map((row, index) => {
                const storeName = str(row[requiredKeys.storeNameKey]);
                const postal = str(row[requiredKeys.postalCodeKey]);
                const address = str(row[requiredKeys.addressKey]);
                const labelBadges = badgeLabels.flatMap((label) => {
                  const value = str(row[label.columnKey]).trim();
                  if (!isTruthyStoreFlag(value)) {
                    return [];
                  }
                  return [
                    {
                      text: label.displayName || label.columnKey,
                      color:
                        typeof label.color === "string" && label.color.trim()
                          ? label.color
                          : labelColorMap[label.columnKey] ??
                            getStableLabelColor(label.columnKey),
                    },
                  ];
                });
                const visibleBadges = labelBadges.slice(0, MAX_LABEL_BADGES);
                const extraBadgeCount = labelBadges.length - visibleBadges.length;
                return (
                  <div
                    key={`store-card-${index}`}
                    className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      {visibleBadges.map((badgeEntry, badgeIndex) => (
                        <LabelBadge
                          key={`${badgeEntry.text}-${badgeIndex}`}
                          label={badgeEntry.text}
                          color={badgeEntry.color}
                        />
                      ))}
                      {extraBadgeCount > 0 ? (
                        <span className="inline-flex min-h-[24px] items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[12px] font-semibold leading-none text-orange-500">
                          +{extraBadgeCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mb-1 text-lg font-bold text-blue-600 hover:underline">
                      {storeName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {postal} {address}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}

const sectionLabels: Record<string, string> = {
  brandBar: "ブランドバー",
  heroImage: "ヒーロー画像",
  campaignPeriodBar: "キャンペーン期間",
  campaignOverview: "キャンペーン概要",
  couponFlow: "クーポン利用の流れ",
  rankingTable: "ランキング表",
  paymentHistoryGuide: "決済利用方法",
  tabbedNotes: "付箋タブセクション",
  excludedStoresList: "対象外店舗一覧",
  excludedBrandsList: "対象外ブランド一覧",
  targetStores: "対象店舗",
  legalNotes: "注意事項",
  footerHtml: "問い合わせ",
  textBlock: "テキストブロック",
  imageText: "画像+テキスト",
  cta: "CTA",
  faq: "FAQ",
  divider: "区切り",
};

const formatDate = (value?: string) => (value ? value.replaceAll("-", "/") : "");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const parseIsoDate = (value?: string) => {
  if (!value || typeof value !== "string") {
    return null;
  }
  const parts = value.split("-").map((entry) => Number(entry));
  if (parts.length < 3) {
    return null;
  }
  const [year, month, day] = parts;
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

const getDateParts = (date: Date) => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
  weekday: WEEKDAYS[date.getDay()],
});

const renderPlaceholder = (section: SectionBase) => (
  <section className="w-full">
    <div className="rounded-xl border border-dashed border-[var(--lp-border)] bg-[var(--lp-card)] p-4">
      <div className="text-sm font-semibold text-[var(--lp-text)]">
        {(sectionLabels[section.type] ?? section.type) + "（準備中）"}
      </div>
      <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--lp-surface)] p-3 text-[11px] text-[var(--lp-muted)]">
        {JSON.stringify(section.data ?? {}, null, 2)}
      </pre>
    </div>
  </section>
);

const isSurfaceCustomized = (style?: SectionStyle) => {
  if (!style) {
    return false;
  }
  const styleBackground = style.background;
  const styleBorder = style.border;
  const styleShadow = style.shadow;
  const hasSurfaceBg = Boolean(
    styleBackground &&
      (styleBackground.type !== "solid" ||
        styleBackground.color1 !== "#f1f1f1" ||
        styleBackground.color2 !== "#ffffff")
  );
  const hasSurfaceBorder = Boolean(styleBorder?.enabled);
  const hasSurfaceShadow = Boolean(styleShadow && styleShadow !== "none");
  return hasSurfaceBg || hasSurfaceBorder || hasSurfaceShadow;
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

  if (style.background.type === "gradient") {
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

const buildSurfaceStyle = (style: SectionStyle | undefined): CSSProperties => {
  const base = buildSectionStyle(style);
  return {
    backgroundColor: base.backgroundColor,
    backgroundImage: base.backgroundImage,
    border: base.border,
    boxShadow: base.boxShadow,
    borderRadius: base.borderRadius,
  };
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
                <ImageSlideshow images={item.images} assets={assets} />
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

const renderSection = (
  section: SectionBase,
  project: ProjectState,
  ui: PreviewUiState | null | undefined,
  cardTextColor: string | undefined,
  mvBackground: ReturnType<typeof buildBackgroundStyle>,
  onUpdateTargetStoresFilters?: (
    sectionId: string,
    filters: Record<string, boolean>
  ) => void
) => {
  if (!section.visible) {
    return null;
  }

  switch (section.type) {
    case "brandBar":
      return (() => {
        const assets = project?.assets ?? {};
        const assetId =
          typeof section.data.brandImageAssetId === "string"
            ? section.data.brandImageAssetId
            : undefined;
        const imageUrl =
          (assetId ? assets[assetId]?.data : "") ||
          (typeof section.data.brandImageUrl === "string"
            ? section.data.brandImageUrl
            : "") ||
          "";
        return (
          <div className="lp-brandbar" data-sticky="true">
            <div className="lp-brandbar-inner">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={String(section.data.logoText ?? "ブランドバー")}
                  className="lp-brandbar-image"
                  data-asset-id={assetId}
                />
              ) : (
                <div className="w-full text-sm font-semibold text-[var(--lp-text)]">
                  {typeof section.data.logoText === "string"
                    ? section.data.logoText
                    : ""}
                </div>
              )}
            </div>
          </div>
        );
      })();
    case "heroImage": {
      const assets = project?.assets ?? {};
      const heroFullSize = Boolean(section.data.heroFullSize);
      const heroSlidesPc = Array.isArray(section.data.heroSlidesPc)
        ? (section.data.heroSlidesPc as SlideshowImage[])
        : [];
      const heroSlidesSp = Array.isArray(section.data.heroSlidesSp)
        ? (section.data.heroSlidesSp as SlideshowImage[])
        : [];
      const pcAssetId =
        typeof section.data.imageAssetIdPc === "string"
          ? section.data.imageAssetIdPc
          : typeof section.data.imageAssetId === "string"
          ? section.data.imageAssetId
          : undefined;
      const spAssetId =
        typeof section.data.imageAssetIdSp === "string"
          ? section.data.imageAssetIdSp
          : undefined;
      const pcUrl =
        (pcAssetId ? assets[pcAssetId]?.data : "") ||
        (typeof section.data.imageUrl === "string" ? section.data.imageUrl : "") ||
        "";
      const spUrl =
        (spAssetId ? assets[spAssetId]?.data : "") ||
        (typeof section.data.imageUrlSp === "string" ? section.data.imageUrlSp : "") ||
        "";
      const isMobilePreview = ui?.previewMode === "mobile";
      const heroUrl = (isMobilePreview ? spUrl : pcUrl) || pcUrl || spUrl;
      const heroPc = section.data.heroPc as | { w?: number; h?: number } | undefined;
      const heroSp = section.data.heroSp as | { w?: number; h?: number } | undefined;
      const heroMeta = (isMobilePreview ? heroSp : heroPc) ?? heroPc ?? heroSp;
      const heroSlides = (isMobilePreview ? heroSlidesSp : heroSlidesPc).filter(
        (entry) => Boolean(entry?.src || entry?.assetId)
      );
      const slideMeta = heroSlides[0];
      const heroBoxStyle: CSSProperties = heroFullSize
        ? slideMeta?.w && slideMeta?.h
          ? {
              width: "100%",
              aspectRatio: `${slideMeta.w} / ${slideMeta.h}`,
            }
          : heroMeta?.w && heroMeta?.h
          ? {
              width: "100%",
              aspectRatio: `${heroMeta.w} / ${heroMeta.h}`,
            }
          : {
              width: "100%",
            }
        : heroMeta?.w && heroMeta?.h
        ? {
            width: "100%",
            maxWidth: `${heroMeta.w}px`,
            aspectRatio: `${heroMeta.w} / ${heroMeta.h}`,
            marginLeft: "auto",
            marginRight: "auto",
          }
        : {
            width: "100%",
          };
      const heroAnimation = section.data.heroAnimation as
        | ContentItemAnimation
        | undefined;
      const heroImageStyle: CSSProperties = {
        ...buildAnimationStyle(heroAnimation),
        objectFit: "contain",
      };
      const mvBackgroundStyle = mvBackground.style;
      const mvVideo = mvBackground.video;
      const mvVideoUrl = mvVideo?.assetId
        ? assets?.[mvVideo.assetId]?.data || ""
        : "";
      const mvAutoPlay = mvVideo?.autoPlay ?? true;
      const mvLoop = mvVideo?.loop ?? true;
      const mvMuted = mvVideo?.muted ?? true;
      const mvInline = mvVideo?.playsInline ?? true;
      const mvOpacity =
        typeof mvVideo?.opacity === "number" ? mvVideo.opacity : 1;
      const mvBlur = typeof mvVideo?.blur === "number" ? mvVideo.blur : 0;
      const mvBrightness =
        typeof mvVideo?.brightness === "number" ? mvVideo.brightness : 1;
      const mvSaturation =
        typeof mvVideo?.saturation === "number" ? mvVideo.saturation : 1;
      const mvFilters = [
        `brightness(${mvBrightness})`,
        `saturate(${mvSaturation})`,
      ];
      if (mvBlur > 0) {
        mvFilters.push(`blur(${mvBlur}px)`);
      }
      if (mvOpacity !== 1) {
        mvFilters.push(`opacity(${mvOpacity})`);
      }
      return (
        <div className="lp-hero relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={mvBackgroundStyle}
          >
            {mvVideo && mvVideoUrl ? (
              <video
                className="h-full w-full object-cover"
                src={mvVideoUrl}
                autoPlay={mvAutoPlay}
                muted={mvMuted}
                loop={mvLoop}
                playsInline={mvInline}
                style={{ filter: mvFilters.join(" ") }}
              />
            ) : null}
          </div>
          <div className="relative z-10">
            {heroSlides.length > 0 ? (
              <div className="w-full" style={heroBoxStyle}>
                <ImageSlideshow images={heroSlides} assets={assets} />
              </div>
            ) : heroUrl ? (
              <div
                className="w-full"
                style={{
                  ...heroBoxStyle,
                  ...(isTransparentImage(heroUrl)
                    ? {
                        backgroundImage:
                          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                        backgroundColor: "#fff",
                      }
                    : {}),
                }}
              >
                <img
                  src={String(heroUrl)}
                  alt={String(section.data.alt ?? section.data.altText ?? "")}
                  className="lp-hero-image"
                  style={heroImageStyle}
                  data-asset-id={(isMobilePreview ? spAssetId : pcAssetId) ?? undefined}
                />
              </div>
            ) : (
              <div
                className="flex w-full items-center justify-center border border-[var(--lp-border)] bg-gradient-to-br from-[var(--lp-surface)] to-[var(--lp-card)] text-sm text-[var(--lp-muted)]"
                style={heroBoxStyle}
              >
                ヒーロー画像
              </div>
            )}
          </div>
        </div>
      );
    }
    case "campaignPeriodBar": {
      const periodText =
        typeof section.data.periodBarText === "string"
          ? section.data.periodBarText.trim()
          : "";
      const periodLabel =
        typeof section.data.periodLabel === "string"
          ? section.data.periodLabel.trim()
          : "";
      const startDateRaw =
        typeof section.data.startDate === "string"
          ? section.data.startDate
          : undefined;
      const endDateRaw =
        typeof section.data.endDate === "string"
          ? section.data.endDate
          : undefined;
      const style = section.data.periodBarStyle as
        | { bold?: boolean; color?: string; size?: number }
        | undefined;
      const animation = section.data.periodBarAnimation as
        | ContentItemAnimation
        | undefined;
      const resolvedSurfaceStyle = buildSectionStyle(section.style);
      const hasSurfaceOverride = isSurfaceCustomized(section.style);
      const defaultBandColor = "#EB5505";
      const fallbackBackground = hasSurfaceOverride
        ? section.style.background.type === "gradient"
          ? `linear-gradient(135deg, ${section.style.background.color1}, ${section.style.background.color2})`
          : section.style.background.color1 || defaultBandColor
        : defaultBandColor;
      const resolvedBackgroundImage =
        hasSurfaceOverride &&
        typeof resolvedSurfaceStyle.backgroundImage === "string" &&
        resolvedSurfaceStyle.backgroundImage !== "none"
          ? resolvedSurfaceStyle.backgroundImage
          : undefined;
      const resolvedBackgroundColor =
        hasSurfaceOverride &&
        typeof resolvedSurfaceStyle.backgroundColor === "string" &&
        resolvedSurfaceStyle.backgroundColor.trim() !== ""
          ? resolvedSurfaceStyle.backgroundColor
          : undefined;
      const bandBackground = hasSurfaceOverride
        ? resolvedBackgroundImage || resolvedBackgroundColor || fallbackBackground
        : defaultBandColor;
      const bandColor = resolvedBackgroundColor || defaultBandColor;
      const surfaceDecorStyle: CSSProperties = {
        background: bandBackground,
        border:
          hasSurfaceOverride && typeof resolvedSurfaceStyle.border === "string"
            ? resolvedSurfaceStyle.border
            : undefined,
        boxShadow:
          hasSurfaceOverride &&
          typeof resolvedSurfaceStyle.boxShadow === "string"
            ? resolvedSurfaceStyle.boxShadow
            : undefined,
      };
      const startDate = parseIsoDate(startDateRaw);
      const endDate = parseIsoDate(endDateRaw);
      const startParts = startDate ? getDateParts(startDate) : null;
      const endParts = endDate ? getDateParts(endDate) : null;
      const sameYear = startParts?.year === endParts?.year;
      const textColor =
        typeof style?.color === "string" && style.color.trim() !== ""
          ? style.color
          : "#ffffff";
      const baseWeight = style?.bold ? 700 : 600;
      const textStyle: CSSProperties = {
        fontWeight: baseWeight,
        fontSize: style?.size
          ? `calc(${style.size}px * var(--lp-font-scale, 1))`
          : undefined,
      };
      const bandStyle = {
        ...surfaceDecorStyle,
        color: textColor,
        width: "100%",
        display: "flex",
        alignItems: "center",
        minHeight:
          Number.isFinite(section.style.layout.minHeight) &&
          section.style.layout.minHeight > 0
            ? `${section.style.layout.minHeight}px`
            : undefined,
        height:
          Number.isFinite(section.style.layout.minHeight) &&
          section.style.layout.minHeight > 0
            ? `${section.style.layout.minHeight}px`
            : undefined,
        "--lp-periodbar-bg": bandColor,
        "--lp-periodbar-band": bandColor,
        "--lp-periodbar-text": textColor,
        ...buildAnimationStyle(animation),
      } as CSSProperties;
      const periodAlign =
        (section.style as { titleBand?: { textAlign?: string } })
          .titleBand?.textAlign ?? "center";
      const periodJustify =
        periodAlign === "left"
          ? "flex-start"
          : periodAlign === "right"
          ? "flex-end"
          : "center";
      const labelText = periodLabel.length > 0 ? periodLabel : "キャンペーン期間";
      const label =
        periodText.length > 0
          ? periodText
          : `${formatDate(startDateRaw)} - ${formatDate(endDateRaw)}`;
      return (
        <div
          className={"lp-periodbar lp-periodbar--responsive"}
          data-testid="campaign-period-bar"
          data-sticky="true"
          style={bandStyle}
        >
          <div
            className="lp-periodbar__center"
            style={{
              justifyContent: periodJustify,
              textAlign: periodAlign as CSSProperties["textAlign"],
            }}
          >
            <div className="lp-periodbar__label">{labelText}</div>
            <div className="lp-periodbar__date" style={textStyle}>
              {startParts && endParts ? (
                <>
                  <span className="lp-periodbar__pair">
                    <span className="lp-periodbar__num">{startParts.year}</span>
                    <span className="lp-periodbar__unit">年</span>
                  </span>
                  <span className="lp-periodbar__pair">
                    <span className="lp-periodbar__num">{startParts.month}</span>
                    <span className="lp-periodbar__unit">月</span>
                  </span>
                  <span className="lp-periodbar__pair">
                    <span className="lp-periodbar__num">{startParts.day}</span>
                    <span className="lp-periodbar__unit">日</span>
                  </span>
                  <span className="lp-periodbar__badge">{startParts.weekday}</span>
                  <span className="lp-periodbar__sep">～</span>
                  {!sameYear ? (
                    <>
                      <span className="lp-periodbar__pair">
                        <span className="lp-periodbar__num">{endParts.year}</span>
                        <span className="lp-periodbar__unit">年</span>
                      </span>
                    </>
                  ) : null}
                  <span className="lp-periodbar__pair">
                    <span className="lp-periodbar__num">{endParts.month}</span>
                    <span className="lp-periodbar__unit">月</span>
                  </span>
                  <span className="lp-periodbar__pair">
                    <span className="lp-periodbar__num">{endParts.day}</span>
                    <span className="lp-periodbar__unit">日</span>
                  </span>
                  <span className="lp-periodbar__badge">{endParts.weekday}</span>
                </>
              ) : (
                <span className="lp-periodbar__num">{label}</span>
              )}
            </div>
          </div>
        </div>
      );
    }
    case "campaignOverview":
      return null;
    case "couponFlow": {
      const assets = project?.assets ?? {};
      const items = Array.isArray(section.content?.items)
        ? (section.content?.items as ContentItem[])
        : [];
      const imageItem = items.find(
        (item) => item.type === "image"
      ) as ImageContentItem | undefined;
      const buttonItems = items.filter(
        (item): item is ButtonContentItem => item.type === "button"
      );
      const slides = imageItem?.images ?? [];
      const lead = String(section.data.lead ?? "").trim();
      const note = String(section.data.note ?? "").trim();
      const textColor = section.style.typography.textColor;
      return (
        <div className="lp-couponflow" data-section-type="couponFlow">
          <div className="lp-couponflow__body">
            {lead ? <p className="lp-couponflow__lead">{lead}</p> : null}
            <CouponFlowSlider slides={slides} assets={assets} />
            {note ? <p className="lp-couponflow__note">{note}</p> : null}
            {buttonItems.length > 0
              ? renderContentItems(section, buttonItems, textColor, assets)
              : null}
          </div>
        </div>
      );
    }
    case "paymentHistoryGuide": {
      const data = section.data ?? {};
      const body = typeof data.body === "string" ? data.body : "";
      const linkText = typeof data.linkText === "string" ? data.linkText : "";
      const linkUrl = typeof data.linkUrl === "string" ? data.linkUrl : "";
      const linkTargetKind =
        data.linkTargetKind === "section" ? "section" : "url";
      const linkSectionId =
        typeof data.linkSectionId === "string" ? data.linkSectionId : "";
      const resolvedLinkUrl =
        linkTargetKind === "section" && linkSectionId
          ? `#sec-${linkSectionId}`
          : linkUrl;
      const linkSuffix =
        typeof data.linkSuffix === "string" ? data.linkSuffix : "";
      const alert = typeof data.alert === "string" ? data.alert : "";
      const imageUrl =
        typeof data.imageUrl === "string" ? data.imageUrl : "";
      const imageAlt =
        typeof data.imageAlt === "string" ? data.imageAlt : "";
      const imageAssetId =
        typeof data.imageAssetId === "string" ? data.imageAssetId : "";
      const assets = project?.assets ?? {};
      const resolvedImage = imageAssetId
        ? assets?.[imageAssetId]?.data || imageUrl
        : imageUrl;
      const textColor = cardTextColor ?? section.style.typography.textColor;
      const baseStyle: CSSProperties = {
        fontFamily: section.style.typography.fontFamily,
        fontSize: `calc(${section.style.typography.fontSize}px * var(--lp-font-scale, 1))`,
        fontWeight: section.style.typography.fontWeight,
        letterSpacing: `${section.style.typography.letterSpacing}px`,
        lineHeight: section.style.typography.lineHeight,
        color: textColor,
      };
      const bodyLines = body.split("\n");
      const alertLines = alert.split("\n");
      return (
        <section className="w-full" style={baseStyle}>
          <div className="flex flex-col gap-2">
            {body ? (
              <p className="text-center text-[13px] font-semibold leading-relaxed sm:text-[14px]">
                {bodyLines.map((line, index) => (
                  <span key={`payment-body-${index}`}>
                    {renderRichText(line)}
                    {index < bodyLines.length - 1 ? <br /> : null}
                  </span>
                ))}
                {linkText && resolvedLinkUrl ? (
                  <>
                    {" "}
                    <a
                      className="font-bold text-[#bf1d20] underline"
                      href={resolvedLinkUrl}
                    >
                      {linkText}
                    </a>
                    {linkSuffix}
                  </>
                ) : null}
              </p>
            ) : null}
            {alert ? (
              <p className="text-center text-[13px] font-bold leading-relaxed text-[#bf1d20] sm:text-[14px]">
                {alertLines.map((line, index) => (
                  <span key={`payment-alert-${index}`}>
                    {renderRichText(line)}
                    {index < alertLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            ) : null}
            <div className="flex justify-center">
              {resolvedImage ? (
                <img
                  src={resolvedImage}
                  alt={imageAlt}
                  className="w-full max-w-[240px]"
                  data-asset-id={imageAssetId || undefined}
                />
              ) : (
                <div className="flex h-[180px] w-full max-w-[240px] items-center justify-center rounded-md border border-dashed border-[var(--lp-border)]/70 text-sm text-[var(--lp-muted)]">
                  画像を追加してください
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }
    case "tabbedNotes": {
      return (
        <TabbedNotesSection
          section={section}
          project={project}
          cardTextColor={cardTextColor}
        />
      );
    }
    case "rankingTable": {
      const data = section.data ?? {};
      const headers = data && typeof data.headers === "object"
        ? (data.headers as {
            rank?: string;
            label?: string;
            value?: string;
          })
        : {};
      const rankLabel =
        typeof data.rankLabel === "string"
          ? data.rankLabel
          : typeof headers.rank === "string"
          ? headers.rank
          : "順位";
      const rawColumns = data.columns;
      const columns = Array.isArray(rawColumns) && rawColumns.length > 0
        ? rawColumns.map((col, index) => {
            if (typeof col === "string") {
              return { key: `col_${index + 1}`, label: col };
            }
            const entry = col && typeof col === "object"
              ? (col as Record<string, unknown>)
              : {};
            return {
              key: typeof entry.key === "string" ? entry.key : `col_${index + 1}`,
              label:
                typeof entry.label === "string"
                  ? entry.label
                  : `列${index + 1}`,
            };
          })
        : [
            {
              key: "label",
              label: typeof headers.label === "string" ? headers.label : "項目",
            },
            {
              key: "value",
              label: typeof headers.value === "string" ? headers.value : "決済金額",
            },
          ];
      const columnCount = columns.length;
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const normalizedRows = rows.map((row, index) => {
        if (Array.isArray(row)) {
          const values = row.map((value) => String(value));
          return {
            id: `rank_${index + 1}`,
            values: values
              .slice(0, columnCount)
              .concat(Array(Math.max(0, columnCount - values.length)).fill("")),
          };
        }
        const entry = row && typeof row === "object"
          ? (row as Record<string, unknown>)
          : {};
        const rawValues = Array.isArray(entry.values)
          ? entry.values.map((value) => String(value))
          : [String(entry.label ?? ""), String(entry.value ?? "")];
        return {
          id:
            typeof entry.id === "string" && entry.id.trim()
              ? entry.id
              : `rank_${index + 1}`,
          values: rawValues
            .slice(0, columnCount)
            .concat(Array(Math.max(0, columnCount - rawValues.length)).fill("")),
        };
      });
      const subtitle = typeof data.subtitle === "string" ? data.subtitle : "";
      const period = typeof data.period === "string" ? data.period : "";
      const dateText = typeof data.date === "string" ? data.date : "";
      const notes = Array.isArray(data.notes)
        ? (data.notes as Array<string>)
            .map((note) => String(note).trim())
            .filter((note) => note.length > 0)
        : [];
      const rawStyle = data.tableStyle && typeof data.tableStyle === "object"
        ? (data.tableStyle as Record<string, unknown>)
        : {};
      const tableStyle = {
        headerBg: typeof rawStyle.headerBg === "string" ? rawStyle.headerBg : "#f8fafc",
        headerText:
          typeof rawStyle.headerText === "string" ? rawStyle.headerText : "#0f172a",
        cellBg: typeof rawStyle.cellBg === "string" ? rawStyle.cellBg : "#ffffff",
        cellText: typeof rawStyle.cellText === "string" ? rawStyle.cellText : "#0f172a",
        border: typeof rawStyle.border === "string" ? rawStyle.border : "#e2e8f0",
        rankBg: typeof rawStyle.rankBg === "string" ? rawStyle.rankBg : "#e2e8f0",
        rankText: typeof rawStyle.rankText === "string" ? rawStyle.rankText : "#0f172a",
        top1Bg: typeof rawStyle.top1Bg === "string" ? rawStyle.top1Bg : "#f59e0b",
        top2Bg: typeof rawStyle.top2Bg === "string" ? rawStyle.top2Bg : "#cbd5f5",
        top3Bg: typeof rawStyle.top3Bg === "string" ? rawStyle.top3Bg : "#fb923c",
        periodLabelBg:
          typeof rawStyle.periodLabelBg === "string" ? rawStyle.periodLabelBg : "#f1f5f9",
        periodLabelText:
          typeof rawStyle.periodLabelText === "string"
            ? rawStyle.periodLabelText
            : "#0f172a",
      };
      const textColor = cardTextColor ?? section.style.typography.textColor;
      const baseStyle: CSSProperties = {
        fontFamily: section.style.typography.fontFamily,
        fontSize: `calc(${section.style.typography.fontSize}px * var(--lp-font-scale, 1))`,
        fontWeight: section.style.typography.fontWeight,
        letterSpacing: `${section.style.typography.letterSpacing}px`,
        lineHeight: section.style.typography.lineHeight,
        color: textColor,
      };
      return (
        <section className="w-full" style={baseStyle}>
          <div className="flex flex-col gap-2">
            {subtitle ? (
              <div className="text-center text-sm font-semibold text-[var(--lp-muted)]">
                {subtitle}
              </div>
            ) : null}
            {period ? (
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--lp-muted)]">
                <span
                  className="rounded px-2 py-0.5"
                  style={{
                    backgroundColor: tableStyle.periodLabelBg,
                    color: tableStyle.periodLabelText,
                  }}
                >
                  集計期間
                </span>
                <span>{period}</span>
              </div>
            ) : null}
            {dateText ? (
              <div className="text-center text-lg font-semibold text-[var(--lp-text)]">
                {dateText}
              </div>
            ) : null}
            {normalizedRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--lp-border)]/70 px-3 py-3 text-center text-sm text-[var(--lp-muted)]">
                ランキング行がありません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-2 font-semibold">
                  <thead>
                    <tr>
                      <th
                        className="rounded border px-3 py-2 text-center text-[12px] sm:text-[13px]"
                        style={{
                          backgroundColor: tableStyle.headerBg,
                          color: tableStyle.headerText,
                          borderColor: tableStyle.border,
                        }}
                      >
                        {rankLabel}
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className="rounded border px-3 py-2 text-center text-[12px] sm:text-[13px]"
                          style={{
                            backgroundColor: tableStyle.headerBg,
                            color: tableStyle.headerText,
                            borderColor: tableStyle.border,
                          }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedRows.map((row, index) => {
                      const rank = index + 1;
                      const rankBg =
                        rank === 1
                          ? tableStyle.top1Bg
                          : rank === 2
                          ? tableStyle.top2Bg
                          : rank === 3
                          ? tableStyle.top3Bg
                          : tableStyle.rankBg;
                      const rankColor = tableStyle.rankText;
                      return (
                        <tr key={row.id ?? `rank-${index}`}>
                          <td
                            className="rounded border px-3 py-2 text-center text-[16px] font-extrabold sm:text-[18px]"
                            style={{
                              backgroundColor: tableStyle.cellBg,
                              color: tableStyle.cellText,
                              borderColor: tableStyle.border,
                            }}
                          >
                            <span
                              className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full px-2"
                              style={{ backgroundColor: rankBg, color: rankColor }}
                            >
                              {rank}
                            </span>
                          </td>
                          {row.values.map((value, valueIndex) => (
                            <td
                              key={`${row.id}_${valueIndex}`}
                              className="rounded border px-3 py-2 text-center text-[14px] font-semibold sm:text-[16px]"
                              style={{
                                backgroundColor: tableStyle.cellBg,
                                color: tableStyle.cellText,
                                borderColor: tableStyle.border,
                              }}
                            >
                              {value.trim() ? value : "-"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {notes.length > 0 ? (
              <ul className="space-y-1 text-[12px] text-[var(--lp-muted)]">
                {notes.map((note, index) => (
                  <li key={`rank-note-${index}`}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      );
    }
    case "targetStores":
      return (
        <section className="w-full">
          <TargetStoresSection
            section={section}
            stores={project?.stores}
            ui={ui}
            assets={project?.assets}
            onUpdateTargetStoresFilters={onUpdateTargetStoresFilters}
          />
        </section>
      );
    case "excludedStoresList": {
      const storeCsv = resolveStoreCsv(section, project?.stores);
      const groups = buildExcludedStoreGroups(storeCsv);
      const returnUrl =
        typeof section.data.returnUrl === "string" && section.data.returnUrl.trim()
          ? section.data.returnUrl
          : "#";
      const returnLabel =
        typeof section.data.returnLabel === "string" &&
        section.data.returnLabel.trim()
          ? section.data.returnLabel
          : "キャンペーンページに戻る";
      const footerCopy =
        typeof section.data.footerCopy === "string" && section.data.footerCopy.trim()
          ? section.data.footerCopy
          : "COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED.";
      const footerLinks = Array.isArray(section.data.footerLinks)
        ? section.data.footerLinks
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const label =
                "label" in entry && typeof entry.label === "string"
                  ? entry.label
                  : "";
              const url =
                "url" in entry && typeof entry.url === "string" ? entry.url : "";
              if (!label || !url) {
                return null;
              }
              return { label, url };
            })
            .filter(
              (entry): entry is { label: string; url: string } => entry != null
            )
        : [];
      const resolvedFooterLinks =
        footerLinks.length > 0
          ? footerLinks
          : [
              { label: "サイトポリシー", url: "#" },
              { label: "会社概要", url: "#" },
              { label: "動作環境", url: "#" },
              { label: "Cookie情報の利用", url: "#" },
              { label: "広告配信などについて", url: "#" },
            ];
      const titleTemplate =
        typeof section.data.title === "string" && section.data.title.trim()
          ? section.data.title
          : "対象外店舗一覧";
      const highlight =
        typeof section.data.highlightLabel === "string" &&
        section.data.highlightLabel.trim()
          ? section.data.highlightLabel
          : "対象外";
      const hasHighlightPlaceholder =
        highlight && titleTemplate.includes("{highlight}");
      const titleSegments = hasHighlightPlaceholder
        ? titleTemplate.split("{highlight}")
        : [titleTemplate];
      return (
        <section className="excluded-stores-section">
          <div className="excluded-wrap">
            <h1 className="excluded-title">
              {hasHighlightPlaceholder ? (
                <>
                  <span className="excluded-title__text">{titleSegments[0]}</span>
                  <span className="excluded-title__badge">{highlight}</span>
                  <span className="excluded-title__text">
                    {titleSegments.slice(1).join("{highlight}")}
                  </span>
                </>
              ) : (
                <>
                  <span className="excluded-title__text">{titleTemplate}</span>
                  {highlight ? (
                    <span className="excluded-title__badge">{highlight}</span>
                  ) : null}
                </>
              )}
            </h1>
            <table className="excluded-region-table">
              <tbody>
                {REGION_GROUPS.map((group) => (
                  <tr key={group.region}>
                    <th className="excluded-region-th">
                      <strong>{group.region}</strong>
                    </th>
                    <td className="excluded-region-td">
                      {group.items.map((item) => (
                        <a
                          key={item.id}
                          className="excluded-region-link"
                          href={`#${item.id}`}
                        >
                          {item.label}
                        </a>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {groups.length === 0 ? (
              <div className="excluded-empty">
                CSVを取り込むと、対象外店舗の一覧が表示されます。
              </div>
            ) : (
              <div className="tenpo-container">
                {groups.map((group) => (
                  <div key={group.id}>
                    <div className="tenpo_list_title">
                      <h2 id={group.id}>{group.prefecture}</h2>
                    </div>
                    {group.entries.map((entry, index) => (
                      <div key={`${group.id}-${index}`} className="tenpo_list">
                        <span className="tenpo_list_shop">
                          {entry.name || "店舗名"}
                        </span>
                        <span className="tenpo_list_add">{entry.address}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="excluded-footer">
              <a className="excluded-return" href={returnUrl}>
                <span className="excluded-return__label">{returnLabel}</span>
                <span className="excluded-return__arrow" aria-hidden="true" />
              </a>
              <div className="excluded-footer__links">
                {resolvedFooterLinks.map((link) => (
                  <a key={link.label} href={link.url}>
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="excluded-footer__copy">{footerCopy}</div>
            </div>
          </div>
        </section>
      );
    }
    case "excludedBrandsList": {
      const storeCsv = resolveStoreCsv(section, project?.stores);
      const groups = buildExcludedBrandGroups(storeCsv);
      const returnUrl =
        typeof section.data.returnUrl === "string" && section.data.returnUrl.trim()
          ? section.data.returnUrl
          : "#";
      const returnLabel =
        typeof section.data.returnLabel === "string" &&
        section.data.returnLabel.trim()
          ? section.data.returnLabel
          : "キャンペーンページに戻る";
      const footerCopy =
        typeof section.data.footerCopy === "string" && section.data.footerCopy.trim()
          ? section.data.footerCopy
          : "COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED.";
      const footerLinks = Array.isArray(section.data.footerLinks)
        ? section.data.footerLinks
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const label =
                "label" in entry && typeof entry.label === "string"
                  ? entry.label
                  : "";
              const url =
                "url" in entry && typeof entry.url === "string" ? entry.url : "";
              if (!label || !url) {
                return null;
              }
              return { label, url };
            })
            .filter(
              (entry): entry is { label: string; url: string } => entry != null
            )
        : [];
      const resolvedFooterLinks =
        footerLinks.length > 0
          ? footerLinks
          : [
              { label: "サイトポリシー", url: "#" },
              { label: "会社概要", url: "#" },
              { label: "動作環境", url: "#" },
              { label: "Cookie情報の利用", url: "#" },
              { label: "広告配信などについて", url: "#" },
            ];
      const titleTemplate =
        typeof section.data.title === "string" && section.data.title.trim()
          ? section.data.title
          : "対象外ブランド一覧";
      const highlight =
        typeof section.data.highlightLabel === "string" &&
        section.data.highlightLabel.trim()
          ? section.data.highlightLabel
          : "対象外";
      const hasHighlightPlaceholder =
        highlight && titleTemplate.includes("{highlight}");
      const titleSegments = hasHighlightPlaceholder
        ? titleTemplate.split("{highlight}")
        : [titleTemplate];
      return (
        <section className="excluded-stores-section">
          <div className="excluded-wrap">
            <h1 className="excluded-title">
              {hasHighlightPlaceholder ? (
                <>
                  <span className="excluded-title__text">{titleSegments[0]}</span>
                  <span className="excluded-title__badge">{highlight}</span>
                  <span className="excluded-title__text">
                    {titleSegments.slice(1).join("{highlight}")}
                  </span>
                </>
              ) : (
                <>
                  <span className="excluded-title__text">{titleTemplate}</span>
                  {highlight ? (
                    <span className="excluded-title__badge">{highlight}</span>
                  ) : null}
                </>
              )}
            </h1>
            {groups.length > 0 ? (
              <ul className="excluded-brand-list">
                {groups.map((group) => (
                  <li key={group.id}>
                    <span className="excluded-brand-marker">▼</span>
                    <a className="excluded-brand-link" href={`#${group.id}`}>
                      {group.brand}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {groups.length === 0 ? (
              <div className="excluded-empty">
                CSVを取り込むと、対象外ブランドの一覧が表示されます。
              </div>
            ) : (
              <div className="tenpo-container">
                {groups.map((group) => (
                  <div key={group.id}>
                    <div className="tenpo_list_title">
                      <h2 id={group.id}>{group.brand}</h2>
                    </div>
                    {group.entries.map((entry, index) => (
                      <div key={`${group.id}-${index}`} className="tenpo_list">
                        <span className="tenpo_list_shop">
                          {entry.name || "ブランド名"}
                        </span>
                        <span className="tenpo_list_add">{entry.address}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="excluded-footer">
              <a className="excluded-return" href={returnUrl}>
                <span className="excluded-return__label">{returnLabel}</span>
                <span className="excluded-return__arrow" aria-hidden="true" />
              </a>
              <div className="excluded-footer__links">
                {resolvedFooterLinks.map((link) => (
                  <a key={link.label} href={link.url}>
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="excluded-footer__copy">{footerCopy}</div>
            </div>
          </div>
        </section>
      );
    }
    case "legalNotes": {
      const legalItems = Array.isArray(section.data.items)
        ? (section.data.items as string[])
        : [];
      const legalBullet = section.data?.bullet === "none" ? "none" : "disc";
      const rawNoteWidth = section.data?.noteWidthPct;
      const noteWidthPct =
        typeof rawNoteWidth === "number" && Number.isFinite(rawNoteWidth)
          ? Math.min(100, Math.max(40, rawNoteWidth))
          : 100;
      // 行ごとの marks.bullet 情報を取得（content.items[0].lines から）
      const legalContentItems = Array.isArray(section.content?.items)
        ? section.content!.items
        : [];
      const legalTextItem = legalContentItems.find((item) => item.type === "text") as
        | { type: "text"; lines: Array<{ id: string; text: string; marks?: { bullet?: "disc" | "none" } }> }
        | undefined;
      const legalLineMarks = legalTextItem?.lines ?? [];
      const getLineBullet = (index: number): "disc" | "none" => {
        const lineMark = legalLineMarks[index];
        if (lineMark?.marks?.bullet !== undefined) {
          return lineMark.marks.bullet;
        }
        return legalBullet;
      };
      return (
        <section className="w-full">
          <ul
            className="mt-3 space-y-2 pl-0 text-sm text-[var(--lp-muted)] list-none"
            style={{
              ...(cardTextColor ? { color: cardTextColor } : {}),
              width: `${noteWidthPct}%`,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {legalItems.map((item, index) => {
              const lineBullet = getLineBullet(index);
              return (
                <li
                  key={`${section.id}-note-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: lineBullet === "disc" ? "0.4em" : "0",
                    paddingLeft: lineBullet === "disc" ? "0" : "0",
                  }}
                >
                  {lineBullet === "disc" && (
                    <span
                      style={{
                        flexShrink: 0,
                        marginTop: "0.3em",
                        width: "0.4em",
                        height: "0.4em",
                        borderRadius: "50%",
                        backgroundColor: "currentColor",
                        display: "inline-block",
                      }}
                    />
                  )}
                  <span>{renderRichText(item)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      );
    }
    case "footerHtml":
      const brandBarSection = project?.sections?.find(
        (entry) => entry.type === "brandBar" && entry.visible
      );
      const brandBarAssetId = brandBarSection?.data
        ?.brandImageAssetId as string | undefined;
      return (
        <section
          className="w-full"
          style={buildSurfaceStyle(section.style)}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: buildFooterHtml(
                project?.assets,
                section.data?.footerAssets as
                  | Record<string, string | undefined>
                  | undefined,
                { brandBarAssetId, hideFooterLogo: !brandBarSection }
              ),
            }}
          />
        </section>
      );
    default:
      return renderPlaceholder(section);
  }
};

export default function PreviewSsr({
  project,
  ui,
  onUpdateTargetStoresFilters,
}: PreviewSsrProps) {
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
  const mvBackground = buildBackgroundStyle(project?.settings?.backgrounds?.mv, {
    resolveAssetUrl,
    resolvePreset: resolveBackgroundPreset,
    fallbackColor: "#ffffff",
  });
  const pageBaseStyle = project?.pageBaseStyle;
  const pageSectionAnimationStyle = buildSectionAnimationStyle(
    pageBaseStyle?.sectionAnimation
  );
  const allSections = project?.sections ?? [];
  const visibleSections = allSections.filter((section) => section.visible);
  const orderedSections = visibleSections;
  const firstSection = orderedSections[0];
  const isFirstFullBleed = Boolean(
    firstSection &&
      (firstSection.type === "brandBar" ||
        firstSection.type === "heroImage" ||
        firstSection.type === "campaignPeriodBar" ||
        firstSection.type === "footerHtml" ||
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

  const previewRootStyle: CSSProperties & Record<string, string> = {
    "--lp-font-scale": String(fontScale),
  };
  const pageBackgroundStyle = pageBackground.style as CSSProperties;
  const pageVideo = pageBackground.video;
  const pageVideoUrl = pageVideo?.assetId
    ? assets?.[pageVideo.assetId]?.data || ""
    : "";
  const pageAutoPlay = pageVideo?.autoPlay ?? true;
  const pageLoop = pageVideo?.loop ?? true;
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

  return (
    <div
      id="__lp_root__"
      data-export="1"
      className="relative min-h-screen lp-preview-bg text-[var(--lp-text)]"
      style={previewRootStyle}
    >
      <style dangerouslySetInnerHTML={{ __html: animationStyleSheet }} />
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
      >
        {visibleSections.length === 0 ? (
          <div className="mx-auto w-full max-w-[920px] px-6 text-sm text-[var(--lp-muted)]">
            No sections
          </div>
        ) : null}
        {orderedSections.map((section, index) => {
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
            section.type === "campaignPeriodBar" ||
            section.type === "footerHtml" ||
            section.type === "tabbedNotes" ||
            Boolean(section.data?.footerAssets);
          const sectionCardStyle = normalizeSectionCardStyle(
            section.sectionCardStyle
          );
          const items = Array.isArray(section.content?.items)
            ? section.content?.items
            : [];
          const titleItem = items.find((item) => item.type === "title");
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
            <div
              key={section.id}
              data-section-id={section.id}
              data-contrast-warning={isLowContrast ? "true" : "false"}
              id={`sec-${section.id}`}
              className={"scroll-mt-4 transition-shadow transition-colors "}
              style={pageSectionAnimationStyle}
            >
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
                  renderSection(section, project, ui, undefined, mvBackground)
                ) : (
                  <SectionCard
                    title={titleItem?.text}
                    titleMarks={titleItem?.marks}
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
                      ui,
                      textColor,
                      mvBackground
                    )}
                  </SectionCard>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
