import type { CreativeJob } from "@/src/features/creative/types/job";
import type { CreativeVariant } from "@/src/features/creative/types/variant";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const jobMap = new Map<string, CreativeJob>();
const documentVariantsMap = new Map<string, CreativeVariant[]>();
const isDebug = process.env.NODE_ENV !== "production";
const snapshotPath = join(process.cwd(), ".next", "cache", "creative-server-generation-store.json");

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[creative:server-store] ${message}`, meta);
    return;
  }
  console.info(`[creative:server-store] ${message}`);
};

type StoreSnapshot = {
  jobs: Record<string, CreativeJob>;
  variants: Record<string, CreativeVariant[]>;
};

const readSnapshot = (): StoreSnapshot => {
  if (!existsSync(snapshotPath)) {
    return { jobs: {}, variants: {} };
  }
  try {
    const parsed = JSON.parse(readFileSync(snapshotPath, "utf-8")) as Partial<StoreSnapshot>;
    return {
      jobs: parsed.jobs && typeof parsed.jobs === "object" ? (parsed.jobs as Record<string, CreativeJob>) : {},
      variants:
        parsed.variants && typeof parsed.variants === "object"
          ? (parsed.variants as Record<string, CreativeVariant[]>)
          : {},
    };
  } catch (error) {
    console.error("[creative:server-store] readSnapshot failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { jobs: {}, variants: {} };
  }
};

const writeSnapshot = () => {
  try {
    mkdirSync(dirname(snapshotPath), { recursive: true });
    const jobs = Object.fromEntries(jobMap.entries());
    const variants = Object.fromEntries(documentVariantsMap.entries());
    writeFileSync(snapshotPath, JSON.stringify({ jobs, variants } satisfies StoreSnapshot), "utf-8");
  } catch (error) {
    console.error("[creative:server-store] writeSnapshot failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

const hydrateFromSnapshot = () => {
  const snapshot = readSnapshot();
  for (const [jobId, job] of Object.entries(snapshot.jobs)) {
    jobMap.set(jobId, job);
  }
  for (const [documentId, variants] of Object.entries(snapshot.variants)) {
    documentVariantsMap.set(documentId, variants);
  }
};

export const setJob = (job: CreativeJob) => {
  hydrateFromSnapshot();
  jobMap.set(job.jobId, job);
  writeSnapshot();
  logDebug("setJob", {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
  });
};

export const updateJob = (
  jobId: string,
  patch: Partial<CreativeJob>,
): CreativeJob | null => {
  hydrateFromSnapshot();
  const current = jobMap.get(jobId);
  if (!current) {
    return null;
  }
  const next: CreativeJob = {
    ...current,
    ...patch,
    jobId,
  };
  jobMap.set(jobId, next);
  writeSnapshot();
  logDebug("updateJob", {
    jobId,
    status: next.status,
    progress: next.progress,
    message: next.message,
  });
  return next;
};

export const getJob = (jobId: string): CreativeJob | null => {
  hydrateFromSnapshot();
  const job = jobMap.get(jobId) ?? null;
  logDebug("getJob", {
    jobId,
    found: Boolean(job),
    status: job?.status,
    progress: job?.progress,
  });
  return job;
};

export const setDocumentVariants = (documentId: string, variants: CreativeVariant[]) => {
  hydrateFromSnapshot();
  documentVariantsMap.set(documentId, variants);
  writeSnapshot();
  logDebug("setDocumentVariants", {
    documentId,
    count: variants.length,
  });
};

export const getDocumentVariants = (documentId: string): CreativeVariant[] | null => {
  hydrateFromSnapshot();
  const variants = documentVariantsMap.get(documentId) ?? null;
  logDebug("getDocumentVariants", {
    documentId,
    found: Boolean(variants),
    count: variants?.length ?? 0,
  });
  return variants;
};

export const findVariantById = (variantId: string): {
  documentId: string;
  index: number;
  variant: CreativeVariant;
} | null => {
  hydrateFromSnapshot();
  for (const [documentId, variants] of documentVariantsMap.entries()) {
    const index = variants.findIndex((entry) => entry.id === variantId);
    if (index >= 0) {
      const variant = variants[index];
      logDebug("findVariantById", {
        variantId,
        documentId,
        index,
      });
      return { documentId, index, variant };
    }
  }
  logDebug("findVariantById", {
    variantId,
    documentId: null,
    index: -1,
  });
  return null;
};

export const replaceVariantById = (
  variantId: string,
  nextVariant: CreativeVariant,
): { documentId: string; variants: CreativeVariant[] } | null => {
  hydrateFromSnapshot();
  for (const [documentId, variants] of documentVariantsMap.entries()) {
    const index = variants.findIndex((entry) => entry.id === variantId);
    if (index < 0) {
      continue;
    }
    const nextVariants = variants.map((entry, idx) =>
      idx === index ? nextVariant : entry,
    );
    documentVariantsMap.set(documentId, nextVariants);
    writeSnapshot();
    logDebug("replaceVariantById", {
      variantId,
      documentId,
      index,
    });
    return { documentId, variants: nextVariants };
  }
  logDebug("replaceVariantById", {
    variantId,
    documentId: null,
    index: -1,
  });
  return null;
};
