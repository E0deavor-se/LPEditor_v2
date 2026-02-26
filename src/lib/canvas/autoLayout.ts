/* ───────────────────────────────────────────────
   Auto Layout Engine – ルールベース自動配置 (v2)
   レイヤーを分類し、プリセットに沿って PC 配置 → SP 自動生成
   ─────────────────────────────────────────────── */

import type {
  CanvasDocument,
  CanvasLayer,
  CanvasLayout,
} from "@/src/types/canvas";
import { fitTextToBox, fitButtonText } from "@/src/lib/canvas/fitText";

/* ========== プリセット種別 ========== */

export type AutoLayoutPreset = "centeredHero" | "splitHero" | "cardStack";

export const AUTO_LAYOUT_PRESETS: {
  id: AutoLayoutPreset;
  label: string;
  description: string;
}[] = [
  { id: "centeredHero", label: "中央ヒーロー", description: "中央寄せ・縦積みレイアウト" },
  { id: "splitHero",   label: "左右分割",     description: "左テキスト + 右画像" },
  { id: "cardStack",   label: "カード積み",   description: "カード風ブロック構成" },
];

/* ========== レイヤー分類 ========== */

export type ClassifiedLayers = {
  heroImageId: string | null;
  subImageIds: string[];
  headingIds: string[];
  bodyIds: string[];
  ctaIds: string[];
  decoIds: string[];
};

/**
 * レイヤーを役割別に分類する。
 * - image のうち最大面積を hero、次点を subImage、残りを装飾
 * - button は CTA
 * - text は fontSize >= 28 OR fontWeight >= 700 なら見出し、それ以外は本文
 * - shape / svg は装飾
 */
export function classifyLayers(layers: CanvasLayer[]): ClassifiedLayers {
  const result: ClassifiedLayers = {
    heroImageId: null,
    subImageIds: [],
    headingIds: [],
    bodyIds: [],
    ctaIds: [],
    decoIds: [],
  };

  const images: CanvasLayer[] = [];

  for (const layer of layers) {
    if (layer.hidden) continue;

    switch (layer.content.kind) {
      case "image":
        images.push(layer);
        break;
      case "button":
        result.ctaIds.push(layer.id);
        break;
      case "text": {
        const fs = layer.style.fontSize ?? 16;
        const fw = layer.style.fontWeight ?? 400;
        if (fs >= 28 || fw >= 700) {
          result.headingIds.push(layer.id);
        } else {
          result.bodyIds.push(layer.id);
        }
        break;
      }
      case "shape":
      case "svg":
        result.decoIds.push(layer.id);
        break;
      default:
        break;
    }
  }

  // 画像を面積降順でソート
  const sorted = [...images].sort((a, b) => {
    const areaA = a.variants.pc.w * a.variants.pc.h;
    const areaB = b.variants.pc.w * b.variants.pc.h;
    return areaB - areaA;
  });

  if (sorted.length > 0) {
    result.heroImageId = sorted[0].id;
  }
  // 2番目以降のある程度大きい画像は subImage
  for (let i = 1; i < sorted.length; i++) {
    const area = sorted[i].variants.pc.w * sorted[i].variants.pc.h;
    if (area >= 10000) {
      // 100x100 以上なら subImage
      result.subImageIds.push(sorted[i].id);
    } else {
      result.decoIds.push(sorted[i].id);
    }
  }

  return result;
}

/* ========== 共通定数・ヘルパー ========== */

const GRID = 8;

/** 計算済みのレイアウト定数 */
interface LayoutConstants {
  pcW: number;
  pcH: number;
  marginX: number;
  gutter: number;
  baseY: number;
  contentW: number;
}

function deriveConstants(doc: CanvasDocument): LayoutConstants {
  const pcW = doc.meta.size.pc.width;
  const pcH = doc.meta.size.pc.height;
  const marginX = Math.max(80, grid(pcW * 0.06));
  const gutter = 40;
  const baseY = 120;
  const contentW = pcW - marginX * 2;
  return { pcW, pcH, marginX, gutter, baseY, contentW };
}

