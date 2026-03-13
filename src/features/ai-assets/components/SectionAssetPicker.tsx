"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import AssetGenerationDrawer from "@/src/features/ai-assets/components/AssetGenerationDrawer";
import AssetsPanel from "@/src/features/ai-assets/components/AssetsPanel";
import { useAiAssetsStore } from "@/src/features/ai-assets/stores/useAiAssetsStore";
import { useEditorStore } from "@/src/store/editorStore";
import { deriveSectionAiBindingsFromProject } from "@/src/features/ai-assets/lib/projectAiAssets";
import { buildAssetPrompt } from "@/src/features/ai-assets/lib/buildAssetPrompt";
import {
  readCampaignBuilderDirectionFromStorage,
  readCampaignBuilderHandoffFromStorage,
} from "@/src/features/campaign/stores/useCampaignStore";
import type {
  AiAssetCampaignFamily,
  AiAssetDensity,
  AiAssetBindingRecord,
  AiAssetGenerationJob,
  AiAssetGeneratePayload,
  AiAssetRole,
  AiAssetTone,
  AiAssetTextOverlayLevel,
  AiAssetOverlayPosition,
  AiAssetSectionPromptType,
  BuiltAssetPrompt,
  AiGeneratedAsset,
  ProjectAiAssets,
} from "@/src/features/ai-assets/types";
import type { SectionBase } from "@/src/types/project";

type SectionAssetPickerProps = {
  section: SectionBase;
  disabled?: boolean;
  addAsset: (asset: { filename: string; data: string }) => string;
  onPatchData: (patch: Record<string, unknown>) => void;
};

const roleBySectionType = (sectionType: string): AiAssetRole[] => {
  if (sectionType === "heroImage") {
    return ["heroPc", "heroSp"];
  }
  if (sectionType === "imageOnly") {
    return ["imageOnly"];
  }
  return ["sectionImage", "sectionIcon"];
};

const AUTO_PROMPT_ROLE_SET = new Set<AiAssetRole>([
  "heroPc",
  "heroSp",
  "imageOnly",
  "sectionImage",
]);

const isAutoPromptRole = (role: AiAssetRole) => AUTO_PROMPT_ROLE_SET.has(role);

const resolvePromptTarget = (sectionType: string, role: AiAssetRole) => {
  if (sectionType === "heroImage") return "heroImage";
  if (role === "imageOnly") return "sectionBackground";
  if (role === "sectionIcon") return "sectionIcon";
  return "sectionImage";
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const next = value.trim();
    if (next.length > 0) {
      return next;
    }
  }
  return undefined;
};

const sizeByRole = (role: AiAssetRole) => {
  if (role === "heroSp") {
    return { width: 750, height: 1334 };
  }
  if (role === "imageOnly") {
    return { width: 1200, height: 800 };
  }
  if (role === "sectionIcon") {
    return { width: 512, height: 512 };
  }
  return { width: 1365, height: 768 };
};

const mapSectionTypeToPromptType = (sectionType: string): AiAssetSectionPromptType => {
  if (sectionType === "heroImage") return "hero";
  if (sectionType === "campaignPeriodBar") return "campaignPeriod";
  if (sectionType === "campaignOverview") return "benefit";
  if (sectionType === "targetStores") return "storeList";
  if (sectionType === "tabbedNotes") return "faq";
  if (sectionType === "legalNotes") return "notice";
  if (sectionType === "contact") return "cta";
  if (sectionType === "reason") return "reason";
  if (sectionType === "feature") return "feature";
  if (sectionType === "step") return "step";
  return "unknown";
};

const mapSectionToPromptType = (section: SectionBase): AiAssetSectionPromptType => {
  const mapped = mapSectionTypeToPromptType(section.type);
  if (mapped !== "unknown") {
    return mapped;
  }
  return "unknown";
};

const mapCampaignFamily = (value: string): AiAssetCampaignFamily => {
  if (value === "coupon") return "coupon";
  if (value === "quick_chance" || value === "lottery") return "entry";
  if (value === "reward") return "point";
  if (value === "municipality") return "awareness";
  if (value === "collaboration") return "branding";
  return "generic";
};

