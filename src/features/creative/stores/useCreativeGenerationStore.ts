import { create } from "zustand";
import type { CreativeJobStatus } from "@/src/features/creative/types/job";

type CreativeGenerationState = {
  jobId: string | null;
  status: CreativeJobStatus;
  progress: number;
  errorMessage: string | null;
  setJobId: (jobId: string | null) => void;
  setStatus: (status: CreativeJobStatus) => void;
  setProgress: (progress: number) => void;
  setErrorMessage: (message: string | null) => void;
  reset: () => void;
};

export const useCreativeGenerationStore = create<CreativeGenerationState>((set) => ({
  jobId: null,
  status: "idle",
  progress: 0,
  errorMessage: null,
  setJobId: (jobId) => set({ jobId }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(100, progress)) }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  reset: () =>
    set({
      jobId: null,
      status: "idle",
      progress: 0,
      errorMessage: null,
    }),
}));
