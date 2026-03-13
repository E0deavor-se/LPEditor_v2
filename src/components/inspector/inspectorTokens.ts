import { SHARED_TOKENS } from "@/src/components/shared/sharedTokens";

export const INSPECTOR_TOKENS = {
  inspectorWidth: SHARED_TOKENS.inspectorWidth,
  inspectorHeaderHeight: "h-9",
  primaryTabHeight: SHARED_TOKENS.primaryTabHeight,
  secondaryTabHeight: SHARED_TOKENS.secondaryTabHeight,
  sectionTitleFontSize: SHARED_TOKENS.sectionTitleFontSize,
  fieldLabelFontSize: SHARED_TOKENS.fieldLabelFontSize,
  fieldGapClass: SHARED_TOKENS.fieldGapClass,
  fieldRowGapClass: SHARED_TOKENS.fieldRowGapClass,
  inputHeightClass: SHARED_TOKENS.inputHeightClass,
  inputRadiusClass: SHARED_TOKENS.inputRadiusClass,
  borderColorVar: SHARED_TOKENS.borderColor,
  panelBgVar: SHARED_TOKENS.panelBg,
  mutedTextVar: SHARED_TOKENS.mutedTextColor,
  accentVar: SHARED_TOKENS.accentColor,
} as const;
