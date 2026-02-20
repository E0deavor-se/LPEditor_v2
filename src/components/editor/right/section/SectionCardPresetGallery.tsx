"use client";

import type { CSSProperties } from "react";
import type { SectionCardStyle, SectionStyle } from "@/src/types/project";
import {
  SECTION_CARD_PRESETS,
  clampCardShadowOpacity,
} from "@/src/lib/sections/sectionCardPresets";

type SectionCardPresetGalleryProps = {
  sectionStyle: SectionStyle;
  currentStyle: SectionCardStyle;
  onSelect: (presetId: SectionCardStyle["presetId"]) => void;
  onReset: (presetId: SectionCardStyle["presetId"]) => void;
};

const buildPreviewStyle = (
  sectionStyle: SectionStyle,
  cardStyle: SectionCardStyle
) => {
  const isTransparent = Boolean(sectionStyle.background.transparent);
  const surfaceOpacity =
    typeof sectionStyle.background.opacity === "number"
      ? Math.max(0, Math.min(1, sectionStyle.background.opacity))
      : 1;
  const opacityPct = Math.round(surfaceOpacity * 100);
  const applyOpacity = (color: string) =>
    isTransparent
      ? "transparent"
      : surfaceOpacity >= 1
      ? color
      : `color-mix(in oklab, ${color} ${opacityPct}%, transparent)`;
  const padding = cardStyle.padding;
  const shadowOpacity = clampCardShadowOpacity(cardStyle.shadowOpacity);
  const backgroundColor =
    applyOpacity(
      cardStyle.innerBgColor || sectionStyle.background.color1 || "#ffffff"
    );
  const backgroundImage =
    !isTransparent &&
    !cardStyle.innerBgColor &&
    sectionStyle.background.type === "gradient"
      ? `linear-gradient(135deg, ${applyOpacity(
          sectionStyle.background.color1
        )}, ${applyOpacity(sectionStyle.background.color2)})`
      : "none";
  return {
    borderColor: cardStyle.borderColor || sectionStyle.border.color,
    borderWidth: `${cardStyle.borderWidth}px`,
    borderRadius: `${cardStyle.radius}px`,
    padding: `${padding.t}px ${padding.r}px ${padding.b}px ${padding.l}px`,
    backgroundColor,
    backgroundImage,
    overflow: "hidden",
    boxShadow: cardStyle.shadowEnabled
      ? `0 2px 4px rgba(0, 0, 0, ${shadowOpacity})`
      : "none",
  } as CSSProperties;
};

export default function SectionCardPresetGallery({
  sectionStyle,
  currentStyle,
  onSelect,
  onReset,
}: SectionCardPresetGalleryProps) {
  return (
    <div className="flex flex-col gap-2 px-2 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {SECTION_CARD_PRESETS.map((preset) => {
          const isActive = currentStyle.presetId === preset.id;
          const previewStyle = buildPreviewStyle(
            sectionStyle,
            preset.cardStyle
          );
          const titleColor =
            preset.cardStyle.headerTextColor || sectionStyle.typography.textColor;
          const headerBg = preset.cardStyle.headerBgColor || "#5fc2f5";
          const titleAlign =
            preset.cardStyle.labelChipTextColor === "center" ||
            preset.cardStyle.labelChipTextColor === "right"
              ? preset.cardStyle.labelChipTextColor
              : "left";
          return (
            <button
              key={preset.id}
              type="button"
              className={
                "flex flex-col gap-2 rounded-md border px-2 py-2 text-left text-[11px] transition " +
                (isActive
                  ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                  : "border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 hover:border-[var(--ui-border)]")
              }
              onClick={() => onSelect(preset.id)}
            >
              <div className="font-semibold text-[var(--ui-text)]">
                {preset.name}
              </div>
              <div
                className="relative flex min-h-[84px] flex-col gap-2 rounded-md border bg-white"
                style={previewStyle}
              >
                <div
                  className="text-[10px] font-semibold"
                  style={{
                    background: headerBg,
                    color: titleColor,
                    padding: "4px",
                    textAlign: titleAlign,
                  }}
                >
                  タイトル
                </div>
                <div className="flex flex-col gap-1 px-2 py-2">
                  <div className="h-2 w-4/5 rounded bg-[var(--ui-card)]" />
                  <div className="h-2 w-3/5 rounded bg-[var(--ui-card)]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="ui-button h-7 px-2 text-[11px]"
        onClick={() => onReset(currentStyle.presetId)}
      >
        プリセットにリセット
      </button>
    </div>
  );
}
