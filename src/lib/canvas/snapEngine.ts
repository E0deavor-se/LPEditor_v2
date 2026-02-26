/* ───────────────────────────────────────────────
   Snap Engine – スナップ計算 (Canvas Editor)
   Canva/Figma 同等の吸着とガイドライン表示を提供
   候補絞り込み・ヒステリシス・優先度付きスナップ
   ─────────────────────────────────────────────── */

import type { CanvasLayout, CanvasSize, CanvasGuide } from "@/src/types/canvas";

/* ---------- 定数 ---------- */

/** スナップ検知距離 (px) */
export const SNAP_THRESHOLD = 6;

/** ヒステリシスマージン: スナップ解除に必要な追加距離 (px) */
const HYSTERESIS_MARGIN = 2;

/* ---------- Types ---------- */

/** 1本のアクティブガイド線 */
export type ActiveGuide = {
  axis: "x" | "y";
  /** キャンバス上のピクセル座標 */
  position: number;
  /** "canvas" | "layer" | "guide" (ソース) */
  source: "canvas" | "layer" | "guide";
};

/** ヒステリシス状態 — ドラッグ中に前回のスナップターゲットを保持 */
export type SnapHysteresis = {
  x: { target: number; source: ActiveGuide["source"] } | null;
  y: { target: number; source: ActiveGuide["source"] } | null;
};

export type SnapResult = {
  /** スナップ後のレイアウト */
  layout: CanvasLayout;
  /** 描画すべきガイド線の配列 (軸ごとに最大1本) */
  activeGuides: ActiveGuide[];
  /** 次フレームに渡すヒステリシス状態 */
  hysteresis: SnapHysteresis;
};

/** 外部から渡すスナップ候補エッジ (事前に計算) */
export type SnapEdges = {
  xs: SnapCandidate[];
  ys: SnapCandidate[];
};

type SnapCandidate = {
  value: number;
  source: ActiveGuide["source"];
  /**
   * 低い = 高優先度
   *   0: キャンバス端 / 中心
   *   1: ユーザーガイド
   *   2: レイヤー中心
   *   3: レイヤー端
   */
  priority: number;
};

/* ---------- スナップ候補の構築 ---------- */

/**
 * スナップ候補を事前計算する。
 * @param canvasSize 現在デバイスのキャンバスサイズ
 * @param otherLayouts 選択外のレイヤーの layout[]
 * @param guides ユーザーガイド[]
 */
export const buildSnapEdges = (
  canvasSize: CanvasSize,
  otherLayouts: CanvasLayout[],
  guides: CanvasGuide[],
): SnapEdges => {
  const xs: SnapCandidate[] = [];
  const ys: SnapCandidate[] = [];

  // (1) キャンバスエッジ & 中心 — priority 0
  xs.push({ value: 0, source: "canvas", priority: 0 });
  xs.push({ value: canvasSize.width / 2, source: "canvas", priority: 0 });
  xs.push({ value: canvasSize.width, source: "canvas", priority: 0 });
  ys.push({ value: 0, source: "canvas", priority: 0 });
  ys.push({ value: canvasSize.height / 2, source: "canvas", priority: 0 });
  ys.push({ value: canvasSize.height, source: "canvas", priority: 0 });

  // (2) 他レイヤー（中心: priority 2、エッジ: priority 3）
  for (const l of otherLayouts) {
    xs.push({ value: l.x, source: "layer", priority: 3 });
    xs.push({ value: l.x + l.w / 2, source: "layer", priority: 2 });
    xs.push({ value: l.x + l.w, source: "layer", priority: 3 });
    ys.push({ value: l.y, source: "layer", priority: 3 });
    ys.push({ value: l.y + l.h / 2, source: "layer", priority: 2 });
    ys.push({ value: l.y + l.h, source: "layer", priority: 3 });
  }

  // (3) ユーザーガイド — priority 1
  for (const g of guides) {
    if (g.axis === "x") {
      xs.push({ value: g.position, source: "guide", priority: 1 });
    } else {
      ys.push({ value: g.position, source: "guide", priority: 1 });
    }
  }

  return { xs, ys };
};

/* ---------- 最近傍検索 (priority-aware) ---------- */

type NearestHit = {
  value: number;
  delta: number;
  source: ActiveGuide["source"];
  priority: number;
} | null;

/**
 * 軸ごとに最も近い候補1つを返す。
 * 同距離の場合は priority が低い（= 重要度が高い）方を優先。
 */
const findNearest = (
  candidates: SnapCandidate[],
  targets: number[],
  threshold: number,
): NearestHit => {
  let best: NearestHit = null;
  for (const t of targets) {
    for (const c of candidates) {
      const d = Math.abs(c.value - t);
      if (d > threshold) continue;
      if (
        !best ||
        d < Math.abs(best.delta) ||
        (d === Math.abs(best.delta) && c.priority < best.priority)
      ) {
        best = { value: c.value, delta: c.value - t, source: c.source, priority: c.priority };
      }
    }
  }
  return best;
};

/* ---------- ヒステリシス付きスナップ解決 ---------- */

type HysteresisEntry = { target: number; source: ActiveGuide["source"] } | null;

