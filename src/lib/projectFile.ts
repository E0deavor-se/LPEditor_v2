import type {
  ProjectSettings,
  ProjectState,
  SectionBase,
  SectionContent,
  SectionStyle,
  StoresTable,
} from "@/src/types/project";
import { normalizeSectionCardStyle } from "@/src/lib/sections/sectionCardPresets";

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
    type: section.type ?? "section",
    visible: section.visible ?? true,
    locked: false,
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

  switch (base.type) {
    case "brandBar":
      base.data.logoText = str(base.data.logoText ?? base.data.brandText);
      base.data.brandText = str(base.data.brandText ?? base.data.logoText);
      break;
    case "heroImage":
      base.data.imageUrl = str(base.data.imageUrl);
      base.data.alt = str(base.data.alt ?? base.data.altText);
      base.data.altText = str(base.data.altText ?? base.data.alt);
      break;
    case "campaignPeriodBar":
      base.data.startDate = str(base.data.startDate);
      base.data.endDate = str(base.data.endDate);
      break;
    case "campaignOverview":
      base.data.title = str(base.data.title);
      base.data.body = str(base.data.body);
      break;
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
      base.data.items = Array.isArray(base.data.items)
        ? base.data.items.map((item: unknown) => str(item))
        : [];
      base.data.text = str(base.data.text ?? "");
      base.data.bullet = base.data.bullet === "none" ? "none" : "disc";
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
      base.data.subtitle = str(base.data.subtitle ?? "");
      base.data.period = str(base.data.period ?? "");
      base.data.date = str(base.data.date ?? "");
      const headers =
        base.data.headers && typeof base.data.headers === "object"
          ? (base.data.headers as Record<string, unknown>)
          : {};
      base.data.rankLabel = str(base.data.rankLabel ?? headers.rank ?? "順位");
      base.data.headers = {
        rank: str(headers.rank ?? "順位"),
        label: str(headers.label ?? "項目"),
        value: str(headers.value ?? "決済金額"),
      };
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
          { key: "label", label: str(headers.label ?? "項目") },
          { key: "value", label: str(headers.value ?? "決済金額") },
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
          : [str(entry.label ?? ""), str(entry.value ?? "")];
        const normalizedValues = rawValues
          .slice(0, columns.length)
          .concat(
            Array(Math.max(0, columns.length - rawValues.length)).fill("")
          );
        return {
          id: str(entry.id ?? `rank_${index + 1}`),
          values: normalizedValues,
        };
      });
      const tableStyle =
        base.data.tableStyle && typeof base.data.tableStyle === "object"
          ? (base.data.tableStyle as Record<string, unknown>)
          : {};
      base.data.tableStyle = {
        headerBg: str(tableStyle.headerBg ?? "#f8fafc"),
        headerText: str(tableStyle.headerText ?? "#0f172a"),
        cellBg: str(tableStyle.cellBg ?? "#ffffff"),
        cellText: str(tableStyle.cellText ?? "#0f172a"),
        border: str(tableStyle.border ?? "#e2e8f0"),
        rankBg: str(tableStyle.rankBg ?? "#e2e8f0"),
        rankText: str(tableStyle.rankText ?? "#0f172a"),
        top1Bg: str(tableStyle.top1Bg ?? "#f59e0b"),
        top2Bg: str(tableStyle.top2Bg ?? "#cbd5f5"),
        top3Bg: str(tableStyle.top3Bg ?? "#fb923c"),
        periodLabelBg: str(tableStyle.periodLabelBg ?? "#f1f5f9"),
        periodLabelText: str(tableStyle.periodLabelText ?? "#0f172a"),
      };
      break;
    }
    case "paymentHistoryGuide":
      base.data.title = str(base.data.title ?? "決済履歴の確認方法");
      base.data.body = str(base.data.body ?? "");
      base.data.linkText = str(base.data.linkText ?? "");
      base.data.linkUrl = str(base.data.linkUrl ?? "");
      base.data.linkTargetKind =
        base.data.linkTargetKind === "section" ? "section" : "url";
      base.data.linkSectionId = str(base.data.linkSectionId ?? "");
      base.data.linkSuffix = str(base.data.linkSuffix ?? "");
      base.data.alert = str(base.data.alert ?? "");
      base.data.imageUrl = str(base.data.imageUrl ?? "/footer-defaults/img-02.png");
      base.data.imageAlt = str(base.data.imageAlt ?? "");
      base.data.imageAssetId = str(base.data.imageAssetId ?? "");
      break;
    case "tabbedNotes": {
      base.data.title = str(base.data.title ?? "注意事項");
      const rawTabs = Array.isArray(base.data.tabs) ? base.data.tabs : [];
      const tabs = rawTabs.map((tab: unknown, index: number) => {
        const entry = tab && typeof tab === "object"
          ? (tab as Record<string, unknown>)
          : {};
        const rawItems = Array.isArray(entry.items) ? entry.items : [];
        const items = rawItems.map((item: unknown, itemIndex: number) => {
          const itemEntry = item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
          const subItems = Array.isArray(itemEntry.subItems)
            ? itemEntry.subItems.map((value) => str(value)).filter(Boolean)
            : [];
          return {
            id: str(itemEntry.id ?? `tab_item_${index + 1}_${itemIndex + 1}`),
            text: str(itemEntry.text ?? ""),
            bullet: itemEntry.bullet === "none" ? "none" : "disc",
            tone: itemEntry.tone === "accent" ? "accent" : "normal",
            bold: Boolean(itemEntry.bold),
            subItems,
          };
        });
        return {
          id: str(entry.id ?? `tab_${index + 1}`),
          labelTop: str(entry.labelTop ?? `タブ${index + 1}`),
          labelBottom: str(entry.labelBottom ?? "注意事項"),
          intro: str(entry.intro ?? ""),
          items,
          footnote: str(entry.footnote ?? ""),
          ctaText: str(entry.ctaText ?? ""),
          ctaLinkText: str(entry.ctaLinkText ?? ""),
          ctaLinkUrl: str(entry.ctaLinkUrl ?? ""),
          ctaTargetKind: entry.ctaTargetKind === "section" ? "section" : "url",
          ctaSectionId: str(entry.ctaSectionId ?? ""),
          ctaImageUrl: str(entry.ctaImageUrl ?? ""),
          ctaImageAlt: str(entry.ctaImageAlt ?? ""),
          ctaImageAssetId: str(entry.ctaImageAssetId ?? ""),
          buttonText: str(entry.buttonText ?? ""),
          buttonTargetKind:
            entry.buttonTargetKind === "section" ? "section" : "url",
          buttonUrl: str(entry.buttonUrl ?? ""),
          buttonSectionId: str(entry.buttonSectionId ?? ""),
        };
      });
      base.data.tabs = tabs;
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
        inactiveBg: str(rawStyle.inactiveBg ?? "#DDDDDD"),
        inactiveText: str(rawStyle.inactiveText ?? "#000000"),
        activeBg: str(rawStyle.activeBg ?? "#000000"),
        activeText: str(rawStyle.activeText ?? "#FFFFFF"),
        border: str(rawStyle.border ?? "#000000"),
        contentBg: str(rawStyle.contentBg ?? "#FFFFFF"),
        contentBorder: str(rawStyle.contentBorder ?? "#000000"),
        accent: str(rawStyle.accent ?? "#EB5505"),
      };
      break;
    }
    default:
      break;
  }

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
  const themeSpec =
    data.themeSpec && typeof data.themeSpec === "object"
      ? (data.themeSpec as ProjectState["themeSpec"])
      : undefined;
  const animationRegistry = Array.isArray(data.animationRegistry)
    ? (data.animationRegistry as ProjectState["animationRegistry"])
    : undefined;
  const pageBaseStyle =
    data.pageBaseStyle && typeof data.pageBaseStyle === "object"
      ? (data.pageBaseStyle as ProjectState["pageBaseStyle"])
      : undefined;

  return {
    meta,
    settings: settings as ProjectSettings,
    sections,
    stores,
    assets,
    schemaVersion,
    appVersion,
    globalSettings,
    assetMeta,
    storeListSpec,
    themeSpec,
    animationRegistry,
    pageBaseStyle,
  };
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
