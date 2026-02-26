/* ───────────────────────────────────────────────
   Align / Distribute Engine (Canvas Editor)
   選択レイヤー群の整列・等間隔分布を計算する
   ─────────────────────────────────────────────── */

import type { CanvasLayout } from "@/src/types/canvas";

/* ---------- Types ---------- */

export type AlignDirection =
  | "left" | "centerH" | "right"
  | "top" | "centerV" | "bottom";

export type DistributeDirection = "horizontal" | "vertical";

type LayoutEntry = { id: string; layout: CanvasLayout };

/* ---------- Bounding Box ---------- */

const boundingBox = (entries: LayoutEntry[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { layout: l } of entries) {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x + l.w);
    maxY = Math.max(maxY, l.y + l.h);
  }
  return { minX, minY, maxX, maxY };
};

/* ---------- Align ---------- */

/**
 * 選択レイヤーを direction で整列させた新しい layout[] を返す。
 * 元の配列は変更しない。
 */
export const computeAlign = (
  entries: LayoutEntry[],
  direction: AlignDirection,
): { id: string; patch: Partial<CanvasLayout> }[] => {
  if (entries.length < 2) return [];
  const bb = boundingBox(entries);

  return entries.map(({ id, layout }) => {
    switch (direction) {
      case "left":
        return { id, patch: { x: bb.minX } };
      case "centerH":
        return { id, patch: { x: (bb.minX + bb.maxX) / 2 - layout.w / 2 } };
      case "right":
        return { id, patch: { x: bb.maxX - layout.w } };
      case "top":
        return { id, patch: { y: bb.minY } };
      case "centerV":
        return { id, patch: { y: (bb.minY + bb.maxY) / 2 - layout.h / 2 } };
      case "bottom":
        return { id, patch: { y: bb.maxY - layout.h } };
    }
  });
};

/* ---------- Distribute ---------- */

/**
 * 選択レイヤーを direction で等間隔に分布させた新しい layout[] を返す。
 * 3つ以上で有効。2つの場合は空を返す。
 */
export const computeDistribute = (
  entries: LayoutEntry[],
  direction: DistributeDirection,
): { id: string; patch: Partial<CanvasLayout> }[] => {
  if (entries.length < 3) return [];

  if (direction === "horizontal") {
    const sorted = [...entries].sort((a, b) => a.layout.x - b.layout.x);
    const first = sorted[0].layout;
    const last = sorted[sorted.length - 1].layout;
    const totalWidth = sorted.reduce((s, e) => s + e.layout.w, 0);
    const totalSpace = (last.x + last.w) - first.x - totalWidth;
    const gap = totalSpace / (sorted.length - 1);

    let cursor = first.x + first.w + gap;
    return sorted.slice(1, -1).map(({ id, layout }) => {
      const patch = { x: cursor };
      cursor += layout.w + gap;
      return { id, patch };
    });
  } else {
    const sorted = [...entries].sort((a, b) => a.layout.y - b.layout.y);
    const first = sorted[0].layout;
    const last = sorted[sorted.length - 1].layout;
    const totalHeight = sorted.reduce((s, e) => s + e.layout.h, 0);
    const totalSpace = (last.y + last.h) - first.y - totalHeight;
    const gap = totalSpace / (sorted.length - 1);

    let cursor = first.y + first.h + gap;
    return sorted.slice(1, -1).map(({ id, layout }) => {
      const patch = { y: cursor };
      cursor += layout.h + gap;
      return { id, patch };
    });
  }
};