const mapTone = (value: string | undefined): AiAssetTone => {
  if (value === "premium") return "premium";
  if (value === "corporate") return "trust";
  if (value === "energetic") return "energetic";
  if (value === "seasonal") return "seasonal";
  if (value === "friendly") return "friendly";
  return "clean";
};

const mapOverlayPosition = (value: unknown): AiAssetOverlayPosition => {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("left")) return "left";
  if (text.includes("right")) return "right";
  if (text.includes("top")) return "top";
  if (text.includes("bottom")) return "bottom";
  return "center";
};

const resolveOverlayPreset = (
  sectionData: Record<string, unknown>,
): { overlayPosition: AiAssetOverlayPosition; sourceHint: "preset" | "inferred" } => {
  const raw =
    sectionData.heroImagePosition ??
    sectionData.imageOnlyAlign ??
    sectionData.alignment;
  const hasExplicitRaw = typeof raw === "string" && raw.trim().length > 0;
  return {
    overlayPosition: mapOverlayPosition(raw),
    sourceHint: hasExplicitRaw ? "preset" : "inferred",
  };
};

const mapTextOverlayLevel = (value: unknown): AiAssetTextOverlayLevel | null => {
  const text = String(value ?? "").toLowerCase().trim();
  if (text === "none" || text === "off") return "none";
  if (text === "light" || text === "weak" || text === "low") return "light";
  if (text === "medium" || text === "normal" || text === "default") return "medium";
  if (text === "strong" || text === "high") return "strong";
  return null;
};

const resolveTextOverlayPreset = (
  sectionData: Record<string, unknown>,
  fallback: AiAssetTextOverlayLevel,
): { textOverlay: AiAssetTextOverlayLevel; sourceHint: "preset" | "inferred" } => {
  const raw =
    sectionData.textOverlay ??
    sectionData.overlayLevel ??
    sectionData.heroTextOverlay ??
    sectionData.imageTextOverlay;
  const mapped = mapTextOverlayLevel(raw);
  if (mapped) {
    return { textOverlay: mapped, sourceHint: "preset" };
  }
  return { textOverlay: fallback, sourceHint: "inferred" };
};

const mapDensity = (value: unknown): AiAssetDensity | null => {
  const text = String(value ?? "").toLowerCase().trim();
  if (text === "low" || text === "minimal" || text === "light") return "low";
  if (text === "high" || text === "rich" || text === "dense") return "high";
  if (text === "medium" || text === "balanced" || text === "normal") return "medium";
  return null;
};

const resolveDensityPreset = (
  sectionData: Record<string, unknown>,
): { density: AiAssetDensity; sourceHint: "preset" } | null => {
  const raw =
    sectionData.density ??
    sectionData.visualDensity ??
    sectionData.imageDensity;
  const mapped = mapDensity(raw);
  if (!mapped) {
    return null;
  }
  return { density: mapped, sourceHint: "preset" };
};

const overlayByRole = (
  role: AiAssetRole,
  sectionType: string,
  sectionPromptType: AiAssetSectionPromptType,
): AiAssetTextOverlayLevel => {
  if (sectionType === "heroImage") {
    return role === "heroSp" ? "medium" : "strong";
  }
  if (role === "sectionIcon") {
    return "none";
  }
  if (role === "imageOnly") {
    if (
      sectionPromptType === "faq" ||
      sectionPromptType === "notice" ||
      sectionPromptType === "storeList" ||
      sectionPromptType === "campaignPeriod"
    ) {
      return "strong";
    }
    return "medium";
  }
  if (role === "sectionImage") {
    return "light";
  }
  return "light";
};

const guessExt = (url: string) => {
  if (url.startsWith("data:image/webp")) {
    return "webp";
  }
  if (url.startsWith("data:image/jpeg")) {
    return "jpg";
  }
  if (url.startsWith("data:image/svg+xml")) {
    return "svg";
  }
  if (url.includes(".webp")) {
    return "webp";
  }
  if (url.includes(".jpg") || url.includes(".jpeg")) {
    return "jpg";
  }
  if (url.includes(".svg")) {
    return "svg";
  }
  return "png";
};

