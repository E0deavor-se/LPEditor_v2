import JSZip from "jszip";
import { buildBackgroundStyle } from "@/src/lib/backgroundSpec";
import { resolveBackgroundPreset } from "@/src/lib/backgroundPresets";
import { FOOTER_DEFAULT_ASSET_PATHS } from "@/src/lib/footerTemplate";
import type {
  AssetMeta,
  AssetRecord,
  BackgroundSpec,
  ImageContentItem,
  ProjectFile,
  ProjectState,
  StoresTable,
} from "@/src/types/project";

type ExportUiState = {
  previewMode?: "desktop" | "mobile";
  previewAspect?: "free" | "16:9" | "4:3" | "1:1";
};

type ExportWarning = {
  type: "asset" | "dist" | "other";
  message: string;
  assetId?: string;
  url?: string;
  detail?: string;
};

export type ExportReport = {
  projectJsonSize: number;
  assetCount: number;
  assetFailures: number;
  distGenerated: boolean;
  distHtmlSize: number;
  distCssSize: number;
  distJsSize: number;
  zipSize: number;
  warnings: ExportWarning[];
};

export type ExportResult = {
  blob: Blob;
  report: ExportReport;
};

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string) => (value ? value.replaceAll("-", "/") : "");

const TITLE_SUFFIX = " | au PAYキャンペーン";

const ensureTitleSuffix = (value: string, enabled: boolean) => {
  if (!enabled) {
    return value;
  }
  if (!value) {
    return TITLE_SUFFIX.trim();
  }
  return value.includes(TITLE_SUFFIX) ? value : `${value}${TITLE_SUFFIX}`;
};

const resolveCampaignPeriod = (project: ProjectState) => {
  const section = project.sections.find(
    (entry) => entry.type === "campaignPeriodBar"
  );
  const start = formatDate(str(section?.data?.startDate));
  const end = formatDate(str(section?.data?.endDate));
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || "";
};

const resolveHeroImageUrl = (project: ProjectState) => {
  const hero = project.sections.find((entry) => entry.type === "heroImage");
  if (!hero) {
    return "";
  }
  const assets = project.assets ?? {};
  const data = hero.data ?? {};
  const slidesPc = Array.isArray(data.heroSlidesPc)
    ? data.heroSlidesPc
    : [];
  const slidesSp = Array.isArray(data.heroSlidesSp)
    ? data.heroSlidesSp
    : [];
  const slide = slidesPc[0] ?? slidesSp[0];
  if (slide && typeof slide === "object") {
    const slideEntry = slide as { assetId?: string; src?: string };
    const slideAsset = slideEntry.assetId
      ? assets[slideEntry.assetId]?.data
      : "";
    return slideAsset || str(slideEntry.src || "");
  }
  const assetId =
    typeof data.imageAssetIdPc === "string"
      ? data.imageAssetIdPc
      : typeof data.imageAssetId === "string"
      ? data.imageAssetId
      : typeof data.imageAssetIdSp === "string"
      ? data.imageAssetIdSp
      : "";
  return (
    (assetId ? assets[assetId]?.data : "") ||
    str(data.imageUrl || "") ||
    str(data.imageUrlSp || "")
  );
};

const resolveMvBackgroundImageUrl = (project: ProjectState) => {
  const mv = project.settings?.backgrounds?.mv;
  if (!mv || mv.type !== "image") {
    return "";
  }
  const assets = project.assets ?? {};
  const assetId = mv.assetId || "";
  return (assetId ? assets[assetId]?.data : "") || "";
};

const resolvePageMeta = (project: ProjectState) => {
  const pageMeta = (project.settings?.pageMeta ?? {}) as {
    title?: string;
    description?: string;
    faviconUrl?: string;
    faviconAssetId?: string;
    ogpImageUrl?: string;
    ogpImageAssetId?: string;
    ogpTitle?: string;
    ogpDescription?: string;
    presets?: {
      appendAuPayTitle?: boolean;
      ogpFromMv?: boolean;
      injectCampaignPeriod?: boolean;
    };
  };
  const presets = pageMeta.presets ?? {};
  const baseTitle =
    str(pageMeta.title) || str(project.meta.projectName) || "キャンペーンLP";
  const title = ensureTitleSuffix(baseTitle, Boolean(presets.appendAuPayTitle));
  const baseDescription = str(pageMeta.description);
  const campaignPeriod = resolveCampaignPeriod(project);
  const applyPeriod = (value: string) => {
    if (!presets.injectCampaignPeriod || !campaignPeriod) {
      return value;
    }
    const label = `キャンペーン期間: ${campaignPeriod}`;
    if (!value) {
      return label;
    }
    return value.includes(label) ? value : `${value} ${label}`;
  };
  const description = applyPeriod(baseDescription);
  const ogpTitleBase = str(pageMeta.ogpTitle) || baseTitle;
  const ogpTitle = ensureTitleSuffix(
    ogpTitleBase,
    Boolean(presets.appendAuPayTitle)
  );
  const ogpDescription = applyPeriod(
    str(pageMeta.ogpDescription) || description
  );
  const assets = project.assets ?? {};
  const faviconUrl =
    str(pageMeta.faviconUrl) ||
    (pageMeta.faviconAssetId
      ? assets[pageMeta.faviconAssetId]?.data
      : "");
  const manualOgp =
    str(pageMeta.ogpImageUrl) ||
    (pageMeta.ogpImageAssetId
      ? assets[pageMeta.ogpImageAssetId]?.data
      : "");
  const mvImage = resolveHeroImageUrl(project) || resolveMvBackgroundImageUrl(project);
  const ogpImageUrl = presets.ogpFromMv && mvImage ? mvImage : manualOgp;
  return {
    title,
    description,
    faviconUrl,
    ogpTitle,
    ogpDescription,
    ogpImageUrl,
  };
};

const buildMetaHeadTags = (project: ProjectState) => {
  const meta = resolvePageMeta(project);
  const tags = [
    meta.description
      ? `<meta name="description" content="${escapeHtml(meta.description)}" />`
      : "",
    meta.faviconUrl
      ? `<link rel="icon" href="${escapeHtml(meta.faviconUrl)}" />`
      : "",
    meta.ogpTitle
      ? `<meta property="og:title" content="${escapeHtml(meta.ogpTitle)}" />`
      : "",
    meta.ogpDescription
      ? `<meta property="og:description" content="${escapeHtml(
          meta.ogpDescription
        )}" />`
      : "",
    meta.ogpImageUrl
      ? `<meta property="og:image" content="${escapeHtml(meta.ogpImageUrl)}" />`
      : "",
  ];
  if (meta.ogpTitle || meta.ogpDescription || meta.ogpImageUrl) {
    tags.unshift('<meta property="og:type" content="website" />');
  }
  return tags.filter(Boolean).join("\n    ");
};

const sanitizeFilename = (value: string) =>
  value
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const normalizePath = (value: string) => value.replace(/\\/g, "/");

const BACKGROUND_LAYER_CSS = `
.bg-root { position: relative; overflow: hidden; }
.bg-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.bg-video { width: 100%; height: 100%; object-fit: cover; object-position: center; }
.bg-content { position: relative; z-index: 1; }
`;

const PATH_KEYS = new Set([
  "path",
  "filepath",
  "src",
  "imagepath",
  "fontpath",
  "relativepath",
  "url",
]);

const shouldNormalizeKey = (key: string) => {
  const normalized = key.toLowerCase();
  return (
    PATH_KEYS.has(normalized) ||
    normalized.endsWith("path") ||
    normalized.endsWith("src") ||
    normalized.endsWith("url")
  );
};

const normalizePathsDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizePathsDeep(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const result: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, entry]) => {
    const normalizedEntry = normalizePathsDeep(entry);
    if (
      typeof normalizedEntry === "string" &&
      normalizedEntry.includes("\\") &&
      shouldNormalizeKey(key)
    ) {
      result[key] = normalizePath(normalizedEntry);
      return;
    }
    result[key] = normalizedEntry;
  });
  return result;
};

const dropUndefinedDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => dropUndefinedDeep(entry))
      .filter((entry) => entry !== undefined);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const result: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, entry]) => {
    const normalized = dropUndefinedDeep(entry);
    if (normalized === undefined) {
      return;
    }
    result[key] = normalized;
  });
  return result;
};

const stripDataUrlsDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripDataUrlsDeep(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const result: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry === "string" && entry.startsWith("data:")) {
      result[key] = "";
      return;
    }
    result[key] = stripDataUrlsDeep(entry);
  });
  return result;
};

const sanitizeProjectForExport = (project: ProjectState): ProjectState => {
  const cloned = JSON.parse(JSON.stringify(project)) as ProjectState;
  const withoutDataUrls = stripDataUrlsDeep(cloned) as ProjectState;
  const normalizedPaths = normalizePathsDeep(withoutDataUrls) as ProjectState;
  return dropUndefinedDeep(normalizedPaths) as ProjectState;
};

