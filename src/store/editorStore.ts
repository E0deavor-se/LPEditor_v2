import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import type {
  BackgroundSpec,
  ButtonContentItem,
  ButtonTarget,
  ContentItem,
  ContentItemAnimation,
  ImageContentItem,
  ImageItem,
  PageBaseStyle,
  PageMetaSettings,
  ProjectSettings,
  ProjectState,
  PrimaryLine,
  LineMarks,
  SectionBase,
  SectionContent,
  SectionStyle,
  SectionStylePatch,
  SectionTextAlign,
  SectionCardStyle,
  SectionCardStylePatch,
  TextContentItem,
  TitleContentItem,
} from "@/src/types/project";
import type { CsvImportPreview } from "@/src/lib/csv/importSummary";
import {
  DEFAULT_SECTION_CARD_STYLE,
  extractLegacyPresetId,
  getSectionCardPreset,
  normalizeSectionCardStyle,
} from "@/src/lib/sections/sectionCardPresets";

export type EditorSaveStatus = "saved" | "dirty" | "saving" | "error" | "offline";

export type BrandPreset = {
  id: string;
  name: string;
  style: SectionStyle;
};

const MAX_HISTORY = 100;
const DEFAULT_TARGET_STORES_CONFIG = {
  labelKeys: [],
  filterKeys: ["都道府県"],
  pageSize: 10,
  columnConfig: {},
};

type TargetStoresConfig = {
  labelKeys: string[];
  filterKeys: string[];
  pageSize: number;
  columnConfig?: Record<
    string,
    {
      showAsLabel: boolean;
      enableFilter: boolean;
      selectedValues: string[];
      label?: string;
      valueDisplay?: "label" | "raw";
      falseLabel?: string;
      badgeColor?: string;
      badgeTextColor?: string;
      falseBadgeColor?: string;
      falseBadgeTextColor?: string;
      filterLabel?: string;
    }
  >;
};

const cloneProject = (project: ProjectState): ProjectState =>
  JSON.parse(JSON.stringify(project)) as ProjectState;

const normalizeProjectForCompare = (project: ProjectState): ProjectState => {
  const normalized = cloneProject(project);
  normalized.meta.updatedAt = "";
  return normalized;
};

const projectsEqual = (a: ProjectState, b: ProjectState) =>
  JSON.stringify(normalizeProjectForCompare(a)) ===
  JSON.stringify(normalizeProjectForCompare(b));

const pushStack = (stack: ProjectState[], snapshot: ProjectState) => {
  const next = [...stack, snapshot];
  if (next.length > MAX_HISTORY) {
    next.splice(0, next.length - MAX_HISTORY);
  }
  return next;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeTargetStoresConfig = (
  config?: Partial<TargetStoresConfig>
): TargetStoresConfig => {
  const labelKeys = Array.isArray(config?.labelKeys)
    ? config?.labelKeys.filter(Boolean)
    : [];
  const filterKeys = Array.isArray(config?.filterKeys)
    ? config?.filterKeys.filter(Boolean)
    : [];
  const pageSize =
    typeof config?.pageSize === "number" && config.pageSize > 0
      ? config.pageSize
      : DEFAULT_TARGET_STORES_CONFIG.pageSize;
  const rawColumnConfig = config?.columnConfig ?? {};
  const columnConfig: TargetStoresConfig["columnConfig"] = {};
  if (rawColumnConfig && typeof rawColumnConfig === "object") {
    Object.entries(rawColumnConfig).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      columnConfig[key] = {
        showAsLabel: Boolean(value.showAsLabel),
        enableFilter: Boolean(value.enableFilter),
        selectedValues: Array.isArray(value.selectedValues)
          ? value.selectedValues.filter((entry) => entry != null && entry !== "")
          : [],
        label: typeof value.label === "string" ? value.label : undefined,
        valueDisplay:
          value.valueDisplay === "raw" ? "raw" : "label",
        falseLabel:
          typeof value.falseLabel === "string" ? value.falseLabel : undefined,
        badgeColor:
          typeof value.badgeColor === "string" ? value.badgeColor : undefined,
        badgeTextColor:
          typeof value.badgeTextColor === "string" ? value.badgeTextColor : undefined,
        falseBadgeColor:
          typeof value.falseBadgeColor === "string"
            ? value.falseBadgeColor
            : undefined,
        falseBadgeTextColor:
          typeof value.falseBadgeTextColor === "string"
            ? value.falseBadgeTextColor
            : undefined,
        filterLabel:
          typeof value.filterLabel === "string" ? value.filterLabel : undefined,
      };
    });
  }
  return {
    labelKeys,
    filterKeys: Array.from(new Set(["都道府県", ...filterKeys])),
    pageSize,
    columnConfig,
  };
};

const DEFAULT_PAGE_BASE_STYLE: PageBaseStyle = {
  typography: {
    fontFamily: "system-ui",
    baseSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
    fontWeight: 400,
  },
  sectionAnimation: {
    type: "none",
    trigger: "onView",
    speed: 500,
    easing: "ease-out",
  },
  colors: {
    background: "#ffffff",
    text: "#111111",
    accent: "#1f6feb",
    border: "#e5e7eb",
  },
  spacing: {
    sectionPadding: {
      t: 32,
      r: 24,
      b: 32,
      l: 24,
    },
    sectionGap: 24,
  },
  layout: {
    maxWidth: 1200,
    align: "center",
    radius: 12,
    shadow: "sm",
  },
};

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  backgrounds: {
    page: { type: "solid", color: "#ffffff" },
    mv: { type: "solid", color: "#ffffff" },
  },
  pageMeta: {
    title: "",
    description: "",
    faviconUrl: "",
    faviconAssetId: "",
    ogpImageUrl: "",
    ogpImageAssetId: "",
    ogpTitle: "",
    ogpDescription: "",
    presets: {
      appendAuPayTitle: false,
      ogpFromMv: false,
      injectCampaignPeriod: false,
    },
  },
};

const normalizePageMetaSettings = (
  value?: Partial<PageMetaSettings>
): PageMetaSettings => {
  const presets = value?.presets ?? {};
  return {
    title: typeof value?.title === "string" ? value.title : "",
    description: typeof value?.description === "string" ? value.description : "",
    faviconUrl: typeof value?.faviconUrl === "string" ? value.faviconUrl : "",
    faviconAssetId:
      typeof value?.faviconAssetId === "string" ? value.faviconAssetId : "",
    ogpImageUrl: typeof value?.ogpImageUrl === "string" ? value.ogpImageUrl : "",
    ogpImageAssetId:
      typeof value?.ogpImageAssetId === "string" ? value.ogpImageAssetId : "",
    ogpTitle: typeof value?.ogpTitle === "string" ? value.ogpTitle : "",
    ogpDescription:
      typeof value?.ogpDescription === "string" ? value.ogpDescription : "",
    presets: {
      appendAuPayTitle: Boolean(presets.appendAuPayTitle),
      ogpFromMv: Boolean(presets.ogpFromMv),
      injectCampaignPeriod: Boolean(presets.injectCampaignPeriod),
    },
  };
};

const normalizePageBaseStyle = (
  style?: Partial<PageBaseStyle>
): PageBaseStyle => {
  const typography = style?.typography ?? DEFAULT_PAGE_BASE_STYLE.typography;
  const sectionAnimationInput =
    style?.sectionAnimation ?? DEFAULT_PAGE_BASE_STYLE.sectionAnimation;
  const colors = style?.colors ?? DEFAULT_PAGE_BASE_STYLE.colors;
  const spacing = style?.spacing ?? DEFAULT_PAGE_BASE_STYLE.spacing;
  const sectionPadding = spacing.sectionPadding ?? DEFAULT_PAGE_BASE_STYLE.spacing.sectionPadding;
  const layout = style?.layout ?? DEFAULT_PAGE_BASE_STYLE.layout;
  const sectionAnimationType =
    sectionAnimationInput.type === "fade" ||
    sectionAnimationInput.type === "slide" ||
    sectionAnimationInput.type === "slideDown" ||
    sectionAnimationInput.type === "slideLeft" ||
    sectionAnimationInput.type === "slideRight" ||
    sectionAnimationInput.type === "zoom" ||
    sectionAnimationInput.type === "bounce" ||
    sectionAnimationInput.type === "flip" ||
    sectionAnimationInput.type === "flipY" ||
    sectionAnimationInput.type === "rotate" ||
    sectionAnimationInput.type === "blur" ||
    sectionAnimationInput.type === "pop" ||
    sectionAnimationInput.type === "swing" ||
    sectionAnimationInput.type === "float" ||
    sectionAnimationInput.type === "pulse" ||
    sectionAnimationInput.type === "shake" ||
    sectionAnimationInput.type === "wobble" ||
    sectionAnimationInput.type === "skew" ||
    sectionAnimationInput.type === "roll" ||
    sectionAnimationInput.type === "tilt" ||
    sectionAnimationInput.type === "zoomOut" ||
    sectionAnimationInput.type === "stretch" ||
    sectionAnimationInput.type === "compress" ||
    sectionAnimationInput.type === "glide"
      ? sectionAnimationInput.type
      : "none";
  const sectionAnimationTrigger =
    sectionAnimationInput.trigger === "onScroll" ? "onScroll" : "onView";
  const sectionAnimationEasing =
    sectionAnimationInput.easing === "linear" ||
    sectionAnimationInput.easing === "ease" ||
    sectionAnimationInput.easing === "ease-in" ||
    sectionAnimationInput.easing === "ease-in-out"
      ? sectionAnimationInput.easing
      : "ease-out";
  return {
    typography: {
      fontFamily: typography.fontFamily ?? DEFAULT_PAGE_BASE_STYLE.typography.fontFamily,
      baseSize: Number.isFinite(typography.baseSize)
        ? Number(typography.baseSize)
        : DEFAULT_PAGE_BASE_STYLE.typography.baseSize,
      lineHeight: Number.isFinite(typography.lineHeight)
        ? Number(typography.lineHeight)
        : DEFAULT_PAGE_BASE_STYLE.typography.lineHeight,
      letterSpacing: Number.isFinite(typography.letterSpacing)
        ? Number(typography.letterSpacing)
        : DEFAULT_PAGE_BASE_STYLE.typography.letterSpacing,
      fontWeight: Number.isFinite(typography.fontWeight)
        ? Number(typography.fontWeight)
        : DEFAULT_PAGE_BASE_STYLE.typography.fontWeight,
    },
    sectionAnimation: {
      type: sectionAnimationType,
      trigger: sectionAnimationTrigger,
      speed: Number.isFinite(sectionAnimationInput.speed)
        ? Number(sectionAnimationInput.speed)
        : DEFAULT_PAGE_BASE_STYLE.sectionAnimation.speed,
      easing: sectionAnimationEasing,
    },
    colors: {
      background: colors.background ?? DEFAULT_PAGE_BASE_STYLE.colors.background,
      text: colors.text ?? DEFAULT_PAGE_BASE_STYLE.colors.text,
      accent: colors.accent ?? DEFAULT_PAGE_BASE_STYLE.colors.accent,
      border: colors.border ?? DEFAULT_PAGE_BASE_STYLE.colors.border,
    },
    spacing: {
      sectionPadding: {
        t: Number.isFinite(sectionPadding.t)
          ? Number(sectionPadding.t)
          : DEFAULT_PAGE_BASE_STYLE.spacing.sectionPadding.t,
        r: Number.isFinite(sectionPadding.r)
          ? Number(sectionPadding.r)
          : DEFAULT_PAGE_BASE_STYLE.spacing.sectionPadding.r,
        b: Number.isFinite(sectionPadding.b)
          ? Number(sectionPadding.b)
          : DEFAULT_PAGE_BASE_STYLE.spacing.sectionPadding.b,
        l: Number.isFinite(sectionPadding.l)
          ? Number(sectionPadding.l)
          : DEFAULT_PAGE_BASE_STYLE.spacing.sectionPadding.l,
      },
      sectionGap: Number.isFinite(spacing.sectionGap)
        ? Number(spacing.sectionGap)
        : DEFAULT_PAGE_BASE_STYLE.spacing.sectionGap,
    },
    layout: {
      maxWidth: Number.isFinite(layout.maxWidth)
        ? Number(layout.maxWidth)
        : DEFAULT_PAGE_BASE_STYLE.layout.maxWidth,
      align: layout.align ?? DEFAULT_PAGE_BASE_STYLE.layout.align,
      radius: Number.isFinite(layout.radius)
        ? Number(layout.radius)
        : DEFAULT_PAGE_BASE_STYLE.layout.radius,
      shadow: layout.shadow ?? DEFAULT_PAGE_BASE_STYLE.layout.shadow,
    },
  };
};

const isBackgroundSpec = (value: unknown): value is BackgroundSpec => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const type = (value as { type?: string }).type;
  return (
    type === "solid" ||
    type === "gradient" ||
    type === "pattern" ||
    type === "layers" ||
    type === "image" ||
    type === "video" ||
    type === "preset"
  );
};

const normalizeProjectSettings = (
  settings?: ProjectState["settings"]
): ProjectState["settings"] => {
  const raw = settings && typeof settings === "object" ? settings : {};
  const rawBackgrounds = (raw as ProjectSettings).backgrounds;
  const normalizedBackgrounds =
    rawBackgrounds && typeof rawBackgrounds === "object" ? rawBackgrounds : {};
  const page = isBackgroundSpec(normalizedBackgrounds.page)
    ? normalizedBackgrounds.page
    : DEFAULT_PROJECT_SETTINGS.backgrounds?.page;
  const mv = isBackgroundSpec(normalizedBackgrounds.mv)
    ? normalizedBackgrounds.mv
    : DEFAULT_PROJECT_SETTINGS.backgrounds?.mv;
  const pageMeta = normalizePageMetaSettings(
    (raw as ProjectSettings).pageMeta
  );
  return {
    ...raw,
    backgrounds: {
      page,
      mv,
    },
    pageMeta,
  };
};

