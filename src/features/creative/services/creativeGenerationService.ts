import { getCreativeDocumentInput } from "@/src/features/creative/services/creativeDocumentService";
import type { CreativeJob } from "@/src/features/creative/types/job";
import type { CreativeInputValues } from "@/src/features/creative/types/document";
import type { CreativeLayer } from "@/src/features/creative/types/layer";

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const makeJobId = () => `job_${Math.random().toString(36).slice(2, 10)}`;
const POLL_MAX_ATTEMPTS = 180;
const POLL_INTERVAL_MS = 1000;

type CreativeStrategyKey =
  | "benefit_push"
  | "urgency_push"
  | "trust_push"
  | "simple_cta";

type StrategyVariantLayout = {
  width: number;
  height: number;
  background: {
    color: string;
    imageUrl: string;
  };
  layers: CreativeLayer[];
};

export type StrategyVariantConfig = {
  strategy: CreativeStrategyKey;
  layout: StrategyVariantLayout;
};

const strategyLayoutMap = new Map<string, StrategyVariantConfig[]>();

const textLayer = (params: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
  color: string;
  fontSize: number;
  fontWeight?: number;
}): CreativeLayer => ({
  type: "text",
  ...params,
});

const imageLayer = (params: {
  id: string;
  type: "logo" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  imageUrl: string;
}): CreativeLayer => ({
  ...params,
});

const defaultLogoUrl =
  "https://dummyimage.com/420x180/111827/ffffff&text=AURBIT+LOGO";

const ctaText = (input: CreativeInputValues): string => {
  switch (input.campaignType) {
    case "coupon":
      return "Get Coupon Now";
    case "cashback":
      return "Join Cashback Today";
    case "event":
      return "Reserve Your Spot";
    default:
      return "Start Now";
  }
};

export const buildVariantStrategies = (
  input: CreativeInputValues,
): StrategyVariantConfig[] => {
  const primary = input.brandPrimaryColor;
  const secondary = input.brandSecondaryColor;
  const neutral = "#0f172a";

  const benefitPush: StrategyVariantConfig = {
    strategy: "benefit_push",
    layout: {
      width: 1200,
      height: 628,
      background: {
        color: "#ffffff",
        imageUrl: `https://dummyimage.com/1200x628/${primary.slice(1)}/ffffff&text=Benefit+Push`,
      },
      layers: [
        textLayer({
          id: "benefit-headline",
          x: 70,
          y: 70,
          width: 760,
          height: 90,
          zIndex: 3,
          text: input.mainCopy,
          color: neutral,
          fontSize: 52,
          fontWeight: 800,
        }),
        textLayer({
          id: "benefit-reward",
          x: 70,
          y: 180,
          width: 780,
          height: 130,
          zIndex: 4,
          text: input.rewardText,
          color: primary,
          fontSize: 80,
          fontWeight: 900,
        }),
        textLayer({
          id: "benefit-detail",
          x: 70,
          y: 335,
          width: 760,
          height: 56,
          zIndex: 4,
          text: `${input.limitText} | ${input.periodText}`,
          color: secondary,
          fontSize: 30,
          fontWeight: 600,
        }),
        imageLayer({
          id: "benefit-logo",
          type: "logo",
          x: 950,
          y: 40,
          width: 210,
          height: 96,
          zIndex: 5,
          imageUrl: defaultLogoUrl,
        }),
      ],
    },
  };

  const urgencyPush: StrategyVariantConfig = {
    strategy: "urgency_push",
    layout: {
      width: 1200,
      height: 628,
      background: {
        color: "#fff7ed",
        imageUrl: "https://dummyimage.com/1200x628/f97316/ffffff&text=Urgency+Push",
      },
      layers: [
        textLayer({
          id: "urgency-badge",
          x: 70,
          y: 48,
          width: 250,
          height: 54,
          zIndex: 5,
          text: "LIMITED TIME",
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 800,
        }),
        textLayer({
          id: "urgency-headline",
          x: 70,
          y: 135,
          width: 700,
          height: 96,
          zIndex: 4,
          text: input.periodText,
          color: "#b91c1c",
          fontSize: 58,
          fontWeight: 900,
        }),
        textLayer({
          id: "urgency-reward",
          x: 70,
          y: 252,
          width: 560,
          height: 82,
          zIndex: 4,
          text: input.rewardText,
          color: "#ea580c",
          fontSize: 48,
          fontWeight: 800,
        }),
        textLayer({
          id: "urgency-detail",
          x: 70,
          y: 351,
          width: 640,
          height: 56,
          zIndex: 4,
          text: `${input.mainCopy} / ${input.limitText}`,
          color: neutral,
          fontSize: 28,
          fontWeight: 600,
        }),
        textLayer({
          id: "urgency-cta",
          x: 760,
          y: 438,
          width: 360,
          height: 88,
          zIndex: 5,
          text: ctaText(input),
          color: "#ffffff",
          fontSize: 34,
          fontWeight: 800,
        }),
        imageLayer({
          id: "urgency-logo",
          type: "logo",
          x: 930,
          y: 48,
          width: 210,
          height: 84,
          zIndex: 5,
          imageUrl: defaultLogoUrl,
        }),
      ],
    },
  };

  const trustPush: StrategyVariantConfig = {
    strategy: "trust_push",
    layout: {
      width: 1200,
      height: 628,
      background: {
        color: "#f8fafc",
        imageUrl: "https://dummyimage.com/1200x628/e2e8f0/0f172a&text=Trust+Push",
      },
      layers: [
        imageLayer({
          id: "trust-logo",
          type: "logo",
          x: 88,
          y: 70,
          width: 340,
          height: 120,
          zIndex: 5,
          imageUrl: defaultLogoUrl,
        }),
        textLayer({
          id: "trust-headline",
          x: 88,
          y: 230,
          width: 760,
          height: 82,
          zIndex: 4,
          text: input.mainCopy,
          color: secondary,
          fontSize: 46,
          fontWeight: 700,
        }),
        textLayer({
          id: "trust-message",
          x: 88,
          y: 332,
          width: 780,
          height: 56,
          zIndex: 4,
          text: `${input.companyName} trusted campaign | ${input.periodText}`,
          color: "#334155",
          fontSize: 27,
          fontWeight: 500,
        }),
        textLayer({
          id: "trust-reward",
          x: 88,
          y: 425,
          width: 460,
          height: 66,
          zIndex: 4,
          text: input.rewardText,
          color: primary,
          fontSize: 37,
          fontWeight: 700,
        }),
      ],
    },
  };

  const simpleCta: StrategyVariantConfig = {
    strategy: "simple_cta",
    layout: {
      width: 1200,
      height: 628,
      background: {
        color: "#ffffff",
        imageUrl: "https://dummyimage.com/1200x628/f1f5f9/0f172a&text=Simple+CTA",
      },
      layers: [
        textLayer({
          id: "simple-headline",
          x: 120,
          y: 170,
          width: 960,
          height: 112,
          zIndex: 4,
          text: input.mainCopy,
          color: neutral,
          fontSize: 64,
          fontWeight: 800,
        }),
        textLayer({
          id: "simple-cta",
          x: 120,
          y: 340,
          width: 420,
          height: 88,
          zIndex: 4,
          text: ctaText(input),
          color: primary,
          fontSize: 38,
          fontWeight: 800,
        }),
        imageLayer({
          id: "simple-logo",
          type: "logo",
          x: 980,
          y: 40,
          width: 160,
          height: 64,
          zIndex: 5,
          imageUrl: defaultLogoUrl,
        }),
      ],
    },
  };

  return [benefitPush, urgencyPush, trustPush, simpleCta];
};