const patchForBinding = (
  section: SectionBase,
  role: AiAssetRole,
  assetId: string,
  asset: AiGeneratedAsset,
): Record<string, unknown> => {
  const alt = asset.generationMeta.prompt;
  const width = Math.max(1, Math.round(asset.generationMeta.width || 1));
  const height = Math.max(1, Math.round(asset.generationMeta.height || 1));

  if (section.type === "heroImage") {
    if (role === "heroSp") {
      return {
        imageAssetIdSp: assetId,
        imageUrlSp: asset.imageUrl,
        heroSp: { assetId, w: width, h: height },
        alt,
        altText: alt,
      };
    }
    return {
      imageAssetId: assetId,
      imageAssetIdPc: assetId,
      imageUrl: asset.imageUrl,
      heroPc: { assetId, w: width, h: height },
      alt,
      altText: alt,
    };
  }

  if (section.type === "imageOnly" || role === "imageOnly") {
    return {
      imageOnlyAssetId: assetId,
      imageOnlyUrl: asset.imageUrl,
      imageOnlyAlt: alt,
    };
  }

  if (role === "sectionIcon") {
    return {
      iconAssetId: assetId,
      iconUrl: asset.imageUrl,
    };
  }

  return {
    imageAssetId: assetId,
    imageUrl: asset.imageUrl,
  };
};

const upsertGeneratedAsset = (
  assets: AiGeneratedAsset[],
  nextAsset: AiGeneratedAsset,
): AiGeneratedAsset[] => {
  const index = assets.findIndex((entry) => entry.id === nextAsset.id);
  if (index < 0) {
    return [nextAsset, ...assets];
  }
  const next = [...assets];
  next[index] = nextAsset;
  return next;
};

const upsertJob = (
  jobs: AiAssetGenerationJob[],
  nextJob: AiAssetGenerationJob,
): AiAssetGenerationJob[] => {
  const index = jobs.findIndex((entry) => entry.jobId === nextJob.jobId);
  if (index < 0) {
    return [nextJob, ...jobs];
  }
  const next = [...jobs];
  next[index] = nextJob;
  return next;
};

const upsertBinding = (
  bindings: AiAssetBindingRecord[],
  nextBinding: AiAssetBindingRecord,
): AiAssetBindingRecord[] => {
  const index = bindings.findIndex(
    (entry) => entry.sectionId === nextBinding.sectionId && entry.role === nextBinding.role,
  );
  if (index < 0) {
    return [nextBinding, ...bindings];
  }
  const next = [...bindings];
  next[index] = nextBinding;
  return next;
};

const mergeProjectAiAssets = (
  current: ProjectAiAssets | undefined,
  patch: Partial<ProjectAiAssets>,
): ProjectAiAssets => ({
  generatedAssets: patch.generatedAssets ?? current?.generatedAssets ?? [],
  jobs: patch.jobs ?? current?.jobs ?? [],
  bindings: patch.bindings ?? current?.bindings ?? [],
});

