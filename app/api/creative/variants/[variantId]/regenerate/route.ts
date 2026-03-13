import { NextResponse } from "next/server";
import { NanoBananaProvider } from "@/src/features/creative/ai/nanoBananaProvider";
import {
  findVariantById,
  replaceVariantById,
} from "@/src/features/creative/ai/serverGenerationStore";
import {
  buildVariantJsonForStrategy,
  resolveStrategyPlanByKey,
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
    console.info(`[creative:regenerate-route] ${message}`, meta);
    return;
  }
  console.info(`[creative:regenerate-route] ${message}`);
};

export async function POST(
  request: Request,
  context: { params: Promise<{ variantId: string }> },
) {
  try {
    const envState = ensureServerEnvLoaded();
    const { variantId } = await context.params;
    logDebug("env:fal-key", {
      present: envState.hasFalKey,
      projectRoot: envState.projectRoot,
      envLocalExists: envState.envLocalExists,
      runtime: "nodejs",
    });
    const body = (await request.json().catch(() => ({}))) as {
      input?: CreativeInputValues;
      preserveCompositionArchetype?: boolean;
    };

    if (!variantId) {
      return NextResponse.json({ error: "variantId is required." }, { status: 400 });
    }
    if (!body.input || typeof body.input !== "object") {
      return NextResponse.json({ error: "Creative input is required." }, { status: 400 });
    }
    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured for regeneration." },
        { status: 500 },
      );
    }

    const found = findVariantById(variantId);
    if (!found) {
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    }

    const previous = found.variant;
    const previousMeta = previous.generationMeta ?? {};
    const strategy =
      previousMeta.strategy === "benefit_push" ||
      previousMeta.strategy === "urgency_push" ||
      previousMeta.strategy === "trust_push" ||
      previousMeta.strategy === "simple_cta"
        ? previousMeta.strategy
        : null;

    if (!strategy) {
      return NextResponse.json(
        { error: "Variant strategy metadata is missing." },
        { status: 400 },
      );
    }

    const preserveCompositionArchetype = body.preserveCompositionArchetype !== false;
    const preferredArchetype = preserveCompositionArchetype
      ? previousMeta.compositionArchetype
      : undefined;

    const plan = resolveStrategyPlanByKey(strategy, {
      compositionArchetype: preferredArchetype,
    });

    const regenerationCount =
      typeof previousMeta.regenerationCount === "number" && Number.isFinite(previousMeta.regenerationCount)
        ? previousMeta.regenerationCount + 1
        : 1;
    const previousSeed =
      typeof previousMeta.currentSeed === "number"
        ? previousMeta.currentSeed
        : typeof previousMeta.seed === "number"
        ? previousMeta.seed
        : undefined;

    logDebug("regenerate:start", {
      variantId,
      documentId: previous.documentId,
      strategy,
      compositionArchetype: plan.compositionArchetype,
      regenerationCount,
    });

    const provider = new NanoBananaProvider();
    const [image] = await provider.generateStrategyImages({
      documentId: previous.documentId,
      input: body.input,
      plans: [plan],
      width: previous.variantJson.width || 1365,
      height: previous.variantJson.height || 768,
      regeneration: {
        mode: "regeneration",
        variantId,
        regenerationCount,
        previousSeed,
        preserveCompositionArchetype: preferredArchetype,
      },
    });

    if (!image) {
      throw new Error("Regeneration did not return an image.");
    }

    const nextVariant: CreativeVariant = {
      ...previous,
      thumbnailUrl: image.imageUrl,
      strategyLabel: plan.label,
      strategySubtitle: plan.subtitle,
      variantJson: buildVariantJsonForStrategy(
        body.input,
        strategy,
        image.imageUrl,
        previous.variantJson.width || 1365,
        previous.variantJson.height || 768,
      ),
      generationMeta: {
        ...previousMeta,
        strategy,
        strategySubtitle: plan.subtitle,
        compositionArchetype: plan.compositionArchetype,
        visualDensity: plan.visualDensity,
        energyLevel: plan.energyLevel,
        whitespaceProfile: plan.whitespaceProfile,
        provider: provider.name,
        model: image.model,
        prompt: image.prompt,
        negativePrompt: image.negativePrompt,
        promptFragments: image.promptFragments,
        regenerationMode: "regeneration",
        regenerationCount,
        regeneratedFromVariantId: variantId,
        previousSeed,
        currentSeed: image.seed,
        regeneratedAt: new Date().toISOString(),
        seed: image.seed,
        width: image.width,
        height: image.height,
      },
      createdAt: new Date().toISOString(),
    };

    const replaced = replaceVariantById(variantId, nextVariant);
    if (!replaced) {
      return NextResponse.json({ error: "Failed to persist regenerated variant." }, { status: 500 });
    }

    logDebug("regenerate:done", {
      variantId,
      documentId: replaced.documentId,
      regenerationCount,
      currentSeed: image.seed,
    });

    return NextResponse.json({
      variant: nextVariant,
      variants: replaced.variants,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Variant regeneration failed.";
    console.error("[creative:regenerate-route] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
