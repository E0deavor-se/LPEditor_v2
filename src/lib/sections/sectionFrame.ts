import type { SectionBase } from "@/src/types/project";

export const SECTION_FRAME_SCHEMA = "v1";

const FULL_WIDTH_SECTION_TYPES = new Set([
  "brandBar",
  "campaignPeriodBar",
  "footerHtml",
  "excludedStoresList",
  "excludedBrandsList",
  "tabbedNotes",
  "imageOnly",
]);

export const hasFullWidthBackground = (section: SectionBase): boolean => {
  if (section.type === "heroImage" && Boolean(section.data?.heroFullSize)) {
    return true;
  }
  if (typeof section.style?.layout?.fullWidth === "boolean") {
    return section.style.layout.fullWidth;
  }
  return FULL_WIDTH_SECTION_TYPES.has(section.type);
};

export const getSectionMetricsKey = (section: SectionBase, index: number): string =>
  `section:${index + 1}:${section.type}`;

export const getSectionFrameDefaults = (section: SectionBase) => {
  const sectionType =
    typeof section.data?.sectionType === "string" && section.data.sectionType.trim()
      ? section.data.sectionType
      : section.type;
  const fullWidthBackground =
    typeof section.data?.fullWidthBackground === "boolean"
      ? section.data.fullWidthBackground
      : hasFullWidthBackground(section);
  return {
    sectionType,
    fullWidthBackground,
  };
};

export const applySectionFrameDefaults = (section: SectionBase): SectionBase => {
  const defaults = getSectionFrameDefaults(section);
  return {
    ...section,
    data: {
      ...section.data,
      sectionType: defaults.sectionType,
      fullWidthBackground: defaults.fullWidthBackground,
    },
  };
};

export const getSectionFrameData = (section: SectionBase, index: number) => ({
  sectionId: section.id,
  sectionType: section.type,
  sectionFrame: SECTION_FRAME_SCHEMA,
  fullWidthBackground: hasFullWidthBackground(section) ? "true" : "false",
  lpMetrics: getSectionMetricsKey(section, index),
});