const DEFAULT_SECTION_STYLE: SectionStyle = {
  typography: {
    fontFamily: "system-ui",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: 0,
    textAlign: "left",
    textColor: "#111111",
  },
  background: {
    type: "solid",
    color1: "#f1f1f1",
    color2: "#ffffff",
  },
  border: {
    enabled: false,
    width: 1,
    color: "#e5e7eb",
  },
  shadow: "sm",
  layout: {
    padding: { t: 0, r: 24, b: 0, l: 24 },
    maxWidth: 920,
    align: "center",
    radius: 0,
    fullWidth: false,
    minHeight: 0,
  },
  customCss: "",
};

const mergeSectionCardStyle = (
  base: SectionCardStyle,
  patch?: SectionCardStylePatch
): SectionCardStyle => {
  if (!patch) {
    return base;
  }
  const padding = patch.padding
    ? {
        ...base.padding,
        ...patch.padding,
      }
    : base.padding;
  return {
    ...base,
    ...patch,
    padding,
  };
};

const coerceNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeSectionStyle = (
  style?: Partial<SectionStyle>
): SectionStyle => {
  const typography = style?.typography ?? DEFAULT_SECTION_STYLE.typography;
  const background = style?.background ?? DEFAULT_SECTION_STYLE.background;
  const border = style?.border ?? DEFAULT_SECTION_STYLE.border;
  const layout = style?.layout ?? DEFAULT_SECTION_STYLE.layout;
  const shadow =
    style?.shadow === "sm" || style?.shadow === "md" || style?.shadow === "none"
      ? style.shadow
      : DEFAULT_SECTION_STYLE.shadow;
  const textAlign: SectionTextAlign =
    typography.textAlign === "center" || typography.textAlign === "right"
      ? typography.textAlign
      : "left";
  const backgroundType = background.type === "gradient" ? "gradient" : "solid";
  return {
    typography: {
      fontFamily: typography.fontFamily ?? DEFAULT_SECTION_STYLE.typography.fontFamily,
      fontSize: coerceNumber(
        typography.fontSize,
        DEFAULT_SECTION_STYLE.typography.fontSize
      ),
      fontWeight: coerceNumber(
        typography.fontWeight,
        DEFAULT_SECTION_STYLE.typography.fontWeight
      ),
      lineHeight: coerceNumber(
        typography.lineHeight,
        DEFAULT_SECTION_STYLE.typography.lineHeight
      ),
      letterSpacing: coerceNumber(
        typography.letterSpacing,
        DEFAULT_SECTION_STYLE.typography.letterSpacing
      ),
      textAlign,
      textColor: typography.textColor ?? DEFAULT_SECTION_STYLE.typography.textColor,
    },
    background: {
      type: backgroundType,
      color1: background.color1 ?? DEFAULT_SECTION_STYLE.background.color1,
      color2: background.color2 ?? DEFAULT_SECTION_STYLE.background.color2,
    },
    border: {
      enabled:
        typeof border.enabled === "boolean"
          ? border.enabled
          : DEFAULT_SECTION_STYLE.border.enabled,
      width: coerceNumber(border.width, DEFAULT_SECTION_STYLE.border.width),
      color: border.color ?? DEFAULT_SECTION_STYLE.border.color,
    },
    shadow,
    layout: {
      padding: {
        t: coerceNumber(layout.padding?.t, DEFAULT_SECTION_STYLE.layout.padding.t),
        r: coerceNumber(layout.padding?.r, DEFAULT_SECTION_STYLE.layout.padding.r),
        b: coerceNumber(layout.padding?.b, DEFAULT_SECTION_STYLE.layout.padding.b),
        l: coerceNumber(layout.padding?.l, DEFAULT_SECTION_STYLE.layout.padding.l),
      },
      maxWidth: coerceNumber(layout.maxWidth, DEFAULT_SECTION_STYLE.layout.maxWidth),
      align:
        layout.align === "left" || layout.align === "center"
          ? layout.align
          : DEFAULT_SECTION_STYLE.layout.align,
      radius: coerceNumber(layout.radius, DEFAULT_SECTION_STYLE.layout.radius),
      fullWidth:
        typeof layout.fullWidth === "boolean"
          ? layout.fullWidth
          : DEFAULT_SECTION_STYLE.layout.fullWidth,
      minHeight: coerceNumber(
        (layout as SectionStyle["layout"]).minHeight,
        DEFAULT_SECTION_STYLE.layout.minHeight
      ),
    },
    customCss: typeof style?.customCss === "string" ? style.customCss : "",
  };
};

const mergeSectionStyle = (
  base: SectionStyle,
  patch: SectionStylePatch
): SectionStyle => ({
  typography: { ...base.typography, ...(patch.typography ?? {}) },
  background: { ...base.background, ...(patch.background ?? {}) },
  border: { ...base.border, ...(patch.border ?? {}) },
  shadow: patch.shadow ?? base.shadow,
  layout: { ...base.layout, ...(patch.layout ?? {}) },
  customCss: patch.customCss ?? base.customCss,
});

const createLineId = () =>
  `line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createItemId = () =>
  `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createImageId = () =>
  `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createRankingRowId = () =>
  `rank_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createTabId = () =>
  `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createTabItemId = () =>
  `tab_item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const TARGET_STORES_NOTICE_LINES = [
  "ご注意ください！",
  "リストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。",
];

const DEFAULT_LEGAL_NOTES_LINES = [
  "割引額は、小数点以下切り捨てとなります。",
  "＊レジで表示されているお買上げ金額は割引表示されません。割引後の金額はau PAY アプリの「履歴」をご確認ください。",
  "クーポンは〇回〇〇〇〇円（税込）以上のお支払いにご利用いただけます。クーポン適用前のお支払い額が〇〇〇〇円（税込）未満となる場合はクーポンが適用されず、クーポン適用前の金額で決済されます。",
  "キャンペーン期間中でも、クーポンの割引総額が所定の金額に達した場合、クーポン配布終了（au PAY アプリ内クーポン一覧非表示）となり、獲得済みクーポンのご利用は不可となります。",
  "au PAYが提供する他の割引とクーポンは併用できません。",
  "1つの店舗に対してクーポンが2つ以上発行されている場合、クーポン適用の優先順位は下記の通りです。",
  "①利用期限までの日数が少ないクーポンが優先されます。",
  "②利用期限までの日数が同じ場合、割引上限金額が大きいクーポンが優先されます（割引率には関係なく、割引上限金額が大きい方が優先されます）。",
  "クーポンはいかなる場合においても一切譲渡・換金できません。",
  "クーポンを使用した決済をキャンセルした場合、お客様がお支払いされた金額のみを返金するものとし、クーポンで割引された額については返金いたしません。",
  "クーポンを利用した決済の後に、一部キャンセルした場合は、クーポンの再発行は一切行いません。",
  "KDDIが不正と判断した場合は、クーポンは無効となります。",
  "掲載期間内であっても今後も同一又は更におトクなクーポンを提供する場合があります。",
  "本キャンペーンは予告なく変更・終了する場合があります。",
  "202〇年〇月〇日時点の情報です。",
];

const buildTargetStoresNoticeLines = (): PrimaryLine[] =>
  TARGET_STORES_NOTICE_LINES.map((text) => ({
    id: createLineId(),
    text,
    marks: { callout: { enabled: true, variant: "note" as const } },
  }));


const normalizeLineMarks = (marks?: LineMarks): LineMarks | undefined => {
  if (!marks || typeof marks !== "object") {
    return undefined;
  }
  const next: LineMarks = {};
  if (typeof marks.bold === "boolean") {
    next.bold = marks.bold;
  }
  if (typeof marks.color === "string") {
    next.color = marks.color;
  }
  if (typeof marks.size === "number" && Number.isFinite(marks.size)) {
    next.size = marks.size;
  }
  if (marks.bullet === "none" || marks.bullet === "disc") {
    next.bullet = marks.bullet;
  }
  if (
    marks.textAlign === "left" ||
    marks.textAlign === "center" ||
    marks.textAlign === "right"
  ) {
    next.textAlign = marks.textAlign;
  }
  if (marks.callout && typeof marks.callout === "object") {
    const callout = marks.callout as LineMarks["callout"];
    next.callout = {
      enabled: Boolean(callout?.enabled),
      variant: callout?.variant === "warn" || callout?.variant === "info"
        ? callout.variant
        : "note",
      bg: typeof callout?.bg === "boolean" ? callout.bg : true,
      border: typeof callout?.border === "boolean" ? callout.border : true,
      bgColor:
        typeof callout?.bgColor === "string" && callout.bgColor.trim()
          ? callout.bgColor
          : undefined,
      borderColor:
        typeof callout?.borderColor === "string" && callout.borderColor.trim()
          ? callout.borderColor
          : undefined,
      radius: typeof callout?.radius === "number" ? callout.radius : 12,
      padding:
        callout?.padding === "sm" || callout?.padding === "lg" || callout?.padding === "md"
          ? callout.padding
          : "md",
      shadow:
        callout?.shadow === "sm" || callout?.shadow === "md" || callout?.shadow === "none"
          ? callout.shadow
          : "none",
    };
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

const normalizeAnimation = (
  animation?: ContentItemAnimation
): ContentItemAnimation | undefined => {
  if (!animation || typeof animation !== "object") {
    return undefined;
  }
  const preset =
    animation.preset === "slideUp" || animation.preset === "zoom"
      ? animation.preset
      : "fade";
  const durationMs = coerceNumber(animation.durationMs, 400);
  const delayMs = coerceNumber(animation.delayMs, 0);
  return { preset, durationMs, delayMs };
};

const normalizePrimaryLines = (
  lines: Array<PrimaryLine | string | null | undefined> | undefined,
  fallbackText: string
): PrimaryLine[] => {
  if (Array.isArray(lines) && lines.length > 0) {
    const normalized = lines
      .map((line) => {
        if (typeof line === "string") {
          return { id: createLineId(), text: line };
        }
        if (!line || typeof line !== "object") {
          return null;
        }
        return {
          id: typeof line.id === "string" && line.id.trim() ? line.id : createLineId(),
          text: typeof line.text === "string" ? line.text : "",
          marks: normalizeLineMarks(line.marks),
          animation: normalizeAnimation(line.animation),
        };
      })
      .filter((line): line is PrimaryLine => Boolean(line));
    if (normalized.length > 0) {
      return normalized;
    }
  }

  const source = typeof fallbackText === "string" ? fallbackText : "";
  const split = source
    .split("\n")
    .map((text) => text.trim())
    .filter((text) => text.length > 0);
  return split.map((text) => ({ id: createLineId(), text }));
};

const normalizeSectionContent = (
  content?: SectionContent
): SectionContent => {
  const title = typeof content?.title === "string" ? content.title : "";
  const normalizeStoreCsv = (
    storeCsv?: SectionContent["storeCsv"]
  ): SectionContent["storeCsv"] => {
    if (!storeCsv || typeof storeCsv !== "object") {
      return undefined;
    }
    const headers = Array.isArray(storeCsv.headers)
      ? storeCsv.headers.map((header) => String(header))
      : [];
    const rows = Array.isArray(storeCsv.rows)
      ? storeCsv.rows.map((row) => {
          const entry: Record<string, string> = {};
          if (row && typeof row === "object") {
            Object.entries(row).forEach(([key, value]) => {
              entry[String(key)] = String(value ?? "");
            });
          }
          return entry;
        })
      : [];
    const importedAt =
      typeof storeCsv.importedAt === "string" ? storeCsv.importedAt : undefined;
    const stats = storeCsv.stats && typeof storeCsv.stats === "object"
      ? {
          totalRows:
            typeof storeCsv.stats.totalRows === "number"
              ? storeCsv.stats.totalRows
              : rows.length,
          duplicateCount:
            typeof storeCsv.stats.duplicateCount === "number"
              ? storeCsv.stats.duplicateCount
              : undefined,
          duplicateIds: Array.isArray(storeCsv.stats.duplicateIds)
            ? storeCsv.stats.duplicateIds.map((id) => String(id))
            : undefined,
        }
      : rows.length > 0
      ? { totalRows: rows.length }
      : undefined;
    return {
      headers,
      rows,
      importedAt,
      stats,
    };
  };
  const normalizeStoreLabels = (
    labels?: SectionContent["storeLabels"]
  ): SectionContent["storeLabels"] => {
    if (!labels || typeof labels !== "object") {
      return undefined;
    }
    const result: SectionContent["storeLabels"] = {};
    Object.entries(labels).forEach(([key, value]) => {
      if (!value || typeof value !== "object") {
        return;
      }
      const columnKey =
        typeof value.columnKey === "string" ? value.columnKey : key;
      result[key] = {
        columnKey,
        displayName:
          typeof value.displayName === "string" && value.displayName.trim()
            ? value.displayName
            : columnKey,
        color:
          typeof value.color === "string" && value.color.trim()
            ? value.color
            : "#CBD5F5",
        trueText:
          typeof value.trueText === "string" && value.trueText.trim()
            ? value.trueText
            : "ON",
        falseText:
          typeof value.falseText === "string" && value.falseText.trim()
            ? value.falseText
            : "OFF",
        valueDisplay:
          value.valueDisplay === "raw" ? "raw" : "toggle",
        showAsFilter:
          typeof value.showAsFilter === "boolean" ? value.showAsFilter : true,
        showAsBadge:
          typeof value.showAsBadge === "boolean" ? value.showAsBadge : true,
      };
    });
    return result;
  };
  const normalizeStoreFilters = (
    filters?: SectionContent["storeFilters"]
  ): SectionContent["storeFilters"] => {
    if (!filters || typeof filters !== "object") {
      return undefined;
    }
    const result: SectionContent["storeFilters"] = {};
    Object.entries(filters).forEach(([key, value]) => {
      result[key] = Boolean(value);
    });
    return result;
  };
  const normalizeStoreFilterOperator = (
    operator?: SectionContent["storeFilterOperator"]
  ): SectionContent["storeFilterOperator"] => {
    if (operator === "OR") {
      return "OR";
    }
    return "AND";
  };

  const normalizeTitleItem = (item: Partial<TitleContentItem>): TitleContentItem => {
    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : createItemId(),
      type: "title",
      text: typeof item.text === "string" ? item.text : "",
      marks: normalizeLineMarks(item.marks),
      animation: normalizeAnimation(item.animation),
    };
  };

  const normalizeTextItem = (item: Partial<TextContentItem>): TextContentItem => {
    const lines = normalizePrimaryLines(item.lines, "");
    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : createItemId(),
      type: "text",
      lines,
      animation: normalizeAnimation(item.animation),
    };
  };

  const normalizeImageItem = (
    item: Partial<ImageContentItem>
  ): ImageContentItem => {
    const images = Array.isArray(item.images)
      ? item.images
          .filter((image) => image && typeof image === "object")
          .map((image) => ({
            id:
              typeof image.id === "string" && image.id.trim()
                ? image.id
                : createImageId(),
            src: typeof image.src === "string" ? image.src : "",
            alt: typeof image.alt === "string" ? image.alt : "",
            animation: normalizeAnimation(image.animation),
          }))
          .filter((image) => image.src.trim().length > 0)
      : [];
    const layout =
      item.layout === "auto" ||
      item.layout === "vertical" ||
      item.layout === "horizontal" ||
      item.layout === "columns2" ||
      item.layout === "columns3" ||
      item.layout === "grid" ||
      item.layout === "slideshow"
        ? item.layout
        : undefined;
    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : createItemId(),
      type: "image",
      images,
      layout,
      animation: normalizeAnimation(item.animation),
    };
  };

  const normalizeButtonTarget = (target?: ButtonTarget): ButtonTarget => {
    if (target?.kind === "section" && typeof target.sectionId === "string") {
      return { kind: "section", sectionId: target.sectionId };
    }
    if (target?.kind === "url" && typeof target.url === "string") {
      return { kind: "url", url: target.url };
    }
    return {
      kind: "url",
      url: "",
    };
  };

  const normalizeButtonItem = (
    item: Partial<ButtonContentItem>
  ): ButtonContentItem => {
    const rawStyle = item.style && typeof item.style === "object" ? item.style : undefined;
    const style = rawStyle
      ? {
          presetId:
            typeof rawStyle.presetId === "string" ? rawStyle.presetId : undefined,
          align:
            rawStyle.align === "left" ||
            rawStyle.align === "center" ||
            rawStyle.align === "right"
              ? rawStyle.align
              : undefined,
          fullWidth:
            typeof rawStyle.fullWidth === "boolean" ? rawStyle.fullWidth : undefined,
          width:
            typeof rawStyle.width === "number" && Number.isFinite(rawStyle.width)
              ? rawStyle.width
              : undefined,
          radius:
            typeof rawStyle.radius === "number" && Number.isFinite(rawStyle.radius)
              ? rawStyle.radius
              : undefined,
          backgroundColor:
            typeof rawStyle.backgroundColor === "string"
              ? rawStyle.backgroundColor
              : undefined,
          textColor:
            typeof rawStyle.textColor === "string" ? rawStyle.textColor : undefined,
          borderColor:
            typeof rawStyle.borderColor === "string" ? rawStyle.borderColor : undefined,
          borderWidth:
            typeof rawStyle.borderWidth === "number" && Number.isFinite(rawStyle.borderWidth)
              ? rawStyle.borderWidth
              : undefined,
        }
      : undefined;
    const hasStyle =
      style &&
      (style.presetId ||
        style.align ||
        typeof style.fullWidth === "boolean" ||
        typeof style.width === "number" ||
        typeof style.radius === "number" ||
        style.backgroundColor ||
        style.textColor ||
        style.borderColor ||
        typeof style.borderWidth === "number");
    return {
      id: typeof item.id === "string" && item.id.trim() ? item.id : createItemId(),
      type: "button",
      label: typeof item.label === "string" ? item.label : "",
      target: normalizeButtonTarget(item.target),
      variant: item.variant === "secondary" ? "secondary" : "primary",
      style: hasStyle ? style : undefined,
      animation: normalizeAnimation(item.animation),
    };
  };

  const normalizedItems: ContentItem[] = Array.isArray(content?.items)
    ? content.items
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          if (item.type === "title") {
            return normalizeTitleItem(item as Partial<TitleContentItem>);
          }
          if (item.type === "image") {
            return normalizeImageItem(item as Partial<ImageContentItem>);
          }
          if (item.type === "button") {
            return normalizeButtonItem(item as Partial<ButtonContentItem>);
          }
          return normalizeTextItem(item as Partial<TextContentItem>);
        })
    : [];

  if (normalizedItems.length === 0) {
    const legacyText =
      typeof content?.primaryText === "string" ? content.primaryText : "";
    const legacyLines = normalizePrimaryLines(content?.primaryLines, legacyText);
    const hasLegacyText = legacyLines.length > 0;
    const legacyImageSrc =
      content?.image && typeof content.image === "object"
        ? typeof content.image.src === "string"
          ? content.image.src
          : ""
        : "";
    const legacyButtonLabel =
      content?.button && typeof content.button === "object"
        ? typeof content.button.label === "string"
          ? content.button.label
          : ""
        : "";
    const legacyButtonHref =
      content?.button && typeof content.button === "object"
        ? typeof content.button.href === "string"
          ? content.button.href
          : ""
        : "";

    if (hasLegacyText) {
      normalizedItems.push(
        normalizeTextItem({
          lines: legacyLines,
        })
      );
    }

    if (legacyImageSrc.trim().length > 0) {
      normalizedItems.push(
        normalizeImageItem({
          images: [
            {
              id: createImageId(),
              src: legacyImageSrc,
              alt:
                content?.image && typeof content.image === "object"
                  ? content.image.alt ?? ""
                  : "",
            },
          ],
        })
      );
    }

    if (legacyButtonLabel.trim().length > 0 || legacyButtonHref.trim().length > 0) {
      normalizedItems.push(
        normalizeButtonItem({
          label: legacyButtonLabel,
          target: { kind: "url", url: legacyButtonHref },
        })
      );
    }
  }

  return {
    title,
    items: normalizedItems,
    storeCsv: normalizeStoreCsv(content?.storeCsv),
    storeLabels: normalizeStoreLabels(content?.storeLabels),
    storeFilters: normalizeStoreFilters(content?.storeFilters),
    storeFilterOperator: normalizeStoreFilterOperator(
      content?.storeFilterOperator
    ),
  };
};

