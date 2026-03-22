import type {
  EditorMode,
  ProjectSettings,
  ProjectState,
  SectionBase,
  SectionContent,
  SectionStyle,
  StoresTable,
} from "@/src/types/project";
import { normalizeSectionCardStyle } from "@/src/lib/sections/sectionCardPresets";
import { applySectionFrameDefaults } from "@/src/lib/sections/sectionFrame";
import { createDefaultCanvasDocument } from "@/src/types/canvas";
import { applyTemplateHydrator } from "@/src/lib/sections/sectionArchitecture/TemplateHydrator";
import { normalizeProjectAiAssets } from "@/src/features/ai-assets/types";
import { ensureProjectAiAssetsConsistency } from "@/src/features/ai-assets/lib/projectAiAssets";
import { DEFAULT_BUILDER_THEME_ID } from "@/src/themes/themePresets";
import { normalizeProjectDocuments } from "@/src/lib/editorProject";
import { deriveCampaignTypeFromTemplateId } from "@/src/structures/campaignStructurePresets";

const DEFAULT_TARGET_STORES_CONFIG = {
  labelKeys: [],
  filterKeys: ["都道府県"],
  pageSize: 10,
  columnConfig: {},
};

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const createItemId = () => `item_${Math.random().toString(36).slice(2, 8)}`;
const createLineId = () => `line_${Math.random().toString(36).slice(2, 8)}`;

const canonicalizeSectionType = (type: string) =>
  type === "paymentUsageGuide" ? "paymentHistoryGuide" : type;

const createDefaultContent = (): SectionContent => ({
  title: "",
  items: [
    {
      id: createItemId(),
      type: "text",
      lines: [{ id: createLineId(), text: "" }],
    },
  ],
});

const createDefaultStyle = (): SectionStyle => ({
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
    color1: "#ffffff",
    color2: "#f1f5f9",
  },
  border: {
    enabled: false,
    width: 1,
    color: "#e5e7eb",
  },
  shadow: "none",
  layout: {
    padding: { t: 32, r: 24, b: 32, l: 24 },
    maxWidth: 1200,
    align: "center",
    radius: 12,
    fullWidth: false,
    minHeight: 0,
  },
});