/** GRID 単位にスナップ */
const grid = (v: number): number => Math.round(v / GRID) * GRID;

function makeLayout(
  x: number, y: number, w: number, h: number, z: number,
): CanvasLayout {
  return { x: grid(x), y: grid(y), w: grid(w), h: grid(h), r: 0, z };
}

/** テキストレイヤーの推定高さ（fontSize × 行数概算） */
function estimateTextHeight(layer: CanvasLayer, width: number): number {
  if (layer.content.kind !== "text") return grid(60);
  const fs = layer.style.fontSize ?? 16;
  const lh = layer.style.lineHeight ?? 1.6;
  const charW = fs * 0.55; // 平均文字幅概算
  const textLen = layer.content.text.length;
  const charsPerLine = Math.max(1, Math.floor(width / charW));
  const lines = Math.max(1, Math.ceil(textLen / charsPerLine));
  return grid(Math.ceil(lines * fs * lh) + 8);
}

/**
 * 仕上げステップ: 全レイヤーの PC 配置を GRID に再スナップし、
 * 同じ X 座標のレイヤーを左揃えに微調整する。
 */
function finishGridAlignment(doc: CanvasDocument): void {
  for (const layer of doc.layers) {
    const pc = layer.variants.pc;
    pc.x = grid(pc.x);
    pc.y = grid(pc.y);
    pc.w = grid(pc.w);
    pc.h = grid(pc.h);
  }

  // X 座標でグループ化し、同グループ内を左揃え
  const xBuckets = new Map<number, CanvasLayer[]>();
  for (const layer of doc.layers) {
    const bx = Math.round(layer.variants.pc.x / GRID) * GRID;
    const bucket = xBuckets.get(bx) ?? [];
    bucket.push(layer);
    xBuckets.set(bx, bucket);
  }
  for (const [bx, layers] of xBuckets) {
    if (layers.length < 2) continue;
    for (const layer of layers) {
      layer.variants.pc.x = bx;
    }
  }
}

/* ========== プリセット A: Centered Hero ========== */

function applyPresetCenteredHero(
  doc: CanvasDocument,
  classified: ClassifiedLayers,
): void {
  const c = deriveConstants(doc);
  const layerMap = new Map(doc.layers.map((l) => [l.id, l]));
  let cursor = c.baseY;
  let z = 1;

  // ── Hero 画像 ──
  if (classified.heroImageId) {
    const layer = layerMap.get(classified.heroImageId)!;
    const h = grid(Math.min(420, c.pcH * 0.25));
    layer.variants.pc = makeLayout(c.marginX, cursor, c.contentW, h, z++);
    cursor += h + c.gutter;
  }

  // ── 見出し ──
  for (const id of classified.headingIds) {
    const layer = layerMap.get(id)!;
    const fs = layer.style.fontSize ?? 36;
    layer.style.fontSize = Math.max(fs, 32);
    layer.style.textAlign = "center";
    const h = estimateTextHeight(layer, c.contentW);
    layer.variants.pc = makeLayout(c.marginX, cursor, c.contentW, h, z++);
    cursor += h + 24;
  }

  // ── 本文 (幅を 800 or contentW に制限) ──
  const bodyMaxW = Math.min(c.contentW, 800);
  for (const id of classified.bodyIds) {
    const layer = layerMap.get(id)!;
    layer.style.textAlign = "center";
    const bodyX = (c.pcW - bodyMaxW) / 2;
    const h = estimateTextHeight(layer, bodyMaxW);
    layer.variants.pc = makeLayout(bodyX, cursor, bodyMaxW, h, z++);
    cursor += h + 24;
  }

  // ── サブ画像 (中央配置) ──
  for (const id of classified.subImageIds) {
    const layer = layerMap.get(id)!;
    cursor += 8;
    const imgW = Math.min(c.contentW, grid(layer.variants.pc.w));
    const imgH = grid(layer.variants.pc.h * (imgW / Math.max(1, layer.variants.pc.w)));
    const imgX = (c.pcW - imgW) / 2;
    layer.variants.pc = makeLayout(imgX, cursor, imgW, imgH, z++);
    cursor += imgH + c.gutter;
  }

  // ── CTA ボタン ──
  for (const id of classified.ctaIds) {
    const layer = layerMap.get(id)!;
    cursor += 16;
    const btnW = 280;
    const btnH = 56;
    const btnX = (c.pcW - btnW) / 2;
    layer.variants.pc = makeLayout(btnX, cursor, btnW, btnH, z++);
    cursor += btnH + c.gutter;
  }

  // ── 装飾 — 右マージン外に配置 ──
  let decoY = c.baseY;
  for (const id of classified.decoIds) {
    const layer = layerMap.get(id)!;
    const dw = grid(Math.min(layer.variants.pc.w, 120));
    const dh = grid(Math.min(layer.variants.pc.h, 120));
    layer.variants.pc = makeLayout(c.pcW - c.marginX + 16, decoY, dw, dh, z++);
    decoY += dh + c.gutter;
  }

  // ── キャンバス高さ自動調整 ──
  doc.meta.size.pc.height = grid(Math.max(cursor + 120, doc.meta.size.pc.height));
}

