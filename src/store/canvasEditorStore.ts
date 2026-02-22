/* ───────────────────────────────────────────────
   Canvas Editor Store – Zustand
   ─────────────────────────────────────────────── */

import { create } from "zustand";
import type {
  CanvasDocument,
  CanvasLayer,
  CanvasLayout,
  LayerStyle,
  CanvasBackground,
  CanvasSize,
  CanvasGuide,
} from "@/src/types/canvas";
import {
  createDefaultCanvasDocument,
  generateLayerId,
  getLayout,
} from "@/src/types/canvas";
import type { CanvasDevice } from "@/src/types/canvas";
import {
  computeAlign,
  computeDistribute,
  type AlignDirection,
  type DistributeDirection,
} from "@/src/lib/canvas/alignEngine";
import {
  autoLayoutCanvas,
  type AutoLayoutPreset,
} from "@/src/lib/canvas/autoLayout";
import { fitTextToBox, fitButtonText } from "@/src/lib/canvas/fitText";

/* -------- History -------- */

const MAX_HISTORY = 80;

const cloneDoc = (doc: CanvasDocument): CanvasDocument =>
  JSON.parse(JSON.stringify(doc)) as CanvasDocument;

/* -------- Types -------- */

export type CanvasViewMode = "single" | "split";

export type CanvasSelection = {
  ids: string[];
  primaryId?: string;
};

export type CanvasEditorState = {
  /* ----- Data ----- */
  document: CanvasDocument;

  /* ----- UI ----- */
  device: CanvasDevice;
  viewMode: CanvasViewMode;
  zoom: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  guidesVisible: boolean;
  gridSize: number;
  selection: CanvasSelection;

  /* ----- History ----- */
  past: CanvasDocument[];
  future: CanvasDocument[];
  canUndo: boolean;
  canRedo: boolean;

  /* ----- Dirty flag ----- */
  dirty: boolean;
};

export type CanvasEditorActions = {
  /* Document */
  setDocument: (doc: CanvasDocument) => void;
  resetDocument: () => void;

  /* Device / View */
  setDevice: (d: CanvasDevice) => void;
  setViewMode: (m: CanvasViewMode) => void;
  setZoom: (z: number) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleGuidesVisible: () => void;

  /* Selection */
  select: (ids: string[], primaryId?: string) => void;
  clearSelection: () => void;

  /* Layer CRUD */
  addLayer: (layer: CanvasLayer) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;

  /* Update */
  updateLayerLayout: (id: string, patch: Partial<CanvasLayout>) => void;
  updateLayerStyle: (id: string, patch: Partial<LayerStyle>) => void;
  updateLayerContent: (id: string, patch: Record<string, unknown>) => void;
  renameLayer: (id: string, name: string) => void;

  /* z-order */
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  /* Lock / Hide */
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;

  /* Background */
  setBackground: (bg: CanvasBackground) => void;

  /* Canvas size */
  setCanvasSize: (device: CanvasDevice, size: Partial<CanvasSize>) => void;

  /* Undo / Redo */
  undo: () => void;
  redo: () => void;
  /** 履歴にスナップショットを明示的にpush（ドラッグ開始時等に呼ぶ） */
  pushSnapshot: () => void;

  /* SP自動生成 */
  generateSpFromPc: () => void;

  /* Multi-select move */
  moveSelectedLayers: (dx: number, dy: number) => void;

  /* Align / Distribute */
  alignSelected: (direction: AlignDirection) => void;
  distributeSelected: (direction: DistributeDirection) => void;

  /* Guides */
  addGuide: (axis: "x" | "y") => void;
  removeGuide: (id: string) => void;
  updateGuidePosition: (id: string, position: number) => void;

  /* Auto layout */
  applyAutoLayout: (preset: AutoLayoutPreset) => void;

  /* Fit Text */
  applyFitTextToSelection: () => void;
};

export type CanvasEditorStore = CanvasEditorState & CanvasEditorActions;

/* -------- Helper: commit(=push history, update doc) -------- */

const commit = (
  state: CanvasEditorState,
  nextDoc: CanvasDocument
): Partial<CanvasEditorState> => {
  const past = [...state.past, cloneDoc(state.document)];
  if (past.length > MAX_HISTORY) past.splice(0, past.length - MAX_HISTORY);
  return {
    document: nextDoc,
    past,
    future: [],
    canUndo: true,
    canRedo: false,
    dirty: true,
  };
};