/**
 * 前回のスナップターゲットがまだ有効なら維持。
 * 解除されたら通常の findNearest で再探索。
 */
const resolveSnap = (
  candidates: SnapCandidate[],
  targets: number[],
  threshold: number,
  prev: HysteresisEntry,
): { value: number; source: ActiveGuide["source"] } | null => {
  // ヒステリシス: 前回ターゲットがまだ近ければ維持
  if (prev) {
    const minDist = Math.min(...targets.map((t) => Math.abs(prev.target - t)));
    if (minDist <= threshold + HYSTERESIS_MARGIN) {
      return { value: prev.target, source: prev.source };
    }
  }
  // 通常の最近傍探索
  const hit = findNearest(candidates, targets, threshold);
  return hit ? { value: hit.value, source: hit.source } : null;
};

/* ---------- Move snap ---------- */

/**
 * ドラッグ移動時のスナップ。
 * candidate は「もうdx/dyを適用済みの layout」。
 */
export const computeSnapForMove = (
  candidate: CanvasLayout,
  snapEdges: SnapEdges,
  threshold = SNAP_THRESHOLD,
  prevHysteresis?: SnapHysteresis,
): SnapResult => {
  const guides: ActiveGuide[] = [];
  const out = { ...candidate };
  const hysteresis: SnapHysteresis = { x: null, y: null };

  // 対象座標: left, center, right
  const xTargets = [out.x, out.x + out.w / 2, out.x + out.w];
  const yTargets = [out.y, out.y + out.h / 2, out.y + out.h];

  // --- X axis ---
  const snapX = resolveSnap(snapEdges.xs, xTargets, threshold, prevHysteresis?.x ?? null);
  if (snapX) {
    // ベストマッチの target を特定して delta を適用
    let bestTarget = xTargets[0];
    let bestDist = Math.abs(snapX.value - bestTarget);
    for (const t of xTargets) {
      const d = Math.abs(snapX.value - t);
      if (d < bestDist) { bestDist = d; bestTarget = t; }
    }
    out.x += snapX.value - bestTarget;
    guides.push({ axis: "x", position: snapX.value, source: snapX.source });
    hysteresis.x = { target: snapX.value, source: snapX.source };
  }

  // --- Y axis ---
  const snapY = resolveSnap(snapEdges.ys, yTargets, threshold, prevHysteresis?.y ?? null);
  if (snapY) {
    let bestTarget = yTargets[0];
    let bestDist = Math.abs(snapY.value - bestTarget);
    for (const t of yTargets) {
      const d = Math.abs(snapY.value - t);
      if (d < bestDist) { bestDist = d; bestTarget = t; }
    }
    out.y += snapY.value - bestTarget;
    guides.push({ axis: "y", position: snapY.value, source: snapY.source });
    hysteresis.y = { target: snapY.value, source: snapY.source };
  }

  return { layout: out, activeGuides: guides, hysteresis };
};

/* ---------- Resize snap ---------- */

/**
 * リサイズ時のスナップ。
 * handleDir の方向に応じて、吸着するエッジを決める。
 */
export const computeSnapForResize = (
  candidate: CanvasLayout,
  handleDir: string,
  snapEdges: SnapEdges,
  threshold = SNAP_THRESHOLD,
  prevHysteresis?: SnapHysteresis,
): SnapResult => {
  const guides: ActiveGuide[] = [];
  const out = { ...candidate };
  const hysteresis: SnapHysteresis = { x: null, y: null };

  // X 軸
  if (handleDir.includes("e")) {
    const rightEdge = out.x + out.w;
    const snap = resolveSnap(snapEdges.xs, [rightEdge], threshold, prevHysteresis?.x ?? null);
    if (snap) {
      out.w += snap.value - rightEdge;
      guides.push({ axis: "x", position: snap.value, source: snap.source });
      hysteresis.x = { target: snap.value, source: snap.source };
    }
  } else if (handleDir.includes("w")) {
    const snap = resolveSnap(snapEdges.xs, [out.x], threshold, prevHysteresis?.x ?? null);
    if (snap) {
      const delta = snap.value - out.x;
      out.x = snap.value;
      out.w -= delta;
      guides.push({ axis: "x", position: snap.value, source: snap.source });
      hysteresis.x = { target: snap.value, source: snap.source };
    }
  }

  // Y 軸
  if (handleDir.includes("s")) {
    const bottomEdge = out.y + out.h;
    const snap = resolveSnap(snapEdges.ys, [bottomEdge], threshold, prevHysteresis?.y ?? null);
    if (snap) {
      out.h += snap.value - bottomEdge;
      guides.push({ axis: "y", position: snap.value, source: snap.source });
      hysteresis.y = { target: snap.value, source: snap.source };
    }
  } else if (handleDir.includes("n")) {
    const snap = resolveSnap(snapEdges.ys, [out.y], threshold, prevHysteresis?.y ?? null);
    if (snap) {
      const delta = snap.value - out.y;
      out.y = snap.value;
      out.h -= delta;
      guides.push({ axis: "y", position: snap.value, source: snap.source });
      hysteresis.y = { target: snap.value, source: snap.source };
    }
  }

  return { layout: out, activeGuides: guides, hysteresis };
};