/* ========== プリセット B: Split Hero ========== */

function applyPresetSplitHero(
  doc: CanvasDocument,
  classified: ClassifiedLayers,
): void {
  const c = deriveConstants(doc);
  const layerMap = new Map(doc.layers.map((l) => [l.id, l]));
  let z = 1;

  // ── カラム幅の算出 (52 : 48 比率) ──
  const innerW = c.contentW - c.gutter;
  const leftW = grid(Math.floor(innerW * 0.52));
  const rightW = grid(innerW - leftW);

  const leftX = c.marginX;
  const rightX = c.marginX + leftW + c.gutter;
  let leftCursor = c.baseY;

  // ── 左列: 見出し ──
  for (const id of classified.headingIds) {
    const layer = layerMap.get(id)!;
    const fs = layer.style.fontSize ?? 36;
    layer.style.fontSize = Math.max(fs, 32);
    layer.style.textAlign = "left";
    const h = estimateTextHeight(layer, leftW);
    layer.variants.pc = makeLayout(leftX, leftCursor, leftW, h, z++);
    leftCursor += h + 24;
  }

  // ── 左列: 本文 ──
  for (const id of classified.bodyIds) {
    const layer = layerMap.get(id)!;
    layer.style.textAlign = "left";
    const h = estimateTextHeight(layer, leftW);
    layer.variants.pc = makeLayout(leftX, leftCursor, leftW, h, z++);
    leftCursor += h + 24;
  }

  // ── 左列: CTA ──
  for (const id of classified.ctaIds) {
    const layer = layerMap.get(id)!;
    leftCursor += 16;
    const btnW = Math.min(leftW, 260);
    layer.variants.pc = makeLayout(leftX, leftCursor, btnW, 56, z++);
    leftCursor += 56 + c.gutter;
  }

  // ── 右列: Hero 画像 (左テキストの高さに合わせる) ──
  const heroH = grid(Math.max(leftCursor - c.baseY, 300));
  if (classified.heroImageId) {
    const layer = layerMap.get(classified.heroImageId)!;
    layer.variants.pc = makeLayout(rightX, c.baseY, rightW, heroH, z++);
  }

  // ── 右列: サブ画像 ──
  let rightCursor = c.baseY + heroH + c.gutter;
  for (const id of classified.subImageIds) {
    const layer = layerMap.get(id)!;
    const imgW = rightW;
    const imgH = grid(layer.variants.pc.h * (imgW / Math.max(1, layer.variants.pc.w)));
    layer.variants.pc = makeLayout(rightX, rightCursor, imgW, imgH, z++);
    rightCursor += imgH + c.gutter;
  }

  // ── 装飾 (右列下に配置) ──
  let decoY = rightCursor;
  for (const id of classified.decoIds) {
    const layer = layerMap.get(id)!;
    const dw = grid(Math.min(layer.variants.pc.w, 120));
    const dh = grid(Math.min(layer.variants.pc.h, 120));
    layer.variants.pc = makeLayout(rightX, decoY, dw, dh, z++);
    decoY += dh + c.gutter;
  }

  const bottomY = Math.max(leftCursor, rightCursor, decoY) + 120;
  doc.meta.size.pc.height = grid(Math.max(bottomY, doc.meta.size.pc.height));
}

