export type AiAssetRole =
  | "heroPc"
  | "heroSp"
  | "imageOnly"
  | "sectionImage"
  | "sectionIcon";

export type AiAssetPromptTarget =
  | "heroImage"
  | "heroBackground"
  | "sectionBackground"
  | "sectionImage"
  | "sectionIcon"
  | "bannerImage"
  | "mainVisual";

export type AiAssetCampaignFamily =
  | "coupon"
  | "point"
  | "cashback"
  | "discount"
  | "present"
  | "entry"
  | "seasonal"
  | "new_opening"
  | "awareness"
  | "branding"
  | "generic";

export type AiAssetSectionPromptType =
  | "hero"
  | "campaignPeriod"
  | "cv"
  | "benefit"
  | "feature"
  | "reason"
  | "step"
  | "useCase"
  | "storeList"
  | "faq"
  | "notice"
  | "cta"
  | "free"
  | "unknown";

export type AiAssetTone =
  | "clean"
  | "premium"
  | "pop"
  | "energetic"
  | "natural"
  | "minimal"
  | "luxury"
  | "friendly"
  | "trust"
  | "seasonal";

export type AiAssetTextOverlayLevel = "none" | "light" | "medium" | "strong";

export type AiAssetDensity = "low" | "medium" | "high";

export type AiAssetOverlayPosition =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "center";

export type AiAssetOverlayPositionSource =
  | "explicit"
  | "preset"
  | "inferred"
  | "fallback";

export type AiAssetTextOverlaySource =
  | "explicit"
  | "preset"
  | "inferred"
  | "fallback";

export type AiAssetDensitySource =
  | "explicit"
  | "preset"
  | "inferred"
  | "fallback";

export type BuildAssetPromptInput = {
  target: AiAssetPromptTarget;
  campaign?: {
    name?: string;
    family?: AiAssetCampaignFamily;
    brandName?: string;
    industry?: string;
    summary?: string;
    benefitText?: string;
    rewardText?: string;
    season?: string;
    keywords?: string[];
  };
  section?: {
    id?: string;
    type?: AiAssetSectionPromptType;
    title?: string;
    description?: string;
    caption?: string;
    name?: string;
    label?: string;
    keywords?: string[];
  };
  creative?: {
    tone?: AiAssetTone;
    aspectRatio?: string;
    textOverlay?: AiAssetTextOverlayLevel;
    textOverlaySourceHint?: Exclude<AiAssetTextOverlaySource, "fallback">;
    density?: AiAssetDensity;
    densitySourceHint?: Exclude<AiAssetDensitySource, "fallback">;
    overlayPosition?: AiAssetOverlayPosition;
    overlayPositionSourceHint?: Exclude<AiAssetOverlayPositionSource, "fallback">;
    safety?: {
      avoidFaceCloseups?: boolean;
      avoidBodyFocus?: boolean;
    };
  };
  brand?: {
    primaryColor?: string;
    secondaryColor?: string;
    styleKeywords?: string[];
  };
  options?: {
    locale?: string;
    includeNegativePrompt?: boolean;
    preferJapaneseLpStyle?: boolean;
    strictTextSafety?: boolean;
  };
};

export type BuiltAssetPrompt = {
  prompt: string;
  negativePrompt?: string;
  meta: {
    target: AiAssetPromptTarget;
    campaignFamily: AiAssetCampaignFamily;
    campaignFamilySource?: "explicit" | "inferred" | "fallback";
    sectionType: AiAssetSectionPromptType;
    sectionTypeSource?: "explicit" | "inferred" | "fallback";
    tone: AiAssetTone;
    textOverlay: AiAssetTextOverlayLevel;
    textOverlaySource?: AiAssetTextOverlaySource;
    density: AiAssetDensity;
    densitySource?: AiAssetDensitySource;
    overlayPosition: AiAssetOverlayPosition;
    overlayPositionSource?: AiAssetOverlayPositionSource;
    appliedRules: string[];
  };
  debug: {
    baseParts: string[];
    targetParts: string[];
    campaignParts: string[];
    sectionParts: string[];
    toneParts: string[];
    layoutParts: string[];
    safetyParts: string[];
  };
};

export type AiAssetSourceType = "generated" | "uploaded";

export type AiAssetGenerationMeta = {
  provider: string;
  model: string;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  width: number;
  height: number;
  sectionType?: string;
  styleHints?: string[];
};

export type AiGeneratedAsset = {
  id: string;
  sectionId: string;
  role: AiAssetRole;
  sourceType: AiAssetSourceType;
  imageUrl: string;
  createdAt: string;
  generationMeta: AiAssetGenerationMeta;
  bindHistory: Array<{
    sectionId: string;
    role: AiAssetRole;
    boundAt: string;
  }>;
};

export type AiAssetGenerationStatus = "idle" | "queued" | "running" | "succeeded" | "failed";

export type AiAssetGenerationJob = {
  jobId: string;
  sectionId: string;
  role: AiAssetRole;
  status: AiAssetGenerationStatus;
  progress: number;
  message?: string;
  assetId?: string;
  error?: string;
  generatedAsset?: AiGeneratedAsset;
};

export type AiAssetBindingRecord = {
  sectionId: string;
  role: AiAssetRole;
  assetId: string;
  sourceGeneratedAssetId: string;
  boundAt: string;
  provider?: string;
  model?: string;
  prompt?: string;
  width?: number;
  height?: number;
};

export type ProjectAiAssets = {
  generatedAssets: AiGeneratedAsset[];
  jobs: AiAssetGenerationJob[];
  bindings: AiAssetBindingRecord[];
};

