/* ───────────────────────────────────────────────
   Fit Text – テキストをボックスに収める自動調整
   fontSize / lineHeight を縮小してテキストが指定枠に
   収まるようにする。日本語混在テキスト対応。
   ─────────────────────────────────────────────── */

import { effectiveLength } from "@/src/lib/canvas/jpLineBreak";

/* ========== 入力パラメータ ========== */

export interface FitTextParams {
  /** 対象テキスト */
  text: string;
  /** ボックス幅 (px) */
  boxW: number;
  /** ボックス高さ (px) */
  boxH: number;
  /** 現在の fontSize (px) */
  fontSize: number;
  /** 行の高さ倍率 (例: 1.6) */
  lineHeight: number;
  /** letter-spacing (px) */
  letterSpacing?: number;
  /** font-weight (100-900) */
  fontWeight?: number;
  /** 最大行数（超過時に fontSize を縮小）。省略 = 無制限 */
  maxLines?: number;
  /** 縮小下限 fontSize (px)。デフォルト 10 */
  minFontSize?: number;
  /** 拡大上限 fontSize (px)。デフォルト = fontSize そのまま */
  maxFontSize?: number;
  /** 縮小ステップ (px)。デフォルト 1 */
  step?: number;
}

/* ========== 出力 ========== */

export interface FitTextResult {
  fontSize: number;
  lineHeight: number;
  /** true = 調整なしで収まった */
  unchanged: boolean;
}

/* ========== 公開ヘルパー ========== */

/**
 * 日本語想定の簡易テキスト推定。
 * 禁則処理を加味した effectiveLength を使い、
 * 行頭禁止文字を前の文字とセットで推定する。
 *   avgCharWidth = fontSize * 0.58 + (letterSpacing ?? 0)
 *   charsPerLine = floor(boxW / max(avgCharWidth, 1))
 *   lines        = ceil(effectiveLength(text) / max(charsPerLine, 1))
 *   neededH      = lines * fontSize * lineHeight
 */
export function estimateTextFit(
  text: string,
  boxW: number,
  fontSize: number,
  letterSpacing = 0,
  lineHeight = 1.6,
  fontWeight = 400,
): { lines: number; neededH: number } {
  const weightScale = fontWeight >= 800 ? 1.1 : fontWeight >= 700 ? 1.07 : 1;
  const avgCW = fontSize * 0.62 * weightScale + letterSpacing;
  const usableW = Math.max(1, boxW - 8);
  const charsPerLine = Math.max(1, Math.floor(usableW / Math.max(avgCW, 1)));
  const segments = text.replace(/\r\n?/g, "\n").split("\n");
  const lines = segments.reduce((sum, segment) => {
    const effLen = effectiveLength(segment);
    return sum + Math.max(1, Math.ceil(effLen / Math.max(charsPerLine, 1)));
  }, 0);
  const neededH = lines * fontSize * lineHeight;
  return { lines, neededH };
}

/* ========== メイン関数 ========== */

/**
 * テキストが指定ボックスに収まるように fontSize / lineHeight を調整する。
 * fontSize を step ずつ下げて収まるサイズを探す。
 */
