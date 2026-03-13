import { fal } from "@fal-ai/client";
import type {
  GeneratedImage,
  ImageProvider,
  ProviderGenerateParams,
} from "@/src/features/creative/ai/imageProvider";
import { buildPromptPayload } from "@/src/features/creative/ai/promptBuilder";

const DEFAULT_MODEL = process.env.FAL_NANO_BANANA_MODEL ?? "fal-ai/nano-banana-2";
const FAL_REQUEST_TIMEOUT_MS = 120000;
const isDebug = process.env.NODE_ENV !== "production";

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isDebug) {
    return;
  }
  if (meta) {
    console.info(`[creative:nano-banana] ${message}`, meta);
    return;
  }
  console.info(`[creative:nano-banana] ${message}`);
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Nano Banana request timed out after ${timeoutMs}ms (${context}).`));
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

type FalImageResult = {
  url?: string;
};

type FalResponse = {
  data?: {
    images?: FalImageResult[];
    seed?: number;
  };
};

export class NanoBananaProvider implements ImageProvider {
  name = "nano-banana-2";

  constructor(private readonly modelId: string = DEFAULT_MODEL) {}

  getModelId() {
    return this.modelId;
  }

  async generateStrategyImages(params: ProviderGenerateParams): Promise<GeneratedImage[]> {
    const key = process.env.FAL_KEY;
    if (!key) {
      throw new Error("FAL_KEY is not configured.");
    }

    logDebug("generateStrategyImages:start", {
      documentId: params.documentId,
      provider: this.name,
      modelId: this.modelId,
      mode: params.regeneration?.mode ?? "initial",
      planCount: params.plans.length,
      width: params.width,
      height: params.height,
    });

    fal.config({ credentials: key });

    const outputs = await Promise.all(params.plans.map(async (plan) => {
      const payload = buildPromptPayload(params.input, plan, {
        mode: params.regeneration?.mode ?? "initial",
        regenerationCount: params.regeneration?.regenerationCount,
        previousSeed: params.regeneration?.previousSeed,
      });

      const input = {
        prompt: payload.prompt,
        negative_prompt: payload.negativePrompt,
        image_size: {
          width: params.width,
          height: params.height,
        },
        num_images: 1,
      };

      logDebug("fal:request:start", {
        documentId: params.documentId,
        strategy: plan.strategy,
        modelId: this.modelId,
      });

      const response = (await withTimeout(
        fal.subscribe(this.modelId, {
          input,
          logs: false,
        }) as Promise<unknown>,
        FAL_REQUEST_TIMEOUT_MS,
        `strategy=${plan.strategy}`,
      )) as unknown as FalResponse;

      const imageCount = Array.isArray(response?.data?.images)
        ? response.data.images.length
        : 0;
      logDebug("fal:request:done", {
        documentId: params.documentId,
        strategy: plan.strategy,
        imageCount,
      });

      const imageUrl = response?.data?.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error(`Nano Banana returned empty image for strategy: ${plan.strategy}`);
      }

      return {
        imageUrl,
        strategy: plan.strategy,
        strategySubtitle: plan.subtitle,
        prompt: payload.prompt,
        negativePrompt: payload.negativePrompt,
        promptFragments: payload.fragments,
        model: this.modelId,
        seed: typeof response?.data?.seed === "number" ? response.data.seed : undefined,
        width: params.width,
        height: params.height,
      } satisfies GeneratedImage;
    }));

    logDebug("generateStrategyImages:done", {
      documentId: params.documentId,
      generatedCount: outputs.length,
    });

    return outputs;
  }
}
