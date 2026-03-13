import { create } from "zustand";
import type {
  AiAssetGenerationJob,
  AiAssetRole,
  AiGeneratedAsset,
} from "@/src/features/ai-assets/types";

type AiAssetsState = {
  assetsBySection: Record<string, AiGeneratedAsset[]>;
  activeJobsBySection: Record<string, AiAssetGenerationJob | null>;
  selectedAssetIdsBySectionRole: Record<string, string>;
  setSectionAssets: (sectionId: string, assets: AiGeneratedAsset[]) => void;
  upsertSectionAsset: (asset: AiGeneratedAsset) => void;
  setActiveJob: (sectionId: string, job: AiAssetGenerationJob | null) => void;
  setSelectedAssetId: (sectionId: string, role: AiAssetRole, assetId: string) => void;
  getSelectedAssetId: (sectionId: string, role: AiAssetRole) => string | null;
};

const roleKey = (sectionId: string, role: AiAssetRole) => `${sectionId}::${role}`;

export const useAiAssetsStore = create<AiAssetsState>((set, get) => ({
  assetsBySection: {},
  activeJobsBySection: {},
  selectedAssetIdsBySectionRole: {},

  setSectionAssets: (sectionId, assets) =>
    set((state) => ({
      assetsBySection: {
        ...state.assetsBySection,
        [sectionId]: assets,
      },
    })),

  upsertSectionAsset: (asset) =>
    set((state) => {
      const current = state.assetsBySection[asset.sectionId] ?? [];
      const index = current.findIndex((entry) => entry.id === asset.id);
      const next = [...current];
      if (index >= 0) {
        next[index] = asset;
      } else {
        next.unshift(asset);
      }
      return {
        assetsBySection: {
          ...state.assetsBySection,
          [asset.sectionId]: next,
        },
      };
    }),

  setActiveJob: (sectionId, job) =>
    set((state) => ({
      activeJobsBySection: {
        ...state.activeJobsBySection,
        [sectionId]: job,
      },
    })),

  setSelectedAssetId: (sectionId, role, assetId) =>
    set((state) => ({
      selectedAssetIdsBySectionRole: {
        ...state.selectedAssetIdsBySectionRole,
        [roleKey(sectionId, role)]: assetId,
      },
    })),

  getSelectedAssetId: (sectionId, role) => {
    return get().selectedAssetIdsBySectionRole[roleKey(sectionId, role)] ?? null;
  },
}));
