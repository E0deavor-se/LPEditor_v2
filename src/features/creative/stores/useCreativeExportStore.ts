import { create } from "zustand";
import type {
  CreativeExportFormat,
  CreativeExportStatus,
  CreativePublishStatus,
} from "@/src/features/creative/types/export";

type CreativeExportState = {
  exportStatus: CreativeExportStatus;
  publishStatus: CreativePublishStatus;
  lastExportUrl: string | null;
  lastExportFormat: CreativeExportFormat | null;
  errorMessage: string | null;
  setExportStatus: (status: CreativeExportStatus) => void;
  setPublishStatus: (status: CreativePublishStatus) => void;
  setLastExport: (format: CreativeExportFormat, downloadUrl: string) => void;
  setErrorMessage: (message: string | null) => void;
};

export const useCreativeExportStore = create<CreativeExportState>((set) => ({
  exportStatus: "idle",
  publishStatus: "idle",
  lastExportUrl: null,
  lastExportFormat: null,
  errorMessage: null,
  setExportStatus: (exportStatus) => set({ exportStatus }),
  setPublishStatus: (publishStatus) => set({ publishStatus }),
  setLastExport: (lastExportFormat, lastExportUrl) =>
    set({
      lastExportFormat,
      lastExportUrl,
      exportStatus: "success",
      errorMessage: null,
    }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