const sanitizeFilename = (value: string) =>
  value
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const normalizeSection = (section: Partial<SectionBase>, index: number): SectionBase => {
  const base: SectionBase = {
    id: section.id ?? `sec_${section.type ?? "section"}_${index}`,
    type: canonicalizeSectionType(section.type ?? "section"),
    visible: section.visible ?? true,
    locked: typeof section.locked === "boolean" ? section.locked : false,
    name: typeof section.name === "string" ? section.name : undefined,
    data: typeof section.data === "object" && section.data ? { ...section.data } : {},
    content:
      typeof section.content === "object" && section.content
        ? { ...section.content }
        : createDefaultContent(),
    style:
      typeof section.style === "object" && section.style
        ? ({ ...section.style } as SectionStyle)
        : createDefaultStyle(),
    sectionCardStyle: normalizeSectionCardStyle(
      typeof section.sectionCardStyle === "object" && section.sectionCardStyle
        ? section.sectionCardStyle
        : undefined
    ),
  };

  const framed = applySectionFrameDefaults(base);
  base.data = framed.data;
  if (typeof base.data.fullWidthBackground === "boolean") {
    base.style.layout.fullWidth = base.data.fullWidthBackground;
  }

  switch (base.type) {
    case "brandBar":
      base.data.logoText = str(base.data.logoText ?? base.data.brandText);
      base.data.brandText = str(base.data.brandText ?? base.data.logoText);
      base.data.brandImageAssetId = str(base.data.brandImageAssetId ?? "");
      base.data.brandImageUrl = str(base.data.brandImageUrl ?? "");
      break;
    case "heroImage":
      base.data.imageAssetIdPc = str(
        base.data.imageAssetIdPc ?? base.data.imageAssetId ?? ""
      );
      base.data.imageAssetIdSp = str(
        base.data.imageAssetIdSp ?? base.data.imageAssetId ?? ""
      );
      base.data.imageUrl = str(base.data.imageUrl);
      base.data.imageUrlSp = str(base.data.imageUrlSp ?? base.data.imageUrl);
      base.data.alt = str(base.data.alt ?? base.data.altText);
      base.data.altText = str(base.data.altText ?? base.data.alt);
      break;
    case "campaignPeriodBar":
      base.data.periodLabel = str(base.data.periodLabel ?? "キャンペーン期間");
      base.data.periodBarText = str(base.data.periodBarText ?? "");
      base.data.startDate = str(base.data.startDate);
      base.data.endDate = str(base.data.endDate);
      if (base.data.startDate && base.data.endDate && base.data.startDate > base.data.endDate) {
        const tmp = base.data.startDate;
        base.data.startDate = base.data.endDate;
        base.data.endDate = tmp;
      }
      base.data.showWeekday =
        typeof base.data.showWeekday === "boolean" ? base.data.showWeekday : true;
      base.data.allowWrap =
        typeof base.data.allowWrap === "boolean" ? base.data.allowWrap : true;
      {
        const rawStyle =
          base.data.periodBarStyle && typeof base.data.periodBarStyle === "object"
            ? (base.data.periodBarStyle as Record<string, unknown>)
            : {};
        const size =
          typeof rawStyle.size === "number" && Number.isFinite(rawStyle.size)
            ? rawStyle.size
            : 14;
        const paddingX =
          typeof rawStyle.paddingX === "number" && Number.isFinite(rawStyle.paddingX)
            ? rawStyle.paddingX
            : 18;
        const paddingY =
          typeof rawStyle.paddingY === "number" && Number.isFinite(rawStyle.paddingY)
            ? rawStyle.paddingY
            : 0;
        const shadow = str(rawStyle.shadow ?? "none");
        base.data.periodBarStyle = {
          bold: typeof rawStyle.bold === "boolean" ? rawStyle.bold : true,
          color: str(rawStyle.color ?? "#FFFFFF"),
          background: str(rawStyle.background ?? "#EB5505"),
          labelColor: str(rawStyle.labelColor ?? rawStyle.color ?? "#FFFFFF"),
          size: Math.max(10, Math.min(32, size)),
          paddingX: Math.max(0, Math.min(48, paddingX)),
          paddingY: Math.max(0, Math.min(24, paddingY)),
          shadow: shadow === "soft" || shadow === "none" ? shadow : "none",
          advancedStyleText: str(rawStyle.advancedStyleText ?? ""),
        };
      }
      break;
    case "campaignOverview":
      base.data.title = str(base.data.title);
      base.data.body = str(base.data.body);
      break;
    case "couponFlow": {
      base.data.title = str(base.data.title ?? "クーポン利用の流れ");
      base.data.lead = str(
        base.data.lead ??
          "＊必ずクーポンを獲得してからau PAY（コード支払い）でお支払いください。"
      );
      base.data.note = str(base.data.note ?? "※画面はイメージです。");
      const rawVariant = str(base.data.variant ?? "slideshow");
      base.data.variant =
        rawVariant === "stepCards" ||
        rawVariant === "timeline" ||
        rawVariant === "simpleList"
          ? rawVariant
          : "slideshow";

      const fallbackSteps = (() => {
        const contentItems = Array.isArray(base.content?.items) ? base.content.items : [];
        const imageItem = contentItems.find((item) => item.type === "image") as
          | { images?: Array<{ src?: unknown; alt?: unknown; assetId?: unknown }> }
          | undefined;
        const slides = Array.isArray(imageItem?.images) ? imageItem.images : [];
        const buttonItem = contentItems.find((item) => item.type === "button") as
          | {
              label?: unknown;
              target?: { kind?: unknown; url?: unknown };
            }
          | undefined;
        return slides.map((slide, index) => ({
          id: `coupon_step_${index + 1}`,
          stepNo: str(index + 1),
          title: `ステップ${index + 1}`,
          description: "",
          supplement: "",
          imageUrl: str(slide?.src ?? ""),
          imageAlt: str(slide?.alt ?? ""),
          imageAssetId: str(slide?.assetId ?? ""),
          iconUrl: "",
          iconAssetId: "",
          buttonText: str(buttonItem?.label ?? ""),
          buttonUrl:
            buttonItem?.target?.kind === "url" ? str(buttonItem.target.url ?? "") : "",
        }));
      })();

      const fallbackPrimaryButton = (() => {
        const contentItems = Array.isArray(base.content?.items) ? base.content.items : [];
        return contentItems.find((item) => item.type === "button") as
          | {
              label?: unknown;
              target?: { kind?: unknown; url?: unknown };
              style?: { presetId?: unknown; backgroundColor?: unknown; textColor?: unknown; borderColor?: unknown; radius?: unknown };
            }
          | undefined;
      })();

      const rawSteps = Array.isArray(base.data.steps) ? base.data.steps : fallbackSteps;
      base.data.steps = rawSteps.map((step: unknown, index: number) => {
        const entry = step && typeof step === "object"
          ? (step as Record<string, unknown>)
          : {};
        return {
          id: str(entry.id ?? `coupon_step_${index + 1}`),
          stepNo: str(entry.stepNo ?? index + 1),
          title: str(entry.title ?? ""),
          description: str(entry.description ?? ""),
          supplement: str(entry.supplement ?? ""),
          imageUrl: str(entry.imageUrl ?? ""),
          imageAlt: str(entry.imageAlt ?? ""),
          imageAssetId: str(entry.imageAssetId ?? ""),
          iconUrl: str(entry.iconUrl ?? ""),
          iconAssetId: str(entry.iconAssetId ?? ""),
          buttonText: str(entry.buttonText ?? ""),
          buttonUrl: str(entry.buttonUrl ?? ""),
        };
      });

      base.data.ctaEnabled = base.data.ctaEnabled !== false;
      base.data.buttonLabel = str(
        base.data.buttonLabel ?? fallbackPrimaryButton?.label ?? "クーポンを獲得する"
      );
      base.data.buttonUrl = str(
        base.data.buttonUrl ??
          (fallbackPrimaryButton?.target?.kind === "url"
            ? fallbackPrimaryButton.target.url
            : "")
      );
      base.data.buttonPreset = str(
        base.data.buttonPreset ?? fallbackPrimaryButton?.style?.presetId ?? "couponFlow"
      );
      base.data.buttonVariant =
        str(base.data.buttonVariant ?? "primary") === "secondary" ? "secondary" : "primary";
      base.data.buttonBg = str(
        base.data.buttonBg ??
          fallbackPrimaryButton?.style?.backgroundColor ??
          (base.data.buttonPreset === "couponFlow" ? "#ea5504" : "#eb5505")
      );
      base.data.buttonTextColor = str(
        base.data.buttonTextColor ?? fallbackPrimaryButton?.style?.textColor ?? "#ffffff"
      );
      base.data.buttonBorderColor = str(
        base.data.buttonBorderColor ??
          fallbackPrimaryButton?.style?.borderColor ??
          (base.data.buttonPreset === "couponFlow" ? "#ffffff" : "#eb5505")
      );
      base.data.buttonRadius =
        typeof base.data.buttonRadius === "number" && Number.isFinite(base.data.buttonRadius)
          ? base.data.buttonRadius
          : typeof fallbackPrimaryButton?.style?.radius === "number" && Number.isFinite(fallbackPrimaryButton.style.radius)
          ? fallbackPrimaryButton.style.radius
          : 999;
      base.data.buttonShadow = str(
        base.data.buttonShadow ?? "0 6px 14px rgba(0, 0, 0, 0.18)"
      );

      const rawSlideshow =
        base.data.slideshow && typeof base.data.slideshow === "object"
          ? (base.data.slideshow as Record<string, unknown>)
          : {};
      base.data.slideshow = {
        autoplay: rawSlideshow.autoplay !== false,
        intervalMs:
          typeof rawSlideshow.intervalMs === "number" && Number.isFinite(rawSlideshow.intervalMs)
            ? rawSlideshow.intervalMs
            : 3500,
        loop: rawSlideshow.loop !== false,
        showArrows: rawSlideshow.showArrows !== false,
        showDots: rawSlideshow.showDots !== false,
        allowSwipe: rawSlideshow.allowSwipe !== false,
      };

      const rawDesign =
        base.data.design && typeof base.data.design === "object"
          ? (base.data.design as Record<string, unknown>)
          : {};
      base.data.design = {
        stepNumberColor: str(rawDesign.stepNumberColor ?? "#ffffff"),
        stepNumberBg: str(rawDesign.stepNumberBg ?? "#eb5505"),
        cardBg: str(rawDesign.cardBg ?? "#ffffff"),
        cardText: str(rawDesign.cardText ?? "#0f172a"),
        borderColor: str(rawDesign.borderColor ?? "#d1d5db"),
        radius:
          typeof rawDesign.radius === "number" && Number.isFinite(rawDesign.radius)
            ? rawDesign.radius
            : 12,
        shadow: str(rawDesign.shadow ?? "0 8px 20px rgba(15, 23, 42, 0.08)"),
        gap:
          typeof rawDesign.gap === "number" && Number.isFinite(rawDesign.gap)
            ? rawDesign.gap
            : 16,
      };

      const rawAnim =
        base.data.couponFlowAnimation && typeof base.data.couponFlowAnimation === "object"
          ? (base.data.couponFlowAnimation as Record<string, unknown>)
          : undefined;
      if (rawAnim) {
        const preset = str(rawAnim.preset ?? "none");
        base.data.couponFlowAnimation =
          preset === "fade" || preset === "slideUp" || preset === "zoom"
            ? {
                preset,
                durationMs:
                  typeof rawAnim.durationMs === "number" && Number.isFinite(rawAnim.durationMs)
                    ? rawAnim.durationMs
                    : 500,
                delayMs:
                  typeof rawAnim.delayMs === "number" && Number.isFinite(rawAnim.delayMs)
                    ? rawAnim.delayMs
                    : 0,
              }
            : undefined;
      }
      break;
    }
    case "targetStores":
      base.data.title = str(base.data.title ?? "対象店舗");
      base.data.note = str(base.data.note ?? "");
      base.data.placeholder = str(base.data.placeholder ?? "");
      base.data.targetStoresConfig = {
        ...DEFAULT_TARGET_STORES_CONFIG,
        ...(typeof base.data.targetStoresConfig === "object" && base.data.targetStoresConfig
          ? base.data.targetStoresConfig
          : {}),
      };
      break;
    case "legalNotes":
      base.data.title = str(base.data.title ?? "注意事項");
      base.data.text = str(base.data.text ?? "");
      base.data.bullet = !(base.data.bullet === false || base.data.bullet === "none");
      {
        const defaultBullet = base.data.bullet ? "disc" : "none";
        const rawItems = Array.isArray(base.data.items) ? base.data.items : [];
        base.data.items = rawItems
          .map((item: unknown) => {
            if (typeof item === "string") {
              return { text: str(item), bullet: defaultBullet };
            }
            if (!item || typeof item !== "object") {
              return null;
            }
            const entry = item as Record<string, unknown>;
            const text = str(entry.text ?? "");
            const bullet =
              entry.bullet === "none" || entry.bullet === "disc"
                ? entry.bullet
                : defaultBullet;
            return { text, bullet };
          })
          .filter(Boolean);
      }
      base.data.noteWidthPct =
        typeof base.data.noteWidthPct === "number" &&
        Number.isFinite(base.data.noteWidthPct)
          ? base.data.noteWidthPct
          : 100;
      break;
    case "footerHtml":
      base.data.html = str(base.data.html ?? "");
      break;
    case "rankingTable": {
      base.data.title = str(base.data.title ?? "ランキング");
      base.data.subtitle = str(base.data.subtitle ?? "最新順位はこちら");
      base.data.period = str(base.data.period ?? "");
      base.data.date = str(base.data.date ?? "");
      base.data.notes = Array.isArray(base.data.notes)
        ? base.data.notes.map((note: unknown) => str(note)).filter(Boolean)
        : [];
      const rawColumns = Array.isArray(base.data.columns)
        ? base.data.columns
        : [];
      let columns = rawColumns
        .map((col: unknown, index: number) => {
          if (typeof col === "string") {
            return { key: `col_${index + 1}`, label: str(col) };
          }
          if (col && typeof col === "object") {
            const entry = col as Record<string, unknown>;
            return {
              key: str(entry.key ?? `col_${index + 1}`),
              label: str(entry.label ?? ""),
            };
          }
          return { key: `col_${index + 1}`, label: "" };
        })
        .map((col, index) => ({
          key: col.key || `col_${index + 1}`,
          label: col.label || `列${index + 1}`,
        }));
      if (columns.length === 0) {
        columns = [
          { key: "amount", label: "決済金額" },
          { key: "count", label: "品数" },
        ];
      }
      base.data.columns = columns;
      const rawRows = Array.isArray(base.data.rows) ? base.data.rows : [];
      base.data.rows = rawRows.map((row: unknown, index: number) => {
        if (Array.isArray(row)) {
          const values = row.map((entry) => str(entry));
          return {
            id: `rank_${index + 1}`,
            values: values.slice(0, columns.length).concat(
              Array(Math.max(0, columns.length - values.length)).fill("")
            ),
          };
        }
        const entry = row && typeof row === "object"
          ? (row as Record<string, unknown>)
          : {};
        const rawValues = Array.isArray(entry.values)
          ? entry.values.map((value) => str(value))
          : [
              str(entry.product ?? entry.label ?? ""),
              str(entry.description ?? entry.value ?? ""),
            ];
        const normalizedValues = rawValues
          .slice(0, columns.length)
          .concat(
            Array(Math.max(0, columns.length - rawValues.length)).fill("")
          );
        return {
          id: str(entry.id ?? `rank_${index + 1}`),
          rank: str(entry.rank ?? index + 1),
          values: normalizedValues,
        };
      });
      delete base.data.rankLabel;
      delete base.data.headers;
      delete base.data.tableStyle;
      delete base.data.mobileDisplayMode;
      delete base.data.showCrown;
      break;
    }
    case "paymentHistoryGuide":
      base.data.title = str(base.data.title ?? "決済履歴の確認方法");
      base.data.body = str(
        base.data.body ??
          "現在の決済金額については、au PAY アプリ内の「取引履歴」をご確認ください。"
      );
      base.data.linkText = str(base.data.linkText ?? "こちら");
      base.data.linkUrl = str(base.data.linkUrl ?? "#contact");
      base.data.linkTargetKind =
        base.data.linkTargetKind === "section" ? "section" : "url";
      base.data.linkSectionId = str(base.data.linkSectionId ?? "");
      base.data.linkSuffix = str(base.data.linkSuffix ?? "までお問い合わせください。");
      base.data.alert = str(
        base.data.alert ??
          "なお、店頭や問い合わせ窓口での現在の順位や金額、当選結果についてのご質問にはお答えできません。"
      );
      base.data.imageUrl = str(base.data.imageUrl ?? "/footer-defaults/img-02.png");
      base.data.imageAlt = str(base.data.imageAlt ?? "決済履歴の確認方法");
      base.data.imageAssetId = str(base.data.imageAssetId ?? "");
      break;
    case "tabbedNotes": {
      base.data.title = str(base.data.title ?? "注意事項");
      const rawTabs = Array.isArray(base.data.tabs) ? base.data.tabs : [];
      const tabs = rawTabs.map((tab: unknown, index: number) => {
        const entry = tab && typeof tab === "object"
          ? (tab as Record<string, unknown>)
          : {};
        const notes = Array.isArray(entry.notes)
          ? entry.notes.map((note) => str(note)).filter(Boolean)
          : [
              ...(Array.isArray(entry.items)
                ? entry.items.map((item) => {
                    const itemEntry = item && typeof item === "object"
                      ? (item as Record<string, unknown>)
                      : {};
                    return str(itemEntry.text ?? "");
                  })
                : []),
              str(entry.footnote ?? ""),
            ].filter((note) => note.trim().length > 0);
        return {
          id: str(entry.id ?? `tab_${index + 1}`),
          label: str(entry.label ?? entry.labelTop ?? entry.labelBottom ?? `タブ${index + 1}`),
          contentTitle: str(entry.contentTitle ?? entry.intro ?? ""),
          notes,
        };
      });
      base.data.tabs = tabs;
      const tabCount = tabs.length;
      const rawInitial =
        typeof base.data.initialTabIndex === "number" && Number.isFinite(base.data.initialTabIndex)
          ? Math.floor(base.data.initialTabIndex)
          : 0;
      base.data.initialTabIndex =
        tabCount <= 0 ? 0 : Math.max(0, Math.min(tabCount - 1, rawInitial));
      const rawStyle =
        base.data.tabStyle && typeof base.data.tabStyle === "object"
          ? (base.data.tabStyle as Record<string, unknown>)
          : {};
      const rawVariant = str(rawStyle.variant ?? "simple");
      const variant =
        rawVariant === "sticky" ||
        rawVariant === "underline" ||
        rawVariant === "popout"
          ? rawVariant
          : "simple";
      base.data.tabStyle = {
        variant,
        showBorder: rawStyle.showBorder !== false,
        inactiveBg: str(rawStyle.inactiveBg ?? "#DDDDDD"),
        activeBg: str(rawStyle.activeBg ?? "#000000"),
        contentBg: str(rawStyle.contentBg ?? "#FFFFFF"),
      };
      break;
    }
    default:
      break;
  }

  applyTemplateHydrator(base);

  return base;
};