export default function SectionAssetPicker({
  section,
  disabled,
  addAsset,
  onPatchData,
}: SectionAssetPickerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bindingAssetId, setBindingAssetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const projectAiAssets = useEditorStore((state) => state.project.aiAssets);
  const generatedAssets = useEditorStore((state) => state.project.aiAssets?.generatedAssets ?? []);
  const persistedBindings = useEditorStore((state) => state.project.aiAssets?.bindings ?? []);
  const updateProjectAiAssets = useEditorStore((state) => state.updateProjectAiAssets);

  const assets = useAiAssetsStore((s) => s.assetsBySection[section.id] ?? []);
  const currentJob = useAiAssetsStore((s) => s.activeJobsBySection[section.id] ?? null);
  const setSectionAssets = useAiAssetsStore((s) => s.setSectionAssets);
  const upsertSectionAsset = useAiAssetsStore((s) => s.upsertSectionAsset);
  const setActiveJob = useAiAssetsStore((s) => s.setActiveJob);
  const setSelectedAssetId = useAiAssetsStore((s) => s.setSelectedAssetId);
  const selectedAssetId = useAiAssetsStore((s) => s.getSelectedAssetId(section.id, roleBySectionType(section.type)[0]));

  const allowedRoles = useMemo(() => roleBySectionType(section.type), [section.type]);
  const defaultRole = allowedRoles[0] ?? "sectionImage";
  const autoPromptRoles = useMemo(() => allowedRoles.filter((role) => isAutoPromptRole(role)), [allowedRoles]);

  const overlayPositionEnabledRoles = useMemo(
    () =>
      allowedRoles.filter((role) => {
        const target = resolvePromptTarget(section.type, role);
        return target === "heroImage" || target === "sectionBackground";
      }),
    [allowedRoles, section.type],
  );

  const textOverlayEnabledRoles = overlayPositionEnabledRoles;

  const densityEnabledRoles = useMemo(
    () =>
      allowedRoles.filter((role) => {
        const target = resolvePromptTarget(section.type, role);
        return target === "heroImage" || target === "sectionBackground" || target === "sectionImage";
      }),
    [allowedRoles, section.type],
  );

  const buildPromptForRole = useCallback((
    role: AiAssetRole,
    overrides?: {
      density?: AiAssetDensity;
      textOverlay?: AiAssetTextOverlayLevel;
      overlayPosition?: AiAssetOverlayPosition;
    },
  ) => {
    const handoff = readCampaignBuilderHandoffFromStorage();
    const direction = readCampaignBuilderDirectionFromStorage();
    const sourceInput = handoff?.sourceInput;
    const sectionType = mapSectionToPromptType(section);
    const sectionData = section.data as Record<string, unknown>;
    const sectionName = firstText(section.name);
    const sectionTitle = firstText(sectionData.title, section.name);
    const sectionDescription = firstText(
      sectionData.subtitle,
      sectionData.description,
      sectionData.caption,
      sectionData.lead,
    );
    const sectionCaption = firstText(sectionData.caption);
    const target = resolvePromptTarget(section.type, role);
    const inferredTextOverlay = overlayByRole(role, section.type, sectionType);
    const sectionKeywords = Array.from(
      new Set(
        [
          section.type,
          role,
          sectionName,
          sectionTitle,
          sectionCaption,
          ...(Array.isArray(sectionData.keywords)
            ? sectionData.keywords.filter((entry): entry is string => typeof entry === "string")
            : []),
          ...(Array.isArray(sectionData.tags)
            ? sectionData.tags.filter((entry): entry is string => typeof entry === "string")
            : []),
        ]
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0),
      ),
    );
    const overlayPreset = resolveOverlayPreset(sectionData);
    const densityPreset = resolveDensityPreset(sectionData);
    const textOverlayPreset = resolveTextOverlayPreset(sectionData, inferredTextOverlay);
    const density = overrides?.density ?? densityPreset?.density;
    const densitySourceHint = overrides?.density ? "explicit" : densityPreset?.sourceHint;
    const textOverlay = overrides?.textOverlay ?? textOverlayPreset.textOverlay;
    const textOverlaySourceHint = overrides?.textOverlay ? "explicit" : textOverlayPreset.sourceHint;
    const overlayPosition = overrides?.overlayPosition ?? overlayPreset.overlayPosition;
    const overlaySourceHint = overrides?.overlayPosition ? "explicit" : overlayPreset.sourceHint;

    return buildAssetPrompt({
      target,
      campaign: {
        name: sourceInput?.campaignName,
        family: sourceInput?.campaignType ? mapCampaignFamily(sourceInput.campaignType) : undefined,
        brandName: sourceInput?.brandName,
        industry: sourceInput?.industry,
        summary: handoff ? `${handoff.heroHeadline} ${handoff.heroSubcopy}` : undefined,
        benefitText: sourceInput?.conditions,
        rewardText: sourceInput?.rewardValue,
        season: sourceInput?.periodStart ? String(sourceInput.periodStart).slice(5, 7) : undefined,
        keywords: [sourceInput?.campaignType, sourceInput?.goal]
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          .map((entry) => String(entry)),
      },
      section: {
        id: section.id,
        type: sectionType,
        title: sectionTitle,
        description: sectionDescription,
        caption: sectionCaption,
        name: sectionName,
        label: section.name,
        keywords: sectionKeywords,
      },
      creative: {
        tone: mapTone(direction?.tone ?? sourceInput?.tone),
        aspectRatio: role === "heroSp" ? "9:16" : "16:9",
        density,
        densitySourceHint,
        textOverlay,
        textOverlaySourceHint,
        overlayPosition,
        overlayPositionSourceHint: overlaySourceHint,
      },
      brand: {
        primaryColor: sourceInput?.colorPreference,
        secondaryColor: undefined,
        styleKeywords: direction?.preferredStrategies,
      },
      options: {
        locale: "ja-JP",
        includeNegativePrompt: true,
        preferJapaneseLpStyle: true,
        strictTextSafety: target === "heroImage" || target === "sectionBackground",
      },
    });
  }, [section]);

  const promptByRole = useMemo<Record<AiAssetRole, BuiltAssetPrompt>>(() => {
    return allowedRoles.reduce((acc, role) => {
      acc[role] = buildPromptForRole(role);
      return acc;
    }, {} as Record<AiAssetRole, BuiltAssetPrompt>);
  }, [allowedRoles, buildPromptForRole]);

  const initialPromptByRole = useMemo(
    () =>
      autoPromptRoles.length > 0
        ?
      Object.fromEntries(
        autoPromptRoles.map((role) => [role, promptByRole[role]?.prompt ?? ""]),
      ) as Partial<Record<AiAssetRole, string>>
        : {},
    [autoPromptRoles, promptByRole],
  );

  const initialNegativePromptByRole = useMemo(
    () =>
      autoPromptRoles.length > 0
        ?
      Object.fromEntries(
        autoPromptRoles.map((role) => [role, promptByRole[role]?.negativePrompt ?? ""]),
      ) as Partial<Record<AiAssetRole, string>>
        : {},
    [autoPromptRoles, promptByRole],
  );

  const initialMetaByRole = useMemo(
    () =>
      autoPromptRoles.length > 0
        ?
      Object.fromEntries(
        autoPromptRoles.map((role) => [role, promptByRole[role]?.meta]),
      ) as Partial<Record<AiAssetRole, BuiltAssetPrompt["meta"]>>
        : {},
    [autoPromptRoles, promptByRole],
  );

  const initialOverlayPositionByRole = useMemo(
    () =>
      autoPromptRoles.length > 0
        ?
      Object.fromEntries(
        autoPromptRoles.map((role) => [role, promptByRole[role]?.meta.overlayPosition]),
      ) as Partial<Record<AiAssetRole, AiAssetOverlayPosition>>
        : {},
    [autoPromptRoles, promptByRole],
  );

  const initialDensityByRole = useMemo(
    () =>
      autoPromptRoles.length > 0
        ?
      Object.fromEntries(
        autoPromptRoles.map((role) => [role, promptByRole[role]?.meta.density]),
      ) as Partial<Record<AiAssetRole, AiAssetDensity>>
        : {},
    [autoPromptRoles, promptByRole],
  );

  const initialTextOverlayByRole = useMemo(
    () =>
      autoPromptRoles.length > 0
        ?
      Object.fromEntries(
        autoPromptRoles.map((role) => [role, promptByRole[role]?.meta.textOverlay]),
      ) as Partial<Record<AiAssetRole, AiAssetTextOverlayLevel>>
        : {},
    [autoPromptRoles, promptByRole],
  );

  useEffect(() => {
    const nextAssets = generatedAssets.filter((entry) => entry.sectionId === section.id);
    setSectionAssets(section.id, nextAssets);
  }, [generatedAssets, section.id, setSectionAssets]);

  useEffect(() => {
    const sectionBindings = persistedBindings
      .filter((entry) => entry.sectionId === section.id)
      .sort((a, b) => (a.boundAt < b.boundAt ? 1 : -1));
    sectionBindings.forEach((entry) => {
      setSelectedAssetId(section.id, entry.role, entry.sourceGeneratedAssetId);
    });
  }, [persistedBindings, section.id, setSelectedAssetId]);

  useEffect(() => {
    if (!currentJob?.jobId || currentJob.status === "succeeded" || currentJob.status === "failed") {
      return;
    }
    let alive = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/ai-assets/jobs/${currentJob.jobId}`);
        if (!response.ok) {
          return;
        }
        const job = (await response.json()) as AiAssetGenerationJob;
        if (!alive) {
          return;
        }
        setActiveJob(section.id, job);
        updateProjectAiAssets((current) => {
          const patch: Partial<ProjectAiAssets> = {
            jobs: upsertJob(current?.jobs ?? [], job),
          };
          if (job.generatedAsset) {
            patch.generatedAssets = upsertGeneratedAsset(
              current?.generatedAssets ?? [],
              job.generatedAsset,
            );
          }
          return mergeProjectAiAssets(current, patch);
        });
        if (job.status === "succeeded" && job.generatedAsset) {
          upsertSectionAsset(job.generatedAsset);
          setSelectedAssetId(section.id, job.generatedAsset.role, job.generatedAsset.id);
        }
      } catch {
        // polling is best effort
      }
    }, 1000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [currentJob, section.id, setActiveJob, setSectionAssets, setSelectedAssetId]);

  const handleGenerate = async (params: {
    role: AiAssetRole;
    prompt: string;
    negativePrompt?: string;
    density?: AiAssetDensity;
    textOverlay?: AiAssetTextOverlayLevel;
    overlayPosition?: AiAssetOverlayPosition;
  }) => {
    setErrorMessage(null);
    const size = sizeByRole(params.role);
    const baseBuilt = isAutoPromptRole(params.role) ? promptByRole[params.role] : undefined;
    const hasPromptOverrides = Boolean(params.density || params.overlayPosition || params.textOverlay);
    const overrideBuilt =
      isAutoPromptRole(params.role) && hasPromptOverrides
        ? buildPromptForRole(params.role, {
          density: params.density,
          textOverlay: params.textOverlay,
          overlayPosition: params.overlayPosition,
        })
        : baseBuilt;
    const basePrompt = baseBuilt?.prompt?.trim() ?? "";
    const inputPrompt = params.prompt.trim();
    const resolvedPrompt =
      overrideBuilt && inputPrompt === basePrompt
        ? overrideBuilt.prompt
        : params.prompt;
    const baseNegative = baseBuilt?.negativePrompt?.trim() ?? "";
    const inputNegative = params.negativePrompt?.trim() ?? "";
    const resolvedNegativePrompt =
      overrideBuilt && inputNegative === baseNegative
        ? overrideBuilt.negativePrompt
        : params.negativePrompt;
    const payload: AiAssetGeneratePayload = {
      sectionId: section.id,
      sectionType: section.type,
      role: params.role,
      prompt: resolvedPrompt,
      negativePrompt: resolvedNegativePrompt,
      width: size.width,
      height: size.height,
      styleHints: [
        section.type,
        "landing page",
        "Japanese campaign",
        ...(isAutoPromptRole(params.role) ? overrideBuilt?.meta.appliedRules ?? [] : []),
      ],
    };

    const response = await fetch("/api/ai-assets/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(error.error ?? "Failed to start AI generation.");
    }

    const data = (await response.json()) as { jobId: string };
    const queuedJob: AiAssetGenerationJob = {
      jobId: data.jobId,
      sectionId: section.id,
      role: params.role,
      status: "queued",
      progress: 0,
      message: "queued",
    };
    setActiveJob(section.id, queuedJob);
    updateProjectAiAssets((current) =>
      mergeProjectAiAssets(current, {
        jobs: upsertJob(current?.jobs ?? [], queuedJob),
      }),
    );
  };

  const handleBindAsset = async (asset: AiGeneratedAsset) => {
    setErrorMessage(null);
    setBindingAssetId(asset.id);
    try {
      const ext = guessExt(asset.imageUrl);
      const localAssetId = addAsset({
        filename: `ai-${section.id}-${asset.role}.${ext}`,
        data: asset.imageUrl,
      });

      const bindPatch = patchForBinding(section, asset.role, localAssetId, asset);
      const boundAt = new Date().toISOString();

      const currentBindings = deriveSectionAiBindingsFromProject(section.id, projectAiAssets);

      onPatchData({
        ...bindPatch,
        aiAssetBindings: {
          ...currentBindings,
          [asset.role]: {
            assetId: localAssetId,
            sourceGeneratedAssetId: asset.id,
            boundAt,
            provider: asset.generationMeta.provider,
            model: asset.generationMeta.model,
            prompt: asset.generationMeta.prompt,
            width: asset.generationMeta.width,
            height: asset.generationMeta.height,
          },
        },
      });

      setSelectedAssetId(section.id, asset.role, asset.id);
      const boundAsset: AiGeneratedAsset = {
        ...asset,
        bindHistory: [
          ...asset.bindHistory,
          {
            sectionId: section.id,
            role: asset.role,
            boundAt,
          },
        ],
      };
      upsertSectionAsset(boundAsset);
      updateProjectAiAssets((current) =>
        mergeProjectAiAssets(current, {
          generatedAssets: upsertGeneratedAsset(current?.generatedAssets ?? [], boundAsset),
          bindings: upsertBinding(current?.bindings ?? [], {
            sectionId: section.id,
            role: asset.role,
            assetId: localAssetId,
            sourceGeneratedAssetId: asset.id,
            boundAt,
            provider: asset.generationMeta.provider,
            model: asset.generationMeta.model,
            prompt: asset.generationMeta.prompt,
            width: asset.generationMeta.width,
            height: asset.generationMeta.height,
          }),
        }),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to bind asset.");
    } finally {
      setBindingAssetId(null);
    }
  };

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="AI Generated Assets">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => setDrawerOpen((prev) => !prev)}
            disabled={disabled}
          >
            {drawerOpen ? "生成設定を閉じる" : "AI生成"}
          </button>
          {currentJob && currentJob.status !== "idle" ? (
            <span className="text-[10px] text-[var(--ui-muted)]">
              {currentJob.status} {Math.round(currentJob.progress)}%
            </span>
          ) : null}
        </div>

        {drawerOpen ? (
          <AssetGenerationDrawer
            open
            disabled={disabled}
            allowedRoles={allowedRoles}
            defaultRole={defaultRole}
            initialPromptByRole={initialPromptByRole}
            initialNegativePromptByRole={initialNegativePromptByRole}
            initialMetaByRole={initialMetaByRole}
            initialDensityByRole={initialDensityByRole}
            initialTextOverlayByRole={initialTextOverlayByRole}
            initialOverlayPositionByRole={initialOverlayPositionByRole}
            densityEnabledRoles={densityEnabledRoles}
            textOverlayEnabledRoles={textOverlayEnabledRoles}
            overlayPositionEnabledRoles={overlayPositionEnabledRoles}
            onClose={() => setDrawerOpen(false)}
            onGenerate={async (params) => {
              try {
                await handleGenerate(params);
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "Failed to start generation.");
              }
            }}
          />
        ) : null}

        {errorMessage ? (
          <div className="mb-2 rounded-md border border-rose-300/70 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        <AssetsPanel
          assets={assets}
          roleFilter={allowedRoles.length === 1 ? allowedRoles[0] : undefined}
          selectedAssetId={selectedAssetId}
          onSelectAsset={(assetId) => {
            const selected = assets.find((entry) => entry.id === assetId);
            if (!selected) {
              return;
            }
            setSelectedAssetId(section.id, selected.role, selected.id);
          }}
          onBindAsset={handleBindAsset}
          bindingAssetId={bindingAssetId}
        />
      </InspectorSection>
    </div>
  );
}
