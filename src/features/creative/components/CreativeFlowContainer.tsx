"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CreativeComparePage from "@/src/features/creative/pages/CreativeComparePage";
import CreativeEditPage from "@/src/features/creative/pages/CreativeEditPage";
import CreativeExportPage from "@/src/features/creative/pages/CreativeExportPage";
import CreativeGeneratingPage from "@/src/features/creative/pages/CreativeGeneratingPage";
import CreativeInputPage from "@/src/features/creative/pages/CreativeInputPage";
import { createCreativeDocument } from "@/src/features/creative/services/creativeDocumentService";
import {
  generateVariants,
  pollGenerationJob,
} from "@/src/features/creative/services/creativeGenerationService";
import { exportCreativeVariant } from "@/src/features/creative/services/creativeExportService";
import {
  applyVariantToLpHero,
  publishVariantToLp,
} from "@/src/features/creative/services/creativePublishService";
import {
  fetchDocumentVariants,
  regenerateVariant,
} from "@/src/features/creative/services/creativeVariantService";
import { useCreativeDocumentStore } from "@/src/features/creative/stores/useCreativeDocumentStore";
import { useCreativeExportStore } from "@/src/features/creative/stores/useCreativeExportStore";
import { useCreativeGenerationStore } from "@/src/features/creative/stores/useCreativeGenerationStore";
import { useCreativeVariantStore } from "@/src/features/creative/stores/useCreativeVariantStore";
import {
  DEFAULT_CREATIVE_INPUT,
  type CreativeDesignTaste,
  type CreativeInputValues,
  type CreativeStrategyPreference,
  type CreativeTone,
} from "@/src/features/creative/types/document";
import type { CreativeExportFormat } from "@/src/features/creative/types/export";
import {
  readCampaignBuilderDirectionFromStorage,
  useCampaignStore,
} from "@/src/features/campaign/stores/useCampaignStore";
import type { CampaignPlan } from "@/src/features/campaign/types/campaign";

type CreativeLaunchContext = {
  source?: string;
  sectionId?: string;
  returnTo?: string;
};

type CreativeFlowContainerProps = {
  launchContext?: CreativeLaunchContext;
  embedded?: boolean;
  onRequestClose?: () => void;
  onApplied?: () => void;
};

const mapCampaignToneToCreativeTone = (
  tone: CampaignPlan["creativeDirection"]["tone"] | undefined,
): CreativeTone | undefined => {
  if (!tone) {
    return undefined;
  }
  if (tone === "friendly") {
    return "friendly";
  }
  if (tone === "premium") {
    return "premium";
  }
  if (tone === "corporate") {
    return "formal";
  }
  return "bold";
};

const mapCampaignStyleToDesignTaste = (style?: string): CreativeDesignTaste | undefined => {
  if (!style) {
    return undefined;
  }
  if (style === "tech_modern") {
    return "minimal";
  }
  if (style === "retail_campaign" || style === "lifestyle_food") {
    return "impact";
  }
  if (style === "public_information") {
    return "clean";
  }
  return "clean";
};

const normalizePreferredStrategies = (
  values?: CampaignPlan["creativeDirection"]["preferredStrategies"],
): CreativeStrategyPreference[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  const allowed: CreativeStrategyPreference[] = [
    "benefit_push",
    "urgency_push",
    "trust_push",
    "simple_cta",
  ];
  const seen = new Set<CreativeStrategyPreference>();
  const normalized: CreativeStrategyPreference[] = [];
  values.forEach((entry) => {
    if (!allowed.includes(entry)) {
      return;
    }
    if (seen.has(entry)) {
      return;
    }
    seen.add(entry);
    normalized.push(entry);
  });
  return normalized;
};