const buildStoresFromStoreCsv = (
  storeCsv?: SectionContent["storeCsv"]
): ProjectState["stores"] | undefined => {
  if (!storeCsv || !Array.isArray(storeCsv.headers)) {
    return undefined;
  }
  const headers = storeCsv.headers.map((header) => String(header));
  if (headers.length < 5) {
    return undefined;
  }
  const rows = Array.isArray(storeCsv.rows)
    ? storeCsv.rows.map((row) => {
        const entry: Record<string, string> = {};
        if (row && typeof row === "object") {
          Object.entries(row).forEach(([key, value]) => {
            entry[String(key)] = String(value ?? "");
          });
        }
        return entry;
      })
    : [];
  return {
    columns: headers,
    extraColumns: headers.slice(5),
    rows,
    canonical: {
      storeIdKey: headers[0],
      storeNameKey: headers[1],
      postalCodeKey: headers[2],
      addressKey: headers[3],
      prefectureKey: headers[4],
    },
  };
};

const SECTION_TITLE_FALLBACK: Record<string, string> = {
  campaignOverview: "キャンペーン概要",
  couponFlow: "クーポン利用の流れ",
  targetStores: "対象店舗",
  legalNotes: "注意事項",
  faq: "よくある質問",
  cta: "お申し込み",
  rankingTable: "ランキング",
};

const deriveDefaultTitle = (section: SectionBase, legacyTitle: string) => {
  const dataTitle =
    typeof section.data?.title === "string" ? section.data.title : "";
  const dataLabel =
    typeof section.data?.label === "string" ? section.data.label : "";
  const nameTitle = typeof section.name === "string" ? section.name : "";
  return (
    legacyTitle ||
    dataTitle ||
    dataLabel ||
    nameTitle ||
    SECTION_TITLE_FALLBACK[section.type] ||
    ""
  ).trim();
};

const pinTitleFirst = (items: ContentItem[]): ContentItem[] => {
  const idx = items.findIndex((item) => item.type === "title");
  if (idx <= 0) {
    return items;
  }
  const titleItem = items[idx];
  return [titleItem, ...items.filter((_, index) => index !== idx)];
};

