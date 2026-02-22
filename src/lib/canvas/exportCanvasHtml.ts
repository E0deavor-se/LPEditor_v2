/* ───────────────────────────────────────────────
   Canvas → HTML/CSS 生成  (ZIP export 用)
   absolute 配置の PC/SP 切替 HTML を生成する
   ─────────────────────────────────────────────── */

import type {
  CanvasDocument,
  CanvasLayer,
  CanvasLayout,
  CanvasBackground,
  LayerStyle,
  CanvasPageData,
} from "@/src/types/canvas";

/* ---------- helpers ---------- */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const px = (n: number) => `${n}px`;

/* ---------- Background CSS ---------- */

const bgToCss = (
  bg: CanvasBackground,
  resolveAsset?: (id: string) => string
): string => {
  switch (bg.type) {
    case "solid":
      return `background-color: ${bg.color};`;
    case "gradient": {
      const stops = bg.stops.map((s) => `${s.color} ${s.pos}%`).join(", ");
      return `background: linear-gradient(${bg.angle}deg, ${stops});`;
    }
    case "image": {
      const url = resolveAsset?.(bg.assetId) ?? bg.assetId;
      return `background-image: url("${url}"); background-size: cover; background-position: center;`;
    }
    default:
      return "background-color: #ffffff;";
  }
};

/* ---------- Layer → CSS string ---------- */

const layerPositionCss = (layout: CanvasLayout): string => {
  const parts = [
    `position: absolute`,
    `left: ${px(layout.x)}`,
    `top: ${px(layout.y)}`,
    `width: ${px(layout.w)}`,
    `height: ${px(layout.h)}`,
    `z-index: ${layout.z}`,
  ];
  if (layout.r) parts.push(`transform: rotate(${layout.r}deg)`);
  return parts.join("; ") + ";";
};

const layerStyleCss = (style: LayerStyle): string => {
  const parts: string[] = [];
  if (typeof style.opacity === "number" && style.opacity < 1) {
    parts.push(`opacity: ${style.opacity}`);
  }
  if (style.shadow) parts.push(`box-shadow: ${style.shadow}`);
  return parts.join("; ");
};

const textStyleCss = (style: LayerStyle): string => {
  const parts: string[] = [];
  if (style.fontFamily) parts.push(`font-family: ${style.fontFamily}`);
  if (style.fontSize) parts.push(`font-size: ${px(style.fontSize)}`);
  if (style.fontWeight) parts.push(`font-weight: ${style.fontWeight}`);
  if (style.lineHeight) parts.push(`line-height: ${style.lineHeight}`);
  if (style.letterSpacing) parts.push(`letter-spacing: ${style.letterSpacing}px`);
  if (style.textAlign) parts.push(`text-align: ${style.textAlign}`);
  if (style.textColor) parts.push(`color: ${style.textColor}`);
  parts.push("word-break: break-word", "white-space: pre-wrap", "margin: 0", "padding: 4px");
  return parts.join("; ") + ";";
};

const buttonStyleCss = (style: LayerStyle): string => {
  const parts: string[] = [
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "width: 100%",
    "height: 100%",
    "text-decoration: none",
    "border: none",
    "cursor: pointer",
  ];
  if (style.buttonBgColor) parts.push(`background-color: ${style.buttonBgColor}`);
  if (style.buttonTextColor) parts.push(`color: ${style.buttonTextColor}`);
  if (typeof style.buttonRadius === "number") parts.push(`border-radius: ${px(style.buttonRadius)}`);
  if (style.fontFamily) parts.push(`font-family: ${style.fontFamily}`);
  if (style.fontSize) parts.push(`font-size: ${px(style.fontSize)}`);
  if (style.fontWeight) parts.push(`font-weight: ${style.fontWeight}`);
  return parts.join("; ") + ";";
};

/* ---------- Layer → HTML element ---------- */

const layerToHtml = (
  layer: CanvasLayer,
  device: "pc" | "sp",
  resolveAsset?: (id: string) => string
): string => {
  const layout = layer.variants[device];
  const { content, style, id } = layer;
  const cls = `layer-${id}`;
  const overflow = "overflow: hidden;";
  const posStyle = `${layerPositionCss(layout)} ${layerStyleCss(style)} ${overflow}`;

  switch (content.kind) {
    case "text":
      return `<div class="${cls}" style="${posStyle}"><div style="${textStyleCss(style)}">${esc(content.text)}</div></div>`;
    case "image": {
      const src = resolveAsset?.(content.assetId) ?? content.assetId;
      const r = style.radius ? `border-radius: ${px(style.radius)};` : "";
      return `<div class="${cls}" style="${posStyle}"><img src="${esc(src)}" alt="${esc(content.alt ?? "")}" style="width:100%;height:100%;object-fit:cover;${r}" /></div>`;
    }
    case "shape": {
      const fill = style.fill ?? "#cccccc";
      const stroke = style.stroke ?? "none";
      const sw = style.strokeWidth ?? 0;
      const rad = style.radius ?? 0;
      let svg = "";
      switch (content.shape) {
        case "circle":
          svg = `<svg width="100%" height="100%" viewBox="0 0 ${layout.w} ${layout.h}" preserveAspectRatio="none"><ellipse cx="${layout.w / 2}" cy="${layout.h / 2}" rx="${layout.w / 2 - sw}" ry="${layout.h / 2 - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" /></svg>`;
          break;
        case "triangle":
          svg = `<svg width="100%" height="100%" viewBox="0 0 ${layout.w} ${layout.h}" preserveAspectRatio="none"><polygon points="${layout.w / 2},${sw} ${layout.w - sw},${layout.h - sw} ${sw},${layout.h - sw}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" /></svg>`;
          break;
        default:
          svg = `<svg width="100%" height="100%" viewBox="0 0 ${layout.w} ${layout.h}" preserveAspectRatio="none"><rect x="${sw / 2}" y="${sw / 2}" width="${layout.w - sw}" height="${layout.h - sw}" rx="${rad}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" /></svg>`;
      }
      return `<div class="${cls}" style="${posStyle}">${svg}</div>`;
    }
    case "button":
      return `<div class="${cls}" style="${posStyle}"><a href="${esc(content.href)}" target="_blank" rel="noopener" style="${buttonStyleCss(style)}">${esc(content.label)}</a></div>`;
    case "svg":
      return `<div class="${cls}" style="${posStyle}">${content.svg}</div>`;
    default:
      return `<div class="${cls}" style="${posStyle}"></div>`;
  }
};

