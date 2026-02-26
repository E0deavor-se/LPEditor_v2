/* ───────────────────────────────────────────────
   Japanese Line Break (簡易禁則処理)
   fitText の行数推定を改善するためのテキスト正規化。
   表示テキスト自体は変えず、推定用の「有効文字数」を返す。
   ─────────────────────────────────────────────── */

/**
 * 行頭禁止文字 (opening-prohibited / 行頭禁則)
 * 句読点、閉じ括弧、小書き文字、長音、感嘆符 等
 */
const LINE_HEAD_PROHIBITED =
  "、。，．・：；？！ー～…‥" +
  "）】」』》〉〕｝〗〙〛" +
  "ぁぃぅぇぉゃゅょっ" +
  "ァィゥェォャュョッ" +
  "゛゜％‰" +
  ")]}";

/**
 * 行末禁止文字 (closing-prohibited / 行末禁則)
 * 開き括弧系
 */
const LINE_TAIL_PROHIBITED =
  "（【「『《〈〔｛〖〘〚" +
  "([{";

/** 連続英数字・URL っぽいパターン */
const ASCII_WORD_RE = /[a-zA-Z0-9@#_./:\\-]{4,}/g;

/**
 * テキストの「推定上の有効文字数」を返す。
 *
 * 行頭禁止文字は直前の文字と "セット" 扱い（+0.0 文字幅）にすることで
 * charsPerLine 計算時に同一行に収まりやすくする。
 *
 * 連続英数字は平均より幅が広いため 1.15 倍に補正する。
 *
 * @returns 有効文字数（float）。推定の入力として使う。
 */
export function effectiveLength(text: string): number {
  let count = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // 行頭禁止文字 → 前の文字とセット（幅 0 扱い）
    if (LINE_HEAD_PROHIBITED.includes(ch)) {
      // ただし先頭文字の場合は 1 とカウント
      if (i === 0) {
        count += 1;
      }
      // else: 0 — 前の文字に付随
      continue;
    }

    // 行末禁止文字 → 次の文字とセット（こちらは普通にカウント）
    if (LINE_TAIL_PROHIBITED.includes(ch)) {
      count += 1;
      continue;
    }

    count += 1;
  }

  // 連続英数字の補正: ASCII 4文字以上連続 → 幅 1.15 倍
  const asciiBonus = estimateAsciiExpansion(text);
  count += asciiBonus;

  return count;
}

/**
 * 連続英数字による推定幅増分を返す。
 * ASCII 文字は全角より狭いが、連続するとフォントによって
 * 少し幅が増えるため補正する。
 */
function estimateAsciiExpansion(text: string): number {
  let bonus = 0;
  let match: RegExpExecArray | null;
  ASCII_WORD_RE.lastIndex = 0;
  while ((match = ASCII_WORD_RE.exec(text)) !== null) {
    // 4文字以上の英数連続 → 長さの 15% を追加幅とする
    bonus += match[0].length * 0.15;
  }
  return bonus;
}

/**
 * テキストの禁則処理済み推定行数を返す。
 * fitText の estimateTextFit の代わりに使う。
 */
export function estimateJpLines(
  text: string,
  boxW: number,
  fontSize: number,
  letterSpacing = 0,
): number {
  const avgCW = fontSize * 0.58 + letterSpacing;
  const charsPerLine = Math.max(1, Math.floor(boxW / Math.max(avgCW, 1)));
  const effLen = effectiveLength(text);
  return Math.max(1, Math.ceil(effLen / Math.max(charsPerLine, 1)));
}