export function fitTextToBox(params: FitTextParams): FitTextResult {
  const {
    text,
    boxW,
    boxH,
    fontSize: initialFs,
    lineHeight: initialLh,
    letterSpacing = 0,
    fontWeight = 400,
    maxLines,
    minFontSize = 10,
    maxFontSize = initialFs,
    step = 1,
  } = params;

  if (!text || text.length === 0) {
    return { fontSize: initialFs, lineHeight: initialLh, unchanged: true };
  }

  // 上限を超えている場合は上限に合わせる
  let fs = Math.min(initialFs, maxFontSize);
  let lh = initialLh;

  // 初回判定
  const first = estimateTextFit(text, boxW, fs, letterSpacing, lh, fontWeight);
  if (first.neededH <= boxH && (!maxLines || first.lines <= maxLines)) {
    return { fontSize: fs, lineHeight: lh, unchanged: fs === initialFs };
  }

  // fontSize を段階的に縮小
  while (fs > minFontSize) {
    fs = Math.max(minFontSize, fs - step);
    const m = estimateTextFit(text, boxW, fs, letterSpacing, lh, fontWeight);
    if (m.neededH <= boxH && (!maxLines || m.lines <= maxLines)) {
      return { fontSize: fs, lineHeight: lh, unchanged: false };
    }
  }

  // fontSize 最小に達しても収まらない場合は lineHeight を詰める
  const lhMin = lh >= 1.5 ? 1.3 : 1.1; // 本文系は1.3まで、見出し系は1.1まで
  const lhStep = 0.05;
  while (lh > lhMin) {
    lh = Math.max(lhMin, lh - lhStep);
    lh = Math.round(lh * 100) / 100; // 小数2桁
    const m = estimateTextFit(text, boxW, fs, letterSpacing, lh, fontWeight);
    if (m.neededH <= boxH && (!maxLines || m.lines <= maxLines)) {
      return { fontSize: fs, lineHeight: lh, unchanged: false };
    }
  }

  // それでも収まらない → 最小値で返す
  return { fontSize: fs, lineHeight: lh, unchanged: false };
}

/* ========== ボタン専用フィット ========== */

/**
 * ボタンラベルを 1 行に収める (maxLines=1 を死守)。
 *
 * 縮小順:
 *  1. fontSize を minFontSize まで下げる
 *  2. paddingX を -4 ずつ減らす（最低 8 まで）
 *  3. boxW を +16〜+32 まで広げる
 */
export function fitButtonText(params: {
  label: string;
  boxW: number;
  boxH: number;
  fontSize: number;
  letterSpacing?: number;
  minFontSize?: number;
  paddingX?: number;
}): { fontSize: number; paddingX: number; suggestedW: number | null } {
  const {
    label,
    boxW,
    fontSize: initialFs,
    letterSpacing = 0,
    minFontSize = 12,
    paddingX: initialPx = 24,
  } = params;

  if (!label) return { fontSize: initialFs, paddingX: initialPx, suggestedW: null };

  const effLen = effectiveLength(label);

  /** 1行に収まるかチェック */
  const fits = (fs: number, px: number, w: number): boolean => {
    const avgCW = fs * 0.58 + letterSpacing;
    const innerW = w - px * 2;
    return effLen * avgCW <= innerW;
  };

  // ── Phase 1: fontSize 縮小 ──
  let fs = initialFs;
  let px = initialPx;
  while (fs >= minFontSize) {
    if (fits(fs, px, boxW)) {
      return { fontSize: fs, paddingX: px, suggestedW: null };
    }
    fs -= 1;
  }
  fs = minFontSize;

  // ── Phase 2: paddingX 縮小（-4 ずつ、最低 8） ──
  const minPx = 8;
  while (px > minPx) {
    px = Math.max(minPx, px - 4);
    if (fits(fs, px, boxW)) {
      return { fontSize: fs, paddingX: px, suggestedW: null };
    }
  }

  // ── Phase 3: boxW 拡張（+16〜+32） ──
  const maxExpand = 32;
  for (let expand = 16; expand <= maxExpand; expand += 8) {
    if (fits(fs, px, boxW + expand)) {
      return {
        fontSize: fs,
        paddingX: px,
        suggestedW: boxW + expand,
      };
    }
  }

  // 最終フォールバック: 必要な幅を算出
  const avgCW = fs * 0.58 + letterSpacing;
  const neededW = Math.ceil(effLen * avgCW + px * 2);
  return {
    fontSize: fs,
    paddingX: px,
    suggestedW: neededW > boxW ? Math.min(neededW, boxW + maxExpand) : null,
  };
}
