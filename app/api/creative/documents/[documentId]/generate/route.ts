import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { NanoBananaProvider } from "@/src/features/creative/ai/nanoBananaProvider";
import {
  getDocumentVariants,
  setDocumentVariants,
  setJob,
  updateJob,
} from "@/src/features/creative/ai/serverGenerationStore";
import {
  buildVariantJsonForStrategy,
  resolveStrategyPlans,
} from "@/src/features/creative/ai/variationBuilder";
import { ensureServerEnvLoaded } from "@/src/lib/server/envLoader";
import type { CreativeInputValues } from "@/src/features/creative/types/document";
import type { CreativeVariant } from "@/src/features/creative/types/variant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDebug = process.env.NODE_ENV !== "production";

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[creative:generate-route] ${message}`, meta);
    return;
  }
  console.info(`[creative:generate-route] ${message}`);
};

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const resolveProvider = () => {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not configured for real Nano Banana generation.");
  }
  return new NanoBananaProvider();
};

const generateWithProvider = async (
  documentId: string,
  input: CreativeInputValues,
): Promise<CreativeVariant[]> => {
  const plans = resolveStrategyPlans(input.preferredStrategies);
  const width = 1365;
  const height = 768;

  const primaryProvider = resolveProvider();

  logDebug("provider:selected", {
    documentId,
    provider: primaryProvider.name,
    modelId:
      primaryProvider instanceof NanoBananaProvider
        ? primaryProvider.getModelId()
        : "unknown",
  });

  const images = await primaryProvider.generateStrategyImages({
    documentId,
    input,
    plans,
    width,
    height,
  });

  logDebug("provider:images:received", {
    documentId,
    imageCount: images.length,
  });

  return plans.map((plan, index) => {
    const image = images.find((entry) => entry.strategy === plan.strategy) ?? images[index];
    if (!image) {
      throw new Error(`Missing generated image for strategy: ${plan.strategy}`);
    }
    return {
      id: `variant_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
      documentId,
      strategyLabel: plan.label,
      strategySubtitle: plan.subtitle,
      thumbnailUrl: image.imageUrl,
      variantJson: buildVariantJsonForStrategy(input, plan.strategy, image.imageUrl, width, height),
      generationMeta: {
        strategy: plan.strategy,
        strategySubtitle: plan.subtitle,
        compositionArchetype: plan.compositionArchetype,
        visualDensity: plan.visualDensity,
        energyLevel: plan.energyLevel,
        whitespaceProfile: plan.whitespaceProfile,
        provider: primaryProvider.name,
        model: image.model,
        prompt: image.prompt,
        negativePrompt: image.negativePrompt,
        promptFragments: image.promptFragments,
        seed: image.seed,
        width: image.width,
        height: image.height,
      },
      createdAt: new Date().toISOString(),
    } satisfies CreativeVariant;
  });
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const envState = ensureServerEnvLoaded();
    const { documentId } = await context.params;
    logDebug("request:entered", { documentId });
    const key = process.env.FAL_KEY ?? "";
    logDebug("env:fal-key", {
      present: envState.hasFalKey,
      keyPrefix: key ? key.slice(0, 6) : "",
      cwd: process.cwd(),
      projectRoot: envState.projectRoot,
      envLocalExists: envState.envLocalExists,
      runtime: "nodejs",
    });
    const body = (await request.json().catch(() => ({}))) as {
      input?: CreativeInputValues;
    };

    if (!documentId || typeof body.input !== "object" || !body.input) {
      return NextResponse.json({ error: "Invalid generation payload." }, { status: 400 });
    }

    const jobId = makeId("job");
    setJob({
      jobId,
      status: "queued",
      progress: 0,
      message: "queued",
    });
    logDebug("job:queued", { documentId, jobId });

    void (async () => {
      updateJob(jobId, { status: "running", progress: 8, message: "provider init" });
      logDebug("job:running", { documentId, jobId, progress: 8 });
      try {
        const existing = getDocumentVariants(documentId);
        if (existing && existing.length === 4) {
          updateJob(jobId, { status: "succeeded", progress: 100, message: "reused existing" });
          logDebug("job:succeeded:reused", { documentId, jobId, variantCount: existing.length });
          return;
        }

        updateJob(jobId, { progress: 35, message: "building prompts" });
        logDebug("job:progress", { documentId, jobId, progress: 35, stage: "building prompts" });
        const variants = await generateWithProvider(documentId, body.input as CreativeInputValues);
        updateJob(jobId, { progress: 92, message: "saving variants" });
        logDebug("job:progress", { documentId, jobId, progress: 92, stage: "saving variants" });
        setDocumentVariants(documentId, variants);
        logDebug("variants:persisted", { documentId, jobId, variantCount: variants.length });
        updateJob(jobId, { status: "succeeded", progress: 100, message: "completed" });
        logDebug("job:succeeded", { documentId, jobId, progress: 100 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "generation failed";
        updateJob(jobId, {
          status: "failed",
          progress: 100,
          message,
        });
        console.error("[creative:generate-route] job:failed", {
          documentId,
          jobId,
          message,
        });
      }
    })();

    return NextResponse.json({ jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start generation.";
    console.error("[creative:generate-route] request:failed", {
      message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
