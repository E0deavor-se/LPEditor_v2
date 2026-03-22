import type {
  AiAssetGenerationJob,
  AiAssetRole,
  AiGeneratedAsset,
} from "@/src/features/ai-assets/types";

type ServerAssetStore = {
  jobMap: Map<string, AiAssetGenerationJob>;
  sectionAssetsMap: Map<string, AiGeneratedAsset[]>;
};

declare global {
  // eslint-disable-next-line no-var
  var __aurbitServerAssetStore: ServerAssetStore | undefined;
}

const store: ServerAssetStore =
  globalThis.__aurbitServerAssetStore ?? {
    jobMap: new Map<string, AiAssetGenerationJob>(),
    sectionAssetsMap: new Map<string, AiGeneratedAsset[]>(),
  };

if (!globalThis.__aurbitServerAssetStore) {
  globalThis.__aurbitServerAssetStore = store;
}

const jobMap = store.jobMap;
const sectionAssetsMap = store.sectionAssetsMap;
const isDebug = process.env.NODE_ENV !== "production";

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[ai-assets:server-store] ${message}`, meta);
    return;
  }
  console.info(`[ai-assets:server-store] ${message}`);
};


export const setJob = (job: AiAssetGenerationJob) => {
  jobMap.set(job.jobId, job);
  logDebug("setJob", {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
  });
};

export const updateJob = (jobId: string, patch: Partial<AiAssetGenerationJob>) => {
  const current = jobMap.get(jobId);
  if (!current) {
    return null;
  }
  const next: AiAssetGenerationJob = {
    ...current,
    ...patch,
    jobId,
  };
  jobMap.set(jobId, next);
  logDebug("updateJob", {
    jobId,
    status: next.status,
    progress: next.progress,
    message: next.message,
  });
  return next;
};

export const getJob = (jobId: string) => {
  return jobMap.get(jobId) ?? null;
};

export const upsertSectionAsset = (asset: AiGeneratedAsset) => {
  const current = sectionAssetsMap.get(asset.sectionId) ?? [];
  const index = current.findIndex((entry) => entry.id === asset.id);
  const next = [...current];
  if (index >= 0) {
    next[index] = asset;
  } else {
    next.unshift(asset);
  }
  sectionAssetsMap.set(asset.sectionId, next);
};

export const getSectionAssets = (sectionId: string) => {
  return sectionAssetsMap.get(sectionId) ?? [];
};

export const findAsset = (
  sectionId: string,
  assetId: string,
): AiGeneratedAsset | null => {
  const assets = sectionAssetsMap.get(sectionId) ?? [];
  return assets.find((entry) => entry.id === assetId) ?? null;
};

export const appendBindHistory = (
  sectionId: string,
  assetId: string,
  role: AiAssetRole,
): AiGeneratedAsset | null => {
  const assets = sectionAssetsMap.get(sectionId) ?? [];
  const index = assets.findIndex((entry) => entry.id === assetId);
  if (index < 0) {
    return null;
  }
  const now = new Date().toISOString();
  const current = assets[index];
  const nextAsset: AiGeneratedAsset = {
    ...current,
    role,
    bindHistory: [
      ...current.bindHistory,
      {
        sectionId,
        role,
        boundAt: now,
      },
    ],
  };
  const nextAssets = [...assets];
  nextAssets[index] = nextAsset;
  sectionAssetsMap.set(sectionId, nextAssets);
  return nextAsset;
};