/* ========== プリセット C: Card Stack ========== */

function applyPresetCardStack(
  doc: CanvasDocument,
  classified: ClassifiedLayers,
): void {
  const c = deriveConstants(doc);
  const layerMap = new Map(doc.layers.map((l) => [l.id, l]));
  let z = 1;

  let cursor = c.baseY;

  // ── Hero (全幅、上部) ──
  if (classified.heroImageId) {
    const layer = layerMap.get(classified.heroImageId)!;
    const h = grid(Math.min(c.contentW * 0.4, 360));
    layer.variants.pc = makeLayout(c.marginX, cursor, c.contentW, h, z++);
    cursor += h + c.gutter;
  }

  // ── カード領域 ──
  // テキストをペア（見出し + 本文）でカードに分配
  const headings = [...classified.headingIds];
  const bodies = [...classified.bodyIds];
  const pairs: { headingId?: string; bodyId?: string }[] = [];

  // 見出しと本文をペアリング
  const maxPairs = Math.max(headings.length, bodies.length, 1);
  for (let i = 0; i < maxPairs; i++) {
    pairs.push({
      headingId: headings[i],
      bodyId: bodies[i],
    });
  }

  const cardCount = Math.max(1, Math.min(3, pairs.length));
  const cardGap = c.gutter;
  const cardW = grid((c.contentW - cardGap * (cardCount - 1)) / cardCount);
  const cardPad = 24;

  // テキストペアをカードに分配
  const cardPairs: typeof pairs[] = Array.from({ length: cardCount }, () => []);
  pairs.forEach((pair, i) => {
    cardPairs[i % cardCount].push(pair);
  });

  // カードに使う背景 shape の割り当て
  const bgShapeIds = classified.decoIds.filter((id) => {
    const layer = layerMap.get(id);
    return layer?.content.kind === "shape";
  });
  const usedDecoIds = new Set<string>();

  const cardStartY = cursor;
  let maxCardBottom = cursor;

  for (let i = 0; i < cardCount; i++) {
    const cardX = c.marginX + i * (cardW + cardGap);
    let innerY = cardStartY + cardPad;

    // カード背景として shape を割り当て
    if (bgShapeIds[i]) {
      const bgLayer = layerMap.get(bgShapeIds[i])!;
      bgLayer.style.opacity = 0.06;
      bgLayer.style.radius = 16;
      usedDecoIds.add(bgShapeIds[i]);
      // 背景は z=0 とし、カードサイズは後で調整
      bgLayer.variants.pc = makeLayout(cardX, cardStartY, cardW, 320, 0);
    }

    for (const pair of cardPairs[i]) {
      // カード内見出し
      if (pair.headingId) {
        const layer = layerMap.get(pair.headingId)!;
        layer.style.fontSize = Math.max(layer.style.fontSize ?? 24, 22);
        layer.style.textAlign = "left";
        const textW = cardW - cardPad * 2;
        const h = estimateTextHeight(layer, textW);
        layer.variants.pc = makeLayout(cardX + cardPad, innerY, textW, h, z++);
        innerY += h + 12;
      }
      // カード内本文
      if (pair.bodyId) {
        const layer = layerMap.get(pair.bodyId)!;
        layer.style.textAlign = "left";
        const textW = cardW - cardPad * 2;
        const h = estimateTextHeight(layer, textW);
        layer.variants.pc = makeLayout(cardX + cardPad, innerY, textW, h, z++);
        innerY += h + 16;
      }
    }

    // カード背景の高さを内容に合わせる
    const cardH = grid(Math.max(innerY - cardStartY + cardPad, 200));
    if (bgShapeIds[i]) {
      const bgLayer = layerMap.get(bgShapeIds[i])!;
      bgLayer.variants.pc.h = cardH;
    }
    maxCardBottom = Math.max(maxCardBottom, cardStartY + cardH);
  }

  cursor = maxCardBottom + c.gutter;

  // ── サブ画像 (全幅) ──
  for (const id of classified.subImageIds) {
    const layer = layerMap.get(id)!;
    const imgW = c.contentW;
    const imgH = grid(layer.variants.pc.h * (imgW / Math.max(1, layer.variants.pc.w)));
    layer.variants.pc = makeLayout(c.marginX, cursor, imgW, imgH, z++);
    cursor += imgH + c.gutter;
  }

  // ── CTA (2列配置: 複数ある場合は横並び、単体なら中央) ──
  if (classified.ctaIds.length === 1) {
    const layer = layerMap.get(classified.ctaIds[0])!;
    const btnW = 280;
    const btnX = (c.pcW - btnW) / 2;
    layer.variants.pc = makeLayout(btnX, cursor, btnW, 56, z++);
    cursor += 56 + c.gutter;
  } else if (classified.ctaIds.length >= 2) {
    // 2列 CTA
    const ctaGap = c.gutter;
    const ctaW = grid((c.contentW - ctaGap) / 2);
    classified.ctaIds.forEach((id, i) => {
      const layer = layerMap.get(id)!;
      const col = i % 2;
      const ctaX = c.marginX + col * (ctaW + ctaGap);
      const row = Math.floor(i / 2);
      layer.variants.pc = makeLayout(ctaX, cursor + row * (56 + 16), ctaW, 56, z++);
    });
    const ctaRows = Math.ceil(classified.ctaIds.length / 2);
    cursor += ctaRows * (56 + 16) + c.gutter;
  }

  // ── 残りの装飾 (カード背景に使わなかったもの) ──
  let decoY = cursor;
  for (const id of classified.decoIds) {
    if (usedDecoIds.has(id)) continue;
    const layer = layerMap.get(id)!;
    const dw = grid(Math.min(layer.variants.pc.w, 120));
    const dh = grid(Math.min(layer.variants.pc.h, 120));
    layer.variants.pc = makeLayout(c.marginX, decoY, dw, dh, z++);
    decoY += dh + c.gutter;
  }

  doc.meta.size.pc.height = grid(Math.max(cursor + 120, doc.meta.size.pc.height));
}

