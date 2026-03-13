/* ───────────────────────────────────────────────
   Shared UI Tokens – Layout / Canvas 共通
   ─────────────────────────────────────────────── */

export const SHARED_TOKENS = {
  /* ---- Dimensions ---- */
  appHeaderHeight: 44,
  modeSwitchHeight: 40,
  toolbarHeight: 40,
  sidebarWidth: 240,
  sidebarMinWidth: 200,
  sidebarMaxWidth: 300,
  inspectorWidth: 300,
  panelHeaderHeight: 36,
  listRowHeight: 32,
  sectionRowHeight: 32,

  /* ---- Spacing (Tailwind class strings) ---- */
  fieldGap: "gap-1.5",
  sectionGap: "gap-3",

  /* ---- Input / Radius ---- */
  inputHeight: "h-7",
  radiusSm: "rounded",
  radiusMd: "rounded-md",
  radiusLg: "rounded-lg",

  /* ---- Colors (CSS var references) ---- */
  borderColor: "var(--ui-border)",
  panelBg: "var(--ui-panel)",
  canvasBg: "var(--ui-canvas-outer)",
  surfaceBg: "var(--surface-2)",
  mutedTextColor: "var(--ui-muted)",
  accentColor: "var(--ui-accent)",

  /* ---- Typography (Tailwind class strings) ---- */
  compactText: "text-[11px]",
  labelText: "text-[10px]",
  titleText: "text-[13px]",

  /* ---- Class helpers ---- */
  inputHeightClass: "h-7",
  inputRadiusClass: "rounded",
  fieldGapClass: "gap-1.5",
  fieldRowGapClass: "gap-x-2",
  primaryTabHeight: "h-6",
  secondaryTabHeight: "h-7",
  sectionTitleFontSize: "text-[10px]",
  fieldLabelFontSize: "text-[11px]",

  /* ---- Button base classes ---- */
  btnBase: "h-7 px-2 rounded text-[11px] font-medium flex items-center gap-1 transition-colors",
  btnActive: "bg-[var(--ui-text)] text-[var(--ui-bg)]",
  btnGhost: "hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] text-[var(--ui-text)]",
} as const;

export type SharedTokens = typeof SHARED_TOKENS;
