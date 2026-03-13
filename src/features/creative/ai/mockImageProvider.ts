import type {
  GeneratedImage,
  ImageProvider,
  ProviderGenerateParams,
} from "@/src/features/creative/ai/imageProvider";
import { buildPromptPayload } from "@/src/features/creative/ai/promptBuilder";

const strategyColor: Record<string, string> = {
  benefit_push: "f97316",
  urgency_push: "ef4444",
  trust_push: "0ea5e9",
  simple_cta: "64748b",
};

export class MockImageProvider implements ImageProvider {
  name = "mock-provider";

  async generateStrategyImages(params: ProviderGenerateParams): Promise<GeneratedImage[]> {
    return params.plans.map((plan, index) => {
      const payload = buildPromptPayload(params.input, plan);
      const color = strategyColor[plan.strategy] ?? "334155";
      return {
        imageUrl: `https://dummyimage.com/${params.width}x${params.height}/${color}/ffffff&text=${encodeURIComponent(plan.label)}`,
        strategy: plan.strategy,
        strategySubtitle: plan.subtitle,
        prompt: payload.prompt,
        negativePrompt: payload.negativePrompt,
        promptFragments: payload.fragments,
        model: "mock/background-generator",
        seed: 1000 + index,
        width: params.width,
        height: params.height,
      };
    });
  }
}