/* ========== SP自動変換 ========== */

/**
 * PC レイアウトから SP variants を自動生成する。
 * - x / w はスケール比で縮小し SP マージン内に収める
 * - 縦積み構造のため y はそのまま維持
 * - フォントサイズを SP 向けに自動縮小
 */
function generateSpVariants(doc: CanvasDocument): void {
  const pcW = doc.meta.size.pc.width;
  const spW = doc.meta.size.sp.width;
  const sx = spW / pcW;
  const spMargin = 16;

  // y 座標の再配置: PC と同じ y 順でレイヤーを並べ直す
  const sorted = [...doc.layers].sort((a, b) => {
    const ay = a.variants.pc.y;
    const by = b.variants.pc.y;
    if (ay !== by) return ay - by;
    return a.variants.pc.x - b.variants.pc.x;
  });

  // 2 パスアプローチ: まず比率変換し、次にはみ出し修正
  for (const layer of sorted) {
    const pc = layer.variants.pc;
    let x = grid(pc.x * sx);
    let w = grid(pc.w * sx);
    const y = pc.y; // y は PC 値を維持
    let h = pc.h;

    // SP では幅が小さすぎる場合は全幅に
    if (w < 40) {
      x = spMargin;
      w = spW - spMargin * 2;
    }

    // はみ出し補正
    if (x < spMargin) {
      w = Math.max(w, 40);
      x = spMargin;
    }
    if (x + w > spW - spMargin) {
      w = spW - spMargin - x;
      if (w < 40) {
        x = spMargin;
        w = spW - spMargin * 2;
      }
    }

    // テキストの高さを SP 幅に対して再計算
    if (layer.content.kind === "text" || layer.content.kind === "button") {
      h = estimateTextHeight(layer, w);
    }

    layer.variants.sp = { x: grid(x), y: grid(y), w: grid(w), h: grid(h), r: pc.r, z: pc.z };
  }

  // SP キャンバス高さ調整
  let maxBottom = 0;
  for (const layer of doc.layers) {
    const sp = layer.variants.sp;
    maxBottom = Math.max(maxBottom, sp.y + sp.h);
  }
  doc.meta.size.sp.height = grid(Math.max(maxBottom + 120, doc.meta.size.sp.height));
}