const collectFooterDefaultAssets = async (
  zip: JSZip,
  warnings: ExportWarning[]
) => {
  const urlMap = new Map<string, string>();
  const uniqueUrls = Array.from(
    new Set(Object.values(FOOTER_DEFAULT_ASSET_PATHS))
  );
  for (const url of uniqueUrls) {
    if (!url) {
      continue;
    }
    const filename = url.split("/").pop() || "asset.png";
    const targetPath = "assets/footer-defaults/" + sanitizeFilename(filename);
    const distPath = toDistAssetPath(targetPath);
    try {
      const asset = await fetchAssetBytes(url);
      zip.file(targetPath, asset.bytes);
      zip.file(distPath, asset.bytes);
      urlMap.set(url, "./" + targetPath);
    } catch (error) {
      warnings.push({
        type: "asset",
        url,
        message: "default footer asset fetch failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return urlMap;
};

const replaceDefaultFooterUrls = (
  html: string,
  urlMap: Map<string, string>
) => {
  let result = html;
  urlMap.forEach((path, url) => {
    result = result.split(url).join(path);
  });
  return result;
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    return null;
  }
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = match[2] === ";base64";
  const data = match[3] || "";
  const bytes = isBase64
    ? Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(data));
  return { mimeType, bytes };
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out (${timeoutMs}ms)`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
};

const fetchAssetBytes = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const error = new Error(`asset fetch failed (${response.status})`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  const mimeType = response.headers.get("content-type") ||
    "application/octet-stream";
  const buffer = await response.arrayBuffer();
  return { mimeType, bytes: new Uint8Array(buffer) };
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const hashBytes = async (bytes: Uint8Array) => {
  const buffer = new Uint8Array(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(digest);
};

const resolveAssetKind = (mimeType: string) => {
  if (mimeType.startsWith("image/")) {
    return "image" as const;
  }
  if (mimeType.startsWith("video/")) {
    return "video" as const;
  }
  if (mimeType.startsWith("font/") || mimeType.includes("font")) {
    return "font" as const;
  }
  return "data" as const;
};

const resolveAssetExtension = (filename: string, mimeType: string) => {
  const match = filename.match(/\.([a-z0-9]+)$/i);
  if (match) {
    return match[1].toLowerCase();
  }
  const parts = mimeType.split("/");
  return parts.length > 1 ? parts[1].toLowerCase() : "bin";
};

const getAssetFolder = (kind: AssetMeta["kind"]) => {
  switch (kind) {
    case "image":
      return "assets/images";
    case "video":
      return "assets/videos";
    case "font":
      return "assets/fonts";
    case "data":
    default:
      return "assets/data";
  }
};

const toDistAssetPath = (assetPath: string) => {
  const normalized = normalizePath(assetPath);
  if (normalized.startsWith("assets/")) {
    return `dist/${normalized}`;
  }
  return `dist/${normalized}`;
};

const buildAssetMetaList = async (
  project: ProjectState,
  zip: JSZip,
  warnings: ExportWarning[]
): Promise<AssetMeta[]> => {
  const assets = project.assets ?? {};
  const metas: AssetMeta[] = [];
  const entries = Object.entries(assets);
  for (const [assetId, asset] of entries) {
    const record = asset as AssetRecord;
    if (!record.data) {
      warnings.push({
        type: "asset",
        assetId,
        message: "asset data is empty",
      });
      continue;
    }
    try {
      let parsed = null as { mimeType: string; bytes: Uint8Array } | null;
      if (record.data.startsWith("data:")) {
        parsed = parseDataUrl(record.data);
      } else if (
        record.data.startsWith("http") ||
        record.data.startsWith("/") ||
        record.data.startsWith("blob:")
      ) {
        parsed = await fetchAssetBytes(record.data);
      }

      if (!parsed) {
        warnings.push({
          type: "asset",
          assetId,
          message: "asset data is not a valid data url",
          detail: record.data.slice(0, 100),
        });
        continue;
      }

      const hash = await hashBytes(parsed.bytes);
      const mimeType = parsed.mimeType;
      const kind = resolveAssetKind(mimeType);
      const extension = resolveAssetExtension(record.filename, mimeType);
      const folder = getAssetFolder(kind);
      const filename = `${hash}.${extension}`;
      const path = normalizePath(`${folder}/${filename}`);
      zip.file(path, parsed.bytes);
      zip.file(toDistAssetPath(path), parsed.bytes);
      metas.push({
        id: assetId,
        filename: record.filename,
        path,
        kind,
        mimeType,
        size: parsed.bytes.length,
        hash,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      warnings.push({
        type: "asset",
        assetId,
        message: "asset processing failed",
        detail,
      });
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      console.warn("[export] asset fetch failed", {
        assetId,
        url: record.data,
        status,
      });
      console.warn("[export] asset processing failed", {
        assetId,
        filename: record.filename,
        error,
      });
    }
  }
  return metas;
};

const buildProjectFile = (
  project: ProjectState,
  assets: AssetMeta[]
): ProjectFile => {
  const sanitized = sanitizeProjectForExport(project);
  return {
    schemaVersion: sanitized.schemaVersion ?? "1.0.0",
    appVersion: sanitized.appVersion ?? sanitized.meta.version ?? "0.1.0",
    globalSettings: sanitized.globalSettings ?? {},
    meta: sanitized.meta,
    settings: sanitized.settings,
    pageBaseStyle: sanitized.pageBaseStyle,
    sections: sanitized.sections,
    assets,
    storeListSpec: sanitized.storeListSpec,
    themeSpec: sanitized.themeSpec,
    animationRegistry: sanitized.animationRegistry,
  };
};

const buildManifest = async (projectFile: ProjectFile) => {
  const projectJson = JSON.stringify(projectFile, null, 2);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(projectJson)
  );
  return {
    schemaVersion: projectFile.schemaVersion,
    appVersion: projectFile.appVersion,
    exportedAt: new Date().toISOString(),
    assetCount: projectFile.assets.length,
    sectionCount: projectFile.sections.length,
    hash: toHex(digest),
  };
};

const escapeCsvCell = (value: string) => {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildStoresCsv = (project: ProjectState) => {
  const storesSection = project.sections.find(
    (section) => section.type === "targetStores"
  );
  const storeCsv = storesSection?.content?.storeCsv;
  if (!storeCsv || !Array.isArray(storeCsv.headers)) {
    return "";
  }
  const headers = storeCsv.headers.map((header) => escapeCsvCell(str(header)));
  const rows = Array.isArray(storeCsv.rows) ? storeCsv.rows : [];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const values = storeCsv.headers.map((header) =>
      escapeCsvCell(str((row as Record<string, string>)[header]))
    );
    lines.push(values.join(","));
  });
  return lines.join("\n");
};

const buildStoresNormalizedJson = (project: ProjectState) => {
  if (project.stores) {
    return JSON.stringify(project.stores, null, 2);
  }
  const storesSection = project.sections.find(
    (section) => section.type === "targetStores"
  );
  const storeCsv = storesSection?.content?.storeCsv;
  if (!storeCsv || !Array.isArray(storeCsv.headers)) {
    return "";
  }
  const rows = Array.isArray(storeCsv.rows) ? storeCsv.rows : [];
  return JSON.stringify(
    {
      columns: storeCsv.headers,
      rows,
      canonical: {
        storeIdKey: "店舗ID",
        storeNameKey: "店舗名",
        postalCodeKey: "郵便番号",
        addressKey: "住所",
        prefectureKey: "都道府県",
      },
    },
    null,
    2
  );
};

const buildAssetReplacementMaps = (
  project: ProjectState,
  assets: AssetMeta[]
) => {
  const urlMap = new Map<string, string>();
  const filenameMap = new Map<string, string>();
  const assetMetaById = new Map(assets.map((entry) => [entry.id, entry]));
  Object.entries(project.assets ?? {}).forEach(([id, record]) => {
    const meta = assetMetaById.get(id);
    if (!meta || !record?.data) {
      return;
    }
    const distPath = `./${meta.path}`;
    urlMap.set(record.data, distPath);
    if (record.filename) {
      filenameMap.set(record.filename.toLowerCase(), distPath);
    }
  });
  return { urlMap, filenameMap };
};

const buildDistPlaceholderHtml = (
  project: ProjectState,
  reason: string
) => {
  const title = escapeHtml(str(project.meta.projectName || "キャンペーンLP"));
  const message = escapeHtml(
    reason || "dist生成に失敗しました。エディタで再書き出ししてください。"
  );
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; margin: 0; padding: 32px; background: #f8fafc; color: #0f172a; }
      .card { max-width: 720px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { font-size: 14px; color: #475569; line-height: 1.6; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
      .reason { margin-top: 12px; padding: 12px; border-radius: 12px; background: #fef2f2; color: #991b1b; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>このZIPは編集再開用です</h1>
      <p>dist生成に失敗したため、プレビューHTMLは含まれていません。</p>
      <p>エディタでZIPを読み込み、もう一度 <code>ZIPを書き出し</code> を実行してください。</p>
      <div class="reason">${message}</div>
    </div>
  </body>
</html>`;
};

const buildDistFailureReadme = (reason: string) => {
  const message = reason || "dist生成に失敗しました。";
  return [
    "dist生成に失敗したため、index.html はプレースホルダです。",
    "エディタでZIPを読み込み、再度 ZIPを書き出してください。",
    "",
    `理由: ${message}`,
  ].join("\n");
};

const replaceAssetDataUrls = (text: string, map: Map<string, string>) => {
  let result = text;
  map.forEach((path, dataUrl) => {
    result = result.split(dataUrl).join(path);
  });
  return result;
};

const collectUrlsFromHtmlCss = (html: string, cssText: string) => {
  const urls = new Set<string>();
  const htmlRegex = /(src|href|poster)=("|')([^"']+)("|')/g;
  let match = htmlRegex.exec(html);
  while (match) {
    if (match[3]) {
      urls.add(match[3]);
    }
    match = htmlRegex.exec(html);
  }
  const cssRegex = /url\(([^)]+)\)/g;
  let cssMatch = cssRegex.exec(cssText);
  while (cssMatch) {
    const raw = String(cssMatch[1] ?? "").trim().replace(/^['"]|['"]$/g, "");
    if (raw) {
      urls.add(raw);
    }
    cssMatch = cssRegex.exec(cssText);
  }
  return Array.from(urls);
};

const shouldCollectExternalUrl = (url: string) => {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
    return false;
  }
  if (url.startsWith("./assets/") || url.startsWith("assets/")) {
    return false;
  }
  if (url.startsWith("/_next/")) {
    return false;
  }
  return url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://");
};

const resolveFetchUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${window.location.origin}${url}`;
  }
  return url;
};

const collectExternalAssets = async (
  zip: JSZip,
  urls: string[],
  warnings: ExportWarning[]
) => {
  const urlMap = new Map<string, string>();
  const hashMap = new Map<string, string>();
  for (const url of urls) {
    if (!shouldCollectExternalUrl(url)) {
      continue;
    }
    try {
      const fetchUrl = resolveFetchUrl(url);
      const asset = await fetchAssetBytes(fetchUrl);
      const hash = await hashBytes(asset.bytes);
      const filename = url.split("/").pop()?.split("?")[0] || "asset";
      const extension = resolveAssetExtension(filename, asset.mimeType);
      const kind = resolveAssetKind(asset.mimeType);
      const folder = getAssetFolder(kind);
      const path = hashMap.get(hash) ??
        normalizePath(`${folder}/${hash}.${extension}`);
      if (!hashMap.has(hash)) {
        zip.file(path, asset.bytes);
        zip.file(toDistAssetPath(path), asset.bytes);
        hashMap.set(hash, path);
      }
      urlMap.set(url, `./${path}`);
    } catch (error) {
      warnings.push({
        type: "asset",
        url,
        message: "external asset fetch failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return urlMap;
};

const replaceExternalUrls = (text: string, map: Map<string, string>) => {
  let result = text;
  map.forEach((path, url) => {
    result = result.split(url).join(path);
  });
  return result;
};

const rewriteAssetUrlsInHtml = (
  html: string,
  urlMap: Map<string, string>,
  filenameMap: Map<string, string>
) => {
  return html.replace(
    /(src|href|poster)=("|')([^"']+)("|')/g,
    (match, attr, quote, url, tail) => {
      if (url.startsWith("data:")) {
        return match;
      }
      const direct = urlMap.get(url);
      if (direct) {
        return `${attr}=${quote}${direct}${tail}`;
      }
      const normalized = url.replace(/\\/g, "/");
      const filename = normalized.split("/").pop() || "";
      const mapped = filenameMap.get(filename.toLowerCase());
      if (mapped) {
        return `${attr}=${quote}${mapped}${tail}`;
      }
      if (normalized.startsWith("/assets/")) {
        return `${attr}=${quote}.${normalized}${tail}`;
      }
      return match;
    }
  );
};

const rewriteAssetUrlsInCss = (
  cssText: string,
  urlMap: Map<string, string>,
  filenameMap: Map<string, string>
) => {
  return cssText.replace(/url\(([^)]+)\)/g, (match, rawUrl) => {
    const trimmed = String(rawUrl).trim().replace(/^['"]|['"]$/g, "");
    if (!trimmed || trimmed.startsWith("data:")) {
      return match;
    }
    const direct = urlMap.get(trimmed);
    if (direct) {
      return `url('${direct}')`;
    }
    const normalized = trimmed.replace(/\\/g, "/");
    const filename = normalized.split("/").pop() || "";
    const mapped = filenameMap.get(filename.toLowerCase());
    if (mapped) {
      return `url('${mapped}')`;
    }
    if (normalized.startsWith("/assets/")) {
      return `url('.${normalized}')`;
    }
    return match;
  });
};

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const styleObjectToString = (style: Record<string, string>) =>
  Object.entries(style)
    .filter(([, value]) => typeof value === "string" && value.trim() !== "")
    .map(([key, value]) => `${toKebabCase(key)}: ${value};`)
    .join(" ");

const resolveBackgroundAssetUrl = (
  assetMetaById: Map<string, AssetMeta>,
  assetId: string
) => {
  const meta = assetMetaById.get(assetId);
  if (meta) {
    return `./${meta.path}`;
  }
  return assetId;
};

const getVideoObjectFit = (spec: unknown) => {
  if (!spec || typeof spec !== "object") {
    return "cover";
  }
  const fit = (spec as { fit?: string }).fit;
  return typeof fit === "string" && fit.trim() ? fit : "cover";
};

const getVideoObjectPosition = (spec: unknown) => {
  if (!spec || typeof spec !== "object") {
    return "center";
  }
  const position = (spec as { position?: string }).position;
  return typeof position === "string" && position.trim() ? position : "center";
};

const applyBackgroundLayerToElement = (
  doc: Document,
  element: Element,
  spec: BackgroundSpec | undefined,
  assetMetaById: Map<string, AssetMeta>,
  options?: { clearInlineStyle?: boolean }
) => {
  if (!spec) {
    return;
  }
  const background = buildBackgroundStyle(spec as any, {
    resolveAssetUrl: (assetId) => resolveBackgroundAssetUrl(assetMetaById, assetId),
    resolvePreset: resolveBackgroundPreset,
    fallbackColor: "transparent",
  });

  if (options?.clearInlineStyle) {
    element.removeAttribute("style");
  }

  element.classList.add("bg-root");

  const layer = doc.createElement("div");
  layer.className = "bg-layer";
  const layerStyle = styleObjectToString(background.style);
  if (layerStyle) {
    layer.setAttribute("style", layerStyle);
  }

  if (background.video?.assetId) {
    const resolvedVideoUrl = resolveBackgroundAssetUrl(
      assetMetaById,
      background.video.assetId
    );
    const video = doc.createElement("video");
    video.className = "bg-video";
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");
    const fit = getVideoObjectFit(spec);
    const position = getVideoObjectPosition(spec);
    if (fit !== "cover" || position !== "center") {
      video.setAttribute(
        "style",
        `object-fit: ${fit}; object-position: ${position};`
      );
    }
    const source = doc.createElement("source");
    source.setAttribute("src", resolvedVideoUrl);
    const meta = assetMetaById.get(background.video.assetId);
    if (meta?.mimeType) {
      source.setAttribute("type", meta.mimeType);
    }
    video.appendChild(source);
    layer.appendChild(video);
  }

  const content = doc.createElement("div");
  content.className = "bg-content";
  const existingContent = element.querySelector(":scope > .bg-content");
  const contentNodes = existingContent
    ? Array.from(existingContent.childNodes)
    : Array.from(element.childNodes);
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  contentNodes.forEach((child) => content.appendChild(child));
  element.appendChild(layer);
  element.appendChild(content);
};

const applyBackgroundLayersToHtml = (
  html: string,
  project: ProjectState,
  assetMeta: AssetMeta[]
) => {
  const assetMetaById = new Map(assetMeta.map((entry) => [entry.id, entry]));
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const root = doc.querySelector("#__lp_root__");
  if (root) {
    applyBackgroundLayerToElement(
      doc,
      root,
      project.settings?.backgrounds?.page,
      assetMetaById,
      { clearInlineStyle: true }
    );
  }

  const hero = doc.querySelector(".lp-hero");
  if (hero) {
    applyBackgroundLayerToElement(
      doc,
      hero,
      project.settings?.backgrounds?.mv,
      assetMetaById
    );
  }

  return `<!doctype html>${doc.documentElement.outerHTML}`;
};

const fetchExportHtmlFromApi = async (
  project: ProjectState,
  ui: ExportUiState | undefined
) => {
  const response = await withTimeout(
    fetch("/api/export-html", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project, ui }),
    }),
    10000,
    "export html api"
  );
        if (!response.ok) {
          let detail = "";
          try {
            const data = (await response.json()) as {
              error?: string;
              debug?: unknown;
            };
            detail = JSON.stringify(data);
            console.error("[export] export-html error", data);
          } catch {
            detail = await response.text();
          }
          throw new Error(`export html api failed (${response.status}): ${detail}`);
        }
        const data = (await response.json()) as { html?: string; debug?: unknown };
        if (!data.html || data.html.trim().length < 50) {
          console.error("[export] export-html empty html", data);
          throw new Error(
            `export html api returned empty html: ${JSON.stringify(data.debug ?? {})}`
          );
        }
        return data.html;
};

const resolveExportCss = async (
  warnings: ExportWarning[],
  rootDoc?: Document
) => {
  const chunks: string[] = [];
  const doc =
    rootDoc ?? (typeof document !== "undefined" ? document : undefined);
  if (!doc) {
    warnings.push({
      type: "other",
      message: "export css is empty, fallback css used",
    });
    return buildStylesCss();
  }
  const inlineStyles = Array.from(doc.querySelectorAll("style"));
  inlineStyles.forEach((node) => {
    const text = node.textContent?.trim();
    if (text) {
      chunks.push(text);
    }
  });

  const linkNodes = Array.from(
    doc.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]")
  );
  for (const link of linkNodes) {
    const href = link.href?.trim();
    if (!href || href.startsWith("data:")) {
      continue;
    }
    try {
      const response = await withTimeout(fetch(href), 8000, "export css fetch");
      if (!response.ok) {
        warnings.push({
          type: "other",
          message: "export css fetch failed",
          detail: `${response.status} ${href}`,
        });
        continue;
      }
      const text = await response.text();
      if (text.trim()) {
        chunks.push(text);
      }
    } catch (error) {
      warnings.push({
        type: "other",
        message: "export css fetch failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (chunks.length === 0) {
    warnings.push({
      type: "other",
      message: "export css is empty, fallback css used",
    });
    return buildStylesCss();
  }

  return chunks.join("\n\n");
};

const injectInlineCss = (html: string, cssText: string) => {
  const styleTag = `<style id="__export_css__">${cssText}</style>`;
  if (html.includes("__export_css__")) {
    return html.replace(
      /<style id="__export_css__">[\s\S]*?<\/style>/,
      styleTag
    );
  }
  return html.replace("</head>", `${styleTag}</head>`);
};

const buildExportHtmlDocument = (
  project: ProjectState,
  bodyHtml: string,
  cssText: string
) => {
  const title = escapeHtml(resolvePageMeta(project).title);
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${buildMetaHeadTags(project)}
    <style id="__export_css__">${cssText}</style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;
};

const getPreviewFrameDocument = (): Document | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const iframes = Array.from(document.querySelectorAll("iframe"));
  const previewFrame = iframes.find((frame) => {
    const src = frame.getAttribute("src") || "";
    return src.includes("/preview");
  });
  return previewFrame?.contentDocument ?? null;
};

const buildExportHtmlFromPreviewDom = (
  project: ProjectState,
  cssText: string,
  previewDoc: Document | null
): string | null => {
  const root = previewDoc?.querySelector("#__lp_root__");
  if (!root) {
    return null;
  }
  return buildExportHtmlDocument(project, root.outerHTML, cssText);
};

const buildStoresEmbed = (project: ProjectState) => {
  const storesSection = project.sections.find(
    (section) => section.type === "targetStores"
  );
  const storeCsv = storesSection?.content?.storeCsv;
  const stores = storeCsv && Array.isArray(storeCsv.headers)
    ? { headers: storeCsv.headers, rows: storeCsv.rows ?? [] }
    : project.stores && project.stores.columns
    ? { headers: project.stores.columns, rows: project.stores.rows ?? [] }
    : null;
  if (!stores) {
    return null;
  }
  const sections = project.sections
    .filter((section) => section.type === "targetStores")
    .map((section) => ({
      id: section.id,
      storeLabels: section.content?.storeLabels ?? {},
      storeFilters: section.content?.storeFilters ?? {},
      storeFilterOperator: section.content?.storeFilterOperator ?? "AND",
    }));
  return { stores, sections };
};

const buildStoresAppJs = () => {
  const lines = [
    "(() => {",
    "  const dataNode = document.getElementById('stores-data');",
    "  if (!dataNode) { return; }",
    "  let payload = null;",
    "  try { payload = JSON.parse(dataNode.textContent || '{}'); } catch { return; }",
    "  const stores = payload && payload.stores ? payload.stores : null;",
    "  const sections = payload && Array.isArray(payload.sections) ? payload.sections : [];",
    "  if (!stores) { return; }",
    "  const str = (value) => typeof value === 'string' ? value : value == null ? '' : String(value);",
    "  const normalizeTruthValue = (value) => value.normalize('NFKC').trim().toLowerCase();",
    "  const TRUTHY = new Set(['対象','〇','○','はい','yes','y','true','1','on']);",
    "  const isTruthy = (value) => { const normalized = normalizeTruthValue(value); return normalized ? TRUTHY.has(normalized) : false; };",
    "  const normalizeKey = (value) => value.normalize('NFKC').trim().toLowerCase();",
    "  const hashKey = (value) => { const normalized = normalizeKey(value); let hash = 0; for (let i = 0; i < normalized.length; i += 1) { hash = (hash * 31 + normalized.charCodeAt(i)) % 2147483647; } return Math.abs(hash); };",
    "  const DEFAULT_LABEL_COLORS = ['#DBEAFE','#FEE2E2','#DCFCE7','#FEF3C7','#E0F2FE','#F3E8FF'];",
    "  const RANDOM_LABEL_PALETTE = ['#F2B183','#F0C27B','#E9A8A0','#D9A0E8','#9FB7E9','#89C6E5','#7DCBB0','#A5D66F','#E6D26A','#F0A3B0','#CFA6EA','#9BCED9'];",
    "  const getStableLabelColor = (key) => { if (!key) { return DEFAULT_LABEL_COLORS[0]; } const hash = hashKey(key); return DEFAULT_LABEL_COLORS[hash % DEFAULT_LABEL_COLORS.length]; };",
    "  const getUniqueLabelColorMap = (keys) => { const paletteSize = RANDOM_LABEL_PALETTE.length; const used = new Set(); const result = {}; keys.forEach((key) => { let index = hashKey(key || 'default') % paletteSize; let attempts = 0; while (used.has(index) && attempts < paletteSize) { index = (index + 1) % paletteSize; attempts += 1; } const color = used.has(index) ? getStableLabelColor(key) : RANDOM_LABEL_PALETTE[index]; result[key] = color; used.add(index); }); return result; };",
    "  const hexToRgb = (value) => { const hex = value.replace('#','').trim(); if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) { return null; } const normalized = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex; const intVal = Number.parseInt(normalized, 16); return { r: (intVal >> 16) & 255, g: (intVal >> 8) & 255, b: intVal & 255 }; };",
    "  const mixRgb = (rgb, mix) => { const clamp = (value) => Math.min(255, Math.max(0, value)); const r = clamp(Math.round(rgb.r * (1 - mix) + 255 * mix)); const g = clamp(Math.round(rgb.g * (1 - mix) + 255 * mix)); const b = clamp(Math.round(rgb.b * (1 - mix) + 255 * mix)); return 'rgb(' + r + ', ' + g + ', ' + b + ')'; };",
    "  const darkenRgb = (rgb, amount) => { const clamp = (value) => Math.min(255, Math.max(0, value)); const r = clamp(Math.round(rgb.r * (1 - amount))); const g = clamp(Math.round(rgb.g * (1 - amount))); const b = clamp(Math.round(rgb.b * (1 - amount))); return 'rgb(' + r + ', ' + g + ', ' + b + ')'; };",
    "  const buildLabelStyle = (color, selected) => { const rgb = hexToRgb(color); if (!rgb) { return { backgroundColor: color, borderColor: color, color: '#000000' }; } return selected ? { backgroundColor: darkenRgb(rgb, 0.05), borderColor: darkenRgb(rgb, 0.2), color: '#000000' } : { backgroundColor: mixRgb(rgb, 0.70), borderColor: darkenRgb(rgb, 0.1), color: '#000000' }; };",
    "  const resolveStoreLabels = (labels, extraColumns, colorMap) => { const result = {}; extraColumns.forEach((column) => { const existing = labels && labels[column] ? labels[column] : null; const fallbackColor = colorMap[column] || getStableLabelColor(column); result[column] = { columnKey: column, displayName: existing && typeof existing.displayName === 'string' && existing.displayName.trim() ? existing.displayName : column, color: existing && typeof existing.color === 'string' && existing.color.trim() ? existing.color : fallbackColor, trueText: existing && typeof existing.trueText === 'string' && existing.trueText.trim() ? existing.trueText : 'ON', falseText: existing && typeof existing.falseText === 'string' && existing.falseText.trim() ? existing.falseText : 'OFF', valueDisplay: existing && existing.valueDisplay === 'raw' ? 'raw' : 'toggle', showAsFilter: existing && typeof existing.showAsFilter === 'boolean' ? existing.showAsFilter : true, showAsBadge: existing && typeof existing.showAsBadge === 'boolean' ? existing.showAsBadge : true }; }); return result; };",
    "  const updateButtonStyle = (button, color, selected) => { const style = buildLabelStyle(color, selected); button.style.backgroundColor = style.backgroundColor; button.style.borderColor = style.borderColor; button.style.color = style.color; button.dataset.storeSelected = selected ? 'true' : 'false'; };",
    "  const buildCardHtml = (row, requiredKeys, badgeLabels, labelColorMap) => {",
    "    const storeName = str(row[requiredKeys.storeNameKey]);",
    "    const postal = str(row[requiredKeys.postalCodeKey]);",
    "    const address = str(row[requiredKeys.addressKey]);",
    "    const labelBadges = [];",
    "    badgeLabels.forEach((label) => {",
    "      const value = str(row[label.columnKey]).trim();",
    "      if (!isTruthy(value)) { return; }",
    "      labelBadges.push({ text: label.displayName || label.columnKey, color: label.color || labelColorMap[label.columnKey] || getStableLabelColor(label.columnKey) });",
    "    });",
    "    const visibleBadges = labelBadges.slice(0, 3);",
    "    const extraBadgeCount = labelBadges.length - visibleBadges.length;",
    "    const badgesHtml = visibleBadges.map((badge) => '<span class=\"inline-flex min-h-[24px] max-w-[160px] items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold leading-none\" style=\"background-color:' + badge.color + ';border-color:' + badge.color + ';color:#000\"><span class=\"truncate\">' + badge.text + '</span></span>').join('');",
    "    const extraBadgeHtml = extraBadgeCount > 0 ? '<span class=\"inline-flex min-h-[24px] items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[12px] font-semibold leading-none text-orange-500\">+' + extraBadgeCount + '</span>' : '';",
    "    return '<div class=\"rounded-2xl border border-orange-200 bg-white p-5 shadow-sm transition hover:shadow-md\"><div class=\"mb-3 flex flex-wrap gap-2\">' + badgesHtml + extraBadgeHtml + '</div><div class=\"mb-1 text-lg font-bold text-blue-600 hover:underline\">' + storeName + '</div><div class=\"text-sm text-gray-500\">' + postal + ' ' + address + '</div></div>';",
    "  };",
    "  const sectionElements = Array.from(document.querySelectorAll('[data-target-stores=\"true\"]'));",
    "  sectionElements.forEach((sectionEl) => {",
    "    const sectionId = sectionEl.getAttribute('data-section-id') || '';",
    "    const sectionConfig = sections.find((entry) => entry.id === sectionId) || { storeLabels: {}, storeFilters: {}, storeFilterOperator: 'AND' };",
    "    const headers = Array.isArray(stores.headers) ? stores.headers : [];",
    "    const rows = Array.isArray(stores.rows) ? stores.rows : [];",
    "    const extraColumns = headers.length >= 5 ? headers.slice(5) : [];",
    "    const labelColorMap = getUniqueLabelColorMap(extraColumns);",
    "    const resolvedLabels = resolveStoreLabels(sectionConfig.storeLabels, extraColumns, labelColorMap);",
    "    const filterLabels = extraColumns.map((column) => resolvedLabels[column]).filter(Boolean).filter((label) => label.showAsFilter !== false);",
    "    const badgeLabels = extraColumns.map((column) => resolvedLabels[column]).filter(Boolean).filter((label) => label.showAsBadge !== false);",
    "    const requiredKeys = { storeIdKey: headers[0] || '店舗ID', storeNameKey: headers[1] || '店舗名', postalCodeKey: headers[2] || '郵便番号', addressKey: headers[3] || '住所', prefectureKey: headers[4] || '都道府県' };",
    "    let activeFilters = {};",
    "    extraColumns.forEach((column) => { activeFilters[column] = Boolean(sectionConfig.storeFilters && sectionConfig.storeFilters[column]); });",
    "    let keyword = '';",
    "    let selectedPrefecture = '';",
    "    let page = 1;",
    "    let isMobile = window.innerWidth < 640;",
    "    const keywordInput = sectionEl.querySelector('[data-store-keyword]');",
    "    const prefectureSelect = sectionEl.querySelector('[data-store-prefecture]');",
    "    const prevButton = sectionEl.querySelector('[data-store-prev]');",
    "    const nextButton = sectionEl.querySelector('[data-store-next]');",
    "    const countNode = sectionEl.querySelector('[data-store-count]');",
    "    const cardsNode = sectionEl.querySelector('[data-store-cards]');",
    "    const emptyNode = sectionEl.querySelector('[data-store-empty]');",
    "    const clearButton = sectionEl.querySelector('[data-store-clear]');",
    "    const filterButtons = Array.from(sectionEl.querySelectorAll('[data-store-filter-key]'));",
    "    const updateFilterButtons = () => {",
    "      filterButtons.forEach((button) => {",
    "        const key = button.getAttribute('data-store-filter-key');",
    "        if (!key) { return; }",
    "        const label = resolvedLabels[key];",
    "        const color = (label && label.color) ? label.color : button.getAttribute('data-store-filter-color') || labelColorMap[key] || getStableLabelColor(key);",
    "        updateButtonStyle(button, color, Boolean(activeFilters[key]));",
    "      });",
    "    };",
    "    const buildPrefectureOptions = () => {",
    "      if (!prefectureSelect) { return; }",
    "      const values = Array.from(new Set(rows.map((row) => str(row[requiredKeys.prefectureKey]).trim()).filter((value) => value.length > 0)));",
    "      values.sort((left, right) => left.localeCompare(right, 'ja'));",
    "      prefectureSelect.innerHTML = '<option value=\"\">すべて</option>' + values.map((pref) => '<option value=\"' + pref + '\">' + pref + '</option>').join('');",
    "    };",
    "    const filterRows = () => {",
    "      const normalizedKeyword = keyword.trim().toLowerCase();",
    "      const activeKeys = filterLabels.map((label) => label.columnKey).filter((key) => activeFilters[key]);",
    "      const operator = sectionConfig.storeFilterOperator === 'OR' ? 'OR' : 'AND';",
    "      return rows.filter((row) => {",
    "        if (normalizedKeyword) {",
    "          const name = str(row[requiredKeys.storeNameKey]).toLowerCase();",
    "          const address = str(row[requiredKeys.addressKey]).toLowerCase();",
    "          const postal = str(row[requiredKeys.postalCodeKey]).toLowerCase();",
    "          if (!name.includes(normalizedKeyword) && !address.includes(normalizedKeyword) && !postal.includes(normalizedKeyword)) { return false; }",
    "        }",
    "        if (selectedPrefecture) {",
    "          const prefecture = str(row[requiredKeys.prefectureKey]).trim();",
    "          if (prefecture !== selectedPrefecture) { return false; }",
    "        }",
    "        if (activeKeys.length > 0) {",
    "          if (operator === 'OR') {",
    "            const hasMatch = activeKeys.some((key) => isTruthy(str(row[key]).trim()));",
    "            if (!hasMatch) { return false; }",
    "          } else {",
    "            for (const key of activeKeys) {",
    "              if (!isTruthy(str(row[key]).trim())) { return false; }",
    "            }",
    "          }",
    "        }",
    "        return true;",
    "      });",
    "    };",
    "    const render = () => {",
    "      updateFilterButtons();",
    "      const filtered = filterRows();",
    "      const pageSize = isMobile ? 5 : 10;",
    "      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));",
    "      if (page > totalPages) { page = totalPages; }",
    "      const start = (page - 1) * pageSize;",
    "      const pageRows = filtered.slice(start, start + pageSize);",
    "      if (countNode) { countNode.textContent = '該当件数: ' + filtered.length + '件'; }",
    "      if (prevButton) { prevButton.disabled = page <= 1; }",
    "      if (nextButton) { nextButton.disabled = page >= totalPages; }",
    "      const empty = filtered.length === 0;",
    "      if (emptyNode) { emptyNode.style.display = empty ? 'block' : 'none'; }",
    "      if (cardsNode) {",
    "        cardsNode.style.display = empty ? 'none' : 'grid';",
    "        cardsNode.innerHTML = pageRows.map((row) => buildCardHtml(row, requiredKeys, badgeLabels, labelColorMap)).join('');",
    "      }",
    "    };",
    "    buildPrefectureOptions();",
    "    updateFilterButtons();",
    "    if (keywordInput) {",
    "      keywordInput.addEventListener('input', (event) => { keyword = event.target.value || ''; page = 1; render(); });",
    "    }",
    "    if (prefectureSelect) {",
    "      prefectureSelect.addEventListener('change', (event) => { selectedPrefecture = event.target.value || ''; page = 1; render(); });",
    "    }",
    "    filterButtons.forEach((button) => {",
    "      button.addEventListener('click', () => {",
    "        const key = button.getAttribute('data-store-filter-key');",
    "        if (!key) { return; }",
    "        activeFilters[key] = !activeFilters[key];",
    "        page = 1;",
    "        render();",
    "      });",
    "    });",
    "    if (prevButton) { prevButton.addEventListener('click', () => { page = Math.max(1, page - 1); render(); }); }",
    "    if (nextButton) { nextButton.addEventListener('click', () => { const filtered = filterRows(); const totalPages = Math.max(1, Math.ceil(filtered.length / (isMobile ? 5 : 10))); page = Math.min(totalPages, page + 1); render(); }); }",
    "    if (clearButton) { clearButton.addEventListener('click', () => { selectedPrefecture = ''; extraColumns.forEach((column) => { activeFilters[column] = false; }); page = 1; if (prefectureSelect) { prefectureSelect.value = ''; } render(); }); }",
    "    window.addEventListener('resize', () => { const nextMobile = window.innerWidth < 640; if (nextMobile !== isMobile) { isMobile = nextMobile; page = 1; render(); } });",
    "    render();",
    "  });",
    "})();",
  ];
  return lines.join("\n");
};

const buildExportHtml = (
  bodyHtml: string,
  project: ProjectState,
  assetMeta: AssetMeta[],
  storesEmbed: ReturnType<typeof buildStoresEmbed>
) => {
  const assetMetaById = new Map(assetMeta.map((entry) => [entry.id, entry]));
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<!doctype html><html><head></head><body>${bodyHtml}</body></html>`,
    "text/html"
  );
  doc.documentElement.lang = "ja";
  const title = str(project.meta.projectName || "キャンペーンLP");
  const titleEl = doc.createElement("title");
  titleEl.textContent = title;
  doc.head.appendChild(titleEl);
  const metaCharset = doc.createElement("meta");
  metaCharset.setAttribute("charset", "UTF-8");
  doc.head.appendChild(metaCharset);
  const metaViewport = doc.createElement("meta");
  metaViewport.setAttribute("name", "viewport");
  metaViewport.setAttribute("content", "width=device-width, initial-scale=1");
  doc.head.appendChild(metaViewport);
  const link = doc.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", "./assets/styles.css");
  doc.head.appendChild(link);

  doc.querySelectorAll("img[data-asset-id]").forEach((img) => {
    if (!(img instanceof HTMLImageElement)) {
      return;
    }
    const assetId = img.getAttribute("data-asset-id") || "";
    const meta = assetMetaById.get(assetId);
    if (!meta) {
      return;
    }
    img.src = `./${meta.path}`;
  });

  let html = `<!doctype html>${doc.documentElement.outerHTML}`;
  html = html.replace(/href="assets\/styles\.css"/g, 'href="./assets/styles.css"');
  html = html.replace(/src="\/assets\//g, 'src="./assets/');

  if (storesEmbed) {
    const storesScript =
      `<script type="application/json" id="stores-data">` +
      `${JSON.stringify(storesEmbed)}` +
      `</script>` +
      `<script defer src="./assets/app.js"></script>`;
    html = html.replace("</body>", `${storesScript}</body>`);
  }

  return html;
};

const MAX_STORE_CARDS = 200;

const resolveStores = (project: ProjectState): StoresTable | null => {
  if (!project.stores || !project.stores.canonical) {
    return null;
  }
  return project.stores;
};

const renderStoreCards = (stores: StoresTable | null) => {
  if (!stores || stores.rows.length === 0) {
    return `<div class="empty">対象店舗がありません。</div>`;
  }
  const canonical = stores.canonical;
  const cards = stores.rows.slice(0, MAX_STORE_CARDS).map((row) => {
    const storeName = escapeHtml(str(row[canonical.storeNameKey]));
    const postal = escapeHtml(str(row[canonical.postalCodeKey]));
    const address = escapeHtml(str(row[canonical.addressKey]));
    return `
      <div class="store-card">
        <div class="store-title">${storeName || "-"}</div>
        <div class="store-meta">${postal} ${address}</div>
      </div>
    `;
  });

  const limitNote =
    stores.rows.length > MAX_STORE_CARDS
      ? `<div class="note">上位${MAX_STORE_CARDS}件のみ表示しています。全件は別途CSVをご参照ください。</div>`
      : "";

  return `<div class="store-grid">${cards.join("")}</div>${limitNote}`;
};

const REGION_GROUPS = [
  {
    region: "北海道",
    items: [{ name: "北海道", label: "北海道", id: "hokkaido" }],
  },
  {
    region: "東北",
    items: [
      { name: "青森県", label: "青森", id: "aomori" },
      { name: "岩手県", label: "岩手", id: "iwate" },
      { name: "宮城県", label: "宮城", id: "miyagi" },
      { name: "秋田県", label: "秋田", id: "akita" },
      { name: "山形県", label: "山形", id: "yamagata" },
      { name: "福島県", label: "福島", id: "fukushima" },
    ],
  },
  {
    region: "関東",
    items: [
      { name: "茨城県", label: "茨城", id: "ibaraki" },
      { name: "栃木県", label: "栃木", id: "tochigi" },
      { name: "群馬県", label: "群馬", id: "gunma" },
      { name: "埼玉県", label: "埼玉", id: "saitama" },
      { name: "千葉県", label: "千葉", id: "chiba" },
      { name: "東京都", label: "東京", id: "tokyo" },
      { name: "神奈川県", label: "神奈川", id: "kanagawa" },
    ],
  },
  {
    region: "中部",
    items: [
      { name: "新潟県", label: "新潟", id: "niigata" },
      { name: "富山県", label: "富山", id: "toyama" },
      { name: "石川県", label: "石川", id: "ishikawa" },
      { name: "福井県", label: "福井", id: "fukui" },
      { name: "山梨県", label: "山梨", id: "yamanashi" },
      { name: "長野県", label: "長野", id: "nagano" },
      { name: "岐阜県", label: "岐阜", id: "gifu" },
      { name: "静岡県", label: "静岡", id: "shizuoka" },
      { name: "愛知県", label: "愛知", id: "aichi" },
    ],
  },
  {
    region: "近畿",
    items: [
      { name: "三重県", label: "三重", id: "mie" },
      { name: "滋賀県", label: "滋賀", id: "shiga" },
      { name: "京都府", label: "京都", id: "kyoto" },
      { name: "大阪府", label: "大阪", id: "osaka" },
      { name: "兵庫県", label: "兵庫", id: "hyogo" },
      { name: "奈良県", label: "奈良", id: "nara" },
      { name: "和歌山県", label: "和歌山", id: "wakayama" },
    ],
  },
  {
    region: "中国",
    items: [
      { name: "鳥取県", label: "鳥取", id: "tottori" },
      { name: "島根県", label: "島根", id: "shimane" },
      { name: "岡山県", label: "岡山", id: "okayama" },
      { name: "広島県", label: "広島", id: "hiroshima" },
      { name: "山口県", label: "山口", id: "yamaguchi" },
    ],
  },
  {
    region: "四国",
    items: [
      { name: "徳島県", label: "徳島", id: "tokushima" },
      { name: "香川県", label: "香川", id: "kagawa" },
      { name: "愛媛県", label: "愛媛", id: "ehime" },
      { name: "高知県", label: "高知", id: "kouchi" },
    ],
  },
  {
    region: "九州・沖縄",
    items: [
      { name: "福岡県", label: "福岡", id: "fukuoka" },
      { name: "佐賀県", label: "佐賀", id: "saga" },
      { name: "長崎県", label: "長崎", id: "nagasaki" },
      { name: "熊本県", label: "熊本", id: "kumamoto" },
      { name: "大分県", label: "大分", id: "oita" },
      { name: "宮崎県", label: "宮崎", id: "miyazaki" },
      { name: "鹿児島県", label: "鹿児島", id: "kagoshima" },
      { name: "沖縄県", label: "沖縄", id: "okinawa" },
    ],
  },
];

const PREFECTURE_ORDER = REGION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.name)
);

