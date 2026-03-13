import { create } from "zustand";
import {
  DEFAULT_CREATIVE_INPUT,
  type CreativeInputValues,
  type CreativeScreen,
} from "@/src/features/creative/types/document";

type CreativeDocumentState = {
  activeScreen: CreativeScreen;
  documentId: string | null;
  inputValues: CreativeInputValues;
  selectedVariantId: string | null;
  setActiveScreen: (screen: CreativeScreen) => void;
  setDocumentId: (documentId: string | null) => void;
  setInputValues: (values: CreativeInputValues) => void;
  updateInputField: <K extends keyof CreativeInputValues>(
    key: K,
    value: CreativeInputValues[K],
  ) => void;
  setSelectedVariantId: (variantId: string | null) => void;
};

export const useCreativeDocumentStore = create<CreativeDocumentState>((set) => ({
  activeScreen: "input",
  documentId: null,
  inputValues: DEFAULT_CREATIVE_INPUT,
  selectedVariantId: null,
  setActiveScreen: (activeScreen) => set({ activeScreen }),
  setDocumentId: (documentId) => set({ documentId }),
  setInputValues: (inputValues) => set({ inputValues }),
  updateInputField: (key, value) =>
    set((state) => ({
      inputValues: {
        ...state.inputValues,
        [key]: value,
      },
    })),
  setSelectedVariantId: (selectedVariantId) => set({ selectedVariantId }),
}));