export default function CreativeFlowContainer({
  launchContext,
  embedded = false,
  onRequestClose,
  onApplied,
}: CreativeFlowContainerProps) {
  const router = useRouter();

  const activeScreen = useCreativeDocumentStore((s) => s.activeScreen);
  const documentId = useCreativeDocumentStore((s) => s.documentId);
  const inputValues = useCreativeDocumentStore((s) => s.inputValues);
  const selectedVariantId = useCreativeDocumentStore((s) => s.selectedVariantId);
  const setActiveScreen = useCreativeDocumentStore((s) => s.setActiveScreen);
  const setDocumentId = useCreativeDocumentStore((s) => s.setDocumentId);
  const setInputValues = useCreativeDocumentStore((s) => s.setInputValues);
  const setSelectedVariantId = useCreativeDocumentStore((s) => s.setSelectedVariantId);

  const jobId = useCreativeGenerationStore((s) => s.jobId);
  const generationStatus = useCreativeGenerationStore((s) => s.status);
  const generationProgress = useCreativeGenerationStore((s) => s.progress);
  const generationError = useCreativeGenerationStore((s) => s.errorMessage);
  const setJobId = useCreativeGenerationStore((s) => s.setJobId);
  const setGenerationStatus = useCreativeGenerationStore((s) => s.setStatus);
  const setGenerationProgress = useCreativeGenerationStore((s) => s.setProgress);
  const setGenerationError = useCreativeGenerationStore((s) => s.setErrorMessage);
  const resetGeneration = useCreativeGenerationStore((s) => s.reset);

  const variants = useCreativeVariantStore((s) => s.variants);
  const currentVariantId = useCreativeVariantStore((s) => s.currentVariantId);
  const setVariants = useCreativeVariantStore((s) => s.setVariants);
  const replaceVariant = useCreativeVariantStore((s) => s.replaceVariant);
  const setCurrentVariantById = useCreativeVariantStore((s) => s.setCurrentVariantById);

  const [regeneratingMap, setRegeneratingMap] = useState<Record<string, boolean>>({});

  const exportStatus = useCreativeExportStore((s) => s.exportStatus);
  const publishStatus = useCreativeExportStore((s) => s.publishStatus);
  const lastExportUrl = useCreativeExportStore((s) => s.lastExportUrl);
  const exportError = useCreativeExportStore((s) => s.errorMessage);
  const setExportStatus = useCreativeExportStore((s) => s.setExportStatus);
  const setPublishStatus = useCreativeExportStore((s) => s.setPublishStatus);
  const setLastExport = useCreativeExportStore((s) => s.setLastExport);
  const setExportError = useCreativeExportStore((s) => s.setErrorMessage);
  const campaignDirectionInStore = useCampaignStore((s) => s.builderCreativeDirection);

  const pollingJobIdRef = useRef<string | null>(null);
  const directionInitRef = useRef(false);
  const [campaignDirectionHint, setCampaignDirectionHint] = useState<string | null>(null);

  const source = launchContext?.source;
  const launchSectionId = launchContext?.sectionId;
  const returnTo = launchContext?.returnTo ?? "/editor?mode=layout";

  const currentVariant = useMemo(() => {
    const targetId = currentVariantId ?? selectedVariantId;
    return variants.find((variant) => variant.id === targetId) ?? null;
  }, [currentVariantId, selectedVariantId, variants]);

  useEffect(() => {
    if (directionInitRef.current) {
      return;
    }
    directionInitRef.current = true;

    const savedDirection = campaignDirectionInStore ?? readCampaignBuilderDirectionFromStorage();
    if (!savedDirection) {
      return;
    }

    const mappedTone = mapCampaignToneToCreativeTone(savedDirection.tone);
    const mappedDesignTaste = mapCampaignStyleToDesignTaste(savedDirection.style);
    const preferred = normalizePreferredStrategies(savedDirection.preferredStrategies);

    const nextValues: CreativeInputValues = {
      ...DEFAULT_CREATIVE_INPUT,
      ...inputValues,
      ...(mappedTone ? { tone: mappedTone } : {}),
      ...(mappedDesignTaste ? { designTaste: mappedDesignTaste } : {}),
      stylePreset: savedDirection.style,
      preferredStrategies: preferred,
    };

    setInputValues(nextValues);
    setCampaignDirectionHint(
      `Campaignの生成方針を初期値として使用: tone=${savedDirection.tone} / style=${savedDirection.style}`,
    );
  }, [campaignDirectionInStore, inputValues, setInputValues]);

  const startGeneration = async (targetDocumentId: string) => {
    setActiveScreen("generating");
    setGenerationStatus("queued");
    setGenerationProgress(0);
    setGenerationError(null);

    const generated = await generateVariants(targetDocumentId);
    setJobId(generated.jobId);
    setGenerationStatus("running");
  };

  const handleSubmit = async (values: CreativeInputValues) => {
    try {
      setInputValues(values);
      setSelectedVariantId(null);
      const document = await createCreativeDocument(values);
      setDocumentId(document.id);
      await startGeneration(document.id);
    } catch (error) {
      setGenerationStatus("failed");
      setGenerationError(error instanceof Error ? error.message : "Failed to start generation.");
    }
  };

  const handleRegenerate = async () => {
    if (!documentId) {
      return;
    }
    await startGeneration(documentId);
  };

  const handleRegenerateVariant = async (variantId: string) => {
    if (!inputValues) {
      return;
    }
    setRegeneratingMap((prev) => ({ ...prev, [variantId]: true }));
    try {
      const regenerated = await regenerateVariant(variantId, inputValues);
      replaceVariant(regenerated);
      if (selectedVariantId === regenerated.id) {
        setCurrentVariantById(regenerated.id);
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Variant regeneration failed.");
    } finally {
      setRegeneratingMap((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
    }
  };

  useEffect(() => {
    if (activeScreen !== "generating" || !documentId || !jobId) {
      return;
    }
    if (pollingJobIdRef.current === jobId) {
      return;
    }

    pollingJobIdRef.current = jobId;
    let alive = true;

    const run = async () => {
      try {
        const job = await pollGenerationJob(jobId, setGenerationProgress);
        if (!alive) {
          return;
        }

        if (job.status === "failed") {
          setGenerationStatus("failed");
          setGenerationError(job.message ?? "Generation failed.");
          return;
        }

        setGenerationStatus("succeeded");
        setGenerationProgress(100);

        const generatedVariants = await fetchDocumentVariants(documentId);
        if (!alive) {
          return;
        }

        setVariants(generatedVariants);
        const firstId = generatedVariants[0]?.id ?? null;
        setSelectedVariantId(firstId);
        if (firstId) {
          setCurrentVariantById(firstId);
        }
        setActiveScreen("compare");
      } catch (error) {
        if (!alive) {
          return;
        }
        setGenerationStatus("failed");
        setGenerationError(error instanceof Error ? error.message : "Polling failed.");
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [
    activeScreen,
    documentId,
    jobId,
    setActiveScreen,
    setCurrentVariantById,
    setGenerationError,
    setGenerationProgress,
    setGenerationStatus,
    setSelectedVariantId,
    setVariants,
  ]);

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setCurrentVariantById(variantId);
  };

  const handleEditVariant = (variantId: string) => {
    handleSelectVariant(variantId);
    setActiveScreen("edit");
  };

  const handleGoEditSelected = () => {
    if (!selectedVariantId) {
      return;
    }
    handleEditVariant(selectedVariantId);
  };

  const handleStartFromSettings = () => {
    resetGeneration();
    useCreativeVariantStore.setState({
      variants: [],
      currentVariantId: null,
      variantJson: null,
      undoStack: [],
      redoStack: [],
    });
    useCreativeExportStore.setState({
      exportStatus: "idle",
      publishStatus: "idle",
      lastExportUrl: null,
      lastExportFormat: null,
      errorMessage: null,
    });
    setDocumentId(null);
    setSelectedVariantId(null);
    setInputValues(DEFAULT_CREATIVE_INPUT);
    setActiveScreen("input");
  };

  const runExport = async (format: CreativeExportFormat) => {
    if (!currentVariant) {
      return;
    }
    try {
      setExportError(null);
      setExportStatus("exporting");
      const result = await exportCreativeVariant(currentVariant.id, format);
      if (process.env.NODE_ENV === "development") {
        console.info("[creative-export] selected", {
          format,
          variantId: currentVariant.id,
          urlSample: result.downloadUrl.slice(0, 48),
        });
      }
      setLastExport(result.format, result.downloadUrl);
    } catch (error) {
      setExportStatus("failed");
      setExportError(error instanceof Error ? error.message : "Export failed.");
    }
  };

  const handlePublishToLp = async () => {
    if (!currentVariant) {
      return;
    }
    try {
      setExportError(null);
      setPublishStatus("publishing");

      const publishResult = await publishVariantToLp(currentVariant.id);
      let imageUrl = publishResult.imageUrl ?? lastExportUrl;
      if (!imageUrl) {
        const fallbackExport = await exportCreativeVariant(currentVariant.id, "png");
        imageUrl = fallbackExport.downloadUrl;
        setLastExport("png", fallbackExport.downloadUrl);
      }

      const applied = applyVariantToLpHero(currentVariant, imageUrl, launchSectionId);
      if (!applied.applied) {
        throw new Error("Hero section not found in current LP document.");
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[creative-apply] completed", {
          targetSectionId: applied.sectionId,
          launchSectionId,
          imageUrlSample: imageUrl.slice(0, 48),
        });
      }

      setPublishStatus("success");
      onApplied?.();

      if (!embedded && (source === "hero" || source === "mainVisual")) {
        window.setTimeout(() => {
          router.push(returnTo);
        }, 500);
      }
    } catch (error) {
      setPublishStatus("failed");
      setExportError(error instanceof Error ? error.message : "Publish failed.");
    }
  };

  const STEPS = [
    { key: "input", label: "入力" },
    { key: "generating", label: "生成" },
    { key: "compare", label: "比較" },
    { key: "edit", label: "編集" },
    { key: "export", label: "書出" },
  ] as const;

  const stepIndex = STEPS.findIndex((s) => s.key === activeScreen);
  const isEditScreen = activeScreen === "edit";

  return (
    <div className={embedded ? "h-full bg-[var(--ui-bg)] text-[var(--ui-text)]" : "min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]"}>
      <header className="sticky top-0 z-30 border-b border-[var(--ui-border)] bg-[var(--surface-2,var(--ui-panel))]">
        <div className="mx-auto flex h-10 max-w-6xl items-center gap-4 px-4">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--ui-muted)]">AURBIT AI</span>
          {embedded ? (
            <button
              type="button"
              className="h-7 rounded border border-[var(--ui-border)] px-3 text-[11px] font-medium text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
              onClick={handleStartFromSettings}
            >
              新しく生成する
            </button>
          ) : null}
          {!embedded ? (
            <div className="flex items-center gap-1 rounded border border-[var(--ui-border)]/60 bg-[var(--ui-panel)] p-0.5">
              <button
                type="button"
                className="h-6 rounded px-2 text-[10px] font-semibold text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
                onClick={() => router.push("/editor?mode=layout")}
              >
                Layout
              </button>
              <button
                type="button"
                className="h-6 rounded px-2 text-[10px] font-semibold text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
                onClick={() => router.push("/editor?mode=canvas")}
              >
                Canvas
              </button>
              <span className="inline-flex h-6 items-center rounded bg-[var(--ui-text)] px-2 text-[10px] font-semibold text-[var(--ui-bg)]">
                AI
              </span>
            </div>
          ) : null}
          <nav className="flex items-center gap-1">
            {STEPS.map((step, i) => {
              const isCurrent = step.key === activeScreen;
              const isPast = i < stepIndex;
              return (
                <div key={step.key} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[10px] text-[var(--ui-border)]">&rsaquo;</span>}
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      isCurrent
                        ? "bg-[var(--ui-primary)] text-white"
                        : isPast
                          ? "text-[var(--ui-primary)]"
                          : "text-[var(--ui-muted)]"
                    }`}
                  >
                    {isPast && <span>&#x2713;</span>}
                    {step.label}
                  </span>
                </div>
              );
            })}
          </nav>
          {embedded ? (
            <button
              type="button"
              className="ml-auto h-7 rounded border border-[var(--ui-border)] px-3 text-[11px]"
              onClick={onRequestClose}
            >
              閉じる
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={
          embedded
            ? isEditScreen
              ? "h-[calc(100%-40px)] min-h-0 overflow-hidden p-0"
              : "h-[calc(100%-40px)] overflow-auto p-4"
            : "p-4 md:p-5"
        }
      >
        {activeScreen === "input" ? (
          <CreativeInputPage
            initialValues={inputValues}
            isSubmitting={generationStatus === "queued" || generationStatus === "running"}
            onSubmit={handleSubmit}
            campaignDirectionHint={campaignDirectionHint}
          />
        ) : null}

        {activeScreen === "generating" ? (
          <CreativeGeneratingPage
            status={generationStatus}
            progress={generationProgress}
            message={generationError}
          />
        ) : null}

        {activeScreen === "compare" ? (
          <CreativeComparePage
            variants={variants}
            selectedVariantId={selectedVariantId}
            onSelect={handleSelectVariant}
            onEdit={handleEditVariant}
            regeneratingMap={regeneratingMap}
            onRegenerate={(variantId) => {
              void handleRegenerateVariant(variantId);
            }}
            onGoEditSelected={handleGoEditSelected}
          />
        ) : null}

        {activeScreen === "edit" ? (
          <CreativeEditPage
            fullHeight={embedded}
            onBack={() => setActiveScreen("compare")}
            onNext={() => setActiveScreen("export")}
          />
        ) : null}

        {activeScreen === "export" ? (
          <CreativeExportPage
            variant={currentVariant}
            exportStatus={exportStatus}
            publishStatus={publishStatus}
            downloadUrl={lastExportUrl}
            errorMessage={exportError}
            onBack={() => setActiveScreen("edit")}
            onExportPng={() => {
              void runExport("png");
            }}
            onExportWebp={() => {
              void runExport("webp");
            }}
            onPublishToLp={() => {
              void handlePublishToLp();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