/* ---------- Main export function ---------- */

export type CanvasExportOptions = {
  /** アセットID → assets/... パスへの変換 */
  resolveAsset?: (id: string) => string;
};

/**
 * CanvasDocument → { html, css }
 * html: PC div + SP div
 * css: @media で切替
 */
export const exportCanvasHtml = (
  doc: CanvasDocument,
  options?: CanvasExportOptions
): { html: string; css: string } => {
  const resolve = options?.resolveAsset;
  const pcSize = doc.meta.size.pc;
  const spSize = doc.meta.size.sp;
  const bgCss = bgToCss(doc.background, resolve);

  const visibleLayers = doc.layers.filter((l) => !l.hidden && l.content.kind !== "group");

  /* ---- PC HTML ---- */
  const pcLayers = visibleLayers
    .filter((l) => !l.visibleOn || l.visibleOn.includes("pc"))
    .sort((a, b) => a.variants.pc.z - b.variants.pc.z)
    .map((l) => layerToHtml(l, "pc", resolve))
    .join("\n      ");

  /* ---- SP HTML ---- */
  const spLayers = visibleLayers
    .filter((l) => !l.visibleOn || l.visibleOn.includes("sp"))
    .sort((a, b) => a.variants.sp.z - b.variants.sp.z)
    .map((l) => layerToHtml(l, "sp", resolve))
    .join("\n      ");

  const html = `
    <div class="canvas-root canvas-pc" style="position:relative;width:${px(pcSize.width)};max-width:100%;margin:0 auto;min-height:${px(pcSize.height)};${bgCss}">
      ${pcLayers}
    </div>
    <div class="canvas-root canvas-sp" style="position:relative;width:${px(spSize.width)};max-width:100%;margin:0 auto;min-height:${px(spSize.height)};${bgCss}">
      ${spLayers}
    </div>`;

  const css = `
/* Canvas page responsive */
.canvas-pc { display: block; }
.canvas-sp { display: none; }
@media (max-width: 767px) {
  .canvas-pc { display: none; }
  .canvas-sp { display: block; }
}
`;

  return { html: html.trim(), css: css.trim() };
};

/* ─────────────────────────────────────────────────────
   Canvas → 独立 LP として完全な index.html を生成する
   (「Canvasのみ書き出し」用)
   ───────────────────────────────────────────────────── */

export type CanvasStandaloneOptions = CanvasExportOptions & {
  /** ページタイトル */
  title?: string;
  /** meta description */
  description?: string;
  /** 追加 <head> タグ (favicon 等) */
  extraHead?: string;
};

/**
 * CanvasDocument → 独立した index.html 文字列を返す。
 * LP モードのセクション・CSS は一切含まない。
 */
export const renderCanvasStandaloneHtml = (
  doc: CanvasDocument,
  options?: CanvasStandaloneOptions,
): string => {
  const { html, css } = exportCanvasHtml(doc, options);
  const title = esc(options?.title ?? "Canvas LP");
  const desc = options?.description ? `<meta name="description" content="${esc(options.description)}" />` : "";
  const extraHead = options?.extraHead ?? "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${desc}
  ${extraHead}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif; background: #ffffff; }
    img { max-width: 100%; }
    a { color: inherit; }
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
};

/* ─────────────────────────────────────────────────────
   Canvas で参照されるアセットIDを収集する
   ───────────────────────────────────────────────────── */

/**
 * CanvasDocument 内で参照されている asset ID の Set を返す。
 * image layer の content.assetId と background image の assetId を含む。
 */
export const collectCanvasAssetIds = (doc: CanvasDocument): Set<string> => {
  const ids = new Set<string>();
  for (const layer of doc.layers) {
    if (layer.content.kind === "image" && layer.content.assetId) {
      ids.add(layer.content.assetId);
    }
  }
  if (doc.background.type === "image" && doc.background.assetId) {
    ids.add(doc.background.assetId);
  }
  return ids;
};

/**
 * CanvasPageData から参照アセットIDを返す便利関数。
 */
export const collectCanvasPageAssetIds = (page: CanvasPageData): Set<string> =>
  collectCanvasAssetIds(page.canvas);