/* -------- Store -------- */

export const useCanvasEditorStore = create<CanvasEditorStore>((set, get) => ({
  /* ===== Initial State ===== */
  document: createDefaultCanvasDocument(),
  device: "pc",
  viewMode: "single",
  zoom: 1,
  gridEnabled: false,
  snapEnabled: true,
  guidesVisible: true,
  gridSize: 10,
  selection: { ids: [] },
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  dirty: false,

  /* ===== Document ===== */
  setDocument: (doc) => {
    set({
      document: cloneDoc(doc),
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      dirty: false,
      selection: { ids: [] },
    });
  },

  resetDocument: () => {
    set({
      document: createDefaultCanvasDocument(),
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      dirty: false,
      selection: { ids: [] },
    });
  },

  /* ===== Device / View ===== */
  setDevice: (d) => set({ device: d }),
  setViewMode: (m) => set({ viewMode: m }),
  setZoom: (z) => set({ zoom: Math.max(0.1, Math.min(4, z)) }),
  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleGuidesVisible: () => set((s) => ({ guidesVisible: !s.guidesVisible })),

  /* ===== Selection ===== */
  select: (ids, primaryId) =>
    set({ selection: { ids, primaryId: primaryId ?? ids[0] } }),
  clearSelection: () => set({ selection: { ids: [] } }),

  /* ===== Layer CRUD ===== */
  addLayer: (layer) => {
    const state = get();
    const doc = cloneDoc(state.document);
    // z-index を最大+1に
    const maxZ = doc.layers.reduce((m, l) => Math.max(m, l.variants.pc.z, l.variants.sp.z), 0);
    layer.variants.pc.z = maxZ + 1;
    layer.variants.sp.z = maxZ + 1;
    doc.layers.push(layer);
    set({
      ...commit(state, doc),
      selection: { ids: [layer.id], primaryId: layer.id },
    });
  },

  removeLayer: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    doc.layers = doc.layers.filter((l) => l.id !== id);
    const sel = state.selection.ids.filter((sid) => sid !== id);
    set({
      ...commit(state, doc),
      selection: { ids: sel, primaryId: sel[0] },
    });
  },

  duplicateLayer: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const src = doc.layers.find((l) => l.id === id);
    if (!src) return;
    const maxZ = doc.layers.reduce((m, l) => Math.max(m, l.variants.pc.z, l.variants.sp.z), 0);
    const dup: CanvasLayer = {
      ...JSON.parse(JSON.stringify(src)),
      id: generateLayerId(),
      name: `${src.name} (コピー)`,
    };
    dup.variants.pc.x += 20;
    dup.variants.pc.y += 20;
    dup.variants.sp.x += 20;
    dup.variants.sp.y += 20;
    dup.variants.pc.z = maxZ + 1;
    dup.variants.sp.z = maxZ + 1;
    doc.layers.push(dup);
    set({
      ...commit(state, doc),
      selection: { ids: [dup.id], primaryId: dup.id },
    });
  },

  /* ===== Update Layout (current device only) ===== */
  updateLayerLayout: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    const layout = getLayout(layer, state.device);
    Object.assign(layout, patch);
    set({ document: doc, dirty: true });
  },

  /* ===== Update Style ===== */
  updateLayerStyle: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    Object.assign(layer.style, patch);
    set({ document: doc, dirty: true });
  },

  /* ===== Update Content ===== */
  updateLayerContent: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    Object.assign(layer.content, patch);
    set({ document: doc, dirty: true });
  },

  /* ===== Rename ===== */
  renameLayer: (id, name) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.name = name;
    set({ document: doc, dirty: true });
  },

  /* ===== Z-Order ===== */
  bringForward: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const { device } = state;
    const sorted = [...doc.layers].sort((a, b) => getLayout(a, device).z - getLayout(b, device).z);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const curZ = getLayout(sorted[idx], device).z;
    const nextZ = getLayout(sorted[idx + 1], device).z;
    // swap z
    const layerA = doc.layers.find((l) => l.id === sorted[idx].id);
    const layerB = doc.layers.find((l) => l.id === sorted[idx + 1].id);
    if (layerA) getLayout(layerA, device).z = nextZ;
    if (layerB) getLayout(layerB, device).z = curZ;
    set({ ...commit(state, doc) });
  },

  sendBackward: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const { device } = state;
    const sorted = [...doc.layers].sort((a, b) => getLayout(a, device).z - getLayout(b, device).z);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    const curZ = getLayout(sorted[idx], device).z;
    const prevZ = getLayout(sorted[idx - 1], device).z;
    const layerA = doc.layers.find((l) => l.id === sorted[idx].id);
    const layerB = doc.layers.find((l) => l.id === sorted[idx - 1].id);
    if (layerA) getLayout(layerA, device).z = prevZ;
    if (layerB) getLayout(layerB, device).z = curZ;
    set({ ...commit(state, doc) });
  },

  bringToFront: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const maxZ = doc.layers.reduce((m, l) => Math.max(m, getLayout(l, state.device).z), 0);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    getLayout(layer, state.device).z = maxZ + 1;
    set({ ...commit(state, doc) });
  },

  sendToBack: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const minZ = doc.layers.reduce((m, l) => Math.min(m, getLayout(l, state.device).z), Infinity);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    getLayout(layer, state.device).z = minZ - 1;
    set({ ...commit(state, doc) });
  },

  /* ===== Lock / Hide ===== */
  toggleLock: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.locked = !layer.locked;
    set({ document: doc, dirty: true });
  },

  toggleHidden: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.hidden = !layer.hidden;
    set({ document: doc, dirty: true });
  },

  /* ===== Background ===== */
  setBackground: (bg) => {
    const state = get();
    const doc = cloneDoc(state.document);
    doc.background = bg;
    set({ ...commit(state, doc) });
  },

  /* ===== Canvas Size ===== */
  setCanvasSize: (device, size) => {
    const state = get();
    const doc = cloneDoc(state.document);
    Object.assign(doc.meta.size[device], size);
    set({ ...commit(state, doc) });
  },

  /* ===== Undo / Redo ===== */
  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    const prev = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    set({
      document: prev,
      past: newPast,
      future: [cloneDoc(state.document), ...state.future].slice(0, MAX_HISTORY),
      canUndo: newPast.length > 0,
      canRedo: true,
      dirty: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    set({
      document: next,
      past: [...state.past, cloneDoc(state.document)].slice(-MAX_HISTORY),
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
      dirty: true,
    });
  },

  pushSnapshot: () => {
    const state = get();
    const past = [...state.past, cloneDoc(state.document)];
    if (past.length > MAX_HISTORY) past.splice(0, past.length - MAX_HISTORY);
    set({ past, future: [], canUndo: true, canRedo: false });
  },

  /* ===== PC→SP 自動生成 ===== */
  applyAutoLayout: (preset) => {
    const state = get();
    const newDoc = autoLayoutCanvas(state.document, preset);
    set({ ...commit(state, newDoc) });
  },

  /* ===== 手動 Fit Text ===== */
  applyFitTextToSelection: () => {
    const state = get();
    const { ids } = state.selection;
    if (ids.length === 0) return;

    const doc = cloneDoc(state.document);
    const dev = state.device;
    let changed = false;

    for (const layer of doc.layers) {
      if (!ids.includes(layer.id) || layer.hidden || layer.locked) continue;

      const layout = dev === "pc" ? layer.variants.pc : layer.variants.sp;

      if (layer.content.kind === "text") {
        const fs = layer.style.fontSize ?? 16;
        const lh = layer.style.lineHeight ?? 1.6;
        const ls = layer.style.letterSpacing ?? 0;
        const fw = layer.style.fontWeight ?? 400;
        const isHeading = fs >= 28 || fw >= 700;
        const result = fitTextToBox({
          text: layer.content.text,
          boxW: layout.w,
          boxH: layout.h,
          fontSize: fs,
          lineHeight: lh,
          letterSpacing: ls,
          maxLines: isHeading ? 3 : 6,
          minFontSize: isHeading ? 16 : 11,
          maxFontSize: fs,
          step: 1,
        });
        if (!result.unchanged) {
          layer.style.fontSize = result.fontSize;
          layer.style.lineHeight = result.lineHeight;
          changed = true;
        }
      } else if (layer.content.kind === "button") {
        const fs = layer.style.fontSize ?? 16;
        const ls = layer.style.letterSpacing ?? 0;
        const result = fitButtonText({
          label: layer.content.label,
          boxW: layout.w,
          boxH: layout.h,
          fontSize: fs,
          letterSpacing: ls,
          minFontSize: 11,
        });
        if (result.fontSize !== fs || result.suggestedW !== null) {
          layer.style.fontSize = result.fontSize;
          if (result.suggestedW !== null) {
            const delta = result.suggestedW - layout.w;
            layout.w = result.suggestedW;
            layout.x = Math.round(layout.x - delta / 2);
          }
          changed = true;
        }
      }
    }

    if (changed) {
      set({ ...commit(state, doc) });
    }
  },

  generateSpFromPc: () => {
    const state = get();
    const doc = cloneDoc(state.document);
    const pcWidth = doc.meta.size.pc.width;
    const spWidth = doc.meta.size.sp.width;
    const sx = spWidth / pcWidth;
    const margin = 8;

    for (const layer of doc.layers) {
      const pc = layer.variants.pc;
      let x = Math.round(pc.x * sx);
      let w = Math.round(pc.w * sx);
      const y = pc.y; // y は維持
      const h = pc.h; // h は維持

      // はみ出し調整
      if (x < margin) x = margin;
      if (x + w > spWidth - margin) {
        w = spWidth - margin - x;
        if (w < 20) {
          x = margin;
          w = spWidth - margin * 2;
        }
      }

      layer.variants.sp = {
        x,
        y,
        w,
        h,
        r: pc.r,
        z: pc.z,
      };

      // テキストのfontSizeを微縮小
      if (layer.type === "text" && layer.style.fontSize) {
        // sp時は元サイズのclamp(0.78..0.92)倍
        // ただし style は共有なのでここでは variants.sp 用に fontSize を style 値として残す
        // → 実際には描画側で sx を反映するか、fontSize 自体を補正する設計
        // ここでは fontSize は共有のままとし、レンダラ側で対応
      }
    }

    set({ ...commit(state, doc) });
  },

  /* ===== Multi-select move ===== */
  moveSelectedLayers: (dx, dy) => {
    const state = get();
    if (state.selection.ids.length === 0) return;
    const doc = cloneDoc(state.document);
    for (const layer of doc.layers) {
      if (state.selection.ids.includes(layer.id) && !layer.locked) {
        const layout = getLayout(layer, state.device);
        layout.x += dx;
        layout.y += dy;
      }
    }
    set({ document: doc, dirty: true });
  },

  /* ===== Align / Distribute ===== */
  alignSelected: (direction) => {
    const state = get();
    const { ids } = state.selection;
    if (ids.length < 2) return;
    const doc = cloneDoc(state.document);
    const entries = ids
      .map((id) => {
        const layer = doc.layers.find((l) => l.id === id);
        return layer ? { id, layout: { ...getLayout(layer, state.device) } } : null;
      })
      .filter(Boolean) as { id: string; layout: CanvasLayout }[];
    if (entries.length < 2) return;

    const patches = computeAlign(entries, direction);
    for (const { id, patch } of patches) {
      const layer = doc.layers.find((l) => l.id === id);
      if (layer) Object.assign(getLayout(layer, state.device), patch);
    }
    set({ ...commit(state, doc) });
  },

  distributeSelected: (direction) => {
    const state = get();
    const { ids } = state.selection;
    if (ids.length < 3) return;
    const doc = cloneDoc(state.document);
    const entries = ids
      .map((id) => {
        const layer = doc.layers.find((l) => l.id === id);
        return layer ? { id, layout: { ...getLayout(layer, state.device) } } : null;
      })
      .filter(Boolean) as { id: string; layout: CanvasLayout }[];
    if (entries.length < 3) return;

    const patches = computeDistribute(entries, direction);
    for (const { id, patch } of patches) {
      const layer = doc.layers.find((l) => l.id === id);
      if (layer) Object.assign(getLayout(layer, state.device), patch);
    }
    set({ ...commit(state, doc) });
  },

  /* ===== Guides ===== */
  addGuide: (axis) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const size = state.device === "pc" ? doc.meta.size.pc : doc.meta.size.sp;
    const position = axis === "x" ? size.width / 2 : size.height / 2;
    const guide: CanvasGuide = {
      id: `guide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      axis,
      position,
    };
    doc.guides = [...(doc.guides ?? []), guide];
    set({ ...commit(state, doc) });
  },

  removeGuide: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    doc.guides = (doc.guides ?? []).filter((g) => g.id !== id);
    set({ ...commit(state, doc) });
  },

  updateGuidePosition: (id, position) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const guide = (doc.guides ?? []).find((g) => g.id === id);
    if (guide) guide.position = position;
    set({ document: doc, dirty: true });
  },
}));