const normalizeStores = (stores: StoresTable | undefined): StoresTable | undefined => {
  if (!stores) {
    return undefined;
  }
  const columns = Array.isArray(stores.columns)
    ? stores.columns.map((column) => str(column))
    : [];
  const extraColumns = Array.isArray(stores.extraColumns)
    ? stores.extraColumns.map((column) => str(column))
    : columns.length >= 5
    ? columns.slice(5)
    : [];
  const rows = Array.isArray(stores.rows)
    ? stores.rows.map((row) => {
        const entry: Record<string, string> = {};
        if (row && typeof row === "object") {
          Object.entries(row).forEach(([key, value]) => {
            entry[str(key)] = str(value);
          });
        }
        return entry;
      })
    : [];
  const canonical = stores.canonical ?? {
    storeIdKey: "店舗ID",
    storeNameKey: "店舗名",
    postalCodeKey: "郵便番号",
    addressKey: "住所",
    prefectureKey: "都道府県",
  };
  return {
    columns,
    extraColumns,
    rows,
    canonical: {
      storeIdKey: str(canonical.storeIdKey || "店舗ID"),
      storeNameKey: str(canonical.storeNameKey || "店舗名"),
      postalCodeKey: str(canonical.postalCodeKey || "郵便番号"),
      addressKey: str(canonical.addressKey || "住所"),
      prefectureKey: str(canonical.prefectureKey || "都道府県"),
    },
  };
};

