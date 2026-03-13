import { create } from "zustand";
import type { CreativeVariantJson } from "@/src/features/creative/types/layer";
import type { CreativeVariant } from "@/src/features/creative/types/variant";

type CreativeVariantState = {
  variants: CreativeVariant[];
  currentVariantId: string | null;
  variantJson: CreativeVariantJson | null;
  undoStack: CreativeVariantJson[];
  redoStack: CreativeVariantJson[];
  setVariants: (variants: CreativeVariant[]) => void;
  replaceVariant: (variant: CreativeVariant) => void;
  setCurrentVariantById: (variantId: string) => void;
  patchLayer: (layerId: string, patch: Record<string, string | number>) => void;
  moveLayer: (layerId: string, x: number, y: number) => void;
  resizeLayer: (layerId: string, width: number, height: number) => void;
  replaceLogo: (imageUrl: string) => void;
  replaceBackground: (imageUrl: string) => void;
  commitVariantJson: (variantJson: CreativeVariantJson) => void;
  undo: () => void;
  redo: () => void;
};

const cloneJson = (value: CreativeVariantJson): CreativeVariantJson =>
  JSON.parse(JSON.stringify(value)) as CreativeVariantJson;

const withSyncedVariant = (
  variants: CreativeVariant[],
  currentVariantId: string | null,
  variantJson: CreativeVariantJson | null,
): CreativeVariant[] => {
  if (!currentVariantId || !variantJson) {
    return variants;
  }
  return variants.map((variant) =>
    variant.id === currentVariantId
      ? {
          ...variant,
          variantJson: cloneJson(variantJson),
        }
      : variant,
  );
};

export const useCreativeVariantStore = create<CreativeVariantState>((set, get) => ({
  variants: [],
  currentVariantId: null,
  variantJson: null,
  undoStack: [],
  redoStack: [],
  setVariants: (variants) => {
    const nextCurrentId = get().currentVariantId ?? variants[0]?.id ?? null;
    const currentVariant = variants.find((variant) => variant.id === nextCurrentId) ?? null;
    set({
      variants,
      currentVariantId: currentVariant?.id ?? null,
      variantJson: currentVariant ? cloneJson(currentVariant.variantJson) : null,
      undoStack: [],
      redoStack: [],
    });
  },
  replaceVariant: (variant) => {
    const { currentVariantId } = get();
    set((state) => {
      const nextVariants = state.variants.map((entry) =>
        entry.id === variant.id ? variant : entry,
      );
      const shouldSyncEditor = currentVariantId === variant.id;
      return {
        variants: nextVariants,
        variantJson: shouldSyncEditor ? cloneJson(variant.variantJson) : state.variantJson,
      };
    });
  },
  setCurrentVariantById: (variantId) => {
    const variant = get().variants.find((entry) => entry.id === variantId);
    if (!variant) {
      return;
    }
    set({
      currentVariantId: variantId,
      variantJson: cloneJson(variant.variantJson),
      undoStack: [],
      redoStack: [],
    });
  },
  patchLayer: (layerId, patch) => {
    const { variantJson, undoStack, variants, currentVariantId } = get();
    if (!variantJson) {
      return;
    }
    const nextJson = cloneJson(variantJson);
    nextJson.layers = nextJson.layers.map((layer) =>
      layer.id === layerId ? { ...layer, ...patch } : layer,
    );
    set({
      variantJson: nextJson,
      undoStack: [...undoStack, cloneJson(variantJson)],
      redoStack: [],
      variants: withSyncedVariant(variants, currentVariantId, nextJson),
    });
  },
  moveLayer: (layerId, x, y) => {
    get().patchLayer(layerId, {
      x: Math.round(x),
      y: Math.round(y),
    });
  },
  resizeLayer: (layerId, width, height) => {
    get().patchLayer(layerId, {
      width: Math.max(20, Math.round(width)),
      height: Math.max(20, Math.round(height)),
    });
  },
  replaceLogo: (imageUrl) => {
    const { variantJson, undoStack, variants, currentVariantId } = get();
    if (!variantJson) {
      return;
    }
    const nextJson = cloneJson(variantJson);
    nextJson.layers = nextJson.layers.map((layer) =>
      layer.type === "logo" ? { ...layer, imageUrl } : layer,
    );
    set({
      variantJson: nextJson,
      undoStack: [...undoStack, cloneJson(variantJson)],
      redoStack: [],
      variants: withSyncedVariant(variants, currentVariantId, nextJson),
    });
  },
  replaceBackground: (imageUrl) => {
    const { variantJson, undoStack, variants, currentVariantId } = get();
    if (!variantJson) {
      return;
    }
    const nextJson = cloneJson(variantJson);
    nextJson.background.imageUrl = imageUrl;
    set({
      variantJson: nextJson,
      undoStack: [...undoStack, cloneJson(variantJson)],
      redoStack: [],
      variants: withSyncedVariant(variants, currentVariantId, nextJson),
    });
  },
  commitVariantJson: (variantJson) => {
    const currentVariantId = get().currentVariantId;
    if (!currentVariantId) {
      return;
    }
    const nextJson = cloneJson(variantJson);
    set((state) => ({
      variantJson: nextJson,
      variants: withSyncedVariant(state.variants, currentVariantId, nextJson),
    }));
  },
  undo: () => {
    const { undoStack, redoStack, variantJson, variants, currentVariantId } = get();
    if (!variantJson || undoStack.length === 0) {
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    const nextUndo = undoStack.slice(0, -1);
    const nextRedo = [...redoStack, cloneJson(variantJson)];
    set({
      variantJson: cloneJson(previous),
      undoStack: nextUndo,
      redoStack: nextRedo,
      variants: withSyncedVariant(variants, currentVariantId, previous),
    });
  },
  redo: () => {
    const { undoStack, redoStack, variantJson, variants, currentVariantId } = get();
    if (!variantJson || redoStack.length === 0) {
      return;
    }
    const next = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    const nextUndo = [...undoStack, cloneJson(variantJson)];
    set({
      variantJson: cloneJson(next),
      undoStack: nextUndo,
      redoStack: nextRedo,
      variants: withSyncedVariant(variants, currentVariantId, next),
    });
  },
}));
