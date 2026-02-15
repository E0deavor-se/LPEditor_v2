import JSZip from "jszip";
import type {
  AssetMeta,
  AssetRecord,
  ProjectFile,
  ProjectState,
  SectionContent,
  SectionBase,
  SectionStyle,
  StoresTable,
} from "@/src/types/project";
import { validateAndNormalizeProject } from "@/src/lib/projectFile";

const REQUIRED_SECTION_TYPES = [
  "brandBar",
  "heroImage",
  "campaignPeriodBar",
  "campaignOverview",
  "targetStores",
  "legalNotes",
  "footerHtml",
] as const;

type RequiredSectionType = (typeof REQUIRED_SECTION_TYPES)[number];

type StoresJsonPayload = {
  canonicalKeys?: {
    storeIdKey?: string;
    storeNameKey?: string;
    postalCodeKey?: string;
    addressKey?: string;
    prefectureKey?: string;
  };
  columns?: string[];
  rows?: Array<{
    storeName?: string;
    postalCode?: string;
    address?: string;
    prefecture?: string;
    raw?: Record<string, string>;
  }>;
};

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const normalizePath = (value: string) => value.replace(/\\/g, "/");

const createItemId = () => `item_${Math.random().toString(36).slice(2, 8)}`;
const createLineId = () => `line_${Math.random().toString(36).slice(2, 8)}`;

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

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
  },
});

const buildDefaultSections = (): SectionBase[] => [
  {
    id: "sec_brandBar",
    type: "brandBar",
    visible: true,
    locked: false,
    data: { logoText: "ブランド名", brandText: "ブランド名" },
    content: createDefaultContent(),
    style: createDefaultStyle(),
  },
  {
    id: "sec_heroImage",
    type: "heroImage",
    visible: true,
    locked: false,
    data: { imageUrl: "", alt: "", altText: "" },
    content: createDefaultContent(),
    style: createDefaultStyle(),
  },
  {
    id: "sec_campaignPeriodBar",
    type: "campaignPeriodBar",
    visible: true,
    locked: false,
    data: { startDate: "", endDate: "" },
    content: createDefaultContent(),
    style: createDefaultStyle(),
  },
  {
    id: "sec_campaignOverview",
    type: "campaignOverview",
    visible: true,
    locked: false,
    data: { title: "キャンペーン概要", body: "" },
    content: createDefaultContent(),
    style: createDefaultStyle(),
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
      targetStoresConfig: {
        labelKeys: [],
        filterKeys: ["都道府県"],
        pageSize: 10,
        columnConfig: {},
      },
    },
    content: createDefaultContent(),
    style: createDefaultStyle(),
  },
  {
    id: "sec_legalNotes",
    type: "legalNotes",
    visible: true,
    locked: false,
    data: { title: "注意事項", items: [], text: "" },
    content: createDefaultContent(),
    style: createDefaultStyle(),
  },
  {
    id: "sec_footerHtml",
    type: "footerHtml",
    visible: true,
    locked: false,
    data: { html: "" },
    content: createDefaultContent(),
    style: createDefaultStyle(),
  },
];

const ensureRequiredSections = (project: ProjectState): ProjectState => {
  const defaults = buildDefaultSections();
  const byType = new Map<string, SectionBase>();
  project.sections.forEach((section) => {
    if (!byType.has(section.type)) {
      byType.set(section.type, section);
    }
  });

  const merged = defaults.map((section) => {
    const existing = byType.get(section.type);
    if (!existing) {
      return section;
    }
    return {
      ...section,
      ...existing,
      locked: false,
      data: { ...section.data, ...existing.data },
      content: { ...section.content, ...existing.content },
      style: { ...section.style, ...existing.style },
    };
  });

  const extra = project.sections.filter(
    (section) => !REQUIRED_SECTION_TYPES.includes(section.type as RequiredSectionType)
  );

  return {
    ...project,
    sections: [...merged, ...extra],
  };
};

const buildStoresFromJson = (payload: StoresJsonPayload): StoresTable => {
  const columns = Array.isArray(payload.columns)
    ? payload.columns.map((column) => str(column))
    : [];
  const extraColumns = columns.length >= 5 ? columns.slice(5) : [];
  const canonicalKeys = payload.canonicalKeys ?? {};
  const canonical = {
    storeIdKey: str(canonicalKeys.storeIdKey || "店舗ID"),
    storeNameKey: str(canonicalKeys.storeNameKey || "店舗名"),
    postalCodeKey: str(canonicalKeys.postalCodeKey || "郵便番号"),
    addressKey: str(canonicalKeys.addressKey || "住所"),
    prefectureKey: str(canonicalKeys.prefectureKey || "都道府県"),
  };
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map((row) => {
        const raw = row?.raw ?? {};
        const entry: Record<string, string> = {};
        Object.entries(raw).forEach(([key, value]) => {
          entry[str(key)] = str(value);
        });
        return entry;
      })
    : [];

  return {
    columns,
    extraColumns,
    rows,
    canonical,
  };
};