export const validateAndNormalizeProject = (raw: unknown): ProjectState => {
  if (!raw || typeof raw !== "object") {
    throw new Error("プロジェクトファイルが無効です。");
  }

  const data = raw as Partial<ProjectState>;
  if (!data.meta || typeof data.meta !== "object") {
    throw new Error("プロジェクトのメタ情報がありません。");
  }
  if (!Array.isArray(data.sections)) {
    throw new Error("プロジェクトのセクションがありません。");
  }

  const now = new Date().toISOString();
  const meta = {
    projectName: str(data.meta.projectName || "キャンペーンLP"),
    templateType: (data.meta.templateType ?? "coupon") as ProjectState["meta"]["templateType"],
    campaignType:
      data.meta.campaignType === "coupon" ||
      data.meta.campaignType === "pointReward" ||
      data.meta.campaignType === "ranking" ||
      data.meta.campaignType === "generic"
        ? data.meta.campaignType
        : deriveCampaignTypeFromTemplateId(
            typeof data.meta.templateId === "string" ? data.meta.templateId : undefined
          ),
    structurePresetId:
      typeof data.meta.structurePresetId === "string" &&
      data.meta.structurePresetId.trim().length > 0
        ? data.meta.structurePresetId
        : undefined,
    templateId:
      typeof data.meta.templateId === "string" && data.meta.templateId.trim().length > 0
        ? data.meta.templateId
        : "campaign",
    version: str(data.meta.version || "1.0"),
    createdAt: str(data.meta.createdAt || now),
    updatedAt: str(data.meta.updatedAt || now),
  };

  const sections = data.sections.map((section, index) =>
    normalizeSection(section, index)
  );

  const settings =
    data.settings && typeof data.settings === "object" ? data.settings : {};

  const assets =
    data.assets && typeof data.assets === "object" ? data.assets : undefined;
  const aiAssets = normalizeProjectAiAssets(data.aiAssets);

  const stores = normalizeStores(data.stores as StoresTable | undefined);
  const schemaVersion =
    typeof data.schemaVersion === "string" ? data.schemaVersion : undefined;
  const appVersion =
    typeof data.appVersion === "string" ? data.appVersion : undefined;
  const globalSettings =
    data.globalSettings && typeof data.globalSettings === "object"
      ? (data.globalSettings as ProjectState["globalSettings"])
      : undefined;
  const assetMeta = Array.isArray(data.assetMeta)
    ? (data.assetMeta as ProjectState["assetMeta"])
    : undefined;
  const storeListSpec =
    data.storeListSpec && typeof data.storeListSpec === "object"
      ? (data.storeListSpec as ProjectState["storeListSpec"])
      : undefined;
  const themeSpec: ProjectState["themeSpec"] =
    data.themeSpec && typeof data.themeSpec === "object"
      ? {
          mode:
            (data.themeSpec as ProjectState["themeSpec"])?.mode ?? "light",
          accent:
            (data.themeSpec as ProjectState["themeSpec"])?.accent ?? "aupay-orange",
          ...(data.themeSpec as ProjectState["themeSpec"]),
          themeId:
            typeof (data.themeSpec as ProjectState["themeSpec"])?.themeId === "string"
              ? (data.themeSpec as ProjectState["themeSpec"])?.themeId
              : DEFAULT_BUILDER_THEME_ID,
          templateId:
            typeof (data.themeSpec as ProjectState["themeSpec"])?.templateId === "string"
              ? (data.themeSpec as ProjectState["themeSpec"])?.templateId
              : meta.templateId,
        }
      : {
          mode: "light",
          accent: "aupay-orange",
          themeId: DEFAULT_BUILDER_THEME_ID,
          templateId: meta.templateId,
        };
  const animationRegistry = Array.isArray(data.animationRegistry)
    ? (data.animationRegistry as ProjectState["animationRegistry"])
    : undefined;
  const pageBaseStyle =
    data.pageBaseStyle && typeof data.pageBaseStyle === "object"
      ? (data.pageBaseStyle as ProjectState["pageBaseStyle"])
      : undefined;
  const legacyCanvasPages = Array.isArray(data.canvasPages)
    ? (data.canvasPages as ProjectState["canvasPages"])
    : undefined;
  const rawEditorDocuments =
    data.editorDocuments && typeof data.editorDocuments === "object"
      ? (data.editorDocuments as ProjectState["editorDocuments"])
      : undefined;

  const mode: EditorMode = rawEditorDocuments?.mode === "canvas" ? "canvas" : "layout";
  const activeDevice: "pc" | "sp" =
    rawEditorDocuments?.activeDevice === "sp"
      ? "sp"
      : rawEditorDocuments?.activeDevice === "pc"
      ? "pc"
      : globalSettings?.ui?.previewMode === "mobile"
      ? "sp"
      : "pc";
  const canvasDocument =
    rawEditorDocuments?.canvasDocument ??
    legacyCanvasPages?.[0]?.canvas ??
    createDefaultCanvasDocument();

  const normalizedProject: ProjectState = {
    meta,
    settings: settings as ProjectSettings,
    sections,
    stores,
    assets,
    aiAssets,
    schemaVersion,
    appVersion,
    globalSettings,
    assetMeta,
    storeListSpec,
    themeSpec,
    animationRegistry,
    pageBaseStyle,
    editorDocuments: {
      mode,
      activeDevice,
      layoutDocument:
        // Read compatibility: accept legacy lpDocument when loading old files.
        // Write path should always persist layoutDocument as canonical.
        rawEditorDocuments?.layoutDocument ??
        rawEditorDocuments?.lpDocument ??
        {
        settings: settings as ProjectSettings,
        sections,
        pageBaseStyle,
        stores,
        assets,
        aiAssets,
        schemaVersion,
        appVersion,
        globalSettings,
        assetMeta,
        storeListSpec,
        themeSpec,
        animationRegistry,
      },
      canvasDocument,
    },
    // Legacy data is retained for backwards compatibility. Migration consumers
    // should prefer editorDocuments.canvasDocument and treat canvasPages as read-only legacy.
    canvasPages: legacyCanvasPages,
  };

  return normalizeProjectDocuments(
    ensureProjectAiAssetsConsistency(normalizedProject)
  );
};

export const downloadProjectJson = (project: ProjectState) => {
  const filenameBase = sanitizeFilename(project.meta.projectName || "project");
  const filename = `${filenameBase || "project"}.lp-project.json`;
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const pickAndLoadProjectJson = async (): Promise<ProjectState> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".lp-project.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        const error = new Error("ファイルが選択されていません。");
        error.name = "AbortError";
        reject(error);
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        resolve(validateAndNormalizeProject(parsed));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
};