const normalizeSection = (section: SectionBase): SectionBase => {
  const normalizedContent = normalizeSectionContent(section.content);
  const legacyTitle =
    typeof section.content?.title === "string" ? section.content.title : "";
  const legacyHeading =
    typeof (section.content as Record<string, unknown>)?.heading === "string"
      ? String((section.content as Record<string, unknown>).heading)
      : "";
  const legacyTitleText =
    typeof (section.content as Record<string, unknown>)?.titleText === "string"
      ? String((section.content as Record<string, unknown>).titleText)
      : "";
  const defaultTitle = deriveDefaultTitle(
    section,
    legacyTitle || legacyHeading || legacyTitleText
  );

  const existingItems = normalizedContent.items ?? [];
  const titleIndex = existingItems.findIndex((item) => item.type === "title");
  let items = [...existingItems];

  if (titleIndex === -1) {
    items = [
      {
        id: createItemId(),
        type: "title",
        text: defaultTitle,
        marks: {},
      } as TitleContentItem,
      ...items,
    ];
  } else {
    const titleItem = existingItems[titleIndex];
    if (titleItem?.type === "title" && !titleItem.text?.trim() && defaultTitle) {
      items = existingItems.map((item, index) =>
        index === titleIndex
          ? { ...titleItem, text: defaultTitle }
          : item
      );
    }
  }
  items = pinTitleFirst(items);

  let cleanedCampaignBody: string | undefined;
  if (section.type === "campaignOverview" && !section.data?.isBlank) {
    const legacyPlaceholder = "ここに概要テキストが入ります。";
    const defaultMainLines = [
      "期間中、「〇〇〇」の対象店舗で 1回〇〇〇円（税込）以上の",
      "au PAY（コード支払い）で 使える最大〇〇％割引クーポンをau PAY アプリにてプレゼント！",
    ]
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const noteCallout = { enabled: true, variant: "note" as const };
    const bodyLines = typeof section.data?.body === "string"
      ? section.data.body.split("\n")
      : [];
    cleanedCampaignBody = bodyLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line !== legacyPlaceholder)
      .join("\n");
    items = items.map((item) => {
      if (item.type !== "text") {
        return item;
      }
      const nextLines = item.lines.filter((line) => {
        const trimmed = line.text.trim();
        return trimmed.length > 0 && trimmed !== legacyPlaceholder;
      });
      return nextLines.length === item.lines.length
        ? item
        : { ...item, lines: nextLines };
    });
    const noticeLines = [
      "〇〇店、〇〇店は対象外です。",
      "一部休業中店舗がございます。詳細はHPをご確認ください。",
    ];
    const isNoticeTextItem = (item: ContentItem) =>
      item.type === "text" &&
      noticeLines.every((line) =>
        item.lines.some((entry) => entry.text.trim() === line)
      );
    const isMainTextItem = (item: ContentItem) =>
      item.type === "text" && !isNoticeTextItem(item);
    const mainTextItem = items.find(
      (item) => isMainTextItem(item)
    ) as TextContentItem | undefined;
    if (defaultMainLines.length > 0) {
      if (!mainTextItem) {
        items = [
          ...items,
          {
            id: createItemId(),
            type: "text",
            lines: defaultMainLines.map((text) => ({
              id: createLineId(),
              text,
              marks: { bold: true, textAlign: "center" },
            })),
          } as TextContentItem,
        ];
      } else if (mainTextItem.type === "text" && mainTextItem.lines.length === 0) {
        items = items.map((item) =>
          item.id === mainTextItem.id && item.type === "text"
            ? {
                ...item,
                lines: defaultMainLines.map((text) => ({
                  id: createLineId(),
                  text,
                  marks: { bold: true, textAlign: "center" },
                })),
              }
            : item
        );
      }
    }
    const noticeItem = items.find((item) => isNoticeTextItem(item));
    if (!noticeItem) {
      items = [
        ...items,
        {
          id: createItemId(),
          type: "text",
          lines: noticeLines.map((text) => ({
            id: createLineId(),
            text,
            marks: { callout: noteCallout },
          })),
        } as TextContentItem,
      ];
    } else if (noticeItem.type === "text" && noticeItem.lines.length === 0) {
      items = items.map((item) =>
        item.id === noticeItem.id && item.type === "text"
          ? {
              ...item,
              lines: noticeLines.map((text) => ({
                id: createLineId(),
                text,
                marks: { callout: noteCallout },
              })),
            }
          : item
      );
    } else if (noticeItem.type === "text") {
      items = items.map((item) =>
        item.id === noticeItem.id && item.type === "text"
          ? {
              ...item,
              lines: item.lines.map((line) => ({
                ...line,
                marks: {
                  ...(line.marks ?? {}),
                  callout: noteCallout,
                },
              })),
            }
          : item
      );
    }
    const existingTexts = new Set(
      items.flatMap((item) => (item.type === "text" ? item.lines : []))
        .map((line) => line.text.trim())
    );
    const missingLines = noticeLines.filter((line) => !existingTexts.has(line));
    if (missingLines.length > 0) {
      const noticeIndex = items.findIndex((item) => isNoticeTextItem(item));
      if (noticeIndex >= 0) {
        const textItem = items[noticeIndex] as TextContentItem;
        const nextLines = [
          ...textItem.lines,
          ...missingLines.map((text) => ({
            id: createLineId(),
            text,
            marks: { callout: noteCallout },
          })),
        ];
        items = items.map((item, index) =>
          index === noticeIndex ? { ...textItem, lines: nextLines } : item
        );
      } else {
        items = [
          ...items,
          {
            id: createItemId(),
            type: "text",
            lines: missingLines.map((text) => ({
              id: createLineId(),
              text,
              marks: { callout: noteCallout },
            })),
          } as TextContentItem,
        ];
      }
    }
    const titleItems = items.filter((item) => item.type === "title");
    const textItems = items.filter(
      (item) => item.type === "text" && !isNoticeTextItem(item)
    );
    const noticeItems = items.filter((item) => isNoticeTextItem(item));
    const otherItems = items.filter(
      (item) => item.type !== "title" && item.type !== "text"
    );
    items = [...titleItems, ...textItems, ...noticeItems, ...otherItems];
  }

  if (section.type === "targetStores") {
    const titleIndex = items.findIndex((item) => item.type === "title");
    const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 0;
    const firstNonTitleIndex = items.findIndex((item) => item.type !== "title");
    const ensureCalloutMarks = (marks?: LineMarks) =>
      normalizeLineMarks({
        ...(marks ?? {}),
        callout: {
          ...(marks?.callout ?? {}),
          enabled: true,
          variant: "note" as const,
        },
      }) ?? { callout: { enabled: true, variant: "note" as const } };

    if (firstNonTitleIndex === -1 || items[firstNonTitleIndex].type !== "text") {
      const nextNotice: TextContentItem = {
        id: createItemId(),
        type: "text",
        lines: buildTargetStoresNoticeLines(),
      };
      items = [
        ...items.slice(0, insertIndex),
        nextNotice,
        ...items.slice(insertIndex),
      ];
    } else {
      const noticeItem = items[firstNonTitleIndex] as TextContentItem;
      const hasAnyText = noticeItem.lines.some((line) => line.text.trim().length > 0);
      if (!hasAnyText || noticeItem.lines.length === 0) {
        items = items.map((item, index) =>
          index === firstNonTitleIndex
            ? { ...noticeItem, lines: buildTargetStoresNoticeLines() }
            : item
        );
      } else {
        const nextLines = noticeItem.lines.map((line, index) => {
          if (line.text.trim().length > 0) {
            return line;
          }
          const fallback = TARGET_STORES_NOTICE_LINES[index];
          if (!fallback) {
            return line;
          }
          return {
            ...line,
            text: fallback,
            marks: ensureCalloutMarks(line.marks),
          };
        });
        const extraLines = TARGET_STORES_NOTICE_LINES.slice(nextLines.length).map(
          (text) => ({
            id: createLineId(),
            text,
            marks: { callout: { enabled: true, variant: "note" as const } },
          })
        );
        items = items.map((item, index) =>
          index === firstNonTitleIndex
            ? { ...noticeItem, lines: [...nextLines, ...extraLines] }
            : item
        );
      }
    }
  }

  if (section.type === "legalNotes") {
    type LegalNoteLine = { text: string; bullet: "none" | "disc" };
    const trimmedDefaults = DEFAULT_LEGAL_NOTES_LINES.map((line) => line.trim())
      .filter((line) => line.length > 0);
    const defaultBullet = section.data?.bullet === "none" ? "none" : "disc";
    const normalizeBullet = (value: unknown, fallback: "none" | "disc") =>
      value === "none" || value === "disc" ? value : fallback;
    const rawItems = Array.isArray(section.data?.items) ? section.data.items : [];
    const dataItems = rawItems
      .map((item): LegalNoteLine | null => {
        if (typeof item === "string") {
          return { text: item, bullet: defaultBullet };
        }
        if (!item || typeof item !== "object") {
          return null;
        }
        const entry = item as Record<string, unknown>;
        const text = typeof entry.text === "string" ? entry.text : "";
        const bullet = normalizeBullet(entry.bullet, defaultBullet);
        return { text, bullet };
      })
      .filter((item): item is LegalNoteLine => Boolean(item));
    const hasDataText = dataItems.some((line) => line.text.trim().length > 0);
    const textItems = items.filter((item) => item.type === "text") as TextContentItem[];
    const sourceItems: LegalNoteLine[] = hasDataText
      ? dataItems
      : trimmedDefaults.map((text): LegalNoteLine => ({
          text,
          bullet: defaultBullet,
        }));
    const sourceLines = sourceItems.map((item) => item.text);
    const firstTextIndex = items.findIndex((item) => item.type === "text");
    const areLinesEqual = (
      left: Array<{ text: string; bullet: "none" | "disc" }>,
      right: Array<{ text: string; bullet: "none" | "disc" }>
    ) => {
      if (left.length !== right.length) {
        return false;
      }
      return left.every(
        (value, index) =>
          value.text === right[index]?.text && value.bullet === right[index]?.bullet
      );
    };
    const shouldNormalizeDataItems = !areLinesEqual(dataItems, sourceItems);
    if (shouldNormalizeDataItems && sourceItems.length > 0) {
      section = {
        ...section,
        data: {
          ...(section.data ?? {}),
          items: sourceItems,
        },
      };
    }
    if (sourceLines.length > 0 && firstTextIndex === -1) {
      const titleIndex = items.findIndex((item) => item.type === "title");
      const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 0;
      const nextTextItem: TextContentItem = {
        id: createItemId(),
        type: "text",
        lines: sourceItems.map((item) => ({
          id: createLineId(),
          text: item.text,
          marks: normalizeLineMarks({ bullet: item.bullet }),
        })),
      };
      items = [
        ...items.slice(0, insertIndex),
        nextTextItem,
        ...items.slice(insertIndex),
      ];
    } else if (sourceLines.length > 0 && firstTextIndex >= 0) {
      const currentTextItem = items[firstTextIndex] as TextContentItem;
      const currentLines = currentTextItem.lines.map((line) => ({
        text: line.text,
        bullet: line.marks?.bullet ?? defaultBullet,
      }));
      if (!areLinesEqual(currentLines, sourceItems)) {
        const nextLines = sourceItems.map((item, index) => {
          const existing = currentTextItem.lines[index];
          const nextMarks = normalizeLineMarks({
            ...(existing?.marks ?? {}),
            bullet: item.bullet,
          });
          return {
            id: existing?.id ?? createLineId(),
            text: item.text,
            marks: nextMarks,
          };
        });
        items = items.map((item, index) =>
          index === firstTextIndex
            ? {
                ...currentTextItem,
                lines: nextLines,
              }
            : item
        );
      }
    }
  }


  const isBrandBar = section.type === "brandBar";
  const legacyPresetId = extractLegacyPresetId(section.style?.customCss);
  const presetFromLegacy = getSectionCardPreset(
    section.sectionCardStyle?.presetId ?? legacyPresetId
  );
  const baseCardStyle = presetFromLegacy?.cardStyle ?? DEFAULT_SECTION_CARD_STYLE;
  const mergedCardStyle = mergeSectionCardStyle(
    baseCardStyle,
    section.sectionCardStyle
  );
  const normalizedStyle = normalizeSectionStyle(section.style);
  const isCampaignPeriodBar = section.type === "campaignPeriodBar";
  const isFooterHtml = section.type === "footerHtml";
  const fullWidthOverride =
    typeof section.style?.layout?.fullWidth === "boolean"
      ? section.style.layout.fullWidth
      : isCampaignPeriodBar || isFooterHtml || isBrandBar;
  const styleWithFullWidth: SectionStyle = {
    ...normalizedStyle,
    layout: {
      ...normalizedStyle.layout,
      fullWidth: fullWidthOverride,
    },
  };
  const isDefaultPeriodBarBg =
    styleWithFullWidth.background.type === "solid" &&
    ((styleWithFullWidth.background.color1 === "#f1f1f1" &&
      styleWithFullWidth.background.color2 === "#ffffff") ||
      (styleWithFullWidth.background.color1 === "#ffffff" &&
        styleWithFullWidth.background.color2 === "#f1f5f9"));
  const periodBarStyle =
    isCampaignPeriodBar && isDefaultPeriodBarBg
      ? {
          ...styleWithFullWidth,
          background: {
            type: "solid" as const,
            color1: "#EB5505",
            color2: "#EB5505",
          },
        }
      : styleWithFullWidth;
  return {
    ...section,
    visible: section.visible ?? true,
    locked: typeof section.locked === "boolean" ? section.locked : false,
    name: typeof section.name === "string" ? section.name : undefined,
    data:
      section.type === "campaignOverview"
        ? { ...(section.data ?? {}), body: cleanedCampaignBody ?? "" }
        : section.data,
    content: {
      ...normalizedContent,
      items,
    },
    style: periodBarStyle,
    sectionCardStyle: normalizeSectionCardStyle(mergedCardStyle),
  };
};

const normalizeSections = (sections: SectionBase[]): SectionBase[] =>
  sections.map((section) => normalizeSection(section));

type LeftTab = "settings" | "sections" | "design";

type UiMode = "simple" | "advanced";

type PreviewMode = "desktop" | "mobile";

type PreviewAspect = "free" | "16:9" | "4:3" | "1:1";

type SaveDestination = "browser" | "manual-json";

type PreviewBusyReason =
  | "render"
  | "ai"
  | "import"
  | "stores"
  | "assets"
  | "responsive";

type SelectedTarget =
  | { kind: "page" }
  | { kind: "section"; id: string }
  | { kind: "block"; sectionId: string; id: string };