const parseAiGeneratedAsset = (value: unknown): AiGeneratedAsset | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<AiGeneratedAsset>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.sectionId !== "string" ||
    typeof raw.role !== "string" ||
    typeof raw.sourceType !== "string" ||
    typeof raw.imageUrl !== "string" ||
    typeof raw.createdAt !== "string" ||
    !raw.generationMeta ||
    typeof raw.generationMeta !== "object"
  ) {
    return null;
  }
  const generationMeta = raw.generationMeta as Partial<AiGeneratedAsset["generationMeta"]>;
  if (
    typeof generationMeta.provider !== "string" ||
    typeof generationMeta.model !== "string" ||
    typeof generationMeta.prompt !== "string" ||
    typeof generationMeta.width !== "number" ||
    typeof generationMeta.height !== "number"
  ) {
    return null;
  }
  return {
    id: raw.id,
    sectionId: raw.sectionId,
    role: raw.role as AiAssetRole,
    sourceType: raw.sourceType as AiAssetSourceType,
    imageUrl: raw.imageUrl,
    createdAt: raw.createdAt,
    generationMeta: {
      provider: generationMeta.provider,
      model: generationMeta.model,
      prompt: generationMeta.prompt,
      negativePrompt:
        typeof generationMeta.negativePrompt === "string"
          ? generationMeta.negativePrompt
          : undefined,
      seed:
        typeof generationMeta.seed === "number" ? generationMeta.seed : undefined,
      width: generationMeta.width,
      height: generationMeta.height,
      sectionType:
        typeof generationMeta.sectionType === "string"
          ? generationMeta.sectionType
          : undefined,
      styleHints: Array.isArray(generationMeta.styleHints)
        ? generationMeta.styleHints.filter((entry): entry is string => typeof entry === "string")
        : undefined,
    },
    bindHistory: Array.isArray(raw.bindHistory)
      ? raw.bindHistory
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const bind = entry as Partial<AiGeneratedAsset["bindHistory"][number]>;
            if (
              typeof bind.sectionId !== "string" ||
              typeof bind.role !== "string" ||
              typeof bind.boundAt !== "string"
            ) {
              return null;
            }
            return {
              sectionId: bind.sectionId,
              role: bind.role as AiAssetRole,
              boundAt: bind.boundAt,
            };
          })
          .filter((entry): entry is AiGeneratedAsset["bindHistory"][number] => Boolean(entry))
      : [],
  };
};

const parseAiJob = (value: unknown): AiAssetGenerationJob | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<AiAssetGenerationJob>;
  if (
    typeof raw.jobId !== "string" ||
    typeof raw.sectionId !== "string" ||
    typeof raw.role !== "string" ||
    typeof raw.status !== "string" ||
    typeof raw.progress !== "number"
  ) {
    return null;
  }
  return {
    jobId: raw.jobId,
    sectionId: raw.sectionId,
    role: raw.role as AiAssetRole,
    status: raw.status as AiAssetGenerationStatus,
    progress: raw.progress,
    message: typeof raw.message === "string" ? raw.message : undefined,
    assetId: typeof raw.assetId === "string" ? raw.assetId : undefined,
    error: typeof raw.error === "string" ? raw.error : undefined,
    generatedAsset: parseAiGeneratedAsset(raw.generatedAsset) ?? undefined,
  };
};

const parseAiBinding = (value: unknown): AiAssetBindingRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<AiAssetBindingRecord>;
  if (
    typeof raw.sectionId !== "string" ||
    typeof raw.role !== "string" ||
    typeof raw.assetId !== "string" ||
    typeof raw.sourceGeneratedAssetId !== "string" ||
    typeof raw.boundAt !== "string"
  ) {
    return null;
  }
  return {
    sectionId: raw.sectionId,
    role: raw.role as AiAssetRole,
    assetId: raw.assetId,
    sourceGeneratedAssetId: raw.sourceGeneratedAssetId,
    boundAt: raw.boundAt,
    provider: typeof raw.provider === "string" ? raw.provider : undefined,
    model: typeof raw.model === "string" ? raw.model : undefined,
    prompt: typeof raw.prompt === "string" ? raw.prompt : undefined,
    width: typeof raw.width === "number" ? raw.width : undefined,
    height: typeof raw.height === "number" ? raw.height : undefined,
  };
};

export const createEmptyProjectAiAssets = (): ProjectAiAssets => ({
  generatedAssets: [],
  jobs: [],
  bindings: [],
});

export const normalizeProjectAiAssets = (value: unknown): ProjectAiAssets | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const raw = value as Partial<ProjectAiAssets>;
  return {
    generatedAssets: Array.isArray(raw.generatedAssets)
      ? raw.generatedAssets
          .map((entry) => parseAiGeneratedAsset(entry))
          .filter((entry): entry is AiGeneratedAsset => Boolean(entry))
      : [],
    jobs: Array.isArray(raw.jobs)
      ? raw.jobs
          .map((entry) => parseAiJob(entry))
          .filter((entry): entry is AiAssetGenerationJob => Boolean(entry))
      : [],
    bindings: Array.isArray(raw.bindings)
      ? raw.bindings
          .map((entry) => parseAiBinding(entry))
          .filter((entry): entry is AiAssetBindingRecord => Boolean(entry))
      : [],
  };
};

export type AiAssetGeneratePayload = {
  sectionId: string;
  sectionType?: string;
  role: AiAssetRole;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  styleHints?: string[];
};

export type AiAssetBindPayload = {
  sectionId: string;
  assetId: string;
  role: AiAssetRole;
};