/* ========== Fit Text 仕上げ ========== */

/**
 * レイヤーの role（見出し/本文/ボタン）を判定する。
 */
function layerRole(
  layer: CanvasLayer,
  classified: ClassifiedLayers,
): "heading" | "body" | "button" | null {
  if (classified.headingIds.includes(layer.id)) return "heading";
  if (classified.bodyIds.includes(layer.id)) return "body";
  if (classified.ctaIds.includes(layer.id)) return "button";
  return null;
}

/** role × device ごとの Fit Text ルール */
const FIT_RULES_PC = {
  heading: { maxFont: 42, minFont: 18, maxLines: 2, lh: 1.25 },
  body:    { maxFont: 18, minFont: 12, maxLines: 4, lh: 1.6  },
  button:  { maxFont: 18, minFont: 12, maxLines: 1, lh: 1.2  },
} as const;

const FIT_RULES_SP = {
  heading: { maxFont: 32, minFont: 16, maxLines: 2, lh: 1.2  },
  body:    { maxFont: 16, minFont: 11, maxLines: 5, lh: 1.55 },
  button:  { maxFont: 16, minFont: 11, maxLines: 1, lh: 1.15 },
} as const;

/**
 * PC variants に対して Fit Text を適用する。
 * text / button レイヤーの fontSize / lineHeight を調整して
 * 割り当て済みの boxW × boxH に収める。
 */
function applyFitTextPc(
  doc: CanvasDocument,
  classified: ClassifiedLayers,
): void {
  for (const layer of doc.layers) {
    if (layer.hidden) continue;
    const role = layerRole(layer, classified);
    if (!role) continue;

    const pc = layer.variants.pc;
    const rules = FIT_RULES_PC[role];

    if (role === "button") {
      if (layer.content.kind !== "button") continue;
      const result = fitButtonText({
        label: layer.content.label,
        boxW: pc.w,
        boxH: pc.h,
        fontSize: Math.min(layer.style.fontSize ?? 16, rules.maxFont),
        letterSpacing: layer.style.letterSpacing ?? 0,
        minFontSize: rules.minFont,
      });
      layer.style.fontSize = result.fontSize;
      // ボタン幅を少し広げる必要がある場合
      if (result.suggestedW !== null) {
        const delta = result.suggestedW - pc.w;
        pc.w = grid(result.suggestedW);
        pc.x = grid(pc.x - delta / 2);
      }
    } else {
      if (layer.content.kind !== "text") continue;
      const curFs = layer.style.fontSize ?? 16;
      const result = fitTextToBox({
        text: layer.content.text,
        boxW: pc.w,
        boxH: pc.h,
        fontSize: curFs,
        lineHeight: layer.style.lineHeight ?? rules.lh,
        letterSpacing: layer.style.letterSpacing ?? 0,
        maxLines: rules.maxLines,
        minFontSize: rules.minFont,
        maxFontSize: rules.maxFont,
        step: 1,
      });
      layer.style.fontSize = result.fontSize;
      layer.style.lineHeight = result.lineHeight;
    }
  }
}

