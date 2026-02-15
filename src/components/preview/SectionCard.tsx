import type { CSSProperties, ReactNode } from "react";
import type {
  LineMarks,
  SectionCardStyle,
  SectionStyle,
} from "@/src/types/project";
import {
  clampCardShadowOpacity,
  getSectionCardPreset,
} from "@/src/lib/sections/sectionCardPresets";

type SectionCardProps = {
  title?: string;
  titleMarks?: LineMarks;
  sectionCardStyle: SectionCardStyle;
  sectionStyle: SectionStyle;
  titleAnimationStyle?: CSSProperties;
  children: ReactNode;
};

const buildTitleStyle = (
  sectionStyle: SectionStyle,
  sectionCardStyle: SectionCardStyle,
  titleMarks: LineMarks | undefined
) => {
  const weight =
    titleMarks?.bold === false
      ? sectionStyle.typography.fontWeight
      : 700;
  const align =
    sectionCardStyle.labelChipTextColor === "center" ||
    sectionCardStyle.labelChipTextColor === "right"
      ? sectionCardStyle.labelChipTextColor
      : "left";
  const color =
    titleMarks?.color ??
    sectionCardStyle.headerTextColor ??
    sectionStyle.typography.textColor;
  const size =
    titleMarks?.size ??
    Math.max(18, sectionStyle.typography.fontSize + 6);
  return {
    fontFamily: sectionStyle.typography.fontFamily,
    fontWeight: weight,
    textAlign: align,
    color,
    fontSize: `calc(${size}px * var(--lp-font-scale, 1))`,
    letterSpacing: `${sectionStyle.typography.letterSpacing}px`,
    lineHeight: sectionStyle.typography.lineHeight,
  } as CSSProperties;
};

export default function SectionCard({
  title,
  titleMarks,
  sectionCardStyle,
  sectionStyle,
  titleAnimationStyle,
  children,
}: SectionCardProps) {
  const resolvedTitle = title?.trim();
  const titleStyle = {
    ...buildTitleStyle(sectionStyle, sectionCardStyle, titleMarks),
    ...(titleAnimationStyle ?? {}),
  };
  const shadowOpacity = clampCardShadowOpacity(sectionCardStyle.shadowOpacity);
  const preset = getSectionCardPreset(sectionCardStyle.presetId);
  const headerLayout = preset?.headerLayout ?? "band";
  const borderColor = sectionStyle.border.color;
  const textColor =
    sectionCardStyle.textColor || sectionStyle.typography.textColor;
  const headerTextColor =
    sectionCardStyle.headerTextColor || sectionStyle.typography.textColor;
  const background =
    sectionStyle.background.type === "gradient"
      ? `linear-gradient(135deg, ${sectionStyle.background.color1}, ${sectionStyle.background.color2})`
      : sectionStyle.background.color1 || "#ffffff";
  const borderWidth = sectionStyle.border.enabled ? sectionStyle.border.width : 0;
  const shadowStyle =
    sectionStyle.shadow === "sm"
      ? `0 2px 4px rgba(0, 0, 0, ${shadowOpacity})`
      : sectionStyle.shadow === "md"
      ? `0 12px 24px rgba(0, 0, 0, 0.18)`
      : "none";
  const bandSize =
    sectionCardStyle.labelChipBg === "sm" ||
    sectionCardStyle.labelChipBg === "lg"
      ? sectionCardStyle.labelChipBg
      : "md";
  const bandPadding =
    bandSize === "sm" ? "4px" : bandSize === "lg" ? "12px" : "8px";
  const bandPosition = sectionCardStyle.labelChipEnabled ? "inset" : "top";
  const cardStyle: CSSProperties & Record<string, string> = {
    borderColor,
    borderWidth: `${borderWidth}px`,
    borderRadius: `${sectionStyle.layout.radius}px`,
    borderStyle: borderWidth > 0 ? "solid" : "none",
    color: textColor,
    background,
    boxShadow: shadowStyle,
    "--lp-card-header-bg":
      sectionCardStyle.headerBgColor || sectionStyle.border.color,
    "--lp-card-header-text": headerTextColor,
    "--lp-card-radius": `${sectionStyle.layout.radius}px`,
    "--lp-card-band-pad": bandPadding,
    "--lp-card-frame-color": sectionStyle.border.color,
    "--lp-card-frame-width": `${Math.max(0, sectionStyle.border.width)}px`,
    "--lp-card-accent": sectionCardStyle.headerBgColor || "#5fc2f5",
    "--lp-titlechip-bg": sectionCardStyle.headerBgColor || "transparent",
    "--lp-titlechip-color": headerTextColor,
  };

  const showHeader = Boolean(resolvedTitle);
  const bodyContent =
    headerLayout === "inner" && showHeader ? (
      <>
        <h2 className="lp-section-title lp-section-title--inner" style={titleStyle}>
          {resolvedTitle}
        </h2>
        {children}
      </>
    ) : (
      children
    );

  return (
    <div className="lp-section-shell">
      <div
        className={`lp-section-card lp-card lp-card--${sectionCardStyle.presetId}`}
        data-preset={sectionCardStyle.presetId}
        data-header-style={sectionCardStyle.headerStyle}
        data-band-position={bandPosition}
        style={cardStyle}
      >
        {showHeader && headerLayout === "band" ? (
          <div className="lp-section-header">
            <h2 className="lp-section-title" style={titleStyle}>
              {resolvedTitle}
            </h2>
          </div>
        ) : null}
        {showHeader && headerLayout === "chip" ? (
          <span className="lp-card__titlechip">{resolvedTitle}</span>
        ) : null}
        <div className="lp-section-body">{bodyContent}</div>
      </div>
    </div>
  );
}
