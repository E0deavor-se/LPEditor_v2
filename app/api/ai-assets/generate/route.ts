import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import {
  setJob,
  updateJob,
  upsertSectionAsset,
} from "@/src/features/ai-assets/server/serverAssetGenerationStore";
import {
  classifyFalError,
  configureFalClient,
  FalAiProviderError,
  getFalModelCandidates,
} from "@/src/features/ai-assets/server/falProvider";
import type {
  AiAssetGeneratePayload,
  AiGeneratedAsset,
} from "@/src/features/ai-assets/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { defaultModel: DEFAULT_MODEL, fallbackModels: FALLBACK_MODELS } =
  getFalModelCandidates();
const FAL_REQUEST_TIMEOUT_MS = 120000;
const isDebug = process.env.NODE_ENV !== "production";

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[ai-assets:generate-route] ${message}`, meta);
    return;
  }
  console.info(`[ai-assets:generate-route] ${message}`);
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI asset generation timed out after ${timeoutMs}ms (${context}).`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

type FalResponse = {
  data?: {
    images?: Array<{ url?: string }>;
    seed?: number;
  };
};

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const normalizePrompt = (payload: AiAssetGeneratePayload) => {
  const hints = Array.isArray(payload.styleHints) ? payload.styleHints.filter(Boolean) : [];
  const roleHint = payload.role === "heroPc"
    ? "desktop hero image"
    : payload.role === "heroSp"
    ? "mobile hero image"
    : payload.role === "imageOnly"
    ? "single section image"
    : payload.role === "sectionIcon"
    ? "simple icon"
    : "section image";
  const prefix = `Create a high quality ${roleHint} for a Japanese campaign landing page.`;
  const suffix = hints.length > 0 ? ` Style hints: ${hints.join(", ")}.` : "";
  return `${prefix} ${payload.prompt.trim()}${suffix}`.trim();
};

const generateImageUrl = async (payload: AiAssetGeneratePayload) => {
  const prompt = normalizePrompt(payload);
  const negativePrompt = payload.negativePrompt?.trim();
  const width = Math.max(256, Math.min(1920, Math.round(payload.width ?? 1365)));
  const height = Math.max(256, Math.min(1920, Math.round(payload.height ?? 768)));

  configureFalClient();

  const input = {
    prompt,
    negative_prompt: negativePrompt,
    image_size: {
      width,
      height,
    },
    num_images: 1,
  };

  const modelCandidates = [DEFAULT_MODEL, ...FALLBACK_MODELS];
  let response: FalResponse | null = null;
  let usedModel = DEFAULT_MODEL;
  const errors: Array<{ model: string; message: string }> = [];

  for (const model of modelCandidates) {
    try {
      const result = (await withTimeout(
        fal.subscribe(model, {
          input,
          logs: false,
        }) as Promise<unknown>,
        FAL_REQUEST_TIMEOUT_MS,
        `sectionId=${payload.sectionId},role=${payload.role},model=${model}`,
      )) as FalResponse;
      response = result;
      usedModel = model;
      if (model !== DEFAULT_MODEL) {
        logDebug("generate:fallback-model-used", {
          primaryModel: DEFAULT_MODEL,
          usedModel: model,
          sectionId: payload.sectionId,
          role: payload.role,
        });
      }
      break;
    } catch (error) {
      const info = classifyFalError(error);
      if (info.code === "auth_or_permission") {
        throw new FalAiProviderError(info.code, info.message);
      }
      errors.push({ model, message: info.message });
    }
  }

  if (!response) {
    if (errors.length === 0) {
      throw new FalAiProviderError("unknown", "fal.ai で画像生成に失敗しました。");
    }
    const summary = errors
      .map((entry) => `${entry.model}: ${entry.message}`)
      .join(" | ");
    throw new FalAiProviderError(
      "unknown",
      `fal.ai の画像生成に失敗しました。${summary}`,
    );
  }

  const imageUrl = response.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new FalAiProviderError(
      "invalid_response",
      "fal.ai のレスポンスに画像URLが含まれていませんでした。",
    );
  }

  return {
    imageUrl,
    model: usedModel,
    seed: typeof response.data?.seed === "number" ? response.data.seed : undefined,
    prompt,
    negativePrompt,
    width,
    height,
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<AiAssetGeneratePayload>;

    if (!body.sectionId || !body.role || !body.prompt?.trim()) {
      return NextResponse.json({ error: "Invalid payload for AI asset generation." }, { status: 400 });
    }

    const payload: AiAssetGeneratePayload = {
      sectionId: body.sectionId,
      sectionType: body.sectionType,
      role: body.role,
      prompt: body.prompt,
      sourceAssetId: body.sourceAssetId,
      negativePrompt: body.negativePrompt,
      width: body.width,
      height: body.height,
      styleHints: body.styleHints,
    };

    const jobId = makeId("ai_job");

    setJob({
      jobId,
      sectionId: payload.sectionId,
      role: payload.role,
      status: "queued",
      progress: 0,
      message: "queued",
    });

    void (async () => {
      try {
        updateJob(jobId, { status: "running", progress: 12, message: "building prompt" });

        logDebug("generate:start", {
          sectionId: payload.sectionId,
          role: payload.role,
          sectionType: payload.sectionType,
        });

        const result = await generateImageUrl(payload);

        updateJob(jobId, { progress: 85, message: "saving asset" });

        const assetId = makeId("ai_asset");
        const now = new Date().toISOString();
        const asset: AiGeneratedAsset = {
          id: assetId,
          sectionId: payload.sectionId,
          role: payload.role,
          sourceType: "generated",
          imageUrl: result.imageUrl,
          createdAt: now,
          generationMeta: {
            provider: result.model.includes("fallback") ? "fallback" : "fal-ai",
            model: result.model,
            prompt: result.prompt,
            inputPrompt: payload.prompt,
            derivedFromAssetId: payload.sourceAssetId,
            negativePrompt: result.negativePrompt,
            seed: result.seed,
            width: result.width,
            height: result.height,
            sectionType: payload.sectionType,
            styleHints: payload.styleHints,
          },
          bindHistory: [],
        };

        upsertSectionAsset(asset);

        updateJob(jobId, {
          status: "succeeded",
          progress: 100,
          message: "completed",
          assetId,
          generatedAsset: asset,
        });

        logDebug("generate:done", {
          jobId,
          sectionId: payload.sectionId,
          role: payload.role,
          assetId,
        });
      } catch (error) {
        const providerError =
          error instanceof FalAiProviderError
            ? error
            : new FalAiProviderError(
                "unknown",
                error instanceof Error ? error.message : "generation failed",
              );
        updateJob(jobId, {
          status: "failed",
          progress: 100,
          message: providerError.message,
          error: providerError.message,
          errorCode: providerError.code,
        });
        console.error("[ai-assets:generate-route] generation failed", {
          jobId,
          code: providerError.code,
          message: providerError.message,
        });
      }
    })();

    return NextResponse.json({ jobId });
  } catch (error) {
    const providerError =
      error instanceof FalAiProviderError
        ? error
        : new FalAiProviderError(
            "unknown",
            error instanceof Error ? error.message : "Failed to start generation.",
          );
    return NextResponse.json(
      {
        code: providerError.code,
        error: providerError.message,
      },
      { status: 500 },
    );
  }
}
