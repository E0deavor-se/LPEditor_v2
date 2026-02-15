import JSZip from "jszip";
import { buildBackgroundStyle } from "@/src/lib/backgroundSpec";
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
    const targetPath = `assets/footer-defaults/${sanitizeFilename(filename)}`;
    const distPath = toDistAssetPath(targetPath);
    try {
      const asset = await fetchAssetBytes(url);
      zip.file(targetPath, asset.bytes);
      zip.file(distPath, asset.bytes);
      urlMap.set(url, `./${targetPath}`);
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
  const title = escapeHtml(str(project.meta.projectName || "キャンペーンLP"));
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
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
        case "legalNotes": {
          const items = Array.isArray(section.data.items) ? section.data.items : [];
          return `
            <section class="container">
              <h2>${escapeHtml(str(section.data.title || "注意事項"))}</h2>
              <ul>
                ${items
                  .map((item) => `<li>${escapeHtml(str(item))}</li>`)
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
    <title>${escapeHtml(str(project.meta.projectName || "キャンペーンLP"))}</title>
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

  if (distGenerated) {
    zip.file("dist/assets/styles.css", exportCss);
    zip.file("dist/assets/app.js", exportJs);
  } else {
    zip.file("dist/README.txt", buildDistFailureReadme(distError));
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