/**
 * SP variants に対して Fit Text を適用する。
 * style.fontSize は PC / SP 共有のため、SP で必要なら
 * PC 値より小さいほうを採用し、SP の boxH も再計算して反映する。
 */
function applyFitTextSp(
  doc: CanvasDocument,
  classified: ClassifiedLayers,
): void {
  for (const layer of doc.layers) {
    if (layer.hidden) continue;
    const role = layerRole(layer, classified);
    if (!role) continue;

    const sp = layer.variants.sp;
    const rules = FIT_RULES_SP[role];

    if (role === "button") {
      if (layer.content.kind !== "button") continue;
      const spMaxFs = Math.min(layer.style.fontSize ?? 16, rules.maxFont);
      const result = fitButtonText({
        label: layer.content.label,
        boxW: sp.w,
        boxH: sp.h,
        fontSize: spMaxFs,
        letterSpacing: layer.style.letterSpacing ?? 0,
        minFontSize: rules.minFont,
      });
      // SP では fontSize を PC と比較し、小さい方を共有 style に書く
      layer.style.fontSize = Math.min(layer.style.fontSize ?? 16, result.fontSize);
      if (result.suggestedW !== null) {
        const spW = doc.meta.size.sp.width;
        const spMargin = 16;
        sp.w = grid(Math.min(result.suggestedW, spW - spMargin * 2));
        sp.x = grid((spW - sp.w) / 2);
      }
    } else {
      if (layer.content.kind !== "text") continue;
      const pcFs = layer.style.fontSize ?? 16;
      const spMaxFs = Math.min(pcFs, rules.maxFont);
      const result = fitTextToBox({
        text: layer.content.text,
        boxW: sp.w,
        boxH: sp.h,
        fontSize: spMaxFs,
        lineHeight: rules.lh,
        letterSpacing: layer.style.letterSpacing ?? 0,
        maxLines: rules.maxLines,
        minFontSize: rules.minFont,
        maxFontSize: spMaxFs,
        step: 1,
      });

      // fontSize: PC/SP 共有 → 小さいほうに統一
      // (SP で途切れるのを防ぐため SP 側を優先)
      layer.style.fontSize = Math.min(pcFs, result.fontSize);
      layer.style.lineHeight = result.lineHeight;

      // SP boxH を結果に合わせて再計算
      if (!result.unchanged) {
        const estH = estimateTextHeight(layer, sp.w);
        sp.h = grid(Math.max(estH, sp.h));
      }
    }
  }
}

/* ========== メイン関数 ========== */

/**
 * CanvasDocument のレイヤーを指定プリセットで自動配置する。
 * 1. レイヤー分類
 * 2. プリセット適用（PC配置）
 * 3. グリッドスナップ仕上げ
 * 4. PC Fit Text
 * 5. SP variants 自動生成
 * 6. SP Fit Text
 * @returns 新しい CanvasDocument（元のオブジェクトは変更しない）
 */
export function autoLayoutCanvas(
  document: CanvasDocument,
  preset: AutoLayoutPreset = "centeredHero",
): CanvasDocument {
  // deep clone
  const doc: CanvasDocument = JSON.parse(JSON.stringify(document));

  if (doc.layers.length === 0) return doc;

  const classified = classifyLayers(doc.layers);

  // 1. プリセット適用
  switch (preset) {
    case "centeredHero":
      applyPresetCenteredHero(doc, classified);
      break;
    case "splitHero":
      applyPresetSplitHero(doc, classified);
      break;
    case "cardStack":
      applyPresetCardStack(doc, classified);
      break;
  }

  // 2. グリッド仕上げ + 左揃え微調整
  finishGridAlignment(doc);

  // 3. PC テキストフィット
  applyFitTextPc(doc, classified);

  // 4. SP 自動生成
  generateSpVariants(doc);

  // 5. SP テキストフィット
  applyFitTextSp(doc, classified);

  return doc;
}