const PREFECTURE_ID_MAP = new Map(
  REGION_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.name, item.id] as const)
  )
);

const resolvePrefectureId = (prefecture: string, fallbackIndex: number) =>
  PREFECTURE_ID_MAP.get(prefecture) ?? `pref-${fallbackIndex}`;

const renderExcludedStoresNav = () => {
  const rows = REGION_GROUPS.map((group) => {
    const links = group.items
      .map(
        (item) =>
          `<a href="#${item.id}" class="excluded-region-link">${escapeHtml(
            item.label
          )}</a>`
      )
      .join("");
    return `
      <tr>
        <th class="excluded-region-th"><strong>${escapeHtml(
          group.region
        )}</strong></th>
        <td class="excluded-region-td">${links}</td>
      </tr>
    `;
  });
  return `
    <table class="excluded-region-table">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
};

const renderExcludedStoresList = (stores: StoresTable | null) => {
  if (!stores || stores.rows.length === 0) {
    return `<div class="excluded-empty">CSVを取り込むと、対象外店舗の一覧が表示されます。</div>`;
  }
  const canonical = stores.canonical;
  const groups = new Map<string, Array<{ name: string; address: string }>>();
  stores.rows.forEach((row) => {
    const name = str(row[canonical.storeNameKey]).trim();
    const address = str(row[canonical.addressKey]).trim();
    const pref = str(row[canonical.prefectureKey]).trim();
    const key = pref || "未分類";
    const list = groups.get(key) ?? [];
    list.push({ name, address });
    groups.set(key, list);
  });
  const orderMap = new Map(
    PREFECTURE_ORDER.map((prefecture, index) => [prefecture, index])
  );
  const sortedGroups = Array.from(groups.entries())
    .map(([prefecture, entries]) => ({
      prefecture,
      entries,
    }))
    .sort((a, b) => {
      const orderA = orderMap.get(a.prefecture) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.prefecture) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  const blocks = sortedGroups
    .map((group, index) => {
      const rows = group.entries
        .map(
          (entry) => `
            <div class="tenpo_list">
              <span class="tenpo_list_shop">${escapeHtml(
                entry.name || "店舗名"
              )}</span>
              <span class="tenpo_list_add">${escapeHtml(entry.address)}</span>
            </div>
          `
        )
        .join("");
      const prefId = resolvePrefectureId(group.prefecture, index + 1);
      return `
        <div>
          <div class="tenpo_list_title">
            <h2 id="${prefId}">${escapeHtml(group.prefecture)}</h2>
          </div>
          ${rows}
        </div>
      `;
    })
    .join("");
  return `<div class="tenpo-container">${blocks}</div>`;
};

const pickHeader = (headers: string[], candidates: string[]) =>
  candidates.find((candidate) => headers.includes(candidate)) ?? "";

const buildBrandAnchorId = (
  label: string,
  index: number,
  used: Set<string>
) => {
  const trimmed = label.trim();
  const base = trimmed ? trimmed.replace(/\s+/g, "-") : `brand-${index + 1}`;
  let next = base;
  let counter = 1;
  while (used.has(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  used.add(next);
  return next;
};

const buildExcludedBrandGroupsFromStores = (stores: StoresTable | null) => {
  if (!stores || stores.rows.length === 0) {
    return [] as Array<{
      brand: string;
      id: string;
      entries: Array<{ name: string; address: string }>;
    }>;
  }
  const headers = [...(stores.columns ?? []), ...(stores.extraColumns ?? [])];
  const brandKey = pickHeader(headers, [
    "ブランド名",
    "ブランド",
    "グループ",
    "チェーン名",
  ]);
  const canonical = stores.canonical;
  const storeNameKey = canonical.storeNameKey;
  const addressKey = canonical.addressKey;
  const order: string[] = [];
  const groups = new Map<string, Array<{ name: string; address: string }>>();
  stores.rows.forEach((row) => {
    const brand = str(row[brandKey]).trim();
    const name = str(row[storeNameKey]).trim();
    const address = str(row[addressKey]).trim();
    if (!brand && !name && !address) {
      return;
    }
    const key = brand || "未分類";
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)?.push({ name, address });
  });
  const usedIds = new Set<string>();
  return order.map((brand, index) => ({
    brand,
    entries: groups.get(brand) ?? [],
    id: buildBrandAnchorId(brand, index, usedIds),
  }));
};

const renderExcludedBrandsNav = (
  groups: Array<{ brand: string; id: string }>
) => {
  if (groups.length === 0) {
    return "";
  }
  return `
    <ul class="excluded-brand-list">
      ${groups
        .map(
          (group) => `
            <li>
              <span class="excluded-brand-marker">▼</span>
              <a class="excluded-brand-link" href="#${escapeHtml(group.id)}">${escapeHtml(
            group.brand
          )}</a>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
};

const renderExcludedBrandsList = (
  groups: Array<{ brand: string; id: string; entries: Array<{ name: string; address: string }> }>
) => {
  if (groups.length === 0) {
    return `<div class="excluded-empty">CSVを取り込むと、対象外ブランドの一覧が表示されます。</div>`;
  }
  const blocks = groups
    .map((group) => {
      const rows = group.entries
        .map(
          (entry) => `
            <div class="tenpo_list">
              <span class="tenpo_list_shop">${escapeHtml(
                entry.name || "ブランド名"
              )}</span>
              <span class="tenpo_list_add">${escapeHtml(entry.address)}</span>
            </div>
          `
        )
        .join("");
      return `
        <div>
          <div class="tenpo_list_title">
            <h2 id="${escapeHtml(group.id)}">${escapeHtml(group.brand)}</h2>
          </div>
          ${rows}
        </div>
      `;
    })
    .join("");
  return `<div class="tenpo-container">${blocks}</div>`;
};

export const renderProjectToHtml = (
  project: ProjectState,
  cssHref = "styles.css"
): string => {
  const stores = resolveStores(project);
  const sections = project.sections.filter((section) => section.visible);

  const sectionHtml = sections
    .map((section) => {
      switch (section.type) {
        case "brandBar":
          return `
            <section class="brand">
              <div class="container">${escapeHtml(
                str(section.data.logoText)
              )}</div>
            </section>
          `;
        case "heroImage":
          return `
            <section class="hero container">
              ${
                section.data.imageUrl
                  ? `<img src="${escapeHtml(
                      str(section.data.imageUrl)
                    )}" alt="${escapeHtml(str(section.data.alt))}" />`
                  : `<div class="hero-placeholder">ヒーロー画像</div>`
              }
            </section>
          `;
        case "campaignPeriodBar": {
          const startDate =
            typeof section.data.startDate === "string"
              ? section.data.startDate
              : undefined;
          const endDate =
            typeof section.data.endDate === "string" ? section.data.endDate : undefined;
          return `
            <section class="period">
              <div class="container">${escapeHtml(
                `${formatDate(startDate)} - ${formatDate(endDate)}`
              )}</div>
            </section>
          `;
        }
        case "campaignOverview":
          return `
            <section class="container">
              <h2>${escapeHtml(str(section.data.title || "キャンペーン概要"))}</h2>
              <p>${escapeHtml(str(section.data.body))}</p>
            </section>
          `;
        case "paymentHistoryGuide": {
          const data = section.data ?? {};
          const title = escapeHtml(str(data.title || "決済履歴の確認方法"));
          const body = escapeHtml(str(data.body || ""));
          const linkText = escapeHtml(str(data.linkText || ""));
          const linkUrl = escapeHtml(str(data.linkUrl || ""));
          const linkTargetKind =
            data.linkTargetKind === "section" ? "section" : "url";
          const linkSectionId = str(data.linkSectionId || "");
          const resolvedLinkUrl =
            linkTargetKind === "section" && linkSectionId
              ? `#sec-${linkSectionId}`
              : linkUrl;
          const linkSuffix = escapeHtml(str(data.linkSuffix || ""));
          const alert = escapeHtml(str(data.alert || ""));
          const imageUrl = str(data.imageUrl || "");
          const imageAlt = escapeHtml(str(data.imageAlt || ""));
          const imageAssetId = str(data.imageAssetId || "");
          const resolvedImage =
            imageAssetId && project.assets?.[imageAssetId]?.data
              ? project.assets[imageAssetId].data
              : imageUrl;
          const bodyHtml = body.replace(/\n/g, "<br />");
          const alertHtml = alert.replace(/\n/g, "<br />");
          const linkHtml = linkText && resolvedLinkUrl
            ? ` <a class="payment-guide__link" href="${resolvedLinkUrl}">${linkText}</a>${linkSuffix}`
            : "";
          return `
            <section class="container payment-guide">
              <h2>${title}</h2>
              ${bodyHtml ? `<p class="payment-guide__body">${bodyHtml}${linkHtml}</p>` : ""}
              ${alertHtml ? `<p class="payment-guide__alert">${alertHtml}</p>` : ""}
              ${
                resolvedImage
                  ? `<div class="payment-guide__image"><img src="${escapeHtml(
                      str(resolvedImage)
                    )}" alt="${imageAlt}" /></div>`
                  : `<div class="payment-guide__image payment-guide__image--placeholder">画像を追加してください</div>`
              }
            </section>
          `;
        }
        case "tabbedNotes": {
          const data = section.data ?? {};
          const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
          const tabs = rawTabs.map((tab, index) => {
            const entry = tab && typeof tab === "object"
              ? (tab as Record<string, unknown>)
              : {};
            const rawItems = Array.isArray(entry.items) ? entry.items : [];
            const items = rawItems.map((item, itemIndex) => {
              const itemEntry = item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};
              const subItems = Array.isArray(itemEntry.subItems)
                ? itemEntry.subItems.map((value) => str(value))
                : [];
              return {
                id:
                  typeof itemEntry.id === "string" && itemEntry.id.trim()
                    ? itemEntry.id
                    : `tab_item_${index + 1}_${itemIndex + 1}`,
                text: str(itemEntry.text ?? ""),
                bullet: itemEntry.bullet === "none" ? "none" : "disc",
                tone: itemEntry.tone === "accent" ? "accent" : "normal",
                bold: Boolean(itemEntry.bold),
                subItems,
              };
            });
            const ctaTargetKind =
              entry.ctaTargetKind === "section" ? "section" : "url";
            const ctaSectionId = str(entry.ctaSectionId ?? "");
            const ctaLinkUrl = str(entry.ctaLinkUrl ?? "");
            const resolvedCtaUrl =
              ctaTargetKind === "section" && ctaSectionId
                ? `#sec-${ctaSectionId}`
                : ctaLinkUrl;
            const ctaImageUrl = str(entry.ctaImageUrl ?? "");
            const ctaImageAlt = escapeHtml(str(entry.ctaImageAlt ?? ""));
            const ctaImageAssetId = str(entry.ctaImageAssetId ?? "");
            const resolvedCtaImage =
              ctaImageAssetId && project.assets?.[ctaImageAssetId]?.data
                ? project.assets[ctaImageAssetId].data
                : ctaImageUrl;
            const buttonTargetKind =
              entry.buttonTargetKind === "section" ? "section" : "url";
            const buttonSectionId = str(entry.buttonSectionId ?? "");
            const buttonUrl = str(entry.buttonUrl ?? "");
            const resolvedButtonUrl =
              buttonTargetKind === "section" && buttonSectionId
                ? `#sec-${buttonSectionId}`
                : buttonUrl;
            return {
              id:
                typeof entry.id === "string" && entry.id.trim()
                  ? entry.id
                  : `tab_${index + 1}`,
              labelTop: escapeHtml(str(entry.labelTop ?? "")),
              labelBottom: escapeHtml(str(entry.labelBottom ?? "注意事項")),
              intro: escapeHtml(str(entry.intro ?? "")),
              items,
              footnote: escapeHtml(str(entry.footnote ?? "")),
              ctaText: escapeHtml(str(entry.ctaText ?? "")),
              ctaLinkText: escapeHtml(str(entry.ctaLinkText ?? "")),
              resolvedCtaUrl,
              resolvedCtaImage,
              ctaImageAlt,
              buttonText: escapeHtml(str(entry.buttonText ?? "")),
              resolvedButtonUrl,
            };
          });
          const rawStyle = data.tabStyle && typeof data.tabStyle === "object"
            ? (data.tabStyle as Record<string, unknown>)
            : {};
          const rawVariant = typeof rawStyle.variant === "string"
            ? rawStyle.variant
            : "simple";
          const variant =
            rawVariant === "sticky" ||
            rawVariant === "underline" ||
            rawVariant === "popout"
              ? rawVariant
              : "simple";
          const tabStyle = {
            variant,
            inactiveBg: typeof rawStyle.inactiveBg === "string" ? rawStyle.inactiveBg : "#DDDDDD",
            inactiveText:
              typeof rawStyle.inactiveText === "string" ? rawStyle.inactiveText : "#000000",
            activeBg: typeof rawStyle.activeBg === "string" ? rawStyle.activeBg : "#000000",
            activeText:
              typeof rawStyle.activeText === "string" ? rawStyle.activeText : "#FFFFFF",
            border: typeof rawStyle.border === "string" ? rawStyle.border : "#000000",
            contentBg:
              typeof rawStyle.contentBg === "string" ? rawStyle.contentBg : "#FFFFFF",
            contentBorder:
              typeof rawStyle.contentBorder === "string"
                ? rawStyle.contentBorder
                : "#000000",
            accent: typeof rawStyle.accent === "string" ? rawStyle.accent : "#EB5505",
          };
          const styleVars = [
            `--tab-inactive-bg:${escapeHtml(str(tabStyle.inactiveBg))}`,
            `--tab-inactive-text:${escapeHtml(str(tabStyle.inactiveText))}`,
            `--tab-active-bg:${escapeHtml(str(tabStyle.activeBg))}`,
            `--tab-active-text:${escapeHtml(str(tabStyle.activeText))}`,
            `--tab-border:${escapeHtml(str(tabStyle.border))}`,
            `--tab-content-bg:${escapeHtml(str(tabStyle.contentBg))}`,
            `--tab-content-border:${escapeHtml(str(tabStyle.contentBorder))}`,
            `--tab-accent:${escapeHtml(str(tabStyle.accent))}`,
          ].join(";");
          const tabName = `tab-${section.id}`;
          const tabHtml = tabs
            .map((tab, index) => {
              const tabId = `${tabName}-${index + 1}`;
              const itemsHtml = tab.items
                .map((item) => {
                  const itemClass = [
                    "tabbed-notes__item",
                    item.bullet === "disc" ? "is-disc" : "",
                    item.tone === "accent" ? "is-accent" : "",
                    item.bold ? "is-bold" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const subList = item.subItems.length > 0
                    ? `<ul class=\"tabbed-notes__sublist\">${item.subItems
                        .map((sub) => `<li>${escapeHtml(sub)}</li>`)
                        .join("")}</ul>`
                    : "";
                  return `<li class=\"${itemClass}\">${escapeHtml(item.text)}${subList}</li>`;
                })
                .join("");
              const ctaHtml =
                tab.ctaText || tab.ctaLinkText || tab.resolvedCtaImage
                  ? `
                    <div class=\"tabbed-notes__cta\">
                      ${tab.ctaText ? `<p class=\"tabbed-notes__cta-text\">${tab.ctaText}</p>` : ""}
                      ${tab.ctaLinkText && tab.resolvedCtaUrl ? `<a class=\"tabbed-notes__cta-link\" href=\"${tab.resolvedCtaUrl}\">${tab.ctaLinkText}</a>` : ""}
                      ${tab.resolvedCtaImage ? `<a class=\"tabbed-notes__cta-image\" href=\"${tab.resolvedCtaUrl || "#"}\"><img src=\"${escapeHtml(str(tab.resolvedCtaImage))}\" alt=\"${tab.ctaImageAlt}\" /></a>` : ""}
                    </div>
                  `
                  : "";
              const buttonHtml =
                tab.buttonText && tab.resolvedButtonUrl
                  ? `
                    <div class=\"tabbed-notes__button\">
                      <a class=\"tabbed-notes__button-link\" href=\"${tab.resolvedButtonUrl}\">${tab.buttonText}</a>
                    </div>
                  `
                  : "";
              return `
                <input id=\"${tabId}\" type=\"radio\" name=\"${tabName}\" class=\"tabbed-notes__switch\" ${
                  index === 0 ? "checked=\\\"checked\\\"" : ""
                }>
                <label class=\"tabbed-notes__label\" for=\"${tabId}\">
                  ${tab.labelTop ? `<span class=\"tabbed-notes__label-top\">${tab.labelTop}</span>` : ""}
                  <span class=\"tabbed-notes__label-bottom\">${tab.labelBottom}</span>
                </label>
                <div class=\"tabbed-notes__content\">
                  <div class=\"tabbed-notes__panel\">
                    ${tab.intro ? `<p class=\"tabbed-notes__intro\">${tab.intro}</p>` : ""}
                    <ul class=\"tabbed-notes__list\">${itemsHtml}</ul>
                    ${tab.footnote ? `<p class=\"tabbed-notes__footnote\">${tab.footnote}</p>` : ""}
                    ${ctaHtml}
                    ${buttonHtml}
                  </div>
                </div>
              `;
            })
            .join("");
          return `
            <section class=\"container tabbed-notes\" style=\"${styleVars}\">
              <div class=\"tabbed-notes__wrap\">
                ${tabHtml}
              </div>
            </section>
          `;
        }
        case "couponFlow": {
          const items = Array.isArray(section.content?.items)
            ? section.content?.items
            : [];
          const imageItem = items.find(
            (item) => item.type === "image"
          ) as ImageContentItem | undefined;
          const slides = imageItem?.images ?? [];
          const current = slides[0];
          const resolvedSrc = current?.assetId
            ? project.assets?.[current.assetId]?.data || current.src
            : current?.src;
          const title = escapeHtml(str(section.data.title || "クーポン利用の流れ"));
          const lead = escapeHtml(str(section.data.lead || ""));
          const note = escapeHtml(str(section.data.note || ""));
          const buttonLabel = escapeHtml(str(section.data.buttonLabel || ""));
          const buttonUrl = escapeHtml(str(section.data.buttonUrl || "#"));
          return `
            <section class="coupon-flow">
              <div class="coupon-flow__titlebar">${title}</div>
              <div class="coupon-flow__body">
                ${lead ? `<p class="coupon-flow__lead">${lead}</p>` : ""}
                <div class="coupon-flow__frame">
                  ${
                    resolvedSrc
                      ? `<img src="${escapeHtml(str(resolvedSrc))}" alt="${escapeHtml(str(current?.alt ?? ""))}" />`
                      : `<div class="coupon-flow__placeholder">画像を追加してください</div>`
                  }
                </div>
                ${note ? `<p class="coupon-flow__note">${note}</p>` : ""}
                ${
                  buttonLabel
                    ? `<a class="coupon-flow__cta" href="${buttonUrl}">${buttonLabel}</a>`
                    : ""
                }
              </div>
            </section>
          `;
        }
        case "targetStores":
          return `
            <section class="container">
              <h2>${escapeHtml(str(section.data.title || "対象店舗"))}</h2>
              <p>${escapeHtml(str(section.data.note || ""))}</p>
              ${renderStoreCards(stores)}
            </section>
          `;
        case "excludedStoresList": {
          const rawTitleTemplate = str(section.data.title || "対象外店舗一覧");
          const rawHighlight = str(section.data.highlightLabel || "対象外");
          const highlight = escapeHtml(rawHighlight);
          const returnUrl = escapeHtml(str(section.data.returnUrl || "#"));
          const returnLabel = escapeHtml(
            str(section.data.returnLabel || "キャンペーンページに戻る")
          );
          const footerCopy = escapeHtml(
            str(
              section.data.footerCopy ||
                "COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED."
            )
          );
          const footerLinksRaw = Array.isArray(section.data.footerLinks)
            ? section.data.footerLinks
            : [];
          const footerLinks = footerLinksRaw
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const label =
                "label" in entry && typeof entry.label === "string"
                  ? entry.label
                  : "";
              const url =
                "url" in entry && typeof entry.url === "string" ? entry.url : "";
              if (!label || !url) {
                return null;
              }
              return { label, url };
            })
            .filter((entry): entry is { label: string; url: string } => entry != null);
          const resolvedFooterLinks = footerLinks.length
            ? footerLinks
            : [
                { label: "サイトポリシー", url: "#" },
                { label: "会社概要", url: "#" },
                { label: "動作環境", url: "#" },
                { label: "Cookie情報の利用", url: "#" },
                { label: "広告配信などについて", url: "#" },
              ];
          const hasHighlightPlaceholder =
            highlight && rawTitleTemplate.includes("{highlight}");
          const titleParts = rawTitleTemplate.split("{highlight}");
          const titleHtml = hasHighlightPlaceholder
            ? `
              <span class="excluded-title__text">${escapeHtml(
                titleParts[0]
              )}</span>
              <span class="excluded-title__badge">${highlight}</span>
              <span class="excluded-title__text">${escapeHtml(
                titleParts.slice(1).join("{highlight}")
              )}</span>
            `
            : `
              <span class="excluded-title__text">${escapeHtml(
                rawTitleTemplate
              )}</span>
              ${highlight ? `<span class="excluded-title__badge">${highlight}</span>` : ""}
            `;
          return `
            <section class="excluded-stores">
              <div class="excluded-wrap">
                <h1 class="excluded-title">${titleHtml}</h1>
                ${renderExcludedStoresNav()}
                ${renderExcludedStoresList(stores)}
                <div class="excluded-footer">
                  <a class="excluded-return" href="${returnUrl}">
                    <span class="excluded-return__label">${returnLabel}</span>
                    <span class="excluded-return__arrow" aria-hidden="true"></span>
                  </a>
                  <div class="excluded-footer__links">
                    ${resolvedFooterLinks
                      .map(
                        (link) =>
                          `<a href="${escapeHtml(link.url)}">${escapeHtml(
                            link.label
                          )}</a>`
                      )
                      .join("")}
                  </div>
                  <div class="excluded-footer__copy">${footerCopy}</div>
                </div>
              </div>
            </section>
          `;
        }
        case "excludedBrandsList": {
          const brandGroups = buildExcludedBrandGroupsFromStores(stores);
          const rawTitleTemplate = str(section.data.title || "対象外ブランド一覧");
          const rawHighlight = str(section.data.highlightLabel || "対象外");
          const highlight = escapeHtml(rawHighlight);
          const returnUrl = escapeHtml(str(section.data.returnUrl || "#"));
          const returnLabel = escapeHtml(
            str(section.data.returnLabel || "キャンペーンページに戻る")
          );
          const footerCopy = escapeHtml(
            str(
              section.data.footerCopy ||
                "COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED."
            )
          );
          const footerLinksRaw = Array.isArray(section.data.footerLinks)
            ? section.data.footerLinks
            : [];
          const footerLinks = footerLinksRaw
            .map((entry) => {
              if (!entry || typeof entry !== "object") {
                return null;
              }
              const label =
                "label" in entry && typeof entry.label === "string"
                  ? entry.label
                  : "";
              const url =
                "url" in entry && typeof entry.url === "string" ? entry.url : "";
              if (!label || !url) {
                return null;
              }
              return { label, url };
            })
            .filter((entry): entry is { label: string; url: string } => entry != null);
          const resolvedFooterLinks = footerLinks.length
            ? footerLinks
            : [
                { label: "サイトポリシー", url: "#" },
                { label: "会社概要", url: "#" },
                { label: "動作環境", url: "#" },
                { label: "Cookie情報の利用", url: "#" },
                { label: "広告配信などについて", url: "#" },
              ];
          const hasHighlightPlaceholder =
            highlight && rawTitleTemplate.includes("{highlight}");
          const titleParts = rawTitleTemplate.split("{highlight}");
          const titleHtml = hasHighlightPlaceholder
            ? `
              <span class="excluded-title__text">${escapeHtml(
                titleParts[0]
              )}</span>
              <span class="excluded-title__badge">${highlight}</span>
              <span class="excluded-title__text">${escapeHtml(
                titleParts.slice(1).join("{highlight}")
              )}</span>
            `
            : `
              <span class="excluded-title__text">${escapeHtml(
                rawTitleTemplate
              )}</span>
              ${highlight ? `<span class="excluded-title__badge">${highlight}</span>` : ""}
            `;
          return `
            <section class="excluded-stores">
              <div class="excluded-wrap">
                <h1 class="excluded-title">${titleHtml}</h1>
                ${renderExcludedBrandsNav(brandGroups)}
                ${renderExcludedBrandsList(brandGroups)}
                <div class="excluded-footer">
                  <a class="excluded-return" href="${returnUrl}">
                    <span class="excluded-return__label">${returnLabel}</span>
                    <span class="excluded-return__arrow" aria-hidden="true"></span>
                  </a>
                  <div class="excluded-footer__links">
                    ${resolvedFooterLinks
                      .map(
                        (link) =>
                          `<a href="${escapeHtml(link.url)}">${escapeHtml(
                            link.label
                          )}</a>`
                      )
                      .join("")}
                  </div>
                  <div class="excluded-footer__copy">${footerCopy}</div>
                </div>
              </div>
            </section>
          `;
        }
        case "legalNotes": {
          const defaultBullet = section.data?.bullet === "none" ? "none" : "disc";
          const rawItems = Array.isArray(section.data.items) ? section.data.items : [];
          const legalTextItem = Array.isArray(section.content?.items)
            ? section.content!.items.find((item) => item.type === "text")
            : undefined;
          const items = legalTextItem?.lines?.length
            ? legalTextItem.lines.map((line) => ({
                text: str(line.text ?? ""),
                bullet: line.marks?.bullet ?? defaultBullet,
              }))
            : rawItems
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
          return `
            <section class="container">
              <h2>${escapeHtml(str(section.data.title || "注意事項"))}</h2>
              <ul style="list-style:none;padding-left:0">
                ${items
                  .map((item) => {
                    const entry = item as { text: string; bullet: "none" | "disc" };
                    return entry.bullet === "disc"
                      ? `<li style=\"display:flex;align-items:flex-start;gap:0.4em\"><span style=\"flex-shrink:0;margin-top:0.3em;width:0.4em;height:0.4em;border-radius:50%;background:currentColor;display:inline-block\"></span><span>${escapeHtml(
                          str(entry.text)
                        )}</span></li>`
                      : `<li>${escapeHtml(str(entry.text))}</li>`;
                  })
                  .join("")}
              </ul>
            </section>
          `;
        }
        case "rankingTable": {
          const data = section.data ?? {};
          const headers =
            data && typeof data.headers === "object"
              ? (data.headers as Record<string, unknown>)
              : {};
          const rankLabel = escapeHtml(
            str(data.rankLabel || headers.rank || "順位")
          );
          const rawColumns = data.columns;
          const columns = Array.isArray(rawColumns) && rawColumns.length > 0
            ? rawColumns.map((col, index) => {
                if (typeof col === "string") {
                  return { key: `col_${index + 1}`, label: col };
                }
                const entry = col && typeof col === "object"
                  ? (col as Record<string, unknown>)
                  : {};
                return {
                  key: typeof entry.key === "string" ? entry.key : `col_${index + 1}`,
                  label:
                    typeof entry.label === "string"
                      ? entry.label
                      : `列${index + 1}`,
                };
              })
            : [
                {
                  key: "label",
                  label: typeof headers.label === "string" ? headers.label : "項目",
                },
                {
                  key: "value",
                  label: typeof headers.value === "string" ? headers.value : "決済金額",
                },
              ];
          const columnCount = columns.length;
          const rows = Array.isArray(data?.rows)
            ? (data.rows as Array<Record<string, unknown>>)
            : [];
          const normalizedRows = rows.map((row, index) => {
            if (Array.isArray(row)) {
              const values = row.map((value) => String(value));
              return {
                id: `rank_${index + 1}`,
                values: values
                  .slice(0, columnCount)
                  .concat(Array(Math.max(0, columnCount - values.length)).fill("")),
              };
            }
            const entry = row && typeof row === "object"
              ? (row as Record<string, unknown>)
              : {};
            const rawValues = Array.isArray(entry.values)
              ? entry.values.map((value) => String(value))
              : [String(entry.label ?? ""), String(entry.value ?? "")];
            return {
              id:
                typeof entry.id === "string" && entry.id.trim()
                  ? entry.id
                  : `rank_${index + 1}`,
              values: rawValues
                .slice(0, columnCount)
                .concat(Array(Math.max(0, columnCount - rawValues.length)).fill("")),
            };
          });
          const title = escapeHtml(str(data.title || "ランキング"));
          const subtitle = escapeHtml(str(data.subtitle || ""));
          const period = escapeHtml(str(data.period || ""));
          const dateText = escapeHtml(str(data.date || ""));
          const notes = Array.isArray(data?.notes)
            ? data.notes.map((note: string) => escapeHtml(str(note)))
            : [];
          const rawStyle = data.tableStyle && typeof data.tableStyle === "object"
            ? (data.tableStyle as Record<string, unknown>)
            : {};
          const tableStyle = {
            headerBg:
              typeof rawStyle.headerBg === "string" ? rawStyle.headerBg : "#f8fafc",
            headerText:
              typeof rawStyle.headerText === "string" ? rawStyle.headerText : "#0f172a",
            cellBg: typeof rawStyle.cellBg === "string" ? rawStyle.cellBg : "#ffffff",
            cellText:
              typeof rawStyle.cellText === "string" ? rawStyle.cellText : "#0f172a",
            border: typeof rawStyle.border === "string" ? rawStyle.border : "#e2e8f0",
            rankBg: typeof rawStyle.rankBg === "string" ? rawStyle.rankBg : "#e2e8f0",
            rankText:
              typeof rawStyle.rankText === "string" ? rawStyle.rankText : "#0f172a",
            top1Bg: typeof rawStyle.top1Bg === "string" ? rawStyle.top1Bg : "#f59e0b",
            top2Bg: typeof rawStyle.top2Bg === "string" ? rawStyle.top2Bg : "#cbd5f5",
            top3Bg: typeof rawStyle.top3Bg === "string" ? rawStyle.top3Bg : "#fb923c",
            periodLabelBg:
              typeof rawStyle.periodLabelBg === "string"
                ? rawStyle.periodLabelBg
                : "#f1f5f9",
            periodLabelText:
              typeof rawStyle.periodLabelText === "string"
                ? rawStyle.periodLabelText
                : "#0f172a",
          };
          const headerHtml = columns
            .map((column) => `<th>${escapeHtml(str(column.label))}</th>`)
            .join("");
          const rowsHtml = normalizedRows
            .map((row, index) => {
              const rank = index + 1;
              const topClass = rank <= 3 ? ` is-top-${rank}` : "";
              const valueCells = row.values
                .map((value) => {
                  const cellText = value.trim() ? value : "-";
                  return `<td class="ranking-table__cell">${escapeHtml(cellText)}</td>`;
                })
                .join("");
              return `
                <tr>
                  <td class="ranking-table__rank">
                    <span class="ranking-table__rank-badge${topClass}">${rank}</span>
                  </td>
                  ${valueCells}
                </tr>
              `;
            })
            .join("");
          const notesHtml = notes.length
            ? `
              <ul class="ranking-table__notes">
                ${notes.map((note) => `<li>${note}</li>`).join("")}
              </ul>
            `
            : "";
          const styleVars = [
            `--ranking-header-bg:${escapeHtml(str(tableStyle.headerBg))}`,
            `--ranking-header-text:${escapeHtml(str(tableStyle.headerText))}`,
            `--ranking-cell-bg:${escapeHtml(str(tableStyle.cellBg))}`,
            `--ranking-cell-text:${escapeHtml(str(tableStyle.cellText))}`,
            `--ranking-border:${escapeHtml(str(tableStyle.border))}`,
            `--ranking-rank-bg:${escapeHtml(str(tableStyle.rankBg))}`,
            `--ranking-rank-text:${escapeHtml(str(tableStyle.rankText))}`,
            `--ranking-top1-bg:${escapeHtml(str(tableStyle.top1Bg))}`,
            `--ranking-top2-bg:${escapeHtml(str(tableStyle.top2Bg))}`,
            `--ranking-top3-bg:${escapeHtml(str(tableStyle.top3Bg))}`,
            `--ranking-period-label-bg:${escapeHtml(str(tableStyle.periodLabelBg))}`,
            `--ranking-period-label-text:${escapeHtml(
              str(tableStyle.periodLabelText)
            )}`,
          ].join(";");
          return `
            <section class="container ranking-table">
              <h2>${title}</h2>
              ${subtitle ? `<p class="ranking-table__subtitle">${subtitle}</p>` : ""}
              ${
                period
                  ? `<div class="ranking-table__period"><span class="ranking-table__period-label">集計期間</span><span>${period}</span></div>`
                  : ""
              }
              ${dateText ? `<div class="ranking-table__date">${dateText}</div>` : ""}
              <div class="ranking-table__table-wrap">
                <table class="ranking-table__table" style="${styleVars}">
                  <thead>
                    <tr>
                      <th>${rankLabel}</th>
                      ${headerHtml}
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </div>
              ${notesHtml}
            </section>
          `;
        }
        case "footerHtml":
          return `
            <footer class="footer">
              <div class="container">${String(section.data.html ?? "")}</div>
            </footer>
          `;
        case "imageOnly": {
          const imageItem = section.content?.items?.find(
            (item: { type: string }) => item.type === "image"
          ) as { images?: Array<{ src?: string; assetId?: string; alt?: string }> } | undefined;
          const images = imageItem?.images ?? [];
          const layout = str(section.data.layout ?? "single");
          const gridStyle =
            layout === "columns2"
              ? "display:grid;grid-template-columns:repeat(2,1fr);gap:12px;"
              : layout === "columns3"
              ? "display:grid;grid-template-columns:repeat(3,1fr);gap:12px;"
              : layout === "grid"
              ? "display:grid;grid-template-columns:repeat(2,1fr);gap:12px;"
              : "display:flex;flex-direction:column;align-items:center;";
          const imgsHtml = images
            .map((img) => {
              const src = escapeHtml(str(img.src ?? ""));
              const alt = escapeHtml(str(img.alt ?? ""));
              const assetId = escapeHtml(str(img.assetId ?? ""));
              return src
                ? `<img src="${src}" alt="${alt}" data-asset-id="${assetId}" style="width:100%;height:auto;display:block;border-radius:8px;" />`
                : "";
            })
            .filter(Boolean)
            .join("\n");
          return `
            <section class="container image-only">
              <div style="${gridStyle}">${imgsHtml || '<div style="height:80px;border:1px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999;font-size:13px;">画像なし</div>'}</div>
            </section>
          `;
        }
        default:
          return "";
      }
    })
    .join("");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(resolvePageMeta(project).title)}</title>
    ${buildMetaHeadTags(project)}
    <link rel="stylesheet" href="${cssHref}" />
  </head>
  <body>
    ${sectionHtml}
  </body>
</html>`;
};

export const buildStylesCss = (): string => `
:root {
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
  color: #0f172a;
  background: #ffffff;
}
body {
  margin: 0;
  background: #ffffff;
}
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}
.brand {
  background: #f8fafc;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 600;
}
.hero img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  border-radius: 16px;
}
.hero-placeholder {
  height: 280px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  background: #f1f5f9;
}
.period {
  background: #fff7ed;
  padding: 10px 0;
  font-size: 13px;
  color: #92400e;
}
.coupon-flow {
  background: transparent;
  padding: 0;
  border-radius: 0;
  margin: 24px 0;
  box-shadow: none;
}
.coupon-flow__titlebar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ea5504;
  color: #ffffff;
  font-weight: 800;
  font-size: 15px;
  padding: 6px 18px;
  border-radius: 999px;
  letter-spacing: 0.04em;
  margin: 0 auto 8px;
}
.coupon-flow__body {
  padding: 0;
}
.coupon-flow__lead {
  margin: 0 0 12px;
  color: #d7262b;
  font-size: 13px;
  font-weight: 700;
}
.coupon-flow__frame {
  background: #f8efe6;
  border-radius: 14px;
  border: 2px solid #f2d8c0;
  padding: 12px;
}
.coupon-flow__frame img {
  width: 100%;
  height: auto;
  border-radius: 10px;
  display: block;
}
.coupon-flow__placeholder {
  border: 1px dashed #f0c1a2;
  border-radius: 10px;
  padding: 24px 12px;
  font-size: 12px;
  color: #a15b2c;
  background: #fff8f1;
}
.coupon-flow__note {
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
}
.coupon-flow__cta {
  margin: 14px auto 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 26px;
  border-radius: 999px;
  background: #ea5504;
  border: 2px solid #ffffff;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 2px 6px rgba(0, 0, 0, 0.18);
  min-width: 240px;
}
h2 {
  font-size: 20px;
  margin: 24px 0 12px;
}
p {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}
ul {
  padding-left: 18px;
  color: #475569;
  font-size: 14px;
}
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  h2 {
    font-size: 18px;
    margin: 20px 0 10px;
  }
  p,
  ul {
    font-size: 13px;
  }
  .hero img {
    height: 240px;
    border-radius: 12px;
  }
  .hero-placeholder {
    height: 220px;
    border-radius: 12px;
  }
}
@media (max-width: 480px) {
  .container {
    padding: 0 12px;
  }
  h2 {
    font-size: 16px;
  }
  .hero img {
    height: 200px;
  }
  .hero-placeholder {
    height: 180px;
  }
}
.store-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.store-card {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
}
.store-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}
.store-meta {
  font-size: 12px;
  color: #64748b;
}
.excluded-stores {
  margin-top: 16px;
}
.excluded-wrap {
  max-width: none;
  width: 100%;
  margin: 0;
  padding: 1em;
  background: #ffffff;
  color: #333333;
  font-size: 16px;
  line-height: 1.6;
  font-family: "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", arial,
    sans-serif;
}
.excluded-title {
  margin: 1.1em 0 0.5em;
  font-size: 1.1em;
  font-weight: bold;
  color: #444444;
}
.excluded-title::before {
  content: "■";
  color: #eb5505;
  padding-right: 0.2em;
}
.excluded-title__text {
  margin-right: 0.1em;
}
.excluded-title__badge {
  color: #ff4500;
  font-size: 1.4em;
  font-weight: bold;
}
.excluded-empty {
  border: 1px dashed #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  color: #666666;
}
.excluded-region-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}
.excluded-region-table th {
  padding: 8px;
  border: 1px solid #000000;
  width: 10%;
  white-space: nowrap;
  background-color: #ff4500;
  color: #ffffff;
  text-align: left;
}
.excluded-region-table td {
  padding: 8px;
  border: 1px solid #ffffff;
  background-color: #ffffe0;
}
.excluded-region-table tr:nth-child(even) td {
  background-color: #fffff0;
}
.excluded-region-link {
  text-decoration: underline;
  color: #eb5505;
  display: inline-block;
  margin-right: 10px;
}
.excluded-brand-list {
  list-style: none;
  margin: 8px 0 16px;
  padding: 0;
}
.excluded-brand-list li {
  margin-bottom: 4px;
  font-size: 14px;
}
.excluded-brand-marker {
  color: #eb5505;
  margin-right: 4px;
}
.excluded-brand-link {
  color: #eb5505;
  text-decoration: underline;
}
.tenpo-container {
  display: block;
}
.tenpo_list_title {
  background-color: #ff4500;
  margin-top: 2em;
  padding: 15px;
  color: #ffffff;
}
.tenpo_list_title h2 {
  margin: 0;
  color: #ffffff;
  font-size: 1.1em;
  font-weight: bold;
}
.tenpo_list {
  padding: 10px;
  line-height: 1.8em;
  vertical-align: middle;
  font-size: 12px;
  border-bottom: 1px solid #006c6b;
  border-left: 1px solid #006c6b;
  border-right: 1px solid #006c6b;
}
.tenpo_list_shop {
  width: 350px;
  padding-left: 1px;
  font-size: 85%;
  display: inline-block;
  font-weight: bold;
  padding-right: 30px;
  vertical-align: top;
}
.tenpo_list_add {
  width: 425px;
  font-size: 80%;
  display: inline-block;
  vertical-align: top;
}
.excluded-footer {
  margin-top: 24px;
  padding: 16px 12px;
  background: #f4f4f4;
  border-top: 1px solid #ebebeb;
  text-align: center;
}
.excluded-return {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  max-width: none;
  margin: 0 0 14px;
  background: #eb5505;
  color: #ffffff;
  font-weight: bold;
  padding: 14px 20px;
  border-radius: 8px;
  text-decoration: none;
  position: relative;
}
.excluded-return__arrow {
  width: 10px;
  height: 10px;
  border-top: 3px solid #ffffff;
  border-right: 3px solid #ffffff;
  transform: rotate(45deg);
}
.excluded-footer__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 11px;
}
.excluded-footer__links a {
  color: #0066aa;
  text-decoration: underline;
}
.excluded-footer__copy {
  font-size: 11px;
  color: #666666;
}
@media (max-width: 780px) {
  .tenpo_list_add,
  .tenpo_list_shop {
    width: 100%;
  }
}
.ranking-table {
  margin-top: 16px;
}
.ranking-table__subtitle {
  margin: 6px 0 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
.ranking-table__period {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
.ranking-table__period-label {
  background: var(--ranking-period-label-bg, #f1f5f9);
  color: var(--ranking-period-label-text, #0f172a);
  padding: 2px 8px;
  border-radius: 4px;
}
.ranking-table__date {
  margin-top: 10px;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.ranking-table__table-wrap {
  margin-top: 12px;
  overflow-x: auto;
}
.ranking-table__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 8px;
  color: #0f172a;
  font-weight: 700;
}
.ranking-table__table th {
  background: var(--ranking-header-bg, #f8fafc);
  color: var(--ranking-header-text, #0f172a);
  border: 1px solid var(--ranking-border, #e2e8f0);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
}
.ranking-table__table td {
  background: var(--ranking-cell-bg, #ffffff);
  color: var(--ranking-cell-text, #0f172a);
  border: 1px solid var(--ranking-border, #e2e8f0);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}
.ranking-table__rank {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}
.ranking-table__rank-badge {
  display: inline-flex;
  min-width: 28px;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0 8px;
  background: var(--ranking-rank-bg, #e2e8f0);
  color: var(--ranking-rank-text, #0f172a);
}
.ranking-table__rank-badge.is-top-1 {
  background: var(--ranking-top1-bg, #f59e0b);
}
.ranking-table__rank-badge.is-top-2 {
  background: var(--ranking-top2-bg, #cbd5f5);
}
.ranking-table__rank-badge.is-top-3 {
  background: var(--ranking-top3-bg, #fb923c);
}
.ranking-table__notes {
  margin: 12px 0 0;
  padding-left: 1em;
  text-indent: -1em;
  color: #64748b;
  font-size: 12px;
}
.payment-guide {
  margin-top: 16px;
}
.payment-guide__body {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  .tabbed-notes__label {
    font-size: 14px;
  }
  .tabbed-notes__panel {
    padding: 0 20px 24px;
  }
  .tabbed-notes__cta-image {
    max-width: 100%;
  }
  line-height: 1.7;
  font-weight: 600;
}
.payment-guide__link {
  color: #bf1d20;
  text-decoration: underline;
  font-weight: 700;
}
.payment-guide__alert {
  margin-top: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #bf1d20;
  line-height: 1.7;
}
.payment-guide__image {
  margin-top: 12px;
  text-align: center;
}
.payment-guide__image img {
  max-width: 240px;
  width: 100%;
  height: auto;
  display: inline-block;
}
.payment-guide__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  border: 1px dashed #e2e8f0;
  color: #64748b;
  border-radius: 6px;
}
.tabbed-notes {
  margin-top: 16px;
}
.tabbed-notes__wrap {
  display: flex;
  flex-wrap: wrap;
  margin: 0 0 4px;
  border-bottom: 1px solid var(--tab-border, #000000);
}
.tabbed-notes__label {
  color: var(--tab-inactive-text, #000000);
  background: var(--tab-inactive-bg, #dddddd);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  text-align: center;
  padding: 10px 8px;
  order: -1;
  position: relative;
  z-index: 1;
  cursor: pointer;
  border-radius: 16px 16px 0 0;
  flex: 1;
}
.tabbed-notes__label:not(:last-of-type) {
  border-right: 1px solid var(--tab-border, #000000);
}
.tabbed-notes__label-top {
  display: block;
  font-size: 12px;
  line-height: 1.2;
}
.tabbed-notes__label-bottom {
  display: block;
  line-height: 1.2;
}
.tabbed-notes--sticky .tabbed-notes__wrap {
  border-bottom: none;
  gap: 6px;
}
.tabbed-notes--sticky .tabbed-notes__label {
  border: 1px solid var(--tab-border, #000000);
  border-radius: 10px 10px 4px 4px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
}
.tabbed-notes--sticky .tabbed-notes__label:not(:last-of-type) {
  border-right: none;
}
.tabbed-notes--underline .tabbed-notes__wrap {
  gap: 12px;
  border-bottom: 1px solid var(--tab-border, #000000);
}
.tabbed-notes--underline .tabbed-notes__label {
  background: transparent;
  border-radius: 0;
  padding: 8px 4px;
}
.tabbed-notes--underline .tabbed-notes__label:not(:last-of-type) {
  border-right: none;
}
.tabbed-notes--underline .tabbed-notes__switch:checked + .tabbed-notes__label {
  background: transparent;
  color: var(--tab-active-bg, #000000);
  box-shadow: inset 0 -2px 0 var(--tab-active-bg, #000000);
}
.tabbed-notes--popout .tabbed-notes__wrap {
  gap: 8px;
}
.tabbed-notes--popout .tabbed-notes__label {
  border: 1px solid var(--tab-border, #000000);
  border-bottom: 1px solid var(--tab-border, #000000);
  border-radius: 14px 14px 0 0;
}
.tabbed-notes--popout .tabbed-notes__label:not(:last-of-type) {
  border-right: none;
}
.tabbed-notes--popout .tabbed-notes__switch:checked + .tabbed-notes__label {
  border-bottom-color: var(--tab-content-bg, #ffffff);
  margin-bottom: -1px;
}
.tabbed-notes--popout .tabbed-notes__switch:checked + .tabbed-notes__label::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: var(--tab-active-bg, #000000) transparent transparent;
}
.tabbed-notes__content {
  width: 100%;
  height: 0;
  overflow: hidden;
  opacity: 0;
}
.tabbed-notes__switch:checked + .tabbed-notes__label {
  color: var(--tab-active-text, #ffffff);
  background-color: var(--tab-active-bg, #000000);
}
.tabbed-notes__switch:checked + .tabbed-notes__label + .tabbed-notes__content {
  height: auto;
  overflow: auto;
  opacity: 1;
  transition: 0.5s opacity;
}
.tabbed-notes__switch {
  display: none;
}
.tabbed-notes__panel {
  background-color: var(--tab-content-bg, #ffffff);
  border: 1px solid var(--tab-content-border, #000000);
  border-radius: 0;
  padding: 0 36px 36px;
}
.tabbed-notes__intro {
  margin: 20px 0 0;
  text-align: center;
  font-size: 14px;
}
.tabbed-notes__list {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
}
.tabbed-notes__item {
  position: relative;
  padding-left: 1em;
  text-indent: -1em;
  font-size: 14px;
  line-height: 1.6;
}
.tabbed-notes__item + .tabbed-notes__item {
  margin-top: 6px;
}
.tabbed-notes__item.is-disc::before {
  content: "・";
}
.tabbed-notes__item.is-accent {
  color: var(--tab-accent, #eb5505);
}
.tabbed-notes__item.is-bold {
  font-weight: 700;
}
.tabbed-notes__sublist {
  margin-top: 6px;
  padding-left: 1em;
  list-style: none;
}
.tabbed-notes__sublist li {
  padding-left: 1em;
  text-indent: -1em;
  font-size: 13px;
  line-height: 1.6;
}
.tabbed-notes__footnote {
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}
.tabbed-notes__cta {
  margin-top: 18px;
  text-align: center;
}
.tabbed-notes__cta-text {
  margin: 0 0 8px;
  font-size: 14px;
}
.tabbed-notes__cta-link {
  color: var(--tab-accent, #eb5505);
  text-decoration: underline;
  font-weight: 700;
}
.tabbed-notes__cta-image {
  display: block;
  margin: 12px auto 0;
  max-width: 65%;
}
.tabbed-notes__cta-image img {
  display: block;
  width: 100%;
  height: auto;
}
.tabbed-notes__button {
  margin-top: 16px;
  text-align: center;
}
.tabbed-notes__button-link {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 999px;
  background: var(--tab-active-bg, #000000);
  color: var(--tab-active-text, #ffffff);
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
}
@media (max-width: 640px) {
  .ranking-table__date {
    font-size: 16px;
  }
  .ranking-table__table th,
  .ranking-table__table td {
    font-size: 12px;
  }
  .payment-guide__body,
  .payment-guide__alert {
    font-size: 12px;
  }
  .excluded-wrap {
    font-size: 0.9em;
  }
}
.note {
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}
.empty {
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}
.footer {
  margin-top: 32px;
  padding: 16px 0;
  background: #f8fafc;
  font-size: 12px;
  color: #64748b;
}
`;

export const exportProjectToZip = async (
  project: ProjectState,
  ui?: ExportUiState
): Promise<ExportResult> => {
  const zip = new JSZip();
  const startedAt = performance.now();
  const logStep = (label: string, payload?: Record<string, unknown>) => {
    const elapsed = Math.round(performance.now() - startedAt);
    if (payload) {
      console.log(`[export] ${label} (${elapsed}ms)`, payload);
    } else {
      console.log(`[export] ${label} (${elapsed}ms)`);
    }
  };
  const warnings: ExportWarning[] = [];
  logStep("assets collect start");
  const assetMeta = await buildAssetMetaList(project, zip, warnings);
  const footerDefaultUrlMap = await collectFooterDefaultAssets(zip, warnings);
  logStep("assets collect done", { count: assetMeta.length });
  const projectFile = buildProjectFile(project, assetMeta);
  const manifest = await buildManifest(projectFile);
  const projectJson = JSON.stringify(projectFile, null, 2);
  const manifestJson = JSON.stringify(manifest, null, 2);
  const storesCsv = buildStoresCsv(project);
  const storesNormalized = buildStoresNormalizedJson(project);
  const storesEmbed = buildStoresEmbed(project);
  const { urlMap, filenameMap } = buildAssetReplacementMaps(project, assetMeta);
  const imageMeta = assetMeta.filter((entry) => entry.kind === "image");

  let exportHtml = "";
  let exportCss = "";
  let exportJs = "";
  let distGenerated = false;
  let distError = "";

  try {
    logStep("dist generate start");
    const previewDoc = getPreviewFrameDocument();
    const cssText = await resolveExportCss(warnings, previewDoc ?? undefined);
    const normalizedCss = rewriteAssetUrlsInCss(
      replaceAssetDataUrls(cssText, urlMap),
      urlMap,
      filenameMap
    );
    const composedCss = `${normalizedCss}\n${BACKGROUND_LAYER_CSS}`;
    exportCss = composedCss;
    exportJs = storesEmbed ? buildStoresAppJs() : "(() => {})();";
    const htmlFromPreview = buildExportHtmlFromPreviewDom(
      project,
      composedCss,
      previewDoc
    );
    let htmlWithCss = "";
    if (htmlFromPreview) {
      htmlWithCss = htmlFromPreview;
    } else {
      const htmlFromApi = await fetchExportHtmlFromApi(project, ui);
      htmlWithCss = injectInlineCss(htmlFromApi, composedCss);
    }
    htmlWithCss = rewriteAssetUrlsInHtml(
      replaceAssetDataUrls(htmlWithCss, urlMap),
      urlMap,
      filenameMap
    );
    htmlWithCss = replaceDefaultFooterUrls(htmlWithCss, footerDefaultUrlMap);
    const externalUrls = collectUrlsFromHtmlCss(htmlWithCss, composedCss);
    const externalUrlMap = await collectExternalAssets(
      zip,
      externalUrls,
      warnings
    );
    if (externalUrlMap.size > 0) {
      htmlWithCss = replaceExternalUrls(htmlWithCss, externalUrlMap);
      exportCss = replaceExternalUrls(exportCss, externalUrlMap);
    }
    if (storesEmbed) {
      const storesScript =
        `<script type="application/json" id="stores-data">` +
        `${JSON.stringify(storesEmbed)}` +
        `</script>` +
        `<script defer src="./assets/app.js"></script>`;
      htmlWithCss = htmlWithCss.replace("</body>", `${storesScript}</body>`);
    }
    exportHtml = applyBackgroundLayersToHtml(htmlWithCss, project, assetMeta);

    if (/\/_next\//.test(exportHtml) || /src="\//.test(exportHtml)) {
      console.warn("[export] html still contains absolute paths", {
        hasNext: /\/_next\//.test(exportHtml),
        hasSrcSlash: /src="\//.test(exportHtml),
      });
    }

    if (/url\(\s*['"]?\//.test(exportCss)) {
      console.warn("[export] css still contains absolute urls");
    }

    distGenerated = true;
    logStep("dist generate done", {
      htmlChars: exportHtml.length,
      cssChars: exportCss.length,
      jsChars: exportJs.length,
    });
  } catch (error) {
    distError = error instanceof Error ? error.message : String(error);
    warnings.push({
      type: "dist",
      message: "dist generation failed",
      detail: distError,
    });
    console.warn("[export] dist generation failed", error);
    logStep("dist generate failed", { error: distError });
    exportHtml = buildDistPlaceholderHtml(project, distError);
  }

  zip.file("project.json", projectJson);
  zip.file("manifest.json", manifestJson);
  zip.folder("dist");

  if (storesCsv) {
    zip.file("assets/data/stores.csv", storesCsv);
  }
  if (storesNormalized) {
    zip.file("assets/data/stores.normalized.json", storesNormalized);
  }

  if (!exportHtml) {
    exportHtml = buildDistPlaceholderHtml(project, distError);
  }

  zip.file("dist/index.html", exportHtml);
  logStep("dist index.html added", { ok: true, generated: distGenerated });
  zip.file("index.html", exportHtml);
  logStep("root index.html added", { ok: true, generated: distGenerated });

  if (distGenerated) {
    zip.file("dist/assets/styles.css", exportCss);
    zip.file("dist/assets/app.js", exportJs);
    zip.file("assets/styles.css", exportCss);
    zip.file("assets/app.js", exportJs);
  } else {
    zip.file("dist/README.txt", buildDistFailureReadme(distError));
    zip.file("README.txt", buildDistFailureReadme(distError));
  }

  logStep("assets images collected", {
    count: imageMeta.length,
    failed: warnings.filter((warning) => warning.type === "asset").length,
  });
  logStep("dist images", {
    paths: imageMeta.map((entry) => `dist/${entry.path}`),
  });

  const entryList = Object.keys(zip.files);
  logStep("zip entries", { count: entryList.length, files: entryList });

  let blob: Blob;
  try {
    blob = await withTimeout(
      zip.generateAsync({ type: "blob" }),
      20000,
      "ZIP generate"
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    warnings.push({
      type: "other",
      message: "zip generation failed, fallback to minimal zip",
      detail,
    });
    console.warn("[export] zip generation failed", error);
    const fallbackZip = new JSZip();
    fallbackZip.file("project.json", projectJson);
    fallbackZip.file("manifest.json", manifestJson);
    if (storesCsv) {
      fallbackZip.file("assets/data/stores.csv", storesCsv);
    }
    if (storesNormalized) {
      fallbackZip.file("assets/data/stores.normalized.json", storesNormalized);
    }
    fallbackZip.folder("dist");
    blob = await withTimeout(
      fallbackZip.generateAsync({ type: "blob" }),
      10000,
      "ZIP generate fallback"
    );
  }
  logStep("zip generate done", { size: blob.size });

  const report: ExportReport = {
    projectJsonSize: projectJson.length,
    assetCount: assetMeta.length,
    assetFailures: warnings.filter((warning) => warning.type === "asset")
      .length,
    distGenerated,
    distHtmlSize: exportHtml.length,
    distCssSize: exportCss.length,
    distJsSize: exportJs.length,
    zipSize: blob.size,
    warnings,
  };

  return { blob, report };
};

export const triggerZipDownload = (blob: Blob, projectName: string) => {
  const filenameBase = sanitizeFilename(projectName || "campaign-lp");
  const filename = `campaign-lp_${filenameBase || "project"}.zip`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