const buildStrategyVariantLayouts = (
  documentId: string,
  input: CreativeInputValues,
): StrategyVariantConfig[] => {
  const strategies = buildVariantStrategies(input).map((entry) => ({
    strategy: entry.strategy,
    layout: {
      ...entry.layout,
      layers: entry.layout.layers.map((layer) => ({ ...layer })),
    },
  }));
  strategyLayoutMap.set(documentId, strategies);
  return strategies;
};

export const getStrategyVariantLayouts = (
  documentId: string,
): StrategyVariantConfig[] | null => {
  const strategies = strategyLayoutMap.get(documentId);
  if (!strategies) {
    return null;
  }
  return strategies.map((entry) => ({
    strategy: entry.strategy,
    layout: {
      ...entry.layout,
      layers: entry.layout.layers.map((layer) => ({ ...layer })),
    },
  }));
};

export const generateVariants = async (documentId: string): Promise<{ jobId: string }> => {
  const input = getCreativeDocumentInput(documentId);
  if (input) {
    buildStrategyVariantLayouts(documentId, input);
  }

  const response = await fetch(`/api/creative/documents/${documentId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (response.ok) {
    return (await response.json()) as { jobId: string };
  }

  let message = `Failed to start generation (status: ${response.status}).`;
  try {
    const errorData = (await response.json()) as { error?: string };
    if (typeof errorData.error === "string" && errorData.error.trim().length > 0) {
      message = errorData.error;
    }
  } catch {
    // Keep default message when response body is not JSON.
  }
  throw new Error(message);
};

export const pollGenerationJob = async (
  jobId: string,
  onProgress: (progress: number) => void,
): Promise<CreativeJob> => {
  let fallbackProgress = 0;

  for (let i = 0; i < POLL_MAX_ATTEMPTS; i += 1) {
    try {
      const response = await fetch(`/api/creative/jobs/${jobId}`, {
        method: "GET",
        cache: "no-store",
      });
      if (response.ok) {
        const data = (await response.json()) as CreativeJob;
        if (process.env.NODE_ENV !== "production" && (i === 0 || i % 10 === 0 || data.status !== "running")) {
          console.info("[creative:poll] job read", {
            jobId,
            attempt: i + 1,
            status: data.status,
            progress: data.progress,
            message: data.message,
          });
        }
        onProgress(data.progress ?? 0);
        if (data.status === "succeeded" || data.status === "failed") {
          return data;
        }
      } else if (response.status === 404) {
        let message = "Job not found";
        try {
          const errorData = (await response.json()) as { message?: string; error?: string };
          message = errorData.message ?? errorData.error ?? message;
        } catch {
          // Keep default message.
        }
        return {
          jobId,
          status: "failed",
          progress: 100,
          message,
        };
      }
    } catch {
      // Keep polling with fallback progress.
    }

    fallbackProgress = Math.min(95, fallbackProgress + 2);
    onProgress(fallbackProgress);
    await wait(POLL_INTERVAL_MS);
  }

  onProgress(100);
  return {
    jobId,
    status: "failed",
    progress: 100,
    message: "Generation polling timed out.",
  };
};
