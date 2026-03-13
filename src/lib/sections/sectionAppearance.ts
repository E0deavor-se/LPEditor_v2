import type { SectionAppearance, SectionHeaderStyle } from "@/src/types/project";

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const asColor = (value: unknown, fallback: string) => {
  const text = typeof value === "string" ? value.trim() : "";
  return HEX_COLOR_RE.test(text) ? text : fallback;
};

const asHeaderStyle = (value: unknown, fallback: SectionHeaderStyle): SectionHeaderStyle => {
  if (value === "band" || value === "ribbon" || value === "plain") {
    return value;
  }
  return fallback;
};

export const resolveSectionAppearance = (
  value: unknown,
  fallback?: Partial<Required<SectionAppearance>>
): Required<SectionAppearance> => {
  const appearance = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};

  const headerBackgroundColor = asColor(
    appearance.headerBackgroundColor,
    fallback?.headerBackgroundColor ?? "#ea5504"
  );
  const titleTextColor = asColor(
    appearance.titleTextColor,
    fallback?.titleTextColor ?? "#ffffff"
  );
  const accentColor = asColor(
    appearance.accentColor,
    fallback?.accentColor ?? "#eb5505"
  );
  const borderColor = asColor(
    appearance.borderColor,
    fallback?.borderColor ?? "#e5e7eb"
  );

  return {
    headerBackgroundColor,
    titleTextColor,
    accentColor,
    borderColor,
    headerStyle: asHeaderStyle(appearance.headerStyle, fallback?.headerStyle ?? "band"),
    showHeaderBand:
      typeof appearance.showHeaderBand === "boolean"
        ? appearance.showHeaderBand
        : fallback?.showHeaderBand ?? true,
  };
};

export const resolveSectionDecorationFromData = (
  data: Record<string, unknown>,
  fallback?: Partial<Required<SectionAppearance>>
) => {
  return resolveSectionAppearance(data.decoration ?? data.appearance, {
    headerBackgroundColor:
      typeof data.titleBandColor === "string"
        ? data.titleBandColor
        : fallback?.headerBackgroundColor,
    titleTextColor:
      typeof data.titleTextColor === "string"
        ? data.titleTextColor
        : fallback?.titleTextColor,
    accentColor:
      typeof data.accentColor === "string"
        ? data.accentColor
        : fallback?.accentColor,
    borderColor:
      typeof data.cardBorderColor === "string"
        ? data.cardBorderColor
        : fallback?.borderColor,
    headerStyle: fallback?.headerStyle,
    showHeaderBand: fallback?.showHeaderBand,
  });
};