export type EditorUIState = {
  project: ProjectState;
  hasUserEdits: boolean;
  manualSaveTick: number;
  undoStack: ProjectState[];
  redoStack: ProjectState[];
  canUndo: boolean;
  canRedo: boolean;
  selected: SelectedTarget;
  selectedSectionId?: string;
  selectedItemId?: string;
  selectedLineId?: string;
  selectedImageIds: string[];
  hoveredSectionId?: string;
  stickyTopPx: number;
  previewKey: number;
  leftTab: LeftTab;
  uiMode: UiMode;
  previewMode: PreviewMode;
  previewAspect: PreviewAspect;
  previewDesktopWidth: number;
  previewMobileWidth: number;
  previewGuidesEnabled: boolean;
  previewSafeAreaEnabled: boolean;
  previewSectionBoundsEnabled: boolean;
  previewScrollSnapEnabled: boolean;
  previewFontScale: number;
  previewContrastWarningsEnabled: boolean;
  autoSaveIntervalSec: number;
  saveDestination: SaveDestination;
  exportFilenameTemplate: string;
  aiDefaultInstruction: string;
  aiForbiddenWords: string;
  aiTargetSectionTypes: string[];
  saveStatus: EditorSaveStatus;
  saveStatusMessage?: string;
  isPreviewBusy: boolean;
  previewBusyReason?: PreviewBusyReason;
  brandPresets: BrandPreset[];
  csvImportDraft: {
    sectionId: string;
    fileName: string;
    headers: string[];
    preview: CsvImportPreview;
    canImport: boolean;
    storeCsv: {
      headers: string[];
      rows: Record<string, string>[];
      importedAt: string;
      stats: {
        totalRows: number;
        duplicateCount: number;
        duplicateIds: string[];
      };
    };
    storeLabels: Record<
      string,
      {
        columnKey: string;
        displayName: string;
        color: string;
        trueText: string;
        falseText: string;
        valueDisplay: "toggle" | "raw";
        showAsFilter: boolean;
        showAsBadge: boolean;
      }
    >;
    storeFilters: Record<string, boolean>;
  } | null;
  isCsvImportModalOpen: boolean;
  setCsvImportDraft: (draft: EditorUIState["csvImportDraft"]) => void;
  setCsvImportModalOpen: (open: boolean) => void;
  setProject: (project: ProjectState) => void;
  resetProjectToDefaultFixedBlocks: () => void;
  updateSectionData: (
    id: string,
    partialData: Record<string, unknown>,
    options?: { skipHistory?: boolean }
  ) => void;
  updateSectionContent: (
    sectionId: string,
    patch: Partial<SectionContent>
  ) => void;
  setSelectedItemId: (id?: string) => void;
  setSelectedLineId: (id?: string) => void;
  setSelectedImageIds: (ids: string[]) => void;
  addContentItem: (
    sectionId: string,
    type: ContentItem["type"]
  ) => void;
  removeContentItem: (sectionId: string, itemId: string) => void;
  reorderContentItems: (
    sectionId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  addTextLine: (sectionId: string, itemId: string) => void;
  reorderTextLines: (
    sectionId: string,
    itemId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  removeTextLine: (sectionId: string, itemId: string, lineId: string) => void;
  updateTextLineText: (
    sectionId: string,
    itemId: string,
    lineId: string,
    text: string
  ) => void;
  updateTextLineMarks: (
    sectionId: string,
    itemId: string,
    lineId: string,
    patch: LineMarks
  ) => void;
  updateContentItemText: (
    sectionId: string,
    itemId: string,
    text: string
  ) => void;
  updateTitleItemText: (
    sectionId: string,
    itemId: string,
    text: string
  ) => void;
  updateTitleItemMarks: (
    sectionId: string,
    itemId: string,
    patch: LineMarks
  ) => void;
  updateTextLineAnimation: (
    sectionId: string,
    itemId: string,
    lineId: string,
    patch?: Partial<ContentItemAnimation>
  ) => void;
  applyLineMarksToAllLines: (
    sectionId: string,
    itemId: string,
    sourceLineId: string
  ) => void;
  applyCalloutToSelection: (
    patch: Partial<NonNullable<LineMarks["callout"]>>,
    scope?: "line" | "item"
  ) => void;
  promoteLineMarksToSectionTypography: (
    sectionId: string,
    itemId: string,
    sourceLineId: string
  ) => void;
  addImageToItem: (
    sectionId: string,
    itemId: string,
    image: { src: string; alt?: string; assetId?: string }
  ) => void;
  setImageItemLayout: (
    sectionId: string,
    itemId: string,
    layout?: ImageContentItem["layout"]
  ) => void;
  updateImageAnimation: (
    sectionId: string,
    itemId: string,
    imageIds: string[],
    patch?: Partial<ContentItemAnimation>
  ) => void;
  updateButtonItem: (
    sectionId: string,
    itemId: string,
    patch: {
      label?: string;
      target?: ButtonTarget;
      variant?: "primary" | "secondary";
      style?: ButtonContentItem["style"];
    }
  ) => void;
  updateContentItemAnimation: (
    sectionId: string,
    itemId: string,
    patch?: Partial<ContentItemAnimation>
  ) => void;
  updateSectionStyle: (sectionId: string, patch: SectionStylePatch) => void;
  updateSectionCardStyle: (
    sectionId: string,
    patch: SectionCardStylePatch
  ) => void;
  applySectionAppearanceToAll: (
    style: SectionStyle,
    cardStyle: SectionCardStyle,
    options?: { excludeTypes?: string[] }
  ) => void;
  insertSectionAfter: (afterId: string | undefined, type: string) => void;
  insertSectionFromTemplate: (
    section: SectionBase,
    afterId?: string
  ) => void;
  reorderSections: (activeId: string, overId: string) => void;
  addSection: () => void;
  selectSection: (sectionId: string) => void;
  renameSection: (sectionId: string, name: string) => void;
  toggleSectionVisible: (sectionId: string) => void;
  toggleSectionLocked: (sectionId: string) => void;
  updateSectionLocked: (sectionId: string, locked: boolean) => void;
  setAllSectionsLocked: (locked: boolean) => void;
  updateSectionVisibility: (id: string, visible: boolean) => void;
  duplicateSection: (sectionId: string) => void;
  deleteSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: "up" | "down") => void;
  setPageTypography: (patch: Partial<PageBaseStyle["typography"]>) => void;
  setPageColors: (patch: Partial<PageBaseStyle["colors"]>) => void;
  setPageSpacing: (patch: Partial<PageBaseStyle["spacing"]>) => void;
  setPageLayout: (patch: Partial<PageBaseStyle["layout"]>) => void;
  setPageSectionAnimation: (
    patch: Partial<PageBaseStyle["sectionAnimation"]>
  ) => void;
  setPageBackground: (spec: BackgroundSpec) => void;
  setMvBackground: (spec: BackgroundSpec) => void;
  setPageMeta: (patch: Partial<PageMetaSettings>) => void;
  updateProjectStores: (stores: ProjectState["stores"]) => void;
  updateStoresData: (
    sectionId: string,
    stores: ProjectState["stores"],
    config: TargetStoresConfig
  ) => void;
  updateTargetStoresContent: (
    sectionId: string,
    patch: Pick<
      SectionContent,
      "storeCsv" | "storeLabels" | "storeFilters" | "storeFilterOperator"
    >
  ) => void;
  updateTargetStoresConfig: (
    sectionId: string,
    partialConfig: Partial<TargetStoresConfig>
  ) => void;
  saveBrandPreset: (name: string, styleSnapshot: SectionStyle) => void;
  applyBrandPreset: (sectionId: string, presetId: string) => void;
  deleteBrandPreset: (presetId: string) => void;
  pushHistory: (reason?: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  requestManualSave: () => void;
  setSelectedSection: (id?: string) => void;
  setHoveredSection: (id?: string) => void;
  setStickyTopPx: (px: number) => void;
  bumpPreviewKey: () => void;
  setLeftTab: (tab: LeftTab) => void;
  setUiMode: (mode: UiMode) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setPreviewAspect: (aspect: PreviewAspect) => void;
  setPreviewDesktopWidth: (width: number) => void;
  setPreviewMobileWidth: (width: number) => void;
  setPreviewGuidesEnabled: (enabled: boolean) => void;
  setPreviewSafeAreaEnabled: (enabled: boolean) => void;
  setPreviewSectionBoundsEnabled: (enabled: boolean) => void;
  setPreviewScrollSnapEnabled: (enabled: boolean) => void;
  setPreviewFontScale: (scale: number) => void;
  setPreviewContrastWarningsEnabled: (enabled: boolean) => void;
  setAutoSaveIntervalSec: (seconds: number) => void;
  setSaveDestination: (destination: SaveDestination) => void;
  setExportFilenameTemplate: (value: string) => void;
  setAiDefaultInstruction: (value: string) => void;
  setAiForbiddenWords: (value: string) => void;
  setAiTargetSectionTypes: (values: string[]) => void;
  setSaveStatus: (status: EditorSaveStatus, message?: string) => void;
  setPreviewBusy: (isBusy: boolean, reason?: PreviewBusyReason) => void;
  getProject: () => ProjectState;
  replaceProject: (project: ProjectState) => void;
  markDirty: () => void;
  addAsset: (asset: { id?: string; filename: string; data: string }) => string;
};

const createDefaultProjectState = (): ProjectState => {
  const sections: SectionBase[] = normalizeSections([
    {
      id: "sec_brandBar",
      type: "brandBar",
      visible: true,
      locked: false,
      data: { logoText: "ブランド名", brandText: "ブランド名" },
      content: normalizeSectionContent(),
      style: normalizeSectionStyle({
        layout: { ...DEFAULT_SECTION_STYLE.layout, fullWidth: true },
      }),
    },
    {
      id: "sec_heroImage",
      type: "heroImage",
      visible: true,
      locked: false,
      data: { imageUrl: "", alt: "", altText: "" },
      content: normalizeSectionContent(),
      style: normalizeSectionStyle(),
    },
    {
      id: "sec_campaignPeriodBar",
      type: "campaignPeriodBar",
      visible: true,
      locked: false,
      data: { startDate: "2026-03-01", endDate: "2026-03-31" },
      content: normalizeSectionContent(),
      style: normalizeSectionStyle({
        layout: { ...DEFAULT_SECTION_STYLE.layout, fullWidth: true },
        background: { type: "solid", color1: "#EB5505", color2: "#EB5505" },
      }),
    },
    {
      id: "sec_campaignOverview",
      type: "campaignOverview",
      visible: true,
      locked: false,
      data: { title: "キャンペーン概要", body: "" },
      content: normalizeSectionContent({
        items: [
          {
            id: createItemId(),
            type: "text",
            lines: [
              "期間中、「〇〇〇」の対象店舗で 1回〇〇〇円（税込）以上の",
              "au PAY（コード支払い）で 使える最大〇〇％割引クーポンをau PAY アプリにてプレゼント！",
            ].map((text) => ({
              id: createLineId(),
              text,
              marks: {
                bold: true,
                textAlign: "center",
              },
            })),
          },
          {
            id: createItemId(),
            type: "text",
            lines: [
              {
                id: createLineId(),
                text: "〇〇店、〇〇店は対象外です。",
                marks: { callout: { enabled: true, variant: "note" } },
              },
              {
                id: createLineId(),
                text: "一部休業中店舗がございます。詳細はHPをご確認ください。",
                marks: { callout: { enabled: true, variant: "note" } },
              },
            ],
          },
        ],
      }),
      style: normalizeSectionStyle(),
    },
    {
      id: "sec_targetStores",
      type: "targetStores",
      visible: true,
      locked: false,
      data: {
        title: "対象店舗",
        note: "",
        placeholder: "",
        targetStoresConfig: { ...DEFAULT_TARGET_STORES_CONFIG },
      },
      content: normalizeSectionContent({
        items: [
          {
            id: createItemId(),
            type: "text",
            lines: buildTargetStoresNoticeLines(),
          },
        ],
        storeCsv: { headers: [], rows: [] },
        storeLabels: {},
        storeFilters: {},
      }),
      style: normalizeSectionStyle(),
    },
    {
      id: "sec_legalNotes",
      type: "legalNotes",
      visible: true,
      locked: false,
      data: {
        title: "注意事項",
        items: [...DEFAULT_LEGAL_NOTES_LINES],
        text: "",
      },
      content: normalizeSectionContent(),
      style: normalizeSectionStyle(),
    },
    {
      id: "sec_footerHtml",
      type: "footerHtml",
      visible: true,
      locked: false,
      data: { html: "<small>© 会社名</small>" },
      content: normalizeSectionContent(),
      style: normalizeSectionStyle({
        layout: { ...DEFAULT_SECTION_STYLE.layout, fullWidth: true },
      }),
    },
  ]);

  const nowIso = new Date().toISOString();
  return {
    meta: {
      projectName: "キャンペーンLP",
      templateType: "coupon",
      version: "1.0",
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    settings: normalizeProjectSettings(DEFAULT_PROJECT_SETTINGS),
    sections,
    pageBaseStyle: DEFAULT_PAGE_BASE_STYLE,
  };
};

export const createProjectFromTemplate = (
  templateType: ProjectState["meta"]["templateType"],
  projectName: string,
  sectionOrder?: string[]
): ProjectState => {
  const base = createDefaultProjectState();
  const nowIso = new Date().toISOString();
  const nextOrder = Array.isArray(sectionOrder)
    ? sectionOrder.filter((type) => typeof type === "string" && type.length > 0)
    : [];
  const orderedSections = (() => {
    if (nextOrder.length === 0) {
      return base.sections;
    }
    const usedIds = new Set<string>();
    const ordered: SectionBase[] = [];
    nextOrder.forEach((type) => {
      const existing = base.sections.find(
        (section) => section.type === type && !usedIds.has(section.id)
      );
      if (existing) {
        ordered.push(existing);
        usedIds.add(existing.id);
        return;
      }
      ordered.push(createSection(type));
    });
    return ordered;
  })();
  return {
    ...base,
    meta: {
      ...base.meta,
      templateType,
      projectName,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    sections: orderedSections,
  };
};

const createSection = (type: string): SectionBase => {
  const id = `sec_${type}_${Math.random().toString(36).slice(2, 8)}`;
  let section: SectionBase;
  switch (type) {
    case "brandBar":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: { logoText: "新しいブランド", brandText: "新しいブランド" },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle({
          layout: { ...DEFAULT_SECTION_STYLE.layout, fullWidth: true },
        }),
      };
      break;
    case "heroImage":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: { imageUrl: "", alt: "", altText: "" },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle(),
      };
      break;
    case "campaignPeriodBar":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: { startDate: "2026-03-01", endDate: "2026-03-31" },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle({
          layout: { ...DEFAULT_SECTION_STYLE.layout, fullWidth: true },
          background: { type: "solid", color1: "#EB5505", color2: "#EB5505" },
        }),
      };
      break;
    case "campaignOverview":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {},
        content: normalizeSectionContent({
          items: [
            {
              id: createItemId(),
              type: "text",
              lines: [
                "期間中、「〇〇〇」の対象店舗で 1回〇〇〇円（税込）以上の",
                "au PAY（コード支払い）で 使える最大〇〇％割引クーポンをau PAY アプリにてプレゼント！",
              ]
                .map((text) => text.trim())
                .filter((text) => text.length > 0)
                .map((text) => ({
                  id: createLineId(),
                  text,
                  marks: { bold: true, textAlign: "center" },
                })),
            },
            {
              id: createItemId(),
              type: "text",
              lines: [
                "〇〇店、〇〇店は対象外です。",
                "一部休業中店舗がございます。詳細はHPをご確認ください。",
              ]
                .map((text) => text.trim())
                .filter((text) => text.length > 0)
                .map((text) => ({
                  id: createLineId(),
                  text,
                  marks: { callout: { enabled: true, variant: "note" } },
                })),
            },
          ],
        }),
        style: normalizeSectionStyle(),
      };
      break;
    case "couponFlow":
      const couponFlowDefaultSlides: ImageItem[] = Array.from(
        { length: 6 },
        (_, index) => ({
          id: createImageId(),
          src: `/footer-defaults/slide-img${index + 1}.png`,
          alt: `スライド${index + 1}`,
        })
      );
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "クーポン利用の流れ",
          lead:
            "＊必ずクーポンを獲得してからau PAY（コード支払い）でお支払いください。",
          note: "※画面はイメージです。",
          buttonLabel: "クーポンを獲得する",
          buttonUrl: "",
        },
        content: normalizeSectionContent({
          items: [
            {
              id: createItemId(),
              type: "image",
              images: couponFlowDefaultSlides,
              layout: "slideshow",
            },
            {
              id: createItemId(),
              type: "button",
              label: "クーポンを獲得する",
              target: { kind: "url", url: "" },
              variant: "primary",
              style: { presetId: "couponFlow", align: "center", fullWidth: true },
            },
          ],
        }),
        style: normalizeSectionStyle(),
      };
      break;
    case "targetStores":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "対象店舗",
          note: "",
          placeholder: "",
          targetStoresConfig: { ...DEFAULT_TARGET_STORES_CONFIG },
        },
        content: normalizeSectionContent({
          items: [
            {
              id: createItemId(),
              type: "text",
              lines: buildTargetStoresNoticeLines(),
            },
          ],
          storeCsv: { headers: [], rows: [] },
          storeLabels: {},
          storeFilters: {},
        }),
        style: normalizeSectionStyle(),
      };
      break;
    case "excludedStoresList":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "対象外店舗一覧",
          highlightLabel: "対象外",
          returnUrl: "",
          returnLabel: "",
        },
        content: normalizeSectionContent({
          storeCsv: { headers: [], rows: [] },
        }),
        style: normalizeSectionStyle(),
      };
      break;
    case "excludedBrandsList":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "対象外ブランド一覧",
          highlightLabel: "対象外",
          returnUrl: "",
          returnLabel: "",
        },
        content: normalizeSectionContent({
          storeCsv: { headers: [], rows: [] },
        }),
        style: normalizeSectionStyle(),
      };
      break;
    case "rankingTable":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "決済金額ランキング",
          subtitle: "最新順位はこちら",
          period: "2025/10/1～2025/12/14",
          date: "2025/12/14時点",
          notes: [
            "※同一順位の場合は期間中の決済回数が多い方が上位となります。",
            "※決済合計額と決済回数の両方が同一の場合初回決済時間が早い方が上位となります。",
          ],
          rankLabel: "順位",
          columns: [
            { key: "amount", label: "決済金額" },
            { key: "count", label: "品数" },
          ],
          rows: [
            { id: createRankingRowId(), values: ["368,330円", "940品以上"] },
            { id: createRankingRowId(), values: ["308,000円", "790品以上"] },
            { id: createRankingRowId(), values: ["246,940円", "630品以上"] },
          ],
        },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle(),
      };
      break;
    case "paymentHistoryGuide":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "決済履歴の確認方法",
          body:
            "現在の決済金額については、au PAY アプリ内の「取引履歴」をご確認ください。",
          linkText: "こちら",
          linkUrl: "#contact",
          linkTargetKind: "url",
          linkSectionId: "",
          linkSuffix: "までお問い合わせください。",
          alert:
            "なお、店頭や問い合わせ窓口での現在の順位や金額、当選結果についてのご質問にはお答えできません。",
          imageUrl: "/footer-defaults/img-02.png",
          imageAlt: "決済履歴の確認方法",
        },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle(),
      };
      break;
    case "tabbedNotes":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "注意事項",
          tabs: [
            {
              id: createTabId(),
              labelTop: "事前獲得クーポン",
              labelBottom: "注意事項",
              intro: "",
              items: [
                {
                  id: createTabItemId(),
                  text:
                    "＊レジで表示されているお買上げ金額は割引表示されません。割引後の金額はau PAY アプリの「履歴」をご確認ください。",
                  bullet: "none",
                  tone: "accent",
                  bold: false,
                  subItems: [],
                },
                {
                  id: createTabItemId(),
                  text:
                    "クーポンは1回20,000円（税込）以上のお支払いにご利用いただけます。",
                  bullet: "disc",
                  tone: "normal",
                  bold: false,
                  subItems: [],
                },
                {
                  id: createTabItemId(),
                  text:
                    "キャンペーン期間中でも、クーポンの割引総額が所定の金額に達した場合、配布終了となり獲得済みクーポンのご利用は不可となります。",
                  bullet: "disc",
                  tone: "accent",
                  bold: true,
                  subItems: [],
                },
              ],
              footnote: "※2026年2月6日時点の情報です。",
              ctaText: "",
              ctaLinkText: "",
              ctaLinkUrl: "",
              ctaTargetKind: "url",
              ctaSectionId: "",
              ctaImageUrl: "",
              ctaImageAlt: "",
              ctaImageAssetId: "",
              buttonText: "",
              buttonTargetKind: "url",
              buttonUrl: "",
              buttonSectionId: "",
            },
            {
              id: createTabId(),
              labelTop: "クイックチャンス",
              labelBottom: "注意事項",
              intro: "",
              items: [
                {
                  id: createTabItemId(),
                  text: "クーポンの利用方法は以下の通りとなります。",
                  bullet: "disc",
                  tone: "normal",
                  bold: false,
                  subItems: [
                    "①クーポン画面を表示します。",
                    "②クーポン利用の旨をお申し出いただき、クーポン画面を提示します。",
                    "③「利用する」ボタンを押下してください。",
                  ],
                },
                {
                  id: createTabItemId(),
                  text:
                    "クーポンの利用期限前であっても、予告なく終了する場合があります。",
                  bullet: "disc",
                  tone: "normal",
                  bold: false,
                  subItems: [],
                },
                {
                  id: createTabItemId(),
                  text: "本キャンペーンは予告なく変更・終了する場合があります。",
                  bullet: "disc",
                  tone: "accent",
                  bold: true,
                  subItems: [],
                },
              ],
              footnote: "※2026年2月6日時点の情報です。",
              ctaText: "",
              ctaLinkText: "",
              ctaLinkUrl: "",
              ctaTargetKind: "url",
              ctaSectionId: "",
              ctaImageUrl: "",
              ctaImageAlt: "",
              ctaImageAssetId: "",
              buttonText: "",
              buttonTargetKind: "url",
              buttonUrl: "",
              buttonSectionId: "",
            },
          ],
          tabStyle: {
            inactiveBg: "#DDDDDD",
            inactiveText: "#000000",
            activeBg: "#000000",
            activeText: "#FFFFFF",
            border: "#000000",
            contentBg: "#FFFFFF",
            contentBorder: "#000000",
            accent: "#EB5505",
          },
        },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle(),
      };
      break;
    case "legalNotes":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {
          title: "注意事項",
          items: [...DEFAULT_LEGAL_NOTES_LINES],
          text: "",
          bullet: "disc",
          noteWidthPct: 100,
        },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle(),
      };
      break;
    case "footerHtml":
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: { html: "", footerAssets: {} },
        content: normalizeSectionContent(),
        style: normalizeSectionStyle({
          layout: { ...DEFAULT_SECTION_STYLE.layout, fullWidth: true },
        }),
      };
      break;
    default:
      section = {
        id,
        type,
        visible: true,
        locked: false,
        data: {},
        content: normalizeSectionContent(),
        style: normalizeSectionStyle(),
      };
      break;
  }
  return normalizeSection(section);
};