const normalizeStoresPayload = (payload: unknown): StoresTable | undefined => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const data = payload as Partial<StoresTable>;
  if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) {
    return undefined;
  }
  const columns = data.columns.map((column) => str(column));
  const rows = data.rows.map((row) => {
    const entry: Record<string, string> = {};
    if (row && typeof row === "object") {
      Object.entries(row).forEach(([key, value]) => {
        entry[str(key)] = str(value);
      });
    }
    return entry;
  });
  const canonical = data.canonical ?? {
    storeIdKey: "店舗ID",
    storeNameKey: "店舗名",
    postalCodeKey: "郵便番号",
    addressKey: "住所",
    prefectureKey: "都道府県",
  };
  return {
    columns,
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

const buildAssetsFromZip = async (zip: JSZip, assets: AssetMeta[]) => {
  const result: Record<string, AssetRecord> = {};
  const missing: string[] = [];
  for (const asset of assets) {
    const normalizedPath = normalizePath(asset.path);
    const entry = zip.file(normalizedPath);
    if (!entry) {
      missing.push(asset.id);
      continue;
    }
    const blob = await entry.async("blob");
    const dataUrl = await blobToDataUrl(blob);
    result[asset.id] = {
      id: asset.id,
      filename: asset.filename,
      data: dataUrl,
    };
  }
  return { assets: result, missing };
};

export const findProjectJsonEntry = (zip: JSZip): JSZip.JSZipObject | null => {
  const candidates = [
    "project.json",
    "project.lp-project.json",
    "project/project.lp-project.json",
  ];
  for (const name of candidates) {
    const entry = zip.file(name);
    if (entry) {
      return entry;
    }
  }
  const fallback = Object.keys(zip.files).find((name) =>
    name.endsWith(".lp-project.json")
  );
  return fallback ? zip.file(fallback) ?? null : null;
};

export const importZipFile = async (file: File): Promise<ProjectState> => {
  const zip = await JSZip.loadAsync(file);
  const projectEntry = findProjectJsonEntry(zip);
  if (!projectEntry) {
    if (zip.file("index.html")) {
      throw new Error("このZIPはキャンペーンLPスタジオの書き出し形式ではありません");
    }
    throw new Error("ZIP内にプロジェクトJSONが見つかりません。");
  }

  const projectText = await projectEntry.async("text");
  const projectRaw = JSON.parse(projectText);
  let project: ProjectState;

  if (projectRaw && Array.isArray(projectRaw.assets)) {
    const projectFile = projectRaw as ProjectFile;
    const meta = projectFile.meta ?? {
      projectName: "キャンペーンLP",
      templateType: "coupon",
      version: projectFile.appVersion ?? "1.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const assetMeta = Array.isArray(projectFile.assets) ? projectFile.assets : [];
    const { assets, missing } = await buildAssetsFromZip(zip, assetMeta);
    if (missing.length > 0) {
      console.warn("Missing assets in zip", missing);
    }
    project = validateAndNormalizeProject({
      meta,
      settings: projectFile.settings ?? {},
      sections: projectFile.sections ?? [],
      assets,
      schemaVersion: projectFile.schemaVersion,
      appVersion: projectFile.appVersion,
      globalSettings: projectFile.globalSettings,
      assetMeta,
      storeListSpec: projectFile.storeListSpec,
      themeSpec: projectFile.themeSpec,
      animationRegistry: projectFile.animationRegistry,
      pageBaseStyle: projectFile.pageBaseStyle,
    } as ProjectState);

    const storesNormalizedEntry = zip.file("assets/data/stores.normalized.json");
    if (storesNormalizedEntry) {
      const storesText = await storesNormalizedEntry.async("text");
      const storesRaw = JSON.parse(storesText);
      const normalizedStores = normalizeStoresPayload(storesRaw);
      if (normalizedStores) {
        project = {
          ...project,
          stores: normalizedStores,
        };
      }
    }
  } else {
    project = validateAndNormalizeProject(projectRaw);
  }

  if (!project.stores) {
    const storesEntry = zip.file("stores/stores.json");
    if (storesEntry) {
      const storesText = await storesEntry.async("text");
      const storesJson = JSON.parse(storesText) as StoresJsonPayload;
      project = {
        ...project,
        stores: buildStoresFromJson(storesJson),
      };
    }
  }

  return ensureRequiredSections(project);
};

export const pickAndImportZip = async (): Promise<ProjectState> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,application/zip";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        const error = new Error("ファイルが選択されていません。");
        error.name = "AbortError";
        reject(error);
        return;
      }
      try {
        const project = await importZipFile(file);
        resolve(project);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
};
