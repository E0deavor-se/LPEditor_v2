/* ───────────────────────────────────────────────
   Canvas Editor Store – Zustand
   ─────────────────────────────────────────────── */

import { create } from "zustand";
import { arrayMove } from "@dnd-kit/sortable";
import type {
  CanvasDocument,
  CanvasLayer,
  CanvasLayout,
  LayerStyle,
  CanvasBackground,
  CanvasSize,
  CanvasGuide,
  LayerConstraints,
  ImageLayerSettings,
  CanvasSection,
} from "@/src/types/canvas";
import {
  createDefaultCanvasDocument,
  DEFAULT_SECTION_BG,
  DEFAULT_SECTION_GAP,
  DEFAULT_SECTION_MIN_HEIGHT,
  DEFAULT_SECTION_PADDING_BOTTOM,
  DEFAULT_SECTION_PADDING_TOP,
  flattenSectionsToLayers,
  getDocumentMode,
  getFreeLayers,
  getSectionContentYOffset,
  getRenderableLayersForDocument,
  generateLayerId,
  getLayout,
  normalizeSectionModel,
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

const normalizeDocModel = (doc: CanvasDocument): CanvasDocument => {
  const mode = getDocumentMode(doc);
  const freeLayers = doc.free?.layers ?? doc.layers ?? [];
  const sections = (doc.sections?.sections ?? []).map((section) => normalizeSectionModel(section));
  return {
    ...doc,
    mode,
    free: { layers: freeLayers },
    sections: { sections },
    layers: freeLayers,
  };
};

const createSectionDraft = (index: number): CanvasSection => ({
  id: `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: `セクション ${index + 1}`,
  background: DEFAULT_SECTION_BG,
  paddingTop: DEFAULT_SECTION_PADDING_TOP,
  paddingBottom: DEFAULT_SECTION_PADDING_BOTTOM,
  gap: DEFAULT_SECTION_GAP,
  minHeight: DEFAULT_SECTION_MIN_HEIGHT,
  layers: [],
});

const createSectionId = () => `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const buildCopiedSectionName = (name: string, fallbackIndex: number): string => {
  const base = name.trim() || `セクション ${fallbackIndex + 1}`;
  return `${base} コピー`;
};

const cloneSectionDeep = (source: CanvasSection, insertIndex: number): CanvasSection => {
  const idMap = new Map<string, string>();
  const clonedLayers = source.layers.map((layer) => {
    const nextId = generateLayerId();
    idMap.set(layer.id, nextId);
    return JSON.parse(JSON.stringify(layer)) as CanvasLayer;
  });

  for (const layer of clonedLayers) {
    const prevId = layer.id;
    layer.id = idMap.get(prevId) ?? generateLayerId();
    if (layer.groupId) {
      layer.groupId = idMap.get(layer.groupId);
    }
  }

  return normalizeSectionModel({
    ...JSON.parse(JSON.stringify(source)),
    id: createSectionId(),
    name: buildCopiedSectionName(source.name ?? source.title ?? "", insertIndex),
    layers: clonedLayers,
  } as CanvasSection);
};

const getEditableLayers = (doc: CanvasDocument): CanvasLayer[] => {
  if (getDocumentMode(doc) === "sections") {
    return (doc.sections?.sections ?? []).flatMap((s) => s.layers);
  }
  return getFreeLayers(doc);
};

const findLayerRef = (
  doc: CanvasDocument,
  id: string,
): { layer: CanvasLayer; sectionIndex: number | null } | null => {
  if (getDocumentMode(doc) === "sections") {
    const sections = doc.sections?.sections ?? [];
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const layer = sections[sectionIndex].layers.find((l) => l.id === id);
      if (layer) return { layer, sectionIndex };
    }
  }
  const layer = getFreeLayers(doc).find((l) => l.id === id);
  return layer ? { layer, sectionIndex: null } : null;
};

const getRenderableLayersForState = (
  state: CanvasEditorState,
  device: CanvasDevice,
): CanvasLayer[] => {
  const designWidth = device === "pc" ? state.document.meta.size.pc.width : state.document.meta.size.sp.width;
  return getRenderableLayersForDocument(state.document, device, designWidth);
};

const sanitizeSelectionForDoc = (
  doc: CanvasDocument,
  selection: CanvasSelection
): CanvasSelection => {
  const existingIds = new Set(getEditableLayers(doc).map((layer) => layer.id));
  const ids = selection.ids.filter((id) => existingIds.has(id));
  const primaryId =
    selection.primaryId && ids.includes(selection.primaryId)
      ? selection.primaryId
      : ids[0];
  return { ids, primaryId };
};

const sanitizeSelectedSectionIdForDoc = (
  doc: CanvasDocument,
  selectedSectionId?: string
): string | undefined => {
  if (getDocumentMode(doc) !== "sections") {
    return undefined;
  }
  const sections = doc.sections?.sections ?? [];
  if (sections.length === 0) {
    return undefined;
  }
  if (selectedSectionId && sections.some((section) => section.id === selectedSectionId)) {
    return selectedSectionId;
  }
  return sections[0]?.id;
};

/* -------- Types -------- */

export type CanvasViewMode = "single" | "split";

export type CanvasSelection = {
  ids: string[];
  primaryId?: string;
};

export type CanvasSectionPatch = {
  name?: string;
  background?: string;
  paddingTop?: number;
  paddingBottom?: number;
  gap?: number;
  minHeight?: number;
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
  selectedSectionId?: string;

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
  selectSection: (sectionId?: string) => void;
  setCanvasMode: (mode: "free" | "sections") => void;
  convertFreeToSections: () => void;
  convertSectionsToFree: () => void;
  getRenderableLayers: (device?: CanvasDevice) => CanvasLayer[];
  addSection: () => void;
  duplicateSection: (sectionId: string) => void;
  renameSection: (sectionId: string, name: string) => void;
  removeSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: "up" | "down") => void;
  moveSectionToIndex: (sectionId: string, targetIndex: number) => void;
  updateSection: (sectionId: string, patch: CanvasSectionPatch) => void;
  groupSelectedLayers: () => void;
  ungroupSelectedLayers: () => void;

  /* Layer CRUD */
  addLayer: (layer: CanvasLayer) => void;
  removeLayer: (id: string) => void;
  removeLayers: (ids: string[]) => void;
  duplicateLayer: (id: string) => void;
  duplicateLayers: (ids: string[]) => void;
  reorderLayers: (activeId: string, overId: string) => void;
  reorderSectionLayers: (sectionId: string, activeId: string, overId: string) => void;

  /* Update */
  updateLayerLayout: (id: string, patch: Partial<CanvasLayout>) => void;
  updateLayerStyle: (id: string, patch: Partial<LayerStyle>) => void;
  updateLayerConstraints: (id: string, patch: Partial<LayerConstraints>) => void;
  updateImageLayerSettings: (id: string, patch: Partial<ImageLayerSettings>) => void;
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
  applyFitTextToAll: () => void;
};

export type CanvasEditorStore = CanvasEditorState & CanvasEditorActions;

/* -------- Helper: commit(=push history, update doc) -------- */

const commit = (
  state: CanvasEditorState,
  nextDoc: CanvasDocument
): Partial<CanvasEditorState> => {
  const normalizedDoc = normalizeDocModel(nextDoc);
  const normalizedSelection = sanitizeSelectionForDoc(normalizedDoc, state.selection);
  const past = [...state.past, cloneDoc(state.document)];
  if (past.length > MAX_HISTORY) past.splice(0, past.length - MAX_HISTORY);
  return {
    document: normalizedDoc,
    selection: normalizedSelection,
    selectedSectionId: sanitizeSelectedSectionIdForDoc(normalizedDoc, state.selectedSectionId),
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
  selectedSectionId: undefined,
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  dirty: false,

  /* ===== Document ===== */
  setDocument: (doc) => {
    const normalized = normalizeDocModel(cloneDoc(doc));
    set({
      document: normalized,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      dirty: false,
      selection: { ids: [] },
      selectedSectionId: normalized.sections?.sections?.[0]?.id,
    });
  },

  resetDocument: () => {
    const next = createDefaultCanvasDocument();
    set({
      document: next,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      dirty: false,
      selection: { ids: [] },
      selectedSectionId: undefined,
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
    set((state) => {
      const editable = getEditableLayers(state.document);
      const editableIdSet = new Set(editable.map((layer) => layer.id));
      const expanded = new Set<string>(ids.filter((id) => editableIdSet.has(id)));
      for (const id of ids) {
        const layer = editable.find((l) => l.id === id);
        if (layer?.content.kind === "group") {
          for (const child of editable) {
            if (child.groupId === layer.id) {
              expanded.add(child.id);
            }
          }
        }
      }
      const nextIds = Array.from(expanded);
      return { selection: { ids: nextIds, primaryId: primaryId ?? nextIds[0] } };
    }),
  clearSelection: () => set({ selection: { ids: [] } }),
  selectSection: (sectionId) => set({ selectedSectionId: sectionId }),

  setCanvasMode: (mode) => {
    const state = get();
    const doc = cloneDoc(state.document);
    doc.mode = mode;
    doc.free = { layers: getFreeLayers(doc) };
    doc.sections = { sections: (doc.sections?.sections ?? []).map((s) => normalizeSectionModel(s)) };
    const nextSelected = mode === "sections"
      ? (state.selectedSectionId ?? doc.sections.sections[0]?.id)
      : undefined;
    set({ ...commit(state, normalizeDocModel(doc)), selectedSectionId: nextSelected });
  },

  convertFreeToSections: () => {
    const state = get();
    const doc = cloneDoc(state.document);
    const freeLayers = [...getFreeLayers(doc)].sort((a, b) => a.variants.pc.y - b.variants.pc.y);
    const sections: CanvasSection[] = [];
    let current: CanvasSection | null = null;
    let lastBottom = -Infinity;

    for (const layer of freeLayers) {
      const y = layer.variants.pc.y;
      if (!current || y - lastBottom > 80) {
        current = createSectionDraft(sections.length);
        sections.push(current);
      }

      const cloned = JSON.parse(JSON.stringify(layer)) as CanvasLayer;
      const sectionTopPc = Math.min(...current.layers.map((l) => l.variants.pc.y), cloned.variants.pc.y);
      const sectionTopSp = Math.min(...current.layers.map((l) => l.variants.sp.y), cloned.variants.sp.y);
      cloned.variants.pc.y = Math.max(0, cloned.variants.pc.y - sectionTopPc);
      cloned.variants.sp.y = Math.max(0, cloned.variants.sp.y - sectionTopSp);
      current.layers.push(cloned);
      lastBottom = layer.variants.pc.y + layer.variants.pc.h;
    }

    doc.mode = "sections";
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    doc.free = { layers: freeLayers };
    set({
      ...commit(state, normalizeDocModel(doc)),
      selection: { ids: [] },
      selectedSectionId: doc.sections.sections[0]?.id,
    });
  },

  convertSectionsToFree: () => {
    const state = get();
    const doc = cloneDoc(state.document);
    const pcWidth = doc.meta.size.pc.width;
    const flattened = flattenSectionsToLayers(doc.sections?.sections ?? [], "pc", pcWidth)
      .filter((l) => !l.id.startsWith("section-bg:"));
    doc.mode = "free";
    doc.free = { layers: flattened };
    doc.layers = flattened;
    set({
      ...commit(state, normalizeDocModel(doc)),
      selection: { ids: [] },
      selectedSectionId: undefined,
    });
  },

  getRenderableLayers: (device) => {
    const state = get();
    return getRenderableLayersForState(state, device ?? state.device);
  },

  addSection: () => {
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = doc.sections?.sections ?? [];
    const nextSection = createSectionDraft(sections.length);
    sections.push(nextSection);
    doc.mode = "sections";
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({
      ...commit(state, doc),
      selectedSectionId: nextSection.id,
      selection: { ids: [] },
    });
  },

  duplicateSection: (sectionId) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = [...(doc.sections?.sections ?? [])];
    const fromIndex = sections.findIndex((s) => s.id === sectionId);
    if (fromIndex < 0) return;

    const source = sections[fromIndex];
    const duplicated = cloneSectionDeep(source, fromIndex + 1);
    sections.splice(fromIndex + 1, 0, duplicated);

    doc.mode = "sections";
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({
      ...commit(state, doc),
      selectedSectionId: duplicated.id,
      selection: { ids: [] },
    });
  },

  renameSection: (sectionId, name) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = doc.sections?.sections ?? [];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index < 0) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if ((sections[index].name ?? "") === trimmed) return;
    sections[index].name = trimmed;
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({ ...commit(state, doc) });
  },

  removeSection: (sectionId) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const currentSections = doc.sections?.sections ?? [];
    const removedIndex = currentSections.findIndex((s) => s.id === sectionId);
    if (removedIndex < 0) return;

    const sections = currentSections.filter((s) => s.id !== sectionId);
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };

    let nextSelected: string | undefined;
    if (sections.length === 0) {
      nextSelected = undefined;
    } else {
      nextSelected = sections[removedIndex]?.id ?? sections[removedIndex - 1]?.id;
    }

    set({
      ...commit(state, doc),
      selection: { ids: [] },
      selectedSectionId: nextSelected,
    });
  },

  updateSection: (sectionId, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = doc.sections?.sections ?? [];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index < 0) return;
    const section = sections[index];
    if (patch.name !== undefined) section.name = patch.name;
    if (patch.background !== undefined) section.background = patch.background;
    if (patch.paddingTop !== undefined) section.paddingTop = patch.paddingTop;
    if (patch.paddingBottom !== undefined) section.paddingBottom = patch.paddingBottom;
    if (patch.gap !== undefined) section.gap = patch.gap;
    if (patch.minHeight !== undefined) section.minHeight = patch.minHeight;
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({ ...commit(state, doc) });
  },

  moveSection: (sectionId, direction) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = [...(doc.sections?.sections ?? [])];
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    const [section] = sections.splice(index, 1);
    sections.splice(target, 0, section);
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({ ...commit(state, doc), selectedSectionId: sectionId });
  },

  moveSectionToIndex: (sectionId, targetIndex) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = [...(doc.sections?.sections ?? [])];
    const fromIndex = sections.findIndex((s) => s.id === sectionId);
    if (fromIndex < 0) return;
    const clampedTarget = Math.max(0, Math.min(sections.length - 1, targetIndex));
    if (fromIndex === clampedTarget) return;
    const [section] = sections.splice(fromIndex, 1);
    sections.splice(clampedTarget, 0, section);
    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({ ...commit(state, doc), selectedSectionId: sectionId });
  },

  groupSelectedLayers: () => {
    const state = get();
    const editable = getEditableLayers(state.document);
    const selected = state.selection.ids
      .map((id) => editable.find((l) => l.id === id))
      .filter(Boolean)
      .filter((l) => l?.content.kind !== "group") as CanvasLayer[];
    if (selected.length < 2) return;

    const doc = cloneDoc(state.document);
    const selectedIds = new Set(selected.map((l) => l.id));

    const editableLayers = getEditableLayers(doc);
    const selectedLayers = editableLayers.filter((l) => selectedIds.has(l.id));
    const bbPc = {
      minX: Math.min(...selectedLayers.map((l) => l.variants.pc.x)),
      minY: Math.min(...selectedLayers.map((l) => l.variants.pc.y)),
      maxX: Math.max(...selectedLayers.map((l) => l.variants.pc.x + l.variants.pc.w)),
      maxY: Math.max(...selectedLayers.map((l) => l.variants.pc.y + l.variants.pc.h)),
    };
    const bbSp = {
      minX: Math.min(...selectedLayers.map((l) => l.variants.sp.x)),
      minY: Math.min(...selectedLayers.map((l) => l.variants.sp.y)),
      maxX: Math.max(...selectedLayers.map((l) => l.variants.sp.x + l.variants.sp.w)),
      maxY: Math.max(...selectedLayers.map((l) => l.variants.sp.y + l.variants.sp.h)),
    };

    const maxZ = editableLayers.reduce((m, l) => Math.max(m, l.variants.pc.z, l.variants.sp.z), 0);
    const groupId = generateLayerId();
    const groupLayer: CanvasLayer = {
      id: groupId,
      type: "group",
      name: "グループ",
      locked: false,
      hidden: false,
      content: { kind: "group" },
      style: { opacity: 1 },
      variants: {
        pc: {
          x: bbPc.minX,
          y: bbPc.minY,
          w: Math.max(1, bbPc.maxX - bbPc.minX),
          h: Math.max(1, bbPc.maxY - bbPc.minY),
          r: 0,
          z: maxZ + 1,
        },
        sp: {
          x: bbSp.minX,
          y: bbSp.minY,
          w: Math.max(1, bbSp.maxX - bbSp.minX),
          h: Math.max(1, bbSp.maxY - bbSp.minY),
          r: 0,
          z: maxZ + 1,
        },
      },
    };

    for (const layer of editableLayers) {
      if (selectedIds.has(layer.id)) {
        layer.groupId = groupId;
      }
    }
    editableLayers.push(groupLayer);

    set({
      ...commit(state, doc),
      selection: { ids: [groupId, ...selectedLayers.map((l) => l.id)], primaryId: groupId },
    });
  },

  ungroupSelectedLayers: () => {
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const targetGroupIds = new Set<string>();

    for (const id of state.selection.ids) {
      const layer = editableLayers.find((l) => l.id === id);
      if (!layer) continue;
      if (layer.content.kind === "group") {
        targetGroupIds.add(layer.id);
      } else if (layer.groupId) {
        targetGroupIds.add(layer.groupId);
      }
    }

    if (targetGroupIds.size === 0) return;

    for (const layer of editableLayers) {
      if (layer.groupId && targetGroupIds.has(layer.groupId)) {
        layer.groupId = undefined;
      }
    }
    const kept = editableLayers.filter((l) => !(l.content.kind === "group" && targetGroupIds.has(l.id)));
    if (getDocumentMode(doc) === "sections") {
      for (const section of doc.sections?.sections ?? []) {
        section.layers = section.layers.filter((l) => kept.some((k) => k.id === l.id));
      }
    } else {
      doc.free = { layers: kept };
      doc.layers = kept;
    }

    set({
      ...commit(state, doc),
      selection: { ids: [] },
    });
  },

  /* ===== Layer CRUD ===== */
  addLayer: (layer) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    // z-index を最大+1に
    const maxZ = editableLayers.reduce((m, l) => Math.max(m, l.variants.pc.z, l.variants.sp.z), 0);
    layer.variants.pc.z = maxZ + 1;
    layer.variants.sp.z = maxZ + 1;
    if (getDocumentMode(doc) === "sections") {
      const sections = doc.sections?.sections ?? [];
      if (sections.length === 0) {
        sections.push(createSectionDraft(0));
      }
      const targetSectionId = state.selectedSectionId ?? sections[0].id;
      const targetSection = sections.find((s) => s.id === targetSectionId) ?? sections[0];
      const pcWidth = doc.meta.size.pc.width;
      const spWidth = doc.meta.size.sp.width;
      layer.variants.pc.x = Math.max(0, Math.round((pcWidth - layer.variants.pc.w) / 2));
      layer.variants.sp.x = Math.max(0, Math.round((spWidth - layer.variants.sp.w) / 2));
      layer.variants.pc.y = targetSection.paddingTop + 40;
      layer.variants.sp.y = targetSection.paddingTop + 40;
      targetSection.layers.push(layer);
      doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    } else {
      editableLayers.push(layer);
      doc.free = { layers: editableLayers };
      doc.layers = editableLayers;
    }
    set({
      ...commit(state, doc),
      selection: { ids: [layer.id], primaryId: layer.id },
      selectedSectionId: getDocumentMode(doc) === "sections"
        ? (state.selectedSectionId ?? doc.sections?.sections?.[0]?.id)
        : undefined,
    });
  },

  removeLayer: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const target = editableLayers.find((l) => l.id === id);
    const removable = new Set<string>([id]);
    if (target?.content.kind === "group") {
      for (const layer of editableLayers) {
        if (layer.groupId === id) {
          removable.add(layer.id);
        }
      }
    }
    const next = editableLayers.filter((l) => !removable.has(l.id));
    if (getDocumentMode(doc) === "sections") {
      for (const section of doc.sections?.sections ?? []) {
        section.layers = section.layers.filter((l) => next.some((n) => n.id === l.id));
      }
    } else {
      doc.free = { layers: next };
      doc.layers = next;
    }
    const sel = state.selection.ids.filter((sid) => !removable.has(sid));
    set({
      ...commit(state, doc),
      selection: { ids: sel, primaryId: sel[0] },
    });
  },

  removeLayers: (ids) => {
    const state = get();
    const normalizedIds = Array.from(new Set(ids));
    if (normalizedIds.length === 0) return;

    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const removable = new Set<string>(normalizedIds);

    for (const id of normalizedIds) {
      const layer = editableLayers.find((l) => l.id === id);
      if (!layer) continue;
      if (layer.content.kind === "group") {
        for (const child of editableLayers) {
          if (child.groupId === id) {
            removable.add(child.id);
          }
        }
      }
    }

    const next = editableLayers.filter((l) => !removable.has(l.id));
    if (getDocumentMode(doc) === "sections") {
      for (const section of doc.sections?.sections ?? []) {
        section.layers = section.layers.filter((l) => next.some((n) => n.id === l.id));
      }
    } else {
      doc.free = { layers: next };
      doc.layers = next;
    }

    const sel = state.selection.ids.filter((sid) => !removable.has(sid));
    set({
      ...commit(state, doc),
      selection: { ids: sel, primaryId: sel[0] },
    });
  },

  duplicateLayer: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const src = editableLayers.find((l) => l.id === id);
    if (!src) return;
    const maxZ = editableLayers.reduce((m, l) => Math.max(m, l.variants.pc.z, l.variants.sp.z), 0);
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
    if (getDocumentMode(doc) === "sections") {
      const found = findLayerRef(doc, id);
      if (found?.sectionIndex != null && doc.sections) {
        doc.sections.sections[found.sectionIndex].layers.push(dup);
      }
    } else {
      editableLayers.push(dup);
      doc.free = { layers: editableLayers };
      doc.layers = editableLayers;
    }
    set({
      ...commit(state, doc),
      selection: { ids: [dup.id], primaryId: dup.id },
    });
  },

  duplicateLayers: (ids) => {
    const state = get();
    const sourceIds = Array.from(new Set(ids));
    if (sourceIds.length === 0) return;

    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const sources = sourceIds
      .map((id) => editableLayers.find((l) => l.id === id))
      .filter(Boolean) as CanvasLayer[];
    if (sources.length === 0) return;

    const idMap = new Map<string, string>();
    for (const src of sources) {
      idMap.set(src.id, generateLayerId());
    }

    const maxZ = editableLayers.reduce((m, l) => Math.max(m, l.variants.pc.z, l.variants.sp.z), 0);
    const newIds: string[] = [];
    const duplicates = sources.map((src, index) => {
      const dup: CanvasLayer = {
        ...JSON.parse(JSON.stringify(src)),
        id: idMap.get(src.id) ?? generateLayerId(),
        name: `${src.name} (コピー)`,
      };

      dup.variants.pc.x += 20;
      dup.variants.pc.y += 20;
      dup.variants.sp.x += 20;
      dup.variants.sp.y += 20;
      dup.variants.pc.z = maxZ + index + 1;
      dup.variants.sp.z = maxZ + index + 1;

      if (dup.groupId) {
        dup.groupId = idMap.get(dup.groupId);
      }

      newIds.push(dup.id);
      return dup;
    });

    if (getDocumentMode(doc) === "sections") {
      const sections = doc.sections?.sections ?? [];
      for (let i = 0; i < sources.length; i += 1) {
        const found = findLayerRef(doc, sources[i].id);
        if (found?.sectionIndex != null) {
          sections[found.sectionIndex].layers.push(duplicates[i]);
        }
      }
      doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    } else {
      editableLayers.push(...duplicates);
      doc.free = { layers: editableLayers };
      doc.layers = editableLayers;
    }

    set({
      ...commit(state, doc),
      selection: { ids: newIds, primaryId: newIds[0] },
    });
  },

  reorderLayers: (activeId, overId) => {
    if (!activeId || !overId || activeId === overId) return;
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const sorted = [...editableLayers].sort(
      (a, b) => getLayout(b, state.device).z - getLayout(a, state.device).z
    );
    const oldIndex = sorted.findIndex((l) => l.id === activeId);
    const newIndex = sorted.findIndex((l) => l.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(sorted, oldIndex, newIndex);
    const count = moved.length;

    for (let i = 0; i < moved.length; i += 1) {
      const layer = editableLayers.find((l) => l.id === moved[i].id);
      if (!layer) continue;
      const z = count - i;
      layer.variants.pc.z = z;
      layer.variants.sp.z = z;
    }

    set({ ...commit(state, doc) });
  },

  reorderSectionLayers: (sectionId, activeId, overId) => {
    if (!sectionId || !activeId || !overId || activeId === overId) return;
    const state = get();
    const doc = cloneDoc(state.document);
    const sections = doc.sections?.sections ?? [];
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const oldIndex = section.layers.findIndex((l) => l.id === activeId);
    const newIndex = section.layers.findIndex((l) => l.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    section.layers = arrayMove(section.layers, oldIndex, newIndex);
    for (let index = 0; index < section.layers.length; index += 1) {
      const z = index + 1;
      section.layers[index].variants.pc.z = z;
      section.layers[index].variants.sp.z = z;
    }

    doc.sections = { sections: sections.map((s) => normalizeSectionModel(s)) };
    set({ ...commit(state, doc), selectedSectionId: sectionId });
  },

  /* ===== Update Layout (current device only) ===== */
  updateLayerLayout: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const found = findLayerRef(doc, id);
    const layer = found?.layer;
    if (!layer) return;
    const layout = getLayout(layer, state.device);
    const nextPatch: Partial<CanvasLayout> = { ...patch };

    if (getDocumentMode(doc) === "sections" && found?.sectionIndex != null) {
      const sections = doc.sections?.sections ?? [];
      const section = sections[found.sectionIndex];
      if (section && typeof nextPatch.y === "number") {
        const contentYOffset = getSectionContentYOffset(sections, section.id, state.device);
        nextPatch.y = nextPatch.y - contentYOffset;
      }
    }

    Object.assign(layout, nextPatch);

    if ((layer.constraints?.horizontal ?? "fixed") === "stretch") {
      const canvasW = state.device === "pc" ? doc.meta.size.pc.width : doc.meta.size.sp.width;
      const marginLeft = Math.max(0, Math.round(layout.x));
      const marginRight = Math.max(0, Math.round(canvasW - (layout.x + layout.w)));
      layer.constraints = {
        ...(layer.constraints ?? {}),
        horizontal: "stretch",
        marginLeft,
        marginRight,
      };
      layout.x = marginLeft;
      layout.w = Math.max(1, canvasW - marginLeft - marginRight);
    }

    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  /* ===== Update Style ===== */
  updateLayerStyle: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer) return;
    Object.assign(layer.style, patch);
    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  updateLayerConstraints: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer) return;
    layer.constraints = {
      horizontal: "fixed",
      marginLeft: 0,
      marginRight: 0,
      ...(layer.constraints ?? {}),
      ...patch,
    };

    if ((layer.constraints.horizontal ?? "fixed") === "stretch") {
      const canvasW = state.device === "pc" ? doc.meta.size.pc.width : doc.meta.size.sp.width;
      const marginLeft = Math.max(0, layer.constraints.marginLeft ?? 0);
      const marginRight = Math.max(0, layer.constraints.marginRight ?? 0);
      const layout = getLayout(layer, state.device);
      layout.x = marginLeft;
      layout.w = Math.max(1, canvasW - marginLeft - marginRight);
    }

    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  updateImageLayerSettings: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer || layer.content.kind !== "image") return;
    const current = layer.imageSettings ?? {
      lockAspect: true,
      fitMode: "cover" as const,
      focalPoint: { x: 0.5, y: 0.5 },
    };
    layer.imageSettings = {
      ...current,
      ...patch,
      focalPoint: {
        ...current.focalPoint,
        ...(patch.focalPoint ?? {}),
      },
    };
    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  /* ===== Update Content ===== */
  updateLayerContent: (id, patch) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer) return;
    Object.assign(layer.content, patch);
    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  /* ===== Rename ===== */
  renameLayer: (id, name) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer) return;
    layer.name = name;
    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  /* ===== Z-Order ===== */
  bringForward: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const { device } = state;
    const editableLayers = getEditableLayers(doc);
    const sorted = [...editableLayers].sort((a, b) => getLayout(a, device).z - getLayout(b, device).z);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const curZ = getLayout(sorted[idx], device).z;
    const nextZ = getLayout(sorted[idx + 1], device).z;
    // swap z
    const layerA = editableLayers.find((l) => l.id === sorted[idx].id);
    const layerB = editableLayers.find((l) => l.id === sorted[idx + 1].id);
    if (layerA) getLayout(layerA, device).z = nextZ;
    if (layerB) getLayout(layerB, device).z = curZ;
    set({ ...commit(state, doc) });
  },

  sendBackward: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const { device } = state;
    const editableLayers = getEditableLayers(doc);
    const sorted = [...editableLayers].sort((a, b) => getLayout(a, device).z - getLayout(b, device).z);
    const idx = sorted.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    const curZ = getLayout(sorted[idx], device).z;
    const prevZ = getLayout(sorted[idx - 1], device).z;
    const layerA = editableLayers.find((l) => l.id === sorted[idx].id);
    const layerB = editableLayers.find((l) => l.id === sorted[idx - 1].id);
    if (layerA) getLayout(layerA, device).z = prevZ;
    if (layerB) getLayout(layerB, device).z = curZ;
    set({ ...commit(state, doc) });
  },

  bringToFront: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const maxZ = editableLayers.reduce((m, l) => Math.max(m, getLayout(l, state.device).z), 0);
    const layer = editableLayers.find((l) => l.id === id);
    if (!layer) return;
    getLayout(layer, state.device).z = maxZ + 1;
    set({ ...commit(state, doc) });
  },

  sendToBack: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const editableLayers = getEditableLayers(doc);
    const minZ = editableLayers.reduce((m, l) => Math.min(m, getLayout(l, state.device).z), Infinity);
    const layer = editableLayers.find((l) => l.id === id);
    if (!layer) return;
    getLayout(layer, state.device).z = minZ - 1;
    set({ ...commit(state, doc) });
  },

  /* ===== Lock / Hide ===== */
  toggleLock: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer) return;
    layer.locked = !layer.locked;
    set({ ...commit(state, doc) });
  },

  toggleHidden: (id) => {
    const state = get();
    const doc = cloneDoc(state.document);
    const layer = findLayerRef(doc, id)?.layer;
    if (!layer) return;
    layer.hidden = !layer.hidden;
    set({ ...commit(state, doc) });
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
    const prev = normalizeDocModel(state.past[state.past.length - 1]);
    const newPast = state.past.slice(0, -1);
    set({
      document: prev,
      selection: sanitizeSelectionForDoc(prev, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(prev, state.selectedSectionId),
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
    const next = normalizeDocModel(state.future[0]);
    const newFuture = state.future.slice(1);
    set({
      document: next,
      selection: sanitizeSelectionForDoc(next, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(next, state.selectedSectionId),
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

    for (const layer of getEditableLayers(doc)) {
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

  applyFitTextToAll: () => {
    const state = get();
    const doc = cloneDoc(state.document);
    const dev = state.device;
    let changed = false;

    for (const layer of getEditableLayers(doc)) {
      if (layer.hidden || layer.locked) continue;

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
    const pcDesignWidth = doc.meta.size.pc.width;
    const pcDesignHeight = doc.meta.size.pc.height;
    const spDesignWidth = doc.meta.size.sp.width;
    const spDesignHeight = doc.meta.size.sp.height;
    const sx = spDesignWidth / pcDesignWidth;
    const sy = spDesignHeight / pcDesignHeight;
    const margin = 8;

    const isHeadingText = (layer: CanvasLayer) => {
      if (layer.content.kind !== "text") return false;
      const pc = layer.variants.pc;
      const fs = layer.style.fontSize ?? 16;
      const fw = layer.style.fontWeight ?? 400;
      const isTopHalf = pc.y <= Math.round(pcDesignHeight * 0.45);
      const isLargeBlock = pc.w >= Math.round(pcDesignWidth * 0.35);
      return isTopHalf && isLargeBlock && (fs >= 30 || fw >= 700 || /見出し|heading|title/i.test(layer.name));
    };

    const largestImage = getEditableLayers(doc)
      .filter((layer) => layer.content.kind === "image")
      .map((layer) => ({
        id: layer.id,
        area: layer.variants.pc.w * layer.variants.pc.h,
        y: layer.variants.pc.y,
      }))
      .sort((a, b) => b.area - a.area)[0];

    for (const layer of getEditableLayers(doc)) {
      const pc = layer.variants.pc;
      const horizontal = layer.constraints?.horizontal ?? "fixed";

      // constraints は常に存在させる（互換用デフォルト）
      layer.constraints = {
        horizontal,
        marginLeft: layer.constraints?.marginLeft ?? 0,
        marginRight: layer.constraints?.marginRight ?? 0,
      };

      // (a) scale 計算（floatのまま）
      let x = pc.x * sx;
      let w = pc.w * sx;
      const y = pc.y * sy;
      let h = pc.h * sy;
      let centered = false;

      if (horizontal === "stretch") {
        const marginLeft = layer.constraints.marginLeft ?? 0;
        const marginRight = layer.constraints.marginRight ?? 0;
        x = marginLeft;
        w = Math.max(1, spDesignWidth - marginLeft - marginRight);
      }

      if (layer.content.kind === "image") {
        const settings = layer.imageSettings ?? {
          lockAspect: true,
          fitMode: "cover" as const,
          focalPoint: { x: 0.5, y: 0.5 },
        };
        const shouldKeepAspect = settings.lockAspect;
        if (shouldKeepAspect && pc.w > 0) {
          h = Math.max(1, pc.h * sx);
        }
      }

      // ページ向け中央寄せ補正: ヒーロー画像（最大面積）/見出しテキスト
      const isHeroImage =
        layer.content.kind === "image" &&
        largestImage?.id === layer.id &&
        layer.variants.pc.y <= Math.round(pcDesignHeight * 0.6);

      const shouldCenter = isHeroImage || isHeadingText(layer);
      if (shouldCenter && horizontal !== "stretch") {
        // (b) 中央寄せ決定（designWidth基準）
        x = (spDesignWidth - w) / 2;
        centered = true;
      }

      // はみ出し調整（stretch 以外）
      if (horizontal !== "stretch" && !centered) {
        if (x < margin) x = margin;
        if (x + w > spDesignWidth - margin) {
          w = spDesignWidth - margin - x;
          if (w < 20) {
            x = margin;
            w = spDesignWidth - margin * 2;
          }
        }
      }

      // (c) 最後にround
      layer.variants.sp = {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
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
    for (const layer of getEditableLayers(doc)) {
      if (state.selection.ids.includes(layer.id) && !layer.locked) {
        const layout = getLayout(layer, state.device);
        layout.x += dx;
        layout.y += dy;
      }
    }
    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },

  /* ===== Align / Distribute ===== */
  alignSelected: (direction) => {
    const state = get();
    const { ids } = state.selection;
    if (ids.length < 2) return;
    const doc = cloneDoc(state.document);
    const entries = ids
      .map((id) => {
        const layer = findLayerRef(doc, id)?.layer;
        return layer ? { id, layout: { ...getLayout(layer, state.device) } } : null;
      })
      .filter(Boolean) as { id: string; layout: CanvasLayout }[];
    if (entries.length < 2) return;

    const patches = computeAlign(entries, direction);
    for (const { id, patch } of patches) {
      const layer = findLayerRef(doc, id)?.layer;
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
        const layer = findLayerRef(doc, id)?.layer;
        return layer ? { id, layout: { ...getLayout(layer, state.device) } } : null;
      })
      .filter(Boolean) as { id: string; layout: CanvasLayout }[];
    if (entries.length < 3) return;

    const patches = computeDistribute(entries, direction);
    for (const { id, patch } of patches) {
      const layer = findLayerRef(doc, id)?.layer;
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
    set({
      document: doc,
      selection: sanitizeSelectionForDoc(doc, state.selection),
      selectedSectionId: sanitizeSelectedSectionIdForDoc(doc, state.selectedSectionId),
      dirty: true,
    });
  },
}));
