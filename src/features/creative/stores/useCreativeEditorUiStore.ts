import { create } from "zustand";

type PreviewDevice = "desktop" | "mobile";

type CreativeEditorUiState = {
  selectedLayerId: string | null;
  zoom: number;
  previewDevice: PreviewDevice;
  setSelectedLayerId: (layerId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPreviewDevice: (previewDevice: PreviewDevice) => void;
};

export const useCreativeEditorUiStore = create<CreativeEditorUiState>((set) => ({
  selectedLayerId: null,
  zoom: 1,
  previewDevice: "desktop",
  setSelectedLayerId: (selectedLayerId) => set({ selectedLayerId }),
  setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(2, zoom)) }),
  setPreviewDevice: (previewDevice) => set({ previewDevice }),
}));