const createUntitledSection = (): SectionBase =>
  normalizeSection({
    id: `sec_campaignOverview_${Math.random().toString(36).slice(2, 8)}`,
    type: "campaignOverview",
    visible: true,
    locked: false,
    name: "無題",
    data: { isBlank: true },
    content: normalizeSectionContent({ items: [] }),
    style: normalizeSectionStyle(),
  });

export const useEditorStore = create<EditorUIState>((set, get) => ({
  project: createDefaultProjectState(),
  hasUserEdits: false,
  manualSaveTick: 0,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  selected: { kind: "page" },
  selectedSectionId: undefined,
  selectedItemId: undefined,
  selectedLineId: undefined,
  selectedImageIds: [],
  hoveredSectionId: undefined,
  stickyTopPx: 0,
  previewKey: 0,
  leftTab: "sections",
  uiMode: "advanced",
  previewMode: "desktop",
  previewAspect: "free",
  previewDesktopWidth: 1100,
  previewMobileWidth: 390,
  previewGuidesEnabled: false,
  previewSafeAreaEnabled: false,
  previewSectionBoundsEnabled: false,
  previewScrollSnapEnabled: false,
  previewFontScale: 1,
  previewContrastWarningsEnabled: false,
  autoSaveIntervalSec: 30,
  saveDestination: "browser",
  exportFilenameTemplate: "{projectName}",
  aiDefaultInstruction: "",
  aiForbiddenWords: "",
  aiTargetSectionTypes: [],
  saveStatus: "saved",
  saveStatusMessage: undefined,
  isPreviewBusy: false,
  previewBusyReason: undefined,
  brandPresets: [],
  csvImportDraft: null,
  isCsvImportModalOpen: false,
  setCsvImportDraft: (draft) => set({ csvImportDraft: draft }),
  setCsvImportModalOpen: (open) => set({ isCsvImportModalOpen: open }),
  setProject: (project) =>
    set({
      project: {
        ...project,
        sections: normalizeSections(project.sections),
        pageBaseStyle: normalizePageBaseStyle(project.pageBaseStyle),
        settings: normalizeProjectSettings(project.settings),
      },
      hasUserEdits: false,
      saveStatus: "saved",
      saveStatusMessage: undefined,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
      selected: { kind: "page" },
      selectedSectionId: undefined,
      selectedItemId: undefined,
      selectedLineId: undefined,
      selectedImageIds: [],
    }),
  resetProjectToDefaultFixedBlocks: () =>
    set({
      project: createDefaultProjectState(),
      hasUserEdits: false,
      saveStatus: "saved",
      saveStatusMessage: undefined,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
      selected: { kind: "page" },
      selectedSectionId: undefined,
      selectedItemId: undefined,
      selectedLineId: undefined,
      selectedImageIds: [],
    }),
  updateSectionData: (id, partialData, options) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === id
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === id
            ? {
                ...section,
                data: {
                  ...section.data,
                  ...partialData,
                },
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      if (options?.skipHistory) {
        return {
          ...state,
          project: nextProject,
          saveStatus: "dirty",
          saveStatusMessage: undefined,
          hasUserEdits: true,
        };
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateSectionContent: (sectionId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const baseContent = normalizeSectionContent(targetSection.content);
      const mergedContent: SectionContent = {
        ...baseContent,
        ...patch,
      };
      const nextContent = normalizeSectionContent(mergedContent);
      const pinnedContent: SectionContent = {
        ...nextContent,
        items: pinTitleFirst(nextContent.items ?? []),
      };
      const nextItems = pinnedContent.items ?? [];
      const selectedItem =
        nextItems.find((item) => item.id === state.selectedItemId) ??
        nextItems[0];
      const nextSelectedItemId = selectedItem?.id;
      const nextSelectedLineId =
        selectedItem?.type === "text"
          ? selectedItem.lines.some((line) => line.id === state.selectedLineId)
            ? state.selectedLineId
            : selectedItem.lines[0]?.id
          : undefined;
      const nextSelectedImageIds =
        selectedItem?.type === "image"
          ? state.selectedImageIds.length > 0
            ? state.selectedImageIds.filter((id) =>
                selectedItem.images.some((image) => image.id === id)
              )
            : selectedItem.images[0]
            ? [selectedItem.images[0].id]
            : []
          : [];

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: pinnedContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedItemId: nextSelectedItemId,
        selectedLineId: nextSelectedLineId,
        selectedImageIds: nextSelectedImageIds,
      };
    }),
  addContentItem: (sectionId, type) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const currentItems = content.items ?? [];
      const pinnedItems = pinTitleFirst(currentItems);
      let nextItem: ContentItem;
      if (type === "title") {
        const hasTitle = pinnedItems.some((item) => item.type === "title");
        if (hasTitle) {
          return state;
        }
        nextItem = {
          id: createItemId(),
          type: "title",
          text: "",
        };
      } else if (type === "image") {
        nextItem = {
          id: createItemId(),
          type: "image",
          images: [],
          layout: "auto",
        };
      } else if (type === "button") {
        nextItem = {
          id: createItemId(),
          type: "button",
          label: "",
          target: { kind: "url", url: "" },
          variant: "primary",
          style: { presetId: "default", align: "left" },
        };
      } else {
        nextItem = {
          id: createItemId(),
          type: "text",
          lines: [{ id: createLineId(), text: "" }],
        };
      }

      const nextItems =
        pinnedItems[0]?.type === "title"
          ? [pinnedItems[0], nextItem, ...pinnedItems.slice(1)]
          : [...pinnedItems, nextItem];
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedItemId: nextItem.id,
        selectedLineId:
          nextItem.type === "text" ? nextItem.lines[0]?.id : undefined,
        selectedImageIds:
          nextItem.type === "image" && nextItem.images[0]
            ? [nextItem.images[0].id]
            : [],
      };
    }),
  removeContentItem: (sectionId, itemId) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const currentItems = content.items ?? [];
      const removeIndex = currentItems.findIndex((item) => item.id === itemId);
      if (removeIndex === -1) {
        return state;
      }
      if (currentItems[removeIndex]?.type === "title") {
        return state;
      }
      const nextItems = pinTitleFirst(
        currentItems.filter((item) => item.id !== itemId)
      );
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      const wasSelected = state.selectedItemId === itemId;
      const fallbackItem = nextItems[
        Math.min(removeIndex, Math.max(0, nextItems.length - 1))
      ];
      const nextSelectedItemId = wasSelected ? fallbackItem?.id : state.selectedItemId;
      const nextSelectedLineId =
        fallbackItem?.type === "text"
          ? fallbackItem.lines[0]?.id
          : undefined;
      const nextSelectedImageIds =
        fallbackItem?.type === "image" && fallbackItem.images[0]
          ? [fallbackItem.images[0].id]
          : [];

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedItemId: nextSelectedItemId,
        selectedLineId: wasSelected ? nextSelectedLineId : state.selectedLineId,
        selectedImageIds: wasSelected ? nextSelectedImageIds : state.selectedImageIds,
      };
    }),
  reorderContentItems: (sectionId, fromIndex, toIndex) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const currentItems = pinTitleFirst(content.items ?? []);
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentItems.length ||
        toIndex >= currentItems.length
      ) {
        return state;
      }
      if (fromIndex === 0 || toIndex === 0) {
        return state;
      }

      const nextItems = pinTitleFirst(
        arrayMove(currentItems, fromIndex, toIndex)
      );
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  reorderTextLines: (sectionId, itemId, fromIndex, toIndex) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const targetItem = (content.items ?? []).find(
        (item) => item.id === itemId && item.type === "text"
      ) as TextContentItem | undefined;
      if (!targetItem || targetItem.lines.length < 2) {
        return state;
      }
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= targetItem.lines.length ||
        toIndex >= targetItem.lines.length
      ) {
        return state;
      }
      if (fromIndex === toIndex) {
        return state;
      }

      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        return {
          ...item,
          lines: arrayMove(item.lines, fromIndex, toIndex),
        };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  addTextLine: (sectionId, itemId) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const items = content.items ?? [];
      const nextLine: PrimaryLine = { id: createLineId(), text: "" };
      const nextItems = items.map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        return {
          ...item,
          lines: [...item.lines, nextLine],
        };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedItemId: itemId,
        selectedLineId: nextLine.id,
        selectedImageIds: [],
      };
    }),
  removeTextLine: (sectionId, itemId, lineId) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      let fallbackSelectedLineId: string | undefined;
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        const currentLines = item.lines;
        if (currentLines.length <= 1) {
          return item;
        }
        const removedIndex = currentLines.findIndex((line) => line.id === lineId);
        const nextLines = currentLines.filter((line) => line.id !== lineId);
        if (nextLines.length === 0) {
          nextLines.push({ id: createLineId(), text: "" });
        }
        if (state.selectedLineId === lineId && removedIndex >= 0) {
          const nextIndex = Math.min(
            Math.max(removedIndex, 0),
            Math.max(0, nextLines.length - 1)
          );
          fallbackSelectedLineId = nextLines[nextIndex]?.id;
        }
        return { ...item, lines: nextLines };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      const nextSelectedLineId =
        state.selectedLineId === lineId
          ? fallbackSelectedLineId ??
            (nextItems
              .find((item) => item.id === itemId && item.type === "text") as
              | TextContentItem
              | undefined)?.lines[0]?.id
          : state.selectedLineId;

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedLineId: nextSelectedLineId,
      };
    }),
  updateTextLineText: (sectionId, itemId, lineId, text) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        return {
          ...item,
          lines: item.lines.map((line) =>
            line.id === lineId ? { ...line, text } : line
          ),
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateTextLineMarks: (sectionId, itemId, lineId, patchMarks) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        const nextLines = item.lines.map((line) => {
          if (line.id !== lineId) {
            return line;
          }
          const mergedMarks: LineMarks = {
            ...(line.marks ?? {}),
            ...(patchMarks ?? {}),
          };
          return {
            ...line,
            marks: normalizeLineMarks(mergedMarks),
          };
        });
        return {
          ...item,
          lines: nextLines,
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateContentItemText: (sectionId, itemId, text) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) =>
        item.id === itemId && item.type === "title"
          ? { ...item, text }
          : item
      );
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateTitleItemText: (sectionId, itemId, text) =>
    get().updateContentItemText(sectionId, itemId, text),
  updateTitleItemMarks: (sectionId, itemId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "title") {
          return item;
        }
        const merged: LineMarks = { ...(item.marks ?? {}), ...(patch ?? {}) };
        return { ...item, marks: normalizeLineMarks(merged) };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateTextLineAnimation: (sectionId, itemId, lineId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        const nextLines = item.lines.map((line) => {
          if (line.id !== lineId) {
            return line;
          }
          if (!patch) {
            const { animation, ...rest } = line;
            return { ...rest } as PrimaryLine;
          }
          const current = line.animation ?? {
            preset: "fade",
            durationMs: 400,
            delayMs: 0,
          };
          return {
            ...line,
            animation: {
              preset: patch.preset ?? current.preset,
              durationMs: patch.durationMs ?? current.durationMs,
              delayMs: patch.delayMs ?? current.delayMs,
            },
          };
        });
        return {
          ...item,
          lines: nextLines,
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  applyLineMarksToAllLines: (sectionId, itemId, sourceLineId) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "text") {
          return item;
        }
        const sourceLine = item.lines.find((line) => line.id === sourceLineId);
        if (!sourceLine?.marks) {
          return item;
        }
        return {
          ...item,
          lines: item.lines.map((line) => ({
            ...line,
            marks: { ...sourceLine.marks },
          })),
        };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  applyCalloutToSelection: (patch, scope) =>
    set((state) => {
      const selected = state.selected;
      if (selected.kind !== "section") {
        return state;
      }
      const sectionId = selected.id;
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const selectedItemId = state.selectedItemId;
      const selectedLineId = state.selectedLineId;
      const nextItems = (content.items ?? []).map((item) => {
        if (item.type !== "text") {
          return item;
        }
        if (scope === "item") {
          if (selectedItemId && item.id !== selectedItemId) {
            return item;
          }
          return {
            ...item,
            lines: item.lines.map((line) => ({
              ...line,
              marks: normalizeLineMarks({
                ...(line.marks ?? {}),
                callout: {
                  ...(line.marks?.callout ?? {}),
                  ...patch,
                },
              }),
            })),
          };
        }
        if (selectedItemId && item.id !== selectedItemId) {
          return item;
        }
        return {
          ...item,
          lines: item.lines.map((line) => {
            if (selectedLineId && line.id !== selectedLineId) {
              return line;
            }
            return {
              ...line,
              marks: normalizeLineMarks({
                ...(line.marks ?? {}),
                callout: {
                  ...(line.marks?.callout ?? {}),
                  ...patch,
                },
              }),
            };
          }),
        };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  promoteLineMarksToSectionTypography: (sectionId, itemId, sourceLineId) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const item = (content.items ?? []).find(
        (entry) => entry.id === itemId && entry.type === "text"
      ) as TextContentItem | undefined;
      const sourceLine = item?.lines.find((line) => line.id === sourceLineId);
      if (!item || !sourceLine?.marks) {
        return state;
      }

      const nextTypography = {
        ...targetSection.style.typography,
        fontWeight: sourceLine.marks.bold
          ? 700
          : targetSection.style.typography.fontWeight,
        textColor:
          sourceLine.marks.color ?? targetSection.style.typography.textColor,
        fontSize:
          sourceLine.marks.size ?? targetSection.style.typography.fontSize,
      };

      const nextItems = (content.items ?? []).map((entry) => {
        if (entry.id !== itemId || entry.type !== "text") {
          return entry;
        }
        return {
          ...entry,
          lines: entry.lines.map((line) =>
            line.id === sourceLineId ? { ...line, marks: undefined } : line
          ),
        };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                style: {
                  ...section.style,
                  typography: nextTypography,
                },
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  addImageToItem: (sectionId, itemId, image) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      if (!image.src.trim()) {
        return state;
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "image") {
          return item;
        }
        const nextImage: ImageItem = {
          id: createImageId(),
          src: image.src,
          assetId: image.assetId,
          alt: image.alt ?? "",
        };
        return {
          ...item,
          images: [...item.images, nextImage],
          layout: item.layout ?? "auto",
        };
      });

      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setImageItemLayout: (sectionId, itemId, layout) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "image") {
          return item;
        }
        return {
          ...item,
          layout,
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateImageAnimation: (sectionId, itemId, imageIds, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "image") {
          return item;
        }
        const nextImages = item.images.map((image) => {
          if (!imageIds.includes(image.id)) {
            return image;
          }
          if (!patch) {
            const { animation, ...rest } = image;
            return { ...rest } as ImageItem;
          }
          const current = image.animation ?? {
            preset: "fade",
            durationMs: 400,
            delayMs: 0,
          };
          return {
            ...image,
            animation: {
              preset: patch.preset ?? current.preset,
              durationMs: patch.durationMs ?? current.durationMs,
              delayMs: patch.delayMs ?? current.delayMs,
            },
          };
        });
        return {
          ...item,
          images: nextImages,
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateButtonItem: (sectionId, itemId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId || item.type !== "button") {
          return item;
        }
        return {
          ...item,
          label: patch.label ?? item.label,
          target: patch.target ?? item.target,
          variant: patch.variant ?? item.variant,
          style: patch.style ? { ...(item.style ?? {}), ...patch.style } : item.style,
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: pinTitleFirst(nextItems),
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateContentItemAnimation: (sectionId, itemId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const content = normalizeSectionContent(targetSection.content);
      const nextItems = (content.items ?? []).map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        if (!patch) {
          return { ...item, animation: undefined };
        }
        const current = item.animation ?? {
          preset: "fade",
          durationMs: 400,
          delayMs: 0,
        };
        return {
          ...item,
          animation: {
            preset: patch.preset ?? current.preset,
            durationMs: patch.durationMs ?? current.durationMs,
            delayMs: patch.delayMs ?? current.delayMs,
          },
        };
      });
      const nextContent: SectionContent = {
        ...content,
        items: nextItems,
      };

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: nextContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateSectionStyle: (sectionId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const baseStyle = normalizeSectionStyle(targetSection.style);
      const mergedStyle = mergeSectionStyle(baseStyle, patch);

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                style: mergedStyle,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateSectionCardStyle: (sectionId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const baseStyle = normalizeSectionCardStyle(
        targetSection.sectionCardStyle
      );
      const mergedStyle = normalizeSectionCardStyle(
        mergeSectionCardStyle(baseStyle, patch)
      );

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                sectionCardStyle: mergedStyle,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  applySectionAppearanceToAll: (style, cardStyle, options) =>
    set((state) => {
      const excludeTypes = new Set(options?.excludeTypes ?? []);
      const nextStyle = normalizeSectionStyle(style);
      const nextCardStyle = normalizeSectionCardStyle(cardStyle);
      const sections = state.project.sections.map((section) => {
        if (excludeTypes.has(section.type) || section.locked) {
          return section;
        }
        return {
          ...section,
          style: nextStyle,
          sectionCardStyle: nextCardStyle,
        };
      });

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  insertSectionAfter: (afterId, type) =>
    set((state) => {
      const newSection = createSection(type);
      const sections = [...state.project.sections];
      const insertIndex = afterId
        ? sections.findIndex((section) => section.id === afterId)
        : -1;
      if (insertIndex >= 0) {
        sections.splice(insertIndex + 1, 0, newSection);
      } else {
        sections.push(newSection);
      }

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections,
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      const firstText = newSection.content?.items?.find(
        (item) => item.type === "text"
      );
      const firstItem = firstText ?? newSection.content?.items?.[0];
      const firstLineId =
        firstText?.type === "text" ? firstText.lines[0]?.id : undefined;
      const firstImage = newSection.content?.items?.find(
        (item) => item.type === "image"
      );
      const firstImageIds =
        firstImage?.type === "image" && firstImage.images[0]
          ? [firstImage.images[0].id]
          : [];

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: newSection.id,
        selected: { kind: "section", id: newSection.id },
        selectedItemId: firstItem?.id,
        selectedLineId: firstLineId,
        selectedImageIds: firstImageIds,
      };
    }),
  insertSectionFromTemplate: (section, afterId) =>
    set((state) => {
      const normalizedSection = normalizeSection(section);
      const sections = [...state.project.sections];
      const footerIndex = sections.findIndex(
        (entry) => entry.type === "footerHtml"
      );
      const afterIndex = afterId
        ? sections.findIndex((entry) => entry.id === afterId)
        : -1;
      const insertIndex =
        afterIndex >= 0
          ? afterIndex + 1
          : footerIndex >= 0
          ? footerIndex
          : sections.length;

      sections.splice(insertIndex, 0, normalizedSection);

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections,
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: normalizedSection.id,
        selected: { kind: "section", id: normalizedSection.id },
      };
    }),
  addSection: () =>
    set((state) => {
      const newSection = createUntitledSection();
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: [...state.project.sections, newSection],
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: newSection.id,
        selected: { kind: "section", id: newSection.id },
        selectedItemId:
          newSection.content?.items?.find((item) => item.type === "text")?.id ??
          newSection.content?.items?.[0]?.id,
        selectedLineId: (() => {
          const firstText = newSection.content?.items?.find(
            (item) => item.type === "text"
          );
          if (firstText?.type === "text") {
            return firstText.lines[0]?.id;
          }
          return undefined;
        })(),
        selectedImageIds: (() => {
          const firstImage = newSection.content?.items?.find(
            (item) => item.type === "image"
          );
          if (firstImage?.type === "image" && firstImage.images[0]) {
            return [firstImage.images[0].id];
          }
          return [];
        })(),
      };
    }),
  selectSection: (sectionId) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      const content = normalizeSectionContent(target?.content);
      const firstText = content.items?.find((item) => item.type === "text");
      const firstItem = firstText ?? content.items?.[0];
      const firstLineId =
        firstText?.type === "text" ? firstText.lines[0]?.id : undefined;
      const firstImage = content.items?.find((item) => item.type === "image");
      const firstImageIds =
        firstImage?.type === "image" && firstImage.images[0]
          ? [firstImage.images[0].id]
          : [];
      return {
        selected: { kind: "section", id: sectionId },
        selectedSectionId: sectionId,
        selectedItemId: firstItem?.id,
        selectedLineId: firstLineId,
        selectedImageIds: firstImageIds,
      };
    }),
  renameSection: (sectionId, name) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!target || target.locked) {
        return state;
      }
      const nextName = name.trim().length > 0 ? name.trim() : "無題";
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId ? { ...section, name: nextName } : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  toggleSectionVisible: (sectionId) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!target) {
        return state;
      }
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? { ...section, visible: !section.visible }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  reorderSections: (activeId, overId) =>
    set((state) => {
      const sections = [...state.project.sections];
      const activeIndex = sections.findIndex(
        (section) => section.id === activeId
      );
      const overIndex = sections.findIndex(
        (section) => section.id === overId
      );
      if (activeIndex < 0 || overIndex < 0) {
        return state;
      }

      const moving = sections[activeIndex];
      if (!moving) {
        return state;
      }

      const nextSections = arrayMove(sections, activeIndex, overIndex);

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: nextSections,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: moving.id,
      };
    }),
  toggleSectionLocked: (sectionId) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!target) {
        return state;
      }
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? { ...section, locked: !section.locked }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateSectionLocked: (sectionId, locked) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!target) {
        return state;
      }

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId ? { ...section, locked } : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setAllSectionsLocked: (locked) =>
    set((state) => {
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) => ({
          ...section,
          locked,
        })),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  duplicateSection: (sectionId) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!target || target.locked) {
        return state;
      }

      const cloned = JSON.parse(JSON.stringify(target)) as SectionBase;
      const idSuffix = Math.random().toString(36).slice(2, 8);
      const baseName = (target.name ?? "無題").trim() || "無題";
      const nextSection: SectionBase = {
        ...cloned,
        id: `sec_${target.type}_${idSuffix}`,
        name: `${baseName} のコピー`,
        locked: Boolean(target.locked),
      };

      const nextSections = [...state.project.sections, nextSection];
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: nextSections,
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: nextSection.id,
        selected: { kind: "section", id: nextSection.id },
        selectedItemId: nextSection.content?.items?.[0]?.id,
        selectedLineId:
          nextSection.content?.items?.[0]?.type === "text"
            ? nextSection.content.items[0].lines[0]?.id
            : undefined,
        selectedImageIds:
          nextSection.content?.items?.[0]?.type === "image" &&
          nextSection.content.items[0].images[0]
            ? [nextSection.content.items[0].images[0].id]
            : [],
      };
    }),
  deleteSection: (sectionId) =>
    set((state) => {
      const target = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!target || target.locked) {
        return state;
      }

      const nextSections = state.project.sections.filter(
        (section) => section.id !== sectionId
      );
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: nextSections,
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      const nextSelected = nextSections[0]?.id;
      const nextSelectedSection = nextSelected
        ? nextSections.find((section) => section.id === nextSelected)
        : undefined;
      const nextFirstItem = nextSelectedSection?.content?.items?.[0];
      const nextLineId =
        nextFirstItem?.type === "text" ? nextFirstItem.lines[0]?.id : undefined;
      const nextImageIds =
        nextFirstItem?.type === "image" && nextFirstItem.images[0]
          ? [nextFirstItem.images[0].id]
          : [];

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: nextSelected,
        selected: nextSelected
          ? { kind: "section", id: nextSelected }
          : { kind: "page" },
        selectedItemId: nextFirstItem?.id,
        selectedLineId: nextLineId,
        selectedImageIds: nextImageIds,
      };
    }),
  moveSection: (sectionId, direction) =>
    set((state) => {
      const sections = [...state.project.sections];
      const index = sections.findIndex((section) => section.id === sectionId);
      if (index < 0) {
        return state;
      }
      const target = sections[index];
      if (!target || target.locked) {
        return state;
      }
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= sections.length) {
        return state;
      }
      const nextSections = arrayMove(sections, index, nextIndex);

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: nextSections,
      };

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
        selectedSectionId: sectionId,
        selected: { kind: "section", id: sectionId },
      };
    }),
  setPageTypography: (patch) =>
    set((state) => {
      const base = normalizePageBaseStyle(state.project.pageBaseStyle);
      const nextStyle: PageBaseStyle = {
        ...base,
        typography: { ...base.typography, ...patch },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        pageBaseStyle: nextStyle,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setPageColors: (patch) =>
    set((state) => {
      const base = normalizePageBaseStyle(state.project.pageBaseStyle);
      const nextStyle: PageBaseStyle = {
        ...base,
        colors: { ...base.colors, ...patch },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        pageBaseStyle: nextStyle,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setPageSpacing: (patch) =>
    set((state) => {
      const base = normalizePageBaseStyle(state.project.pageBaseStyle);
      const nextStyle: PageBaseStyle = {
        ...base,
        spacing: {
          ...base.spacing,
          ...patch,
          sectionPadding: {
            ...base.spacing.sectionPadding,
            ...patch.sectionPadding,
          },
        },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        pageBaseStyle: nextStyle,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setPageSectionAnimation: (patch) =>
    set((state) => {
      const base = normalizePageBaseStyle(state.project.pageBaseStyle);
      const nextStyle: PageBaseStyle = {
        ...base,
        sectionAnimation: { ...base.sectionAnimation, ...patch },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        pageBaseStyle: nextStyle,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setPageLayout: (patch) =>
    set((state) => {
      const base = normalizePageBaseStyle(state.project.pageBaseStyle);
      const nextStyle: PageBaseStyle = {
        ...base,
        layout: { ...base.layout, ...patch },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        pageBaseStyle: nextStyle,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setPageBackground: (spec) =>
    set((state) => {
      const settings = normalizeProjectSettings(state.project.settings);
      const nextSettings: ProjectState["settings"] = {
        ...settings,
        backgrounds: {
          ...settings.backgrounds,
          page: spec,
        },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        settings: nextSettings,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setMvBackground: (spec) =>
    set((state) => {
      const settings = normalizeProjectSettings(state.project.settings);
      const nextSettings: ProjectState["settings"] = {
        ...settings,
        backgrounds: {
          ...settings.backgrounds,
          mv: spec,
        },
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        settings: nextSettings,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  setPageMeta: (patch) =>
    set((state) => {
      const settings = normalizeProjectSettings(state.project.settings);
      const baseMeta = normalizePageMetaSettings(settings.pageMeta);
      const nextMeta: PageMetaSettings = {
        ...baseMeta,
        ...patch,
        presets: {
          ...baseMeta.presets,
          ...patch.presets,
        },
      };
      const nextSettings: ProjectState["settings"] = {
        ...settings,
        pageMeta: nextMeta,
      };
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        settings: nextSettings,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateSectionVisibility: (id, visible) =>
    set((state) => {
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === id ? { ...section, visible } : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateProjectStores: (stores) =>
    set((state) => {
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        stores,
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateStoresData: (sectionId, stores, config) =>
    set((state) => {
      const normalizedConfig = normalizeTargetStoresConfig(config);
      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        stores,
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                data: {
                  ...section.data,
                  targetStoresConfig: normalizedConfig,
                },
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateTargetStoresContent: (sectionId, patch) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const baseContent = normalizeSectionContent(targetSection.content);
      const mergedContent: SectionContent = {
        ...baseContent,
        ...patch,
      };
      const nextContent = normalizeSectionContent(mergedContent);
      const pinnedContent: SectionContent = {
        ...nextContent,
        items: pinTitleFirst(nextContent.items ?? []),
      };
      const nextStores = patch.storeCsv
        ? buildStoresFromStoreCsv(nextContent.storeCsv)
        : state.project.stores;

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        stores: nextStores,
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                content: pinnedContent,
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  updateTargetStoresConfig: (sectionId, partialConfig) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      if (!targetSection) {
        return state;
      }

      const rawConfig = targetSection.data.targetStoresConfig;
      const currentConfig = normalizeTargetStoresConfig(
        rawConfig && typeof rawConfig === "object"
          ? (rawConfig as Partial<TargetStoresConfig>)
          : undefined
      );
      const nextConfig = normalizeTargetStoresConfig({
        ...currentConfig,
        ...partialConfig,
      });

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                data: {
                  ...section.data,
                  targetStoresConfig: nextConfig,
                },
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  saveBrandPreset: (name, styleSnapshot) =>
    set((state) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return state;
      }
      const nextPreset: BrandPreset = {
        id: `preset_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        name: trimmed,
        style: normalizeSectionStyle(styleSnapshot),
      };
      return {
        ...state,
        brandPresets: [...state.brandPresets, nextPreset],
      };
    }),
  applyBrandPreset: (sectionId, presetId) =>
    set((state) => {
      const targetSection = state.project.sections.find(
        (section) => section.id === sectionId
      );
      const preset = state.brandPresets.find((item) => item.id === presetId);
      if (!targetSection || !preset) {
        return state;
      }
      if (targetSection.locked) {
        return {
          ...state,
          saveStatus: "error",
          saveStatusMessage: "ロック中のため編集できません。",
        };
      }

      const nextProject: ProjectState = {
        ...state.project,
        meta: {
          ...state.project.meta,
          updatedAt: new Date().toISOString(),
        },
        sections: state.project.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                style: normalizeSectionStyle(preset.style),
              }
            : section
        ),
      };

      if (projectsEqual(state.project, nextProject)) {
        return state;
      }

      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  deleteBrandPreset: (presetId) =>
    set((state) => ({
      ...state,
      brandPresets: state.brandPresets.filter((item) => item.id !== presetId),
    })),
  pushHistory: () =>
    set((state) => {
      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );
      return {
        ...state,
        undoStack: nextUndoStack,
        redoStack: [],
        canUndo: nextUndoStack.length > 0,
        canRedo: false,
      };
    }),
  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) {
        return state;
      }

      const previous = state.undoStack[state.undoStack.length - 1];
      const nextUndoStack = state.undoStack.slice(0, -1);
      const nextRedoStack = pushStack(
        state.redoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: previous,
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        canUndo: nextUndoStack.length > 0,
        canRedo: nextRedoStack.length > 0,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) {
        return state;
      }

      const nextProject = state.redoStack[state.redoStack.length - 1];
      const nextRedoStack = state.redoStack.slice(0, -1);
      const nextUndoStack = pushStack(
        state.undoStack,
        cloneProject(state.project)
      );

      return {
        ...state,
        project: nextProject,
        undoStack: nextUndoStack,
        redoStack: nextRedoStack,
        canUndo: nextUndoStack.length > 0,
        canRedo: nextRedoStack.length > 0,
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    }),
  clearHistory: () =>
    set({
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    }),
  requestManualSave: () =>
    set((state) => ({ manualSaveTick: state.manualSaveTick + 1 })),
  setSelectedSection: (id) =>
    set((state) => {
      if (!id) {
        return {
          selectedSectionId: undefined,
          selected: { kind: "page" },
          selectedItemId: undefined,
          selectedLineId: undefined,
          selectedImageIds: [],
        };
      }
      const target = state.project.sections.find(
        (section) => section.id === id
      );
      if (!target) {
        return {
          selectedSectionId: undefined,
          selected: { kind: "page" },
          selectedItemId: undefined,
          selectedLineId: undefined,
          selectedImageIds: [],
        };
      }
      const content = normalizeSectionContent(target?.content);
      const firstItem = content.items?.[0];
      const firstLineId =
        firstItem?.type === "text" ? firstItem.lines[0]?.id : undefined;
      const firstImageIds =
        firstItem?.type === "image" && firstItem.images[0]
          ? [firstItem.images[0].id]
          : [];
      return {
        selectedSectionId: id,
        selected: { kind: "section", id },
        selectedItemId: firstItem?.id,
        selectedLineId: firstLineId,
        selectedImageIds: firstImageIds,
      };
    }),
  setSelectedItemId: (id) =>
    set((state) => {
      if (!id || state.selected.kind !== "section") {
        return {
          selectedItemId: id,
          selectedLineId: undefined,
          selectedImageIds: [],
        };
      }
      const selectedSectionId =
        state.selected.kind === "section" ? state.selected.id : undefined;
      if (!selectedSectionId) {
        return {
          selectedItemId: id,
          selectedLineId: undefined,
          selectedImageIds: [],
        };
      }
      const target = state.project.sections.find(
        (section) => section.id === selectedSectionId
      );
      const content = normalizeSectionContent(target?.content);
      const item = content.items?.find((entry) => entry.id === id);
      if (!item) {
        return {
          selectedItemId: undefined,
          selectedLineId: undefined,
          selectedImageIds: [],
        };
      }
      return {
        selectedItemId: id,
        selectedLineId: item.type === "text" ? item.lines[0]?.id : undefined,
        selectedImageIds:
          item.type === "image" && item.images[0]
            ? [item.images[0].id]
            : [],
      };
    }),
  setSelectedLineId: (id) => set({ selectedLineId: id }),
  setSelectedImageIds: (ids) => set({ selectedImageIds: ids }),
  setHoveredSection: (id) => set({ hoveredSectionId: id }),
  setStickyTopPx: (px) => set({ stickyTopPx: px }),
  bumpPreviewKey: () =>
    set((state) => ({ previewKey: state.previewKey + 1 })),
  setLeftTab: (tab) => set({ leftTab: tab }),
  setUiMode: (mode) => set({ uiMode: mode }),
  setPreviewMode: (mode) => {
    set((state) => {
      if (state.previewMode === mode) {
        return state;
      }
      return {
        previewMode: mode,
        previewKey: state.previewKey + 1,
        isPreviewBusy: true,
        previewBusyReason: "responsive",
      };
    });
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          set({ isPreviewBusy: false, previewBusyReason: undefined });
        });
      });
    }
  },
  setPreviewAspect: (aspect) => set({ previewAspect: aspect }),
  setPreviewDesktopWidth: (width) =>
    set({ previewDesktopWidth: clampNumber(Math.round(width), 720, 1600) }),
  setPreviewMobileWidth: (width) =>
    set({ previewMobileWidth: clampNumber(Math.round(width), 320, 520) }),
  setPreviewGuidesEnabled: (enabled) => set({ previewGuidesEnabled: enabled }),
  setPreviewSafeAreaEnabled: (enabled) =>
    set({ previewSafeAreaEnabled: enabled }),
  setPreviewSectionBoundsEnabled: (enabled) =>
    set({ previewSectionBoundsEnabled: enabled }),
  setPreviewScrollSnapEnabled: (enabled) =>
    set({ previewScrollSnapEnabled: enabled }),
  setPreviewFontScale: (scale) =>
    set({ previewFontScale: clampNumber(Number(scale) || 1, 0.85, 1.2) }),
  setPreviewContrastWarningsEnabled: (enabled) =>
    set({ previewContrastWarningsEnabled: enabled }),
  setAutoSaveIntervalSec: (seconds) =>
    set({ autoSaveIntervalSec: Math.max(10, Math.round(seconds)) }),
  setSaveDestination: (destination) => set({ saveDestination: destination }),
  setExportFilenameTemplate: (value) =>
    set({ exportFilenameTemplate: value }),
  setAiDefaultInstruction: (value) => set({ aiDefaultInstruction: value }),
  setAiForbiddenWords: (value) => set({ aiForbiddenWords: value }),
  setAiTargetSectionTypes: (values) =>
    set({ aiTargetSectionTypes: values.filter(Boolean) }),
  setSaveStatus: (status, message) =>
    set({ saveStatus: status, saveStatusMessage: message }),
  setPreviewBusy: (isBusy, reason) =>
    set({
      isPreviewBusy: isBusy,
      previewBusyReason: isBusy ? reason : undefined,
    }),
  getProject: () => get().project,
  replaceProject: (project) =>
    set({
      project: {
        ...project,
        sections: normalizeSections(project.sections),
        pageBaseStyle: normalizePageBaseStyle(project.pageBaseStyle),
        settings: normalizeProjectSettings(project.settings),
      },
      hasUserEdits: false,
      saveStatus: "saved",
      saveStatusMessage: undefined,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
      selected: { kind: "page" },
      selectedSectionId: undefined,
      selectedItemId: undefined,
      selectedLineId: undefined,
      selectedImageIds: [],
    }),
  markDirty: () =>
    set({
      saveStatus: "dirty",
      saveStatusMessage: undefined,
      hasUserEdits: true,
    }),
  addAsset: (asset) => {
    const id =
      asset.id ??
      `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    set((state) => {
      const nextAssets = {
        ...(state.project.assets ?? {}),
        [id]: {
          id,
          filename: asset.filename,
          data: asset.data,
        },
      };
      return {
        ...state,
        project: {
          ...state.project,
          meta: {
            ...state.project.meta,
            updatedAt: new Date().toISOString(),
          },
          assets: nextAssets,
        },
        saveStatus: "dirty",
        saveStatusMessage: undefined,
        hasUserEdits: true,
      };
    });
    return id;
  },
}));
